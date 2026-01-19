"""
Vendors router for managing vendors.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Vendor
from app.schemas import VendorCreate, VendorUpdate, VendorRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("", response_model=List[VendorRead])
async def list_vendors(
    search: Optional[str] = Query(None, description="Search by name"),
    active_only: bool = Query(True, description="Show only active vendors"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all vendors with pagination."""
    stmt = select(Vendor)
    
    if active_only:
        stmt = stmt.where(Vendor.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(Vendor.name.ilike(search_filter))
    
    stmt = stmt.order_by(Vendor.name)
    
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.get("/{vendor_id}", response_model=VendorRead)
async def get_vendor(
    vendor_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific vendor by ID."""
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    return vendor


@router.post("", response_model=VendorRead, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    vendor_data: VendorCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Create a new vendor (Admin only)."""
    vendor = Vendor(**vendor_data.model_dump())
    db.add(vendor)
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}", response_model=VendorRead)
async def update_vendor(
    vendor_id: UUID,
    vendor_data: VendorUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Update a vendor (Admin only)."""
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    update_data = vendor_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vendor, field, value)
    
    await db.commit()
    await db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(
    vendor_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Delete a vendor (Admin only)."""
    vendor = await db.get(Vendor, vendor_id)
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    if hard_delete:
        await db.delete(vendor)
    else:
        vendor.is_active = False
    
    await db.commit()
    return None

