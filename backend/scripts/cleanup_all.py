#!/usr/bin/env python3
"""
Script to delete ALL sales and products from the database.
Usage: python scripts/cleanup_all.py
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
from app.models import Product, ProductCategory, ProductVariant, Sale, SaleItem
from app.config import settings
from sqlalchemy import select, delete

async def cleanup_all():
    """Delete all sales, sale items, products, and variants."""
    
    # Create database connection
    db_url = settings.DATABASE_URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    elif db_url.startswith('postgresql+psycopg'):
        db_url = db_url.replace('postgresql+psycopg', 'postgresql+asyncpg', 1)
    
    engine = create_async_engine(
        db_url,
        connect_args={"statement_cache_size": 0} if "asyncpg" in db_url else {}
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            print("=" * 60)
            print("CLEANUP: Deleting ALL data")
            print("=" * 60)
            
            # Count everything
            result = await db.execute(select(SaleItem))
            sale_item_count = len(result.scalars().all())
            
            result = await db.execute(select(Sale))
            sale_count = len(result.scalars().all())
            
            result = await db.execute(select(ProductVariant))
            variant_count = len(result.scalars().all())
            
            result = await db.execute(select(Product))
            product_count = len(result.scalars().all())
            
            print(f"\nFound:")
            print(f"  - {sale_count} sales")
            print(f"  - {sale_item_count} sale items")
            print(f"  - {product_count} products")
            print(f"  - {variant_count} product variants")
            
            if sale_count == 0 and sale_item_count == 0 and product_count == 0 and variant_count == 0:
                print("\n✓ Database is already empty.")
                return
            
            # Delete in correct order (respecting foreign keys)
            print("\nDeleting...")
            
            # 1. Delete sale items first
            if sale_item_count > 0:
                print(f"  Deleting {sale_item_count} sale items...")
                await db.execute(delete(SaleItem))
            
            # 2. Delete sales
            if sale_count > 0:
                print(f"  Deleting {sale_count} sales...")
                await db.execute(delete(Sale))
            
            # 3. Delete product variants
            if variant_count > 0:
                print(f"  Deleting {variant_count} product variants...")
                await db.execute(delete(ProductVariant))
            
            # 4. Delete products
            if product_count > 0:
                print(f"  Deleting {product_count} products...")
                await db.execute(delete(Product))
            
            await db.commit()
            
            print("\n" + "=" * 60)
            print("✓ CLEANUP COMPLETE")
            print("=" * 60)
            print(f"Deleted:")
            print(f"  - {sale_count} sales")
            print(f"  - {sale_item_count} sale items")
            print(f"  - {product_count} products")
            print(f"  - {variant_count} product variants")
            print("=" * 60)
            
    except Exception as e:
        await db.rollback()
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if not settings.DATABASE_URL or settings.DATABASE_URL == "postgresql://user:password@localhost:5432/posdb":
        print("Warning: DATABASE_URL not configured!")
        print("Please set DATABASE_URL in your .env file or as an environment variable")
        sys.exit(1)
    
    try:
        asyncio.run(cleanup_all())
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

