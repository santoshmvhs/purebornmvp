"""
Expenses router for managing business expenses (async).
"""
import logging
import json
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import OperationalError, ProgrammingError
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
import uuid
from decimal import Decimal

from app.database import get_db
from app.models import User, Expense, ExpenseCategory, ExpenseSubcategory, Vendor
from app.schemas import (
    ExpenseCreate, ExpenseRead, 
    ExpenseCategoryCreate, ExpenseCategoryRead, ExpenseCategoryWithSubcategories,
    ExpenseSubcategoryCreate, ExpenseSubcategoryRead
)
from app.deps import get_current_active_user

logger = logging.getLogger(__name__)

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
    - Handles missing expense_subcategory_id column gracefully
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
        
        # Try to create expense with expense_subcategory_id first
        try:
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
        except (OperationalError, ProgrammingError) as col_error:
            # Column doesn't exist, create without expense_subcategory_id
            error_str = str(col_error).lower()
            if 'expense_subcategory_id' in error_str or 'column' in error_str or 'does not exist' in error_str:
                logger.warning("expense_subcategory_id column not found - creating expense without it")
                await db.rollback()
                
                # Use raw SQL to insert without expense_subcategory_id
                expense_id = uuid.uuid4()
                sql = text("""
                    INSERT INTO expenses (id, date, name, description, expense_category_id, vendor_id,
                                         amount_cash, amount_upi, amount_card, amount_credit,
                                         total_amount, total_paid, balance_due)
                    VALUES (:id, :date, :name, :description, :expense_category_id, :vendor_id,
                            :amount_cash, :amount_upi, :amount_card, :amount_credit,
                            :total_amount, :total_paid, :balance_due)
                    RETURNING id, date, name, description, expense_category_id, vendor_id,
                              amount_cash, amount_upi, amount_card, amount_credit,
                              total_amount, total_paid, balance_due, created_at
                """)
                params = {
                    "id": expense_id,
                    "date": expense_data.date,
                    "name": expense_data.name,
                    "description": expense_data.description,
                    "expense_category_id": expense_data.expense_category_id,
                    "vendor_id": expense_data.vendor_id,
                    "amount_cash": float(amount_cash),
                    "amount_upi": float(amount_upi),
                    "amount_card": float(amount_card),
                    "amount_credit": float(amount_credit),
                    "total_amount": float(total_amount),
                    "total_paid": float(total_paid),
                    "balance_due": float(balance_due),
                }
                result = await db.execute(sql, params)
                await db.commit()
                row = result.fetchone()
                
                # Convert to dict and return
                expense_dict = {
                    'id': str(row[0]),
                    'date': row[1].isoformat() if row[1] else None,
                    'name': str(row[2]) if row[2] else '',
                    'description': str(row[3]) if row[3] else None,
                    'expense_category_id': str(row[4]) if row[4] else None,
                    'expense_subcategory_id': None,  # Column doesn't exist
                    'vendor_id': str(row[5]) if row[5] else None,
                    'amount_cash': float(row[6]) if row[6] is not None else 0.0,
                    'amount_upi': float(row[7]) if row[7] is not None else 0.0,
                    'amount_card': float(row[8]) if row[8] is not None else 0.0,
                    'amount_credit': float(row[9]) if row[9] is not None else 0.0,
                    'total_amount': float(row[10]) if row[10] is not None else 0.0,
                    'total_paid': float(row[11]) if row[11] is not None else 0.0,
                    'balance_due': float(row[12]) if row[12] is not None else 0.0,
                    'created_at': row[13].isoformat() if row[13] else None,
                }
                return Response(content=json.dumps(expense_dict, default=str), media_type="application/json")
            raise  # Re-raise if it's a different error
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating expense: {str(e)}"
        )


