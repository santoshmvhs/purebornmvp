"""
Reports router for sales analytics and summaries.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from datetime import datetime, date
from typing import Optional

from app.database import get_db
from app.models import User, Sale, SaleItem
from app.schemas import DailySalesReport, MonthlySalesReport, GSTR1Report, GSTR3BReport, GSTReportItem
from app.deps import get_current_active_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/daily", response_model=DailySalesReport)
async def get_daily_sales_report(
    report_date: date = Query(..., description="Date for the report (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get daily sales summary for a specific date.
    
    Returns:
    - Total number of sales
    - Total amount (subtotal)
    - Total tax
    - Grand total
    """
    # Define date range for the day
    start_datetime = datetime.combine(report_date, datetime.min.time())
    end_datetime = datetime.combine(report_date, datetime.max.time())
    
    # Query aggregated data - using actual Sale model fields
    result = await db.execute(
        select(
            func.count(Sale.id).label("total_sales_count"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_amount"),
            func.coalesce(func.sum(Sale.tax_amount), 0).label("total_tax"),
            func.coalesce(func.sum(Sale.net_amount), 0).label("total_grand_total")
        ).where(
            Sale.created_at >= start_datetime,
            Sale.created_at <= end_datetime
        )
    )
    row = result.first()

    # Calculate GST from SaleItems (if needed, otherwise set to 0)
    # For now, GST breakdown is not available in Sale model, so we'll aggregate from SaleItems
    gst_result = await db.execute(
        select(
            func.coalesce(func.sum(SaleItem.gst_amount), 0).label("total_gst")
        ).join(Sale).where(
            Sale.created_at >= start_datetime,
            Sale.created_at <= end_datetime
        )
    )
    gst_row = gst_result.first()

    return DailySalesReport(
        date=report_date.isoformat(),
        total_sales_count=row.total_sales_count or 0,
        total_amount=float(row.total_amount or 0),
        total_tax=float(row.total_tax or 0),
        total_cgst=0.0,  # Not available in current schema
        total_sgst=0.0,  # Not available in current schema
        total_igst=0.0,  # Not available in current schema
        total_gst=float(gst_row.total_gst or 0),
        total_grand_total=float(row.total_grand_total or 0)
    )


@router.get("/gstr1", response_model=GSTR1Report)
async def get_gstr1_report(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get GSTR-1 report (Outward supplies) for a date range.
    Groups sales by HSN code and GST rate.
    """
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())

    # Get all sale items in the date range
    # Note: SaleItem doesn't have hsn_code or GST breakdown fields in current schema
    # Using available fields: gst_rate, gst_amount, taxable_value
    result = await db.execute(
        select(
            SaleItem.gst_rate,
            func.sum(SaleItem.taxable_value).label("taxable_value"),
            func.sum(SaleItem.gst_amount).label("total_gst")
        ).join(Sale).where(
            Sale.created_at >= start_datetime,
            Sale.created_at <= end_datetime
        ).group_by(
            SaleItem.gst_rate
        )
    )
    items = result.all()

    gst_items = [
        GSTReportItem(
            hsn_code="",  # Not available in current schema
            gst_rate=item.gst_rate or 0,
            taxable_value=float(item.taxable_value or 0),
            cgst_amount=0.0,  # Not available in current schema
            sgst_amount=0.0,  # Not available in current schema
            igst_amount=0.0,  # Not available in current schema
            total_gst=float(item.total_gst or 0)
        )
        for item in items
    ]

    # Calculate totals
    total_taxable = sum(item.taxable_value for item in gst_items)
    total_cgst = sum(item.cgst_amount for item in gst_items)
    total_sgst = sum(item.sgst_amount for item in gst_items)
    total_igst = sum(item.igst_amount for item in gst_items)
    total_gst = sum(item.total_gst for item in gst_items)

    return GSTR1Report(
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        total_taxable_value=total_taxable,
        total_cgst=total_cgst,
        total_sgst=total_sgst,
        total_igst=total_igst,
        total_gst=total_gst,
        items=gst_items
    )


@router.get("/gstr3b", response_model=GSTR3BReport)
async def get_gstr3b_report(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get GSTR-3B report (Summary return) for a specific month.
    """
    # Define date range for the month
    start_date = date(year, month, 1)

    # Calculate last day of month
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)

    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.min.time())

    # Query aggregated data - using actual Sale model fields
    result = await db.execute(
        select(
            func.coalesce(func.sum(Sale.total_amount), 0).label("taxable_supplies"),
            func.coalesce(func.sum(Sale.tax_amount), 0).label("total_tax")
        ).where(
            Sale.created_at >= start_datetime,
            Sale.created_at < end_datetime
        )
    )
    row = result.first()

    return GSTR3BReport(
        month=month,
        year=year,
        outward_taxable_supplies=float(row.taxable_supplies or 0),
        outward_cgst=0.0,  # Not available in current schema
        outward_sgst=0.0,  # Not available in current schema
        outward_igst=0.0,  # Not available in current schema
        total_tax=float(row.total_tax or 0)
    )


@router.get("/monthly", response_model=MonthlySalesReport)
async def get_monthly_sales_report(
    year: int = Query(..., ge=2000, le=2100, description="Year"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get monthly sales summary for a specific month.
    
    Returns:
    - Total number of sales
    - Total amount (subtotal)
    - Total tax
    - Grand total
    """
    # Define date range for the month
    start_date = date(year, month, 1)
    
    # Calculate last day of month
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.min.time())
    
    # Query aggregated data - using actual Sale model fields
    result = await db.execute(
        select(
            func.count(Sale.id).label("total_sales_count"),
            func.coalesce(func.sum(Sale.total_amount), 0).label("total_amount"),
            func.coalesce(func.sum(Sale.tax_amount), 0).label("total_tax"),
            func.coalesce(func.sum(Sale.net_amount), 0).label("total_grand_total")
        ).where(
            Sale.created_at >= start_datetime,
            Sale.created_at < end_datetime
        )
    )
    row = result.first()

    # Calculate GST from SaleItems
    gst_result = await db.execute(
        select(
            func.coalesce(func.sum(SaleItem.gst_amount), 0).label("total_gst")
        ).join(Sale).where(
            Sale.created_at >= start_datetime,
            Sale.created_at < end_datetime
        )
    )
    gst_row = gst_result.first()

    return MonthlySalesReport(
        year=year,
        month=month,
        total_sales_count=row.total_sales_count or 0,
        total_amount=float(row.total_amount or 0),
        total_tax=float(row.total_tax or 0),
        total_cgst=0.0,  # Not available in current schema
        total_sgst=0.0,  # Not available in current schema
        total_igst=0.0,  # Not available in current schema
        total_gst=float(gst_row.total_gst or 0),
        total_grand_total=float(row.total_grand_total or 0)
    )

