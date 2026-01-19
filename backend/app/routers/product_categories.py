"""
Product Categories router for managing product categories.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.models import User, ProductCategory
from app.schemas import ProductCategoryCreate, ProductCategoryRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/product-categories", tags=["Product Categories"])


@router.get("", response_model=List[ProductCategoryRead])
async def list_product_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all product categories ordered by name.
    """
    result = await db.execute(
        select(ProductCategory).order_by(ProductCategory.name)
    )
    categories = result.scalars().all()
    return categories


@router.post("", response_model=ProductCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_product_category(
    category_data: ProductCategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Create a new product category (Admin only).
    """
    name = category_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name cannot be empty"
        )

    # Prevent duplicates (case-insensitive)
    existing = await db.execute(
        select(ProductCategory).where(func.lower(ProductCategory.name) == name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{name}' already exists"
        )

    category = ProductCategory(name=name)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category