@router.get("")
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
    Uses raw SQL to avoid SQLAlchemy model issues with missing columns.
    """
    try:
        # Build WHERE clause for filters
        where_clauses = []
        params = {"limit": limit, "offset": (page - 1) * limit}
        
        if start_date:
            where_clauses.append("date >= :start_date")
            params["start_date"] = start_date
        if end_date:
            where_clauses.append("date <= :end_date")
            params["end_date"] = end_date
        if category_id:
            where_clauses.append("expense_category_id = :category_id")
            params["category_id"] = category_id
        if vendor_id:
            where_clauses.append("vendor_id = :vendor_id")
            params["vendor_id"] = vendor_id
        
        where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        # Try to select with expense_subcategory_id first
        try:
            sql = text(f"""
                SELECT id, date, name, description, expense_category_id, expense_subcategory_id, vendor_id,
                       amount_cash, amount_upi, amount_card, amount_credit,
                       total_amount, total_paid, balance_due, created_at
                FROM expenses
                {where_sql}
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """)
            result = await db.execute(sql, params)
            rows = result.fetchall()
            
            expense_list = []
            for row in rows:
                try:
                    expense_dict = {
                        'id': str(row[0]) if row[0] else None,
                        'date': row[1].isoformat() if row[1] else None,
                        'name': str(row[2]) if row[2] else '',
                        'description': str(row[3]) if row[3] else None,
                        'expense_category_id': str(row[4]) if row[4] else None,
                        'expense_subcategory_id': str(row[5]) if row[5] else None,
                        'vendor_id': str(row[6]) if row[6] else None,
                        'amount_cash': float(row[7]) if row[7] is not None else 0.0,
                        'amount_upi': float(row[8]) if row[8] is not None else 0.0,
                        'amount_card': float(row[9]) if row[9] is not None else 0.0,
                        'amount_credit': float(row[10]) if row[10] is not None else 0.0,
                        'total_amount': float(row[11]) if row[11] is not None else 0.0,
                        'total_paid': float(row[12]) if row[12] is not None else 0.0,
                        'balance_due': float(row[13]) if row[13] is not None else 0.0,
                        'created_at': row[14].isoformat() if row[14] else None,
                    }
                    expense_list.append(expense_dict)
                except Exception as e:
                    logger.error(f"Error creating expense dict from row: {str(e)}", exc_info=True)
                    continue
            return Response(content=json.dumps(expense_list, default=str), media_type="application/json")
        except (OperationalError, ProgrammingError) as col_error:
            # Column doesn't exist, use query without it
            error_str = str(col_error).lower()
            if 'expense_subcategory_id' in error_str or 'column' in error_str or 'does not exist' in error_str:
                logger.warning("expense_subcategory_id column not found - using query without it")
                sql = text(f"""
                    SELECT id, date, name, description, expense_category_id, vendor_id,
                           amount_cash, amount_upi, amount_card, amount_credit,
                           total_amount, total_paid, balance_due, created_at
                    FROM expenses
                    {where_sql}
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                """)
                result = await db.execute(sql, params)
                rows = result.fetchall()
                
                expense_list = []
                for row in rows:
                    try:
                        expense_dict = {
                            'id': str(row[0]) if row[0] else None,
                            'date': row[1].isoformat() if row[1] else None,
                            'name': str(row[2]) if row[2] else '',
                            'description': str(row[3]) if row[3] else None,
                            'expense_category_id': str(row[4]) if row[4] else None,
                            'expense_subcategory_id': None,  # Column doesn't exist
                            'vendor_id': str(row[5]) if row[5] else None,
                            'amount_cash': float(row[6]) if row[6] is not None else 0.0,
                            'amount_upi': float(row[7]) if row[7] is not None else 0.0,
                            'amount_card': float(row[8]) if row[8] is not None else 0.0,
                            'amount_credit': float(row[9]) if row[9] is not None else 0.0,
                            'total_amount': float(row[10]) if row[10] is not None else 0.0,
                            'total_paid': float(row[11]) if row[11] is not None else 0.0,
                            'balance_due': float(row[12]) if row[12] is not None else 0.0,
                            'created_at': row[13].isoformat() if row[13] else None,
                        }
                        expense_list.append(expense_dict)
                    except Exception as e:
                        logger.error(f"Error creating expense dict from row: {str(e)}", exc_info=True)
                        continue
                return Response(content=json.dumps(expense_list, default=str), media_type="application/json")
            raise  # Re-raise if it's a different error
    except Exception as e:
        logger.error(f"Error listing expenses: {str(e)}", exc_info=True)
        return Response(content=json.dumps([], default=str), media_type="application/json")


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
        
        # Update expense - try with expense_subcategory_id first
        try:
            expense.date = expense_data.date
            expense.name = expense_data.name
            expense.description = expense_data.description
            expense.expense_category_id = expense_data.expense_category_id
            if hasattr(expense, 'expense_subcategory_id'):
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
        except (OperationalError, ProgrammingError) as col_error:
            # Column doesn't exist, update without expense_subcategory_id using raw SQL
            error_str = str(col_error).lower()
            if 'expense_subcategory_id' in error_str or 'column' in error_str or 'does not exist' in error_str:
                logger.warning("expense_subcategory_id column not found - updating expense without it")
                await db.rollback()
                
                sql = text("""
                    UPDATE expenses
                    SET date = :date, name = :name, description = :description,
                        expense_category_id = :expense_category_id, vendor_id = :vendor_id,
                        amount_cash = :amount_cash, amount_upi = :amount_upi,
                        amount_card = :amount_card, amount_credit = :amount_credit,
                        total_amount = :total_amount, total_paid = :total_paid,
                        balance_due = :balance_due
                    WHERE id = :expense_id
                    RETURNING id, date, name, description, expense_category_id, vendor_id,
                              amount_cash, amount_upi, amount_card, amount_credit,
                              total_amount, total_paid, balance_due, created_at
                """)
                params = {
                    "expense_id": expense_id,
                    "date": expense_data.date,
                    "name": expense_data.name,
                    "description": expense_data.description,
                    "expense_category_id": expense_data.expense_category_id,
                    "vendor_id": expense_data.vendor_id,
                    "amount_cash": float(amount_cash),
                    "amount_upi": float(amount_upi),
                    "amount_card": float(amount_card),
                    "amount_credit": float(amount_credit),
                    "total_amount": float(total_amount),
                    "total_paid": float(total_paid),
                    "balance_due": float(balance_due),
                }
                result = await db.execute(sql, params)
                await db.commit()
                row = result.fetchone()
                
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Expense not found"
                    )
                
                # Convert to dict and return
                expense_dict = {
                    'id': str(row[0]),
                    'date': row[1].isoformat() if row[1] else None,
                    'name': str(row[2]) if row[2] else '',
                    'description': str(row[3]) if row[3] else None,
                    'expense_category_id': str(row[4]) if row[4] else None,
                    'expense_subcategory_id': None,  # Column doesn't exist
                    'vendor_id': str(row[5]) if row[5] else None,
                    'amount_cash': float(row[6]) if row[6] is not None else 0.0,
                    'amount_upi': float(row[7]) if row[7] is not None else 0.0,
                    'amount_card': float(row[8]) if row[8] is not None else 0.0,
                    'amount_credit': float(row[9]) if row[9] is not None else 0.0,
                    'total_amount': float(row[10]) if row[10] is not None else 0.0,
                    'total_paid': float(row[11]) if row[11] is not None else 0.0,
                    'balance_due': float(row[12]) if row[12] is not None else 0.0,
                    'created_at': row[13].isoformat() if row[13] else None,
                }
                return Response(content=json.dumps(expense_dict, default=str), media_type="application/json")
            raise  # Re-raise if it's a different error
        
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


@router.get("/categories")
async def list_expense_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all expense categories.
    Uses raw SQL to avoid SQLAlchemy model issues.
    """
    try:
        # Use raw SQL to avoid any SQLAlchemy model/relationship issues
        sql = text("""
            SELECT id, name, description, created_at
            FROM expense_categories
            ORDER BY name
        """)
        result = await db.execute(sql)
        rows = result.fetchall()
        
        category_list = []
        for row in rows:
            try:
                category_dict = {
                    "id": str(row[0]) if row[0] else None,
                    "name": str(row[1]) if row[1] else "",
                    "description": str(row[2]) if row[2] else None,
                    "created_at": row[3].isoformat() if row[3] else None
                }
                category_list.append(category_dict)
            except Exception as e:
                logger.warning(f"Error serializing category row: {str(e)}", exc_info=True)
                continue
        
        return Response(content=json.dumps(category_list, default=str), media_type="application/json")
    except (OperationalError, ProgrammingError) as e:
        # Table might not exist yet
        logger.warning(f"expense_categories table might not exist: {str(e)}")
        return Response(content=json.dumps([], default=str), media_type="application/json")
    except Exception as e:
        logger.error(f"Error listing expense categories: {str(e)}", exc_info=True)
        # Return empty list on any error to prevent 422
        return Response(content=json.dumps([], default=str), media_type="application/json")


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


