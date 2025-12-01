"""
Sales router for creating and managing sales transactions.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models import User, ProductVariant, Sale, SaleItem
from app.schemas import SaleNewCreate, SaleNewRead, SaleNewWithItems
from app.deps import get_current_active_user

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("", response_model=SaleNewWithItems, status_code=status.HTTP_201_CREATED)
async def create_sale(
    sale_data: SaleNewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new sale transaction.
    
    - Validates product variant availability
    - Calculates totals including GST
    - Creates Sale and SaleItem records in a transaction
    """
    if not sale_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale must contain at least one item"
        )
    
    try:
        # Fetch all product variants with their products and validate
        variant_ids = [item.product_variant_id for item in sale_data.items]
        result = await db.execute(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.id.in_(variant_ids))
        )
        variants = result.scalars().all()
        
        if len(variants) != len(variant_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more product variants not found"
            )
        
        # Create variant lookup
        variant_map = {v.id: v for v in variants}
        
        # Validate active status
        for item in sale_data.items:
            variant = variant_map[item.product_variant_id]
            
            if not variant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product variant '{variant.variant_name}' is not active"
                )
        
        # Calculate totals with GST
        total_amount = Decimal(0)
        total_tax = Decimal(0)
        sale_items_data = []

        for item in sale_data.items:
            variant = variant_map[item.product_variant_id]
            
            # Get selling price (use mrp if selling_price not set)
            unit_price = variant.selling_price or variant.mrp or Decimal(0)
            if unit_price == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product variant '{variant.variant_name}' has no price set"
                )
            
            # Get GST rate (default to 0 if not available)
            # Note: GST rate should be configured per product or product variant
            # For now, we'll use 0 or you can add a gst_rate field to ProductVariant
            gst_rate = Decimal(0)
            
            # Calculate line totals
            quantity = Decimal(str(item.quantity))
            taxable_value = unit_price * quantity
            gst_amount = taxable_value * (gst_rate / Decimal(100)) if gst_rate > 0 else Decimal(0)
            line_total = taxable_value + gst_amount
            
            total_amount += taxable_value
            total_tax += gst_amount

            sale_items_data.append({
                "product_variant_id": variant.id,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
                "gst_rate": gst_rate,
                "gst_amount": gst_amount,
                "taxable_value": taxable_value,
            })
        
        # Calculate net amount after discount
        discount_amount = Decimal(str(sale_data.discount_amount))
        net_amount = total_amount + total_tax - discount_amount
        
        # Calculate payment totals
        amount_cash = Decimal(str(sale_data.amount_cash))
        amount_upi = Decimal(str(sale_data.amount_upi))
        amount_card = Decimal(str(sale_data.amount_card))
        amount_credit = Decimal(str(sale_data.amount_credit))
        total_paid = amount_cash + amount_upi + amount_card
        balance_due = net_amount - total_paid

        # Create Sale record
        sale = Sale(
            invoice_number=sale_data.invoice_number,
            invoice_date=sale_data.invoice_date,
            invoice_time=sale_data.invoice_time,
            customer_id=sale_data.customer_id,
            channel=sale_data.channel,
            total_amount=float(total_amount),
            discount_amount=float(discount_amount),
            tax_amount=float(total_tax),
            net_amount=float(net_amount),
            amount_cash=float(amount_cash),
            amount_upi=float(amount_upi),
            amount_card=float(amount_card),
            amount_credit=float(amount_credit),
            total_paid=float(total_paid),
            balance_due=float(balance_due),
            remarks=sale_data.remarks,
        )
        db.add(sale)
        await db.flush()  # Get sale.id without committing
        
        # Create SaleItem records
        for item_data in sale_items_data:
            sale_item = SaleItem(sale_id=sale.id, **item_data)
            db.add(sale_item)
        
        await db.commit()
        await db.refresh(sale)
        
        # Load relationships for response
        await db.refresh(sale, ["items", "customer"])
        for item in sale.items:
            await db.refresh(item, ["product_variant"])
        
        return sale
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating sale: {str(e)}"
        )


@router.get("/{sale_id}", response_model=SaleNewWithItems)
async def get_sale(
    sale_id: UUID = Path(..., description="Sale ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific sale by ID with all items and details.
    """
    result = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items).selectinload(SaleItem.product_variant))
        .options(selectinload(Sale.customer))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    return sale


@router.get("", response_model=List[SaleNewRead])
async def list_sales(
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List sales with optional date range filtering and pagination.
    """
    query = select(Sale)
    
    # Date range filtering
    if start_date:
        start_datetime = datetime.combine(start_date, datetime.min.time())
        query = query.where(Sale.created_at >= start_datetime)
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time())
        query = query.where(Sale.created_at <= end_datetime)
    
    # Order by most recent first
    query = query.order_by(Sale.created_at.desc())
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    sales = result.scalars().all()
    
    return sales
