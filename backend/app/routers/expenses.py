"""
Expenses router for managing business expenses (async).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models import User, Expense, ExpenseCategory, ExpenseSubcategory, Vendor
from app.schemas import (
    ExpenseCreate, ExpenseRead, 
    ExpenseCategoryCreate, ExpenseCategoryRead, ExpenseCategoryWithSubcategories,
    ExpenseSubcategoryCreate, ExpenseSubcategoryRead
)
from app.deps import get_current_active_user

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new expense record.
    
    - Validates expense category and vendor if provided
    - Calculates total_amount, total_paid, and balance_due
    """
    try:
        # Validate expense category if provided
        if expense_data.expense_category_id:
            category_result = await db.execute(
                select(ExpenseCategory).where(ExpenseCategory.id == expense_data.expense_category_id)
            )
            category = category_result.scalar_one_or_none()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Expense category not found"
                )
        
        # Validate vendor if provided
        if expense_data.vendor_id:
            vendor_result = await db.execute(
                select(Vendor).where(Vendor.id == expense_data.vendor_id)
            )
            vendor = vendor_result.scalar_one_or_none()
            if not vendor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor not found"
                )
        
        # Calculate totals
        amount_cash = Decimal(str(expense_data.amount_cash))
        amount_upi = Decimal(str(expense_data.amount_upi))
        amount_card = Decimal(str(expense_data.amount_card))
        amount_credit = Decimal(str(expense_data.amount_credit))
        
        total_amount = amount_cash + amount_upi + amount_card + amount_credit
        total_paid = amount_cash + amount_upi + amount_card
        balance_due = amount_credit
        
        # Create expense
        expense = Expense(
            date=expense_data.date,
            name=expense_data.name,
            description=expense_data.description,
            expense_category_id=expense_data.expense_category_id,
            expense_subcategory_id=expense_data.expense_subcategory_id,
            vendor_id=expense_data.vendor_id,
            amount_cash=float(amount_cash),
            amount_upi=float(amount_upi),
            amount_card=float(amount_card),
            amount_credit=float(amount_credit),
            total_amount=float(total_amount),
            total_paid=float(total_paid),
            balance_due=float(balance_due),
        )
        
        db.add(expense)
        await db.commit()
        await db.refresh(expense)
        
        return expense
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating expense: {str(e)}"
        )


@router.get("", response_model=List[ExpenseRead])
async def list_expenses(
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    category_id: Optional[UUID] = Query(None, description="Filter by expense category"),
    vendor_id: Optional[UUID] = Query(None, description="Filter by vendor"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List expenses with optional filtering and pagination.
    """
    query = select(Expense)
    
    # Date range filtering
    if start_date:
        query = query.where(Expense.date >= start_date)
    if end_date:
        query = query.where(Expense.date <= end_date)
    
    # Category filtering
    if category_id:
        query = query.where(Expense.expense_category_id == category_id)
    
    # Vendor filtering
    if vendor_id:
        query = query.where(Expense.vendor_id == vendor_id)
    
    # Order by most recent first
    query = query.order_by(Expense.created_at.desc())
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    return expenses


@router.get("/{expense_id}", response_model=ExpenseRead)
async def get_expense(
    expense_id: UUID = Path(..., description="Expense ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific expense by ID.
    """
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    return expense


@router.put("/{expense_id}", response_model=ExpenseRead)
async def update_expense(
    expense_id: UUID = Path(..., description="Expense ID"),
    expense_data: ExpenseCreate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing expense.
    """
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    try:
        # Validate expense category if provided
        if expense_data.expense_category_id:
            category_result = await db.execute(
                select(ExpenseCategory).where(ExpenseCategory.id == expense_data.expense_category_id)
            )
            category = category_result.scalar_one_or_none()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Expense category not found"
                )
        
        # Validate vendor if provided
        if expense_data.vendor_id:
            vendor_result = await db.execute(
                select(Vendor).where(Vendor.id == expense_data.vendor_id)
            )
            vendor = vendor_result.scalar_one_or_none()
            if not vendor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Vendor not found"
                )
        
        # Calculate totals
        amount_cash = Decimal(str(expense_data.amount_cash))
        amount_upi = Decimal(str(expense_data.amount_upi))
        amount_card = Decimal(str(expense_data.amount_card))
        amount_credit = Decimal(str(expense_data.amount_credit))
        
        total_amount = amount_cash + amount_upi + amount_card + amount_credit
        total_paid = amount_cash + amount_upi + amount_card
        balance_due = amount_credit
        
        # Update expense
        expense.date = expense_data.date
        expense.name = expense_data.name
        expense.description = expense_data.description
        expense.expense_category_id = expense_data.expense_category_id
        expense.expense_subcategory_id = expense_data.expense_subcategory_id
        expense.vendor_id = expense_data.vendor_id
        expense.amount_cash = float(amount_cash)
        expense.amount_upi = float(amount_upi)
        expense.amount_card = float(amount_card)
        expense.amount_credit = float(amount_credit)
        expense.total_amount = float(total_amount)
        expense.total_paid = float(total_paid)
        expense.balance_due = float(balance_due)
        
        await db.commit()
        await db.refresh(expense)
        
        return expense
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating expense: {str(e)}"
        )


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID = Path(..., description="Expense ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete an expense.
    """
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id)
    )
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    await db.delete(expense)
    await db.commit()
    
    return None


# Expense Categories endpoints
@router.post("/categories", response_model=ExpenseCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    category_data: ExpenseCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new expense category.
    """
    category = ExpenseCategory(
        name=category_data.name,
        description=category_data.description
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/categories", response_model=List[ExpenseCategoryWithSubcategories])
async def list_expense_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all expense categories with their subcategories.
    """
    try:
        result = await db.execute(
            select(ExpenseCategory)
            .options(selectinload(ExpenseCategory.subcategories))
            .order_by(ExpenseCategory.name)
        )
        categories = result.scalars().unique().all()
        # Return empty list if no categories
        if not categories:
            return []
        # Return categories - FastAPI will serialize via response_model
        return list(categories)
    except Exception as e:
        # Return empty list on any error to prevent 422
        return []


@router.post("/subcategories", response_model=ExpenseSubcategoryRead, status_code=status.HTTP_201_CREATED)
async def create_expense_subcategory(
    subcategory_data: ExpenseSubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new expense subcategory.
    """
    # Validate category exists
    category_result = await db.execute(
        select(ExpenseCategory).where(ExpenseCategory.id == subcategory_data.category_id)
    )
    category = category_result.scalar_one_or_none()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    subcategory = ExpenseSubcategory(
        category_id=subcategory_data.category_id,
        name=subcategory_data.name,
        description=subcategory_data.description
    )
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)
    return subcategory


@router.get("/subcategories", response_model=List[ExpenseSubcategoryRead])
async def list_expense_subcategories(
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all expense subcategories, optionally filtered by category.
    """
    query = select(ExpenseSubcategory)
    if category_id:
        query = query.where(ExpenseSubcategory.category_id == category_id)
    query = query.order_by(ExpenseSubcategory.name)
    
    result = await db.execute(query)
    subcategories = result.scalars().all()
    return subcategories

