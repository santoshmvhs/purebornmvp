"""
Day Counters router for daily cash control and reconciliation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models import User, DayCounter
from app.schemas import DayCounterCreate, DayCounterUpdate, DayCounterRead
from app.deps import get_current_active_user

router = APIRouter(prefix="/day-counters", tags=["Day Counters"])


@router.get("", response_model=List[DayCounterRead])
async def list_day_counters(
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all day counters with pagination, optionally filtered by date range."""
    stmt = select(DayCounter)
    
    if start_date:
        stmt = stmt.where(DayCounter.date >= start_date)
    if end_date:
        stmt = stmt.where(DayCounter.date <= end_date)
    
    stmt = stmt.order_by(DayCounter.date.desc())
    
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.get("/{counter_date}", response_model=DayCounterRead)
async def get_day_counter(
    counter_date: date = Path(..., description="Date for the day counter (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a day counter by date."""
    result = await db.execute(
        select(DayCounter).where(DayCounter.date == counter_date)
    )
    day_counter = result.scalar_one_or_none()
    
    if not day_counter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day counter for date {counter_date} not found"
        )
    return day_counter


@router.post("", response_model=DayCounterRead, status_code=status.HTTP_201_CREATED)
async def create_day_counter(
    day_counter_data: DayCounterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create or update a day counter.
    
    If a counter for the date already exists, it will be updated.
    Calculates total_sales, system_closing_cash, and difference automatically.
    """
    # Check if counter for this date already exists
    result = await db.execute(
        select(DayCounter).where(DayCounter.date == day_counter_data.date)
    )
    existing = result.scalar_one_or_none()
    
    # Calculate derived fields
    total_sales = (
        day_counter_data.sales_cash +
        day_counter_data.sales_upi +
        day_counter_data.sales_card +
        day_counter_data.sales_credit
    )
    system_closing_cash = (
        day_counter_data.opening_cash_balance +
        day_counter_data.sales_cash -
        day_counter_data.total_expenses_cash -
        day_counter_data.cash_hand_over
    )
    difference = day_counter_data.actual_closing_cash - system_closing_cash
    
    if existing:
        # Update existing counter
        update_data = day_counter_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        
        # Update calculated fields
        existing.total_sales = Decimal(str(total_sales))
        existing.system_closing_cash = Decimal(str(system_closing_cash))
        existing.difference = Decimal(str(difference))
        
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        # Create new counter
        counter_dict = day_counter_data.model_dump()
        counter_dict['total_sales'] = Decimal(str(total_sales))
        counter_dict['system_closing_cash'] = Decimal(str(system_closing_cash))
        counter_dict['difference'] = Decimal(str(difference))
        
        day_counter = DayCounter(**counter_dict)
        db.add(day_counter)
        await db.commit()
        await db.refresh(day_counter)
        return day_counter


@router.put("/{counter_date}", response_model=DayCounterRead)
async def update_day_counter(
    counter_date: date,
    day_counter_data: DayCounterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a day counter by date."""
    result = await db.execute(
        select(DayCounter).where(DayCounter.date == counter_date)
    )
    day_counter = result.scalar_one_or_none()
    
    if not day_counter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day counter for date {counter_date} not found"
        )
    
    # Update provided fields
    update_data = day_counter_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(day_counter, field, value)
    
    # Recalculate derived fields
    total_sales = (
        day_counter.sales_cash +
        day_counter.sales_upi +
        day_counter.sales_card +
        day_counter.sales_credit
    )
    system_closing_cash = (
        day_counter.opening_cash_balance +
        day_counter.sales_cash -
        day_counter.total_expenses_cash -
        day_counter.cash_hand_over
    )
    difference = day_counter.actual_closing_cash - system_closing_cash
    
    day_counter.total_sales = Decimal(str(total_sales))
    day_counter.system_closing_cash = Decimal(str(system_closing_cash))
    day_counter.difference = Decimal(str(difference))
    
    await db.commit()
    await db.refresh(day_counter)
    return day_counter


@router.delete("/{counter_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_day_counter(
    counter_date: date,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a day counter by date."""
    result = await db.execute(
        select(DayCounter).where(DayCounter.date == counter_date)
    )
    day_counter = result.scalar_one_or_none()
    
    if not day_counter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day counter for date {counter_date} not found"
        )
    
    db.delete(day_counter)
    await db.commit()
    return None

