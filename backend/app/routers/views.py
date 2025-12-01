"""
Views router for querying database views (inventory, balances, GST summaries).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from uuid import UUID

from app.database import get_db
from app.models import User
from app.schemas import (
    RawMaterialStock, ProductVariantStock,
    VendorBalance, CustomerBalance,
    SalesGSTSummary, PurchaseGSTSummary
)
from app.deps import get_current_active_user

router = APIRouter(prefix="/views", tags=["Views"])


@router.get("/inventory/raw-materials", response_model=List[RawMaterialStock])
async def get_raw_material_stock(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current stock for all raw materials with pagination."""
    offset = (page - 1) * limit
    query = f"SELECT * FROM public.raw_material_current_stock ORDER BY raw_material_name LIMIT :limit OFFSET :offset"
    result = await db.execute(text(query), {"limit": limit, "offset": offset})
    rows = result.fetchall()
    return [
        RawMaterialStock(
            raw_material_id=row.raw_material_id,
            raw_material_name=row.raw_material_name,
            unit=row.unit,
            current_stock=float(row.current_stock),
            total_cost_value=float(row.total_cost_value)
        )
        for row in rows
    ]


@router.get("/inventory/product-variants", response_model=List[ProductVariantStock])
async def get_product_variant_stock(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current stock for all product variants with pagination."""
    offset = (page - 1) * limit
    query = f"SELECT * FROM public.product_variant_current_stock ORDER BY product_name, variant_name LIMIT :limit OFFSET :offset"
    result = await db.execute(text(query), {"limit": limit, "offset": offset})
    rows = result.fetchall()
    return [
        ProductVariantStock(
            product_variant_id=row.product_variant_id,
            product_name=row.product_name,
            variant_name=row.variant_name,
            sku=row.sku,
            channel=row.channel,
            mrp=float(row.mrp) if row.mrp else None,
            selling_price=float(row.selling_price) if row.selling_price else None,
            current_stock=float(row.current_stock),
            total_cost_value=float(row.total_cost_value)
        )
        for row in rows
    ]


@router.get("/balances/vendors", response_model=List[VendorBalance])
async def get_vendor_balances(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get outstanding balances for all vendors with pagination."""
    offset = (page - 1) * limit
    query = f"SELECT * FROM public.vendor_balances ORDER BY name LIMIT :limit OFFSET :offset"
    result = await db.execute(text(query), {"limit": limit, "offset": offset})
    rows = result.fetchall()
    return [
        VendorBalance(
            vendor_id=row.vendor_id,
            name=row.name,
            phone=row.phone,
            gst_number=row.gst_number,
            total_purchase_amount=float(row.total_purchase_amount),
            total_purchase_paid=float(row.total_purchase_paid),
            total_purchase_balance=float(row.total_purchase_balance),
            total_expense_amount=float(row.total_expense_amount),
            total_expense_paid=float(row.total_expense_paid),
            total_expense_balance=float(row.total_expense_balance),
            grand_total_balance_due=float(row.grand_total_balance_due)
        )
        for row in rows
    ]


@router.get("/balances/customers", response_model=List[CustomerBalance])
async def get_customer_balances(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get outstanding balances for all customers with pagination."""
    offset = (page - 1) * limit
    query = f"SELECT * FROM public.customer_balances ORDER BY name LIMIT :limit OFFSET :offset"
    result = await db.execute(text(query), {"limit": limit, "offset": offset})
    rows = result.fetchall()
    return [
        CustomerBalance(
            customer_id=row.customer_id,
            name=row.name,
            phone=row.phone,
            gst_number=row.gst_number,
            total_billed=float(row.total_billed),
            total_paid=float(row.total_paid),
            total_balance_due=float(row.total_balance_due)
        )
        for row in rows
    ]


@router.get("/gst/sales", response_model=List[SalesGSTSummary])
async def get_sales_gst_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get GST summary for sales invoices with pagination."""
    query = "SELECT * FROM public.sales_gst_summary WHERE 1=1"
    params = {}
    
    if start_date:
        query += " AND invoice_date >= :start_date"
        params["start_date"] = start_date
    if end_date:
        query += " AND invoice_date <= :end_date"
        params["end_date"] = end_date
    
    query += " ORDER BY invoice_date DESC"
    
    # Pagination
    offset = (page - 1) * limit
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    return [
        SalesGSTSummary(
            sale_id=row.sale_id,
            invoice_number=row.invoice_number,
            invoice_date=row.invoice_date,
            channel=row.channel,
            customer_name=row.customer_name,
            total_taxable_value=float(row.total_taxable_value),
            total_gst_amount=float(row.total_gst_amount),
            total_invoice_amount=float(row.total_invoice_amount)
        )
        for row in rows
    ]


@router.get("/gst/purchases", response_model=List[PurchaseGSTSummary])
async def get_purchase_gst_summary(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get GST summary for purchase invoices with pagination."""
    query = "SELECT * FROM public.purchase_gst_summary WHERE 1=1"
    params = {}
    
    if start_date:
        query += " AND invoice_date >= :start_date"
        params["start_date"] = start_date
    if end_date:
        query += " AND invoice_date <= :end_date"
        params["end_date"] = end_date
    
    query += " ORDER BY invoice_date DESC"
    
    # Pagination
    offset = (page - 1) * limit
    query += " LIMIT :limit OFFSET :offset"
    params["limit"] = limit
    params["offset"] = offset
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    return [
        PurchaseGSTSummary(
            purchase_id=row.purchase_id,
            invoice_number=row.invoice_number,
            invoice_date=row.invoice_date,
            vendor_name=row.vendor_name,
            total_taxable_value=float(row.total_taxable_value),
            total_gst_amount=float(row.total_gst_amount),
            total_invoice_amount=float(row.total_invoice_amount)
        )
        for row in rows
    ]