@router.get("/subcategories/{category_id}", response_model=List[ExpenseSubcategoryRead])
async def list_expense_subcategories_by_category(
    category_id: UUID = Path(..., description="Filter by category ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all expense subcategories for a given category (path parameter version).
    """
    try:
        query = select(ExpenseSubcategory).where(
            ExpenseSubcategory.category_id == category_id
        ).order_by(ExpenseSubcategory.name)
        
        result = await db.execute(query)
        subcategories = result.scalars().all()
        return list(subcategories)
    except (OperationalError, ProgrammingError) as e:
        # Table might not exist yet
        logger.warning(f"expense_subcategories table might not exist: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error listing expense subcategories for category {category_id}: {str(e)}", exc_info=True)
        return []


@router.get("/subcategories", response_model=List[ExpenseSubcategoryRead])
async def list_expense_subcategories(
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all expense subcategories, optionally filtered by category (query parameter version).
    """
    try:
        query = select(ExpenseSubcategory)
        if category_id:
            query = query.where(ExpenseSubcategory.category_id == category_id)
        query = query.order_by(ExpenseSubcategory.name)
        
        result = await db.execute(query)
        subcategories = result.scalars().all()
        return list(subcategories)
    except (OperationalError, ProgrammingError) as e:
        # Table might not exist yet
        logger.warning(f"expense_subcategories table might not exist: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error listing expense subcategories: {str(e)}", exc_info=True)
        return []

