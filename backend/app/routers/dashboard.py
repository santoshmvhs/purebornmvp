"""
Dashboard router for KPI calculations and aggregated data.
Moves heavy calculations from frontend to backend for better performance.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from datetime import date, datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models import (
    Sale, SaleItem, Purchase, PurchaseItem, Expense, 
    Product, ProductVariant, RawMaterial, ManufacturingBatch,
    DayCounter, Vendor, Customer, User
)
from app.deps import get_current_active_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis")
async def get_dashboard_kpis(
    start_date: Optional[date] = Query(None, description="Start date for KPI calculations"),
    end_date: Optional[date] = Query(None, description="End date for KPI calculations"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get comprehensive dashboard KPIs.
    All calculations are performed server-side for better performance.
    """
    try:
        # Default to current month if no dates provided
        if not start_date:
            start_date = date.today().replace(day=1)
        if not end_date:
            end_date = date.today()
    
    # Calculate date ranges
        today = date.today()
        yesterday = today - timedelta(days=1)
        start_of_month = today.replace(day=1)
        start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
        end_of_last_month = start_of_month - timedelta(days=1)
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)
        end_of_last_week = start_of_week - timedelta(days=1)
    
    # Fetch sales data
        sales_query = select(Sale).where(
        and_(
            Sale.invoice_date >= start_date,
            Sale.invoice_date <= end_date
        )
        )
        sales_result = await db.execute(sales_query)
        all_sales = sales_result.scalars().all()
    
    # Fetch purchases
        purchases_query = select(Purchase).where(
        and_(
            Purchase.invoice_date >= start_date,
            Purchase.invoice_date <= end_date
        )
        )
        purchases_result = await db.execute(purchases_query)
        all_purchases = purchases_result.scalars().all()
    
    # Fetch expenses
        expenses_query = select(Expense).where(
        and_(
            Expense.date >= start_date,
            Expense.date <= end_date
        )
        )
        expenses_result = await db.execute(expenses_query)
        all_expenses = expenses_result.scalars().all()
    
    # Calculate financial KPIs
        monthly_sales_amount = sum(s.net_amount or 0 for s in all_sales)
        monthly_purchases_amount = sum(p.total_amount or 0 for p in all_purchases)
        monthly_expenses_amount = sum(e.total_amount or 0 for e in all_expenses)
    
    # Estimate COGS (simplified: 70% of purchases)
        estimated_cogs = monthly_purchases_amount * 0.7
        gross_profit = monthly_sales_amount - estimated_cogs
        gross_profit_margin = (gross_profit / monthly_sales_amount * 100) if monthly_sales_amount > 0 else 0
        net_profit = monthly_sales_amount - monthly_purchases_amount - monthly_expenses_amount
    
    # Cash flow
        cash_inflow = sum(
        (s.amount_cash or 0) + (s.amount_upi or 0) + (s.amount_card or 0)
        for s in all_sales
        )
        cash_outflow = sum(
        (p.amount_cash or 0) + (p.amount_upi or 0) + (p.amount_card or 0)
        for p in all_purchases
        ) + sum(
        (e.amount_cash or 0) + (e.amount_upi or 0) + (e.amount_card or 0)
        for e in all_expenses
        )
        cash_flow = cash_inflow - cash_outflow
    
    # Today's sales
        today_sales_query = select(Sale).where(Sale.invoice_date == today)
        today_sales_result = await db.execute(today_sales_query)
        today_sales_list = today_sales_result.scalars().all()
        today_sales = sum(s.net_amount or 0 for s in today_sales_list)
        today_count = len(today_sales_list)
        avg_transaction_value = (today_sales / today_count) if today_count > 0 else 0
    
    # Expense to sales ratio
        expense_to_sales_ratio = (monthly_expenses_amount / monthly_sales_amount * 100) if monthly_sales_amount > 0 else 0
    
    # Sales growth calculations
    # Day over day
        yesterday_sales_query = select(Sale).where(Sale.invoice_date == yesterday)
        yesterday_sales_result = await db.execute(yesterday_sales_query)
        yesterday_sales = sum(s.net_amount or 0 for s in yesterday_sales_result.scalars().all())
        sales_growth_dod = ((today_sales - yesterday_sales) / yesterday_sales * 100) if yesterday_sales > 0 else 0
    
    # Week over week
        this_week_sales_query = select(Sale).where(
        and_(Sale.invoice_date >= start_of_week, Sale.invoice_date <= today)
        )
        this_week_sales_result = await db.execute(this_week_sales_query)
        this_week_sales = sum(s.net_amount or 0 for s in this_week_sales_result.scalars().all())
    
        last_week_sales_query = select(Sale).where(
        and_(Sale.invoice_date >= start_of_last_week, Sale.invoice_date <= end_of_last_week)
        )
        last_week_sales_result = await db.execute(last_week_sales_query)
        last_week_sales = sum(s.net_amount or 0 for s in last_week_sales_result.scalars().all())
        sales_growth_wow = ((this_week_sales - last_week_sales) / last_week_sales * 100) if last_week_sales > 0 else 0
    
    # Month over month
        last_month_sales_query = select(Sale).where(
        and_(Sale.invoice_date >= start_of_last_month, Sale.invoice_date <= end_of_last_month)
        )
        last_month_sales_result = await db.execute(last_month_sales_query)
        last_month_sales = sum(s.net_amount or 0 for s in last_month_sales_result.scalars().all())
        sales_growth_mom = ((monthly_sales_amount - last_month_sales) / last_month_sales * 100) if last_month_sales > 0 else 0
    
    # Discounts
        total_discounts = sum(s.discount_amount or 0 for s in all_sales)
        discount_percentage = (total_discounts / monthly_sales_amount * 100) if monthly_sales_amount > 0 else 0
    
    # Purchase metrics
        avg_purchase_order_value = (monthly_purchases_amount / len(all_purchases)) if all_purchases else 0
        purchase_frequency = len(all_purchases)
    
    # Manufacturing metrics
        manufacturing_query = select(ManufacturingBatch).where(
        and_(
            ManufacturingBatch.batch_date >= start_date,
            ManufacturingBatch.batch_date <= end_date
        )
        )
        manufacturing_result = await db.execute(manufacturing_query)
        manufacturing_batches_list = manufacturing_result.scalars().all()
        manufacturing_batches = len(manufacturing_batches_list)
    
    # Inventory metrics (simplified - would need views for accurate calculations)
        products_query = select(func.count(Product.id))
        products_result = await db.execute(products_query)
        total_products = products_result.scalar() or 0
    
    # Vendor and customer balances (calculated from purchases/sales)
    # Vendor balance = sum of unpaid purchase amounts + unpaid expense amounts
        vendor_balance = sum(
        (p.total_amount or 0) - (p.total_paid or 0)
        for p in all_purchases
        ) + sum(
        (e.total_amount or 0) - (e.total_paid or 0)
        for e in all_expenses
        )
    
    # Customer balance = sum of unpaid sale amounts
        customer_balance = sum(
        (s.net_amount or 0) - (s.amount_cash or 0) - (s.amount_upi or 0) - (s.amount_card or 0)
        for s in all_sales
        )
    
    # Credit sales ratio
        credit_sales = sum(s.amount_credit or 0 for s in all_sales)
        credit_sales_ratio = (credit_sales / monthly_sales_amount * 100) if monthly_sales_amount > 0 else 0
    
    # Cash accuracy (from day counters)
        day_counter_query = select(DayCounter).where(DayCounter.date == today)
        day_counter_result = await db.execute(day_counter_query)
        day_counter = day_counter_result.scalar_one_or_none()
        cash_accuracy = 0
        if day_counter and day_counter.difference is not None:
            cash_accuracy = abs(day_counter.difference)
    
        return {
        # Financial KPIs
        "gross_profit": round(gross_profit, 2),
        "gross_profit_margin": round(gross_profit_margin, 2),
        "net_profit": round(net_profit, 2),
        "cash_flow": round(cash_flow, 2),
        "avg_transaction_value": round(avg_transaction_value, 2),
        "expense_to_sales_ratio": round(expense_to_sales_ratio, 2),
        
        # Sales Performance
        "sales_growth_dod": round(sales_growth_dod, 2),
        "sales_growth_wow": round(sales_growth_wow, 2),
        "sales_growth_mom": round(sales_growth_mom, 2),
        "total_discounts": round(total_discounts, 2),
        "discount_percentage": round(discount_percentage, 2),
        
        # Purchase/Vendor
        "avg_purchase_order_value": round(avg_purchase_order_value, 2),
        "purchase_frequency": purchase_frequency,
        "vendor_balance": round(vendor_balance, 2),
        
        # Manufacturing
        "manufacturing_batches": manufacturing_batches,
        
        # Operational
        "cash_accuracy": round(cash_accuracy, 2),
        "credit_sales_ratio": round(credit_sales_ratio, 2),
        
        # Basic stats
        "today_sales": round(today_sales, 2),
        "today_count": today_count,
        "monthly_sales": round(monthly_sales_amount, 2),
        "monthly_count": len(all_sales),
        "total_products": total_products,
        "customer_balance": round(customer_balance, 2),
        }
    except Exception as e:
        logger.error(f"Error calculating dashboard KPIs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating dashboard KPIs: {str(e)}"
        )

