"""
Purchases router for managing purchase transactions (async).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models import User, Purchase, PurchaseItem, Vendor, RawMaterial, InventoryMovement
from app.schemas import PurchaseCreate, PurchaseRead, PurchaseWithItems, PurchaseItemRead
from app.deps import get_current_active_user

router = APIRouter(prefix="/purchases", tags=["Purchases"])


@router.post("", response_model=PurchaseWithItems, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    purchase_data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new purchase transaction.
    
    - Creates purchase and purchase items
    - Updates inventory movements (stock IN)
    - Calculates totals and GST
    """
    if not purchase_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase must contain at least one item"
        )
    
    try:
        # Validate vendor exists
        vendor_result = await db.execute(
            select(Vendor).where(Vendor.id == purchase_data.vendor_id)
        )
        vendor = vendor_result.scalar_one_or_none()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        # Compute totals
        total_amount = Decimal("0")
        purchase_items: List[PurchaseItem] = []
        
        for item in purchase_data.items:
            # Validate raw material if provided
            if item.raw_material_id:
                raw_material_result = await db.execute(
                    select(RawMaterial).where(RawMaterial.id == item.raw_material_id)
                )
                raw_material = raw_material_result.scalar_one_or_none()
                if not raw_material:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Raw material not found: {item.raw_material_id}"
                    )
            
            # Calculate line totals
            qty = Decimal(str(item.quantity))
            price = Decimal(str(item.price_per_unit))
            gst_rate = Decimal(str(item.gst_rate)) if item.gst_rate else Decimal("0")
            
            line_total = qty * price
            
            # Calculate GST (assuming GST is included in price)
            # If GST rate is provided, calculate taxable value and GST amount
            if gst_rate > 0:
                # GST is included in price, so extract it
                taxable_value = line_total / (Decimal("1") + (gst_rate / Decimal("100")))
                gst_amount = line_total - taxable_value
            else:
                taxable_value = line_total
                gst_amount = Decimal("0")
            
            total_amount += line_total
            
            purchase_items.append(
                PurchaseItem(
                    raw_material_id=item.raw_material_id,
                    description=item.description,
                    quantity=qty,
                    unit=item.unit,
                    price_per_unit=price,
                    line_total=line_total,
                    gst_rate=gst_rate,
                    gst_amount=gst_amount,
                    taxable_value=taxable_value,
                )
            )
        
        # Calculate payment totals
        amount_cash = Decimal(str(purchase_data.amount_cash))
        amount_upi = Decimal(str(purchase_data.amount_upi))
        amount_card = Decimal(str(purchase_data.amount_card))
        amount_credit = Decimal(str(purchase_data.amount_credit))
        
        total_paid = amount_cash + amount_upi + amount_card
        balance_due = total_amount - total_paid + amount_credit
        
        # Create Purchase record
        purchase = Purchase(
            invoice_number=purchase_data.invoice_number,
            invoice_date=purchase_data.invoice_date,
            vendor_id=purchase_data.vendor_id,
            purchase_category=purchase_data.purchase_category,
            total_amount=total_amount,
            amount_cash=amount_cash,
            amount_upi=amount_upi,
            amount_card=amount_card,
            amount_credit=amount_credit,
            total_paid=total_paid,
            balance_due=balance_due,
            notes=purchase_data.notes,
        )
        
        db.add(purchase)
        await db.flush()  # Get purchase.id
        
        # Attach items to purchase
        for pi in purchase_items:
            pi.purchase_id = purchase.id
            db.add(pi)
            await db.flush()  # Get purchase_item.id
            
            # Create inventory movement (stock IN for raw materials)
            if pi.raw_material_id:
                inventory_movement = InventoryMovement(
                    item_type="raw_material",
                    item_id=pi.raw_material_id,
                    quantity_change=pi.quantity,
                    unit=pi.unit,
                    cost_per_unit=pi.price_per_unit,
                    total_cost=pi.line_total,
                    reference_type="purchase",
                    reference_id=purchase.id,
                )
                db.add(inventory_movement)
        
        await db.commit()
        
        # Refresh to load relationships
        await db.refresh(purchase, ["vendor", "items"])
        
        return purchase
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("", response_model=List[PurchaseWithItems])
async def list_purchases(
    vendor_id: Optional[UUID] = Query(None, description="Filter by vendor"),
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List purchases with optional filtering."""
    query = select(Purchase).options(selectinload(Purchase.vendor), selectinload(Purchase.items).selectinload(PurchaseItem.raw_material))
    
    if vendor_id:
        query = query.where(Purchase.vendor_id == vendor_id)
    
    if start_date:
        query = query.where(Purchase.invoice_date >= start_date)
    if end_date:
        query = query.where(Purchase.invoice_date <= end_date)
    
    query = query.order_by(Purchase.invoice_date.desc(), Purchase.created_at.desc())
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    purchases = result.scalars().unique().all()
    
    return purchases


@router.get("/{purchase_id}", response_model=PurchaseWithItems)
async def get_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific purchase by ID with all items."""
    result = await db.execute(
        select(Purchase)
        .options(
            selectinload(Purchase.vendor), 
            selectinload(Purchase.items).selectinload(PurchaseItem.raw_material)
        )
        .where(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    return purchase


@router.put("/{purchase_id}", response_model=PurchaseWithItems)
async def update_purchase(
    purchase_id: UUID,
    purchase_data: PurchaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing purchase transaction.
    
    Note: This will reverse existing inventory movements and create new ones.
    """
    # Get existing purchase
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    if not purchase_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase must contain at least one item"
        )
    
    try:
        # Reverse existing inventory movements
        for item in purchase.items:
            if item.raw_material_id:
                inv_result = await db.execute(
                    select(InventoryMovement).where(
                        and_(
                            InventoryMovement.reference_type == "purchase",
                            InventoryMovement.reference_id == purchase.id,
                            InventoryMovement.item_type == "raw_material",
                            InventoryMovement.item_id == item.raw_material_id
                        )
                    )
                )
                inv_movements = inv_result.scalars().all()
                for inv in inv_movements:
                    await db.delete(inv)
        
        # Delete existing items
        for item in purchase.items:
            await db.delete(item)
        
        await db.flush()
        
        # Validate vendor exists
        vendor_result = await db.execute(
            select(Vendor).where(Vendor.id == purchase_data.vendor_id)
        )
        vendor = vendor_result.scalar_one_or_none()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
        
        # Compute new totals (same logic as create)
        total_amount = Decimal("0")
        purchase_items: List[PurchaseItem] = []
        
        for item in purchase_data.items:
            if item.raw_material_id:
                raw_material_result = await db.execute(
                    select(RawMaterial).where(RawMaterial.id == item.raw_material_id)
                )
                raw_material = raw_material_result.scalar_one_or_none()
                if not raw_material:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Raw material not found: {item.raw_material_id}"
                    )
            
            qty = Decimal(str(item.quantity))
            price = Decimal(str(item.price_per_unit))
            gst_rate = Decimal(str(item.gst_rate)) if item.gst_rate else Decimal("0")
            
            line_total = qty * price
            
            if gst_rate > 0:
                taxable_value = line_total / (Decimal("1") + (gst_rate / Decimal("100")))
                gst_amount = line_total - taxable_value
            else:
                taxable_value = line_total
                gst_amount = Decimal("0")
            
            total_amount += line_total
            
            purchase_items.append(
                PurchaseItem(
                    raw_material_id=item.raw_material_id,
                    description=item.description,
                    quantity=qty,
                    unit=item.unit,
                    price_per_unit=price,
                    line_total=line_total,
                    gst_rate=gst_rate,
                    gst_amount=gst_amount,
                    taxable_value=taxable_value,
                )
            )
        
        amount_cash = Decimal(str(purchase_data.amount_cash))
        amount_upi = Decimal(str(purchase_data.amount_upi))
        amount_card = Decimal(str(purchase_data.amount_card))
        amount_credit = Decimal(str(purchase_data.amount_credit))
        
        total_paid = amount_cash + amount_upi + amount_card
        balance_due = total_amount - total_paid + amount_credit
        
        # Update purchase
        purchase.invoice_number = purchase_data.invoice_number
        purchase.invoice_date = purchase_data.invoice_date
        purchase.vendor_id = purchase_data.vendor_id
        purchase.purchase_category = purchase_data.purchase_category
        purchase.total_amount = total_amount
        purchase.amount_cash = amount_cash
        purchase.amount_upi = amount_upi
        purchase.amount_card = amount_card
        purchase.amount_credit = amount_credit
        purchase.total_paid = total_paid
        purchase.balance_due = balance_due
        purchase.notes = purchase_data.notes
        
        # Add new items
        for pi in purchase_items:
            pi.purchase_id = purchase.id
            db.add(pi)
            await db.flush()
            
            # Create inventory movement
            if pi.raw_material_id:
                inventory_movement = InventoryMovement(
                    item_type="raw_material",
                    item_id=pi.raw_material_id,
                    quantity_change=pi.quantity,
                    unit=pi.unit,
                    cost_per_unit=pi.price_per_unit,
                    total_cost=pi.line_total,
                    reference_type="purchase",
                    reference_id=purchase.id,
                )
                db.add(inventory_movement)
        
        await db.commit()
        
        # Refresh to load relationships
        await db.refresh(purchase, ["vendor", "items"])
        
        return purchase
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_purchase(
    purchase_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Delete a purchase transaction.
    
    Warning: This will reverse all inventory movements associated with this purchase.
    """
    result = await db.execute(
        select(Purchase)
        .options(selectinload(Purchase.items))
        .where(Purchase.id == purchase_id)
    )
    purchase = result.scalar_one_or_none()
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    try:
        # Reverse inventory movements
        for item in purchase.items:
            if item.raw_material_id:
                inv_result = await db.execute(
                    select(InventoryMovement).where(
                        and_(
                            InventoryMovement.reference_type == "purchase",
                            InventoryMovement.reference_id == purchase.id,
                            InventoryMovement.item_type == "raw_material",
                            InventoryMovement.item_id == item.raw_material_id
                        )
                    )
                )
                inv_movements = inv_result.scalars().all()
                for inv in inv_movements:
                    await db.delete(inv)
        
        # Delete purchase (items will be deleted via cascade)
        await db.delete(purchase)
        await db.commit()
        
        return None
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
