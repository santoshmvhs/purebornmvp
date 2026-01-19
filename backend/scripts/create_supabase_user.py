"""
Helper script to create a user in the database that matches a Supabase Auth user.

Usage:
    python scripts/create_supabase_user.py <email> <role>

Example:
    python scripts/create_supabase_user.py admin@pureborn.in admin
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import User
from app.auth import get_password_hash
from app.config import settings

async def create_user(email: str, role: str):
    """Create a user in the database for a Supabase Auth user."""
    # Create database connection
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.username == email)
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"User {email} already exists in database.")
            print(f"  ID: {existing_user.id}")
            print(f"  Role: {existing_user.role}")
            print(f"  Active: {existing_user.is_active}")
            return
        
        # Create new user
        # Note: hashed_password is not used with Supabase Auth, but we'll set a placeholder
        new_user = User(
            username=email,
            hashed_password=get_password_hash("placeholder"),  # Not used with Supabase
            role=role,
            is_active=True
        )
        
        session.add(new_user)
        await session.commit()
        
        print(f"✅ User created successfully!")
        print(f"  Email: {email}")
        print(f"  Role: {role}")
        print(f"  Active: {new_user.is_active}")
        print(f"\n⚠️  Make sure this user also exists in Supabase Auth:")
        print(f"   1. Go to Supabase Dashboard → Authentication → Users")
        print(f"   2. Create user with email: {email}")
        print(f"   3. Use the same password you'll use to log in")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/create_supabase_user.py <email> <role>")
        print("Example: python scripts/create_supabase_user.py admin@pureborn.in admin")
        sys.exit(1)
    
    email = sys.argv[1]
    role = sys.argv[2]
    
    if role not in ["admin", "cashier"]:
        print("Error: Role must be 'admin' or 'cashier'")
        sys.exit(1)
    
    asyncio.run(create_user(email, role))

