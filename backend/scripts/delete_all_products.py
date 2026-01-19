#!/usr/bin/env python3
"""
Script to delete all products and variants from the database.
Usage: python scripts/delete_all_products.py
"""
import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set environment variable to skip validation during script execution
os.environ['ALEMBIC_CONTEXT'] = 'true'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Product, ProductCategory, ProductVariant
from app.config import settings
from sqlalchemy import select, delete

async def delete_all_products():
    """Delete all products and variants."""
    
    # Create database connection
    db_url = settings.DATABASE_URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    elif db_url.startswith('postgresql+psycopg'):
        db_url = db_url.replace('postgresql+psycopg', 'postgresql+asyncpg', 1)
    
    # Disable prepared statement cache for pgbouncer compatibility
    engine = create_async_engine(
        db_url,
        connect_args={"statement_cache_size": 0} if "asyncpg" in db_url else {}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            # Count before deletion
            result = await db.execute(select(Product))
            product_count = len(result.scalars().all())
            
            result = await db.execute(select(ProductVariant))
            variant_count = len(result.scalars().all())
            
            print(f"Found {product_count} products and {variant_count} variants")
            
            if product_count == 0 and variant_count == 0:
                print("No products or variants to delete.")
                return
            
            # Confirm deletion
            response = input(f"\nAre you sure you want to delete ALL {product_count} products and {variant_count} variants? (yes/no): ")
            if response.lower() != 'yes':
                print("Deletion cancelled.")
                return
            
            # Delete variants first (due to foreign key constraint)
            print("\nDeleting variants...")
            await db.execute(delete(ProductVariant))
            
            # Delete products
            print("Deleting products...")
            await db.execute(delete(Product))
            
            await db.commit()
            
            print(f"\n✓ Successfully deleted {product_count} products and {variant_count} variants")
            
    except Exception as e:
        await db.rollback()
        print(f"\nError: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if not settings.DATABASE_URL or settings.DATABASE_URL == "postgresql://user:password@localhost:5432/posdb":
        print("Warning: DATABASE_URL not configured!")
        print("Please set DATABASE_URL in your .env file or as an environment variable")
        sys.exit(1)
    
    try:
        asyncio.run(delete_all_products())
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

