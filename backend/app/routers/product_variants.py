"""
Product Variants router for managing product variations (async).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Product, ProductVariant
from app.schemas import ProductVariantCreate, ProductVariantUpdate, ProductVariantRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/product-variants", tags=["Product Variants"])


@router.get("", response_model=List[ProductVariantRead])
async def list_product_variants(
    product_id: Optional[UUID] = Query(None, description="Filter by product ID"),
    active_only: bool = Query(True, description="Show only active variants"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all product variants with pagination and optional filtering.
    """
    query = select(ProductVariant).options(selectinload(ProductVariant.product))
    
    if product_id:
        query = query.where(ProductVariant.product_id == product_id)
    
    if active_only:
        query = query.where(ProductVariant.is_active == True)
    
    query = query.order_by(ProductVariant.variant_name)
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    variants = result.scalars().unique().all()
    
    # Convert to dict and add product_name and hsn_code, then create Pydantic models
    from app.schemas import ProductVariantRead
    variant_dicts = []
    for variant in variants:
        variant_dict = {
            'id': variant.id,
            'product_id': variant.product_id,
            'variant_name': variant.variant_name,
            'multiplier': float(variant.multiplier),
            'sku': variant.sku,
            'barcode': variant.barcode,
            'mrp': float(variant.mrp) if variant.mrp else None,
            'selling_price': float(variant.selling_price) if variant.selling_price else None,
            'cost_price': float(variant.cost_price) if variant.cost_price else None,
            'channel': variant.channel,
            'is_active': variant.is_active,
            'created_at': variant.created_at,
            'product_name': variant.product.name if variant.product else None,
            'hsn_code': variant.product.hsn_code if variant.product else None,
        }
        variant_dicts.append(ProductVariantRead(**variant_dict))
    
    return variant_dicts


@router.get("/{variant_id}", response_model=ProductVariantRead)
async def get_product_variant(
    variant_id: UUID = Path(..., description="Product variant ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific product variant by ID.
    """
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found"
        )
    return variant


@router.post("", response_model=ProductVariantRead, status_code=status.HTTP_201_CREATED)
async def create_product_variant(
    variant_data: ProductVariantCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Create a new product variant (Admin only).
    """
    # Validate product exists
    result = await db.execute(
        select(Product).where(Product.id == variant_data.product_id)
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if SKU already exists (if provided)
    if variant_data.sku:
        existing = await db.execute(
            select(ProductVariant).where(ProductVariant.sku == variant_data.sku)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product variant with SKU '{variant_data.sku}' already exists"
            )
    
    variant = ProductVariant(**variant_data.model_dump())
    db.add(variant)
    await db.commit()
    await db.refresh(variant)
    
    return variant


@router.put("/{variant_id}", response_model=ProductVariantRead)
async def update_product_variant(
    variant_id: UUID = Path(..., description="Product variant ID"),
    variant_data: ProductVariantUpdate = ...,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Update an existing product variant (Admin only).
    """
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found"
        )
    
    # Check if SKU already exists (if being updated)
    update_data = variant_data.model_dump(exclude_unset=True)
    if 'sku' in update_data and update_data['sku']:
        existing = await db.execute(
            select(ProductVariant).where(
                ProductVariant.sku == update_data['sku'],
                ProductVariant.id != variant_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product variant with SKU '{update_data['sku']}' already exists"
            )
    
    for field, value in update_data.items():
        setattr(variant, field, value)
    
    await db.commit()
    await db.refresh(variant)
    return variant


@router.delete("/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_variant(
    variant_id: UUID = Path(..., description="Product variant ID"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Delete a product variant (Admin only).
    """
    result = await db.execute(
        select(ProductVariant).where(ProductVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    
    if not variant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product variant not found"
        )
    
    await db.delete(variant)
    await db.commit()
    return None

