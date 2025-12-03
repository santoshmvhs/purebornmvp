"""
Products router for CRUD operations on products.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Product
from app.schemas import ProductCreate, ProductUpdate, ProductRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductRead])
async def list_products(
    search: Optional[str] = Query(None, description="Search by name or product code"),
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    active_only: bool = Query(True, description="Show only active products"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all products with optional search and pagination.
    """
    stmt = select(Product).options(selectinload(Product.category))
    
    # Filter by active status
    if active_only:
        stmt = stmt.where(Product.is_active == True)

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    
    # Search filter
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(search_filter),
                Product.product_code.ilike(search_filter)
            )
        )
    
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    products = result.scalars().unique().all()
    
    # Attach category names for serialization
    for product in products:
        if product.category:
            product.category_name = product.category.name
        else:
            product.category_name = None
    
    return products


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific product by ID.
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Create a new product (Admin only).
    """
    # Check if product_code already exists (if provided)
    if product_data.product_code:
        existing = await db.execute(
            select(Product).where(Product.product_code == product_data.product_code)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with code '{product_data.product_code}' already exists"
            )
    
    product = Product(**product_data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    return product


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Update a product (Admin only).
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update only provided fields
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Delete a product (Admin only).
    
    By default performs soft delete (sets is_active=False).
    Use hard_delete=true to permanently remove.
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if hard_delete:
        await db.delete(product)
    else:
        product.is_active = False
    
    await db.commit()
    return None

