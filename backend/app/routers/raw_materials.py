"""
Raw Materials router for managing raw materials.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, RawMaterial
from app.schemas import RawMaterialCreate, RawMaterialUpdate, RawMaterialRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/raw-materials", tags=["Raw Materials"])


@router.get("", response_model=List[RawMaterialRead])
async def list_raw_materials(
    search: Optional[str] = Query(None, description="Search by name"),
    active_only: bool = Query(True, description="Show only active raw materials"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all raw materials with pagination."""
    query = select(RawMaterial)
    
    if active_only:
        query = query.where(RawMaterial.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(RawMaterial.name.ilike(search_filter))
    
    query = query.order_by(RawMaterial.name)
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().unique().all()


@router.get("/{raw_material_id}", response_model=RawMaterialRead)
async def get_raw_material(
    raw_material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific raw material by ID."""
    result = await db.execute(
        select(RawMaterial).where(RawMaterial.id == raw_material_id)
    )
    raw_material = result.scalar_one_or_none()
    
    if not raw_material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw material not found"
        )
    return raw_material


@router.post("", response_model=RawMaterialRead, status_code=status.HTTP_201_CREATED)
async def create_raw_material(
    raw_material_data: RawMaterialCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Create a new raw material (Admin only)."""
    raw_material = RawMaterial(**raw_material_data.model_dump())
    db.add(raw_material)
    await db.commit()
    await db.refresh(raw_material)
    return raw_material


@router.put("/{raw_material_id}", response_model=RawMaterialRead)
async def update_raw_material(
    raw_material_id: UUID,
    raw_material_data: RawMaterialUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Update a raw material (Admin only)."""
    result = await db.execute(
        select(RawMaterial).where(RawMaterial.id == raw_material_id)
    )
    raw_material = result.scalar_one_or_none()
    
    if not raw_material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw material not found"
        )
    
    update_data = raw_material_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(raw_material, field, value)
    
    await db.commit()
    await db.refresh(raw_material)
    return raw_material


@router.delete("/{raw_material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_raw_material(
    raw_material_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Delete a raw material (Admin only)."""
    result = await db.execute(
        select(RawMaterial).where(RawMaterial.id == raw_material_id)
    )
    raw_material = result.scalar_one_or_none()
    
    if not raw_material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Raw material not found"
        )
    
    await db.delete(raw_material)
    await db.commit()
    return None

