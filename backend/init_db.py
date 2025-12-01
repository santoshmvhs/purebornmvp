"""
Database initialization script.
Creates tables and seeds initial data.
"""
from app.database import Base, engine, SessionLocal
from app.models import User, Product
from app.auth import get_password_hash


def init_db():
    """Initialize database with tables and seed data."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created successfully")
    
    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            print("\nCreating default admin user...")
            admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("✓ Admin user created (username: admin, password: admin123)")
        else:
            print("\n✓ Admin user already exists")
        
        # Add some sample products if none exist
        product_count = db.query(Product).count()
        if product_count == 0:
            print("\nAdding sample products...")
            sample_products = [
                Product(sku="PROD001", name="Sample Product 1", price=9.99, stock_qty=100),
                Product(sku="PROD002", name="Sample Product 2", price=19.99, stock_qty=50),
                Product(sku="PROD003", name="Sample Product 3", price=29.99, stock_qty=25),
            ]
            for product in sample_products:
                db.add(product)
            db.commit()
            print(f"✓ Added {len(sample_products)} sample products")
        else:
            print(f"\n✓ Database already has {product_count} products")
        
        print("\n✅ Database initialization complete!")
        print("\nYou can now start the server with:")
        print("  uvicorn main:app --reload")
        print("\nDefault credentials:")
        print("  Username: admin")
        print("  Password: admin123")
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

