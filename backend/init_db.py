"""
Database initialization script.
Creates tables and seeds initial data.
Note: Tables are created via Alembic migrations, this script is for seeding data only.
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models import User, Product
from app.auth import get_password_hash


async def init_db():
    """Initialize database with seed data."""
    async with AsyncSessionLocal() as db:
        try:
            # Check if admin user already exists
            from sqlalchemy import select
            result = await db.execute(select(User).where(User.username == "admin"))
            admin = result.scalar_one_or_none()
            
            if not admin:
                print("\nCreating default admin user...")
                admin = User(
                    username="admin",
                    hashed_password=get_password_hash("admin123"),
                    role="admin",
                    is_active=True
                )
                db.add(admin)
                await db.commit()
                print("✓ Admin user created (username: admin, password: admin123)")
            else:
                print("\n✓ Admin user already exists")
            
            # Add some sample products if none exist
            result = await db.execute(select(Product))
            products = result.scalars().all()
            product_count = len(products)
            
            if product_count == 0:
                print("\nAdding sample products...")
                sample_products = [
                    Product(sku="PROD001", name="Sample Product 1", price=9.99, stock_qty=100),
                    Product(sku="PROD002", name="Sample Product 2", price=19.99, stock_qty=50),
                    Product(sku="PROD003", name="Sample Product 3", price=29.99, stock_qty=25),
                ]
                for product in sample_products:
                    db.add(product)
                await db.commit()
                print(f"✓ Added {len(sample_products)} sample products")
            else:
                print(f"\n✓ Database already has {product_count} products")
            
            print("\n✅ Database initialization complete!")
            print("\nDefault credentials:")
            print("  Username: admin")
            print("  Password: admin123")
            
        except Exception as e:
            print(f"\n❌ Error during initialization: {e}")
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(init_db())

