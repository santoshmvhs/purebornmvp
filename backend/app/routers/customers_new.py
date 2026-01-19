"""
Customers router for managing customers (new UUID-based).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User, Customer
from app.schemas import CustomerNewCreate, CustomerNewUpdate, CustomerNewRead
from app.deps import get_current_active_user, get_current_admin_user

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=List[CustomerNewRead])
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name or phone"),
    active_only: bool = Query(True, description="Show only active customers"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all customers with pagination."""
    stmt = select(Customer)
    
    if active_only:
        stmt = stmt.where(Customer.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Customer.name.ilike(search_filter),
                Customer.phone.ilike(search_filter)
            )
        )
    
    stmt = stmt.order_by(Customer.name)
    
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.get("/{customer_id}", response_model=CustomerNewRead)
async def get_customer(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific customer by ID."""
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


@router.post("", response_model=CustomerNewRead, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerNewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new customer."""
    customer = Customer(**customer_data.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerNewRead)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerNewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a customer."""
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    update_data = customer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    await db.commit()
    await db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """Delete a customer (Admin only)."""
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    if hard_delete:
        await db.delete(customer)
    else:
        customer.is_active = False
    
    await db.commit()
    return None

