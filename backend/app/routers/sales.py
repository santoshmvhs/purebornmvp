"""
Sales router for creating and managing sales transactions.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, date, time
from uuid import UUID
from decimal import Decimal
import pandas as pd
import io
from collections import defaultdict

from app.database import get_db
from app.models import User, ProductVariant, Sale, SaleItem, Product
from app.schemas import SaleNewCreate, SaleNewRead, SaleNewWithItems
from app.deps import get_current_active_user
import logging

logger = logging.getLogger(__name__)

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


@router.post("/import-excel", status_code=status.HTTP_200_OK)
async def import_sales_from_excel(
    file: UploadFile = File(..., description="Excel file (.xlsx or .xls)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Import sales from Paytm POS Excel file.
    
    Expected Excel format (flexible column names):
    - Invoice Number / Invoice No / Invoice
    - Date / Invoice Date / Transaction Date
    - Time / Invoice Time (optional)
    - Product Name / Item Name / Product
    - SKU / Product Code / Barcode
    - Quantity / Qty
    - Price / Unit Price / Rate
    - Total / Amount
    - Payment Method / Payment Type (Cash/UPI/Card/Credit)
    - Customer Name / Customer (optional)
    
    The function will:
    1. Parse the Excel file
    2. Group rows by invoice number
    3. Match products by SKU, barcode, or name
    4. Create sales records with items
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)"
        )
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file is empty"
            )
        
        # Normalize column names (case-insensitive, remove spaces)
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        logger.info(f"Importing sales from Excel file: {file.filename}, {len(df)} rows")
        
        # Map common column name variations
        column_mapping = {
            'invoice_number': ['invoice_number', 'invoice_no', 'invoice', 'invoice_id', 'bill_no'],
            'date': ['date', 'invoice_date', 'transaction_date', 'sale_date', 'bill_date'],
            'time': ['time', 'invoice_time', 'transaction_time', 'sale_time'],
            'product_name': ['product_name', 'item_name', 'product', 'item', 'description'],
            'sku': ['sku', 'product_code', 'barcode', 'code', 'item_code'],
            'quantity': ['quantity', 'qty', 'qty.', 'amount'],
            'price': ['price', 'unit_price', 'rate', 'unit_rate'],
            'total': ['total', 'amount', 'line_total', 'item_total'],
            'payment_method': ['payment_method', 'payment_type', 'payment', 'pay_mode'],
            'customer': ['customer', 'customer_name', 'customer_id']
        }
        
        # Find actual column names
        actual_columns = {}
        for key, variations in column_mapping.items():
            for col in df.columns:
                if col in variations:
                    actual_columns[key] = col
                    break
        
        # Validate required columns
        required = ['invoice_number', 'date', 'product_name', 'quantity', 'price']
        missing = [col for col in required if col not in actual_columns]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {missing}. Found columns: {list(df.columns)}"
            )
        
        # Load all product variants for matching
        result = await db.execute(
            select(ProductVariant)
            .options(selectinload(ProductVariant.product))
            .where(ProductVariant.is_active == True)
        )
        all_variants = result.scalars().all()
        
        # Create lookup dictionaries
        variant_by_sku = {v.sku.lower(): v for v in all_variants if v.sku}
        variant_by_barcode = {v.barcode.lower(): v for v in all_variants if v.barcode}
        variant_by_name = {}
        for v in all_variants:
            # Try both variant name and product name
            if v.product:
                key = f"{v.product.name} {v.variant_name}".lower().strip()
                variant_by_name[key] = v
                variant_by_name[v.variant_name.lower().strip()] = v
                variant_by_name[v.product.name.lower().strip()] = v
        
        # Group rows by invoice number
        invoices = defaultdict(list)
        for _, row in df.iterrows():
            invoice_num = str(row[actual_columns['invoice_number']]).strip()
            invoices[invoice_num].append(row)
        
        logger.info(f"Found {len(invoices)} unique invoices")
        
        # Process each invoice
        created_sales = []
        errors = []
        skipped = []
        
        for invoice_num, rows in invoices.items():
            try:
                # Get invoice date (use first row's date)
                date_str = str(rows[0][actual_columns['date']])
                try:
                    if isinstance(rows[0][actual_columns['date']], pd.Timestamp):
                        invoice_date = rows[0][actual_columns['date']].date()
                    else:
                        invoice_date = pd.to_datetime(date_str).date()
                except:
                    invoice_date = date.today()
                    logger.warning(f"Could not parse date '{date_str}', using today's date")
                
                # Get invoice time if available
                invoice_time = None
                if 'time' in actual_columns:
                    time_str = str(rows[0][actual_columns['time']])
                    try:
                        if isinstance(rows[0][actual_columns['time']], pd.Timestamp):
                            invoice_time = rows[0][actual_columns['time']].time()
                        else:
                            invoice_time = pd.to_datetime(time_str).time()
                    except:
                        pass
                
                # Get payment method
                payment_method = None
                if 'payment_method' in actual_columns:
                    payment_method = str(rows[0][actual_columns['payment_method']]).lower()
                
                # Get customer if available
                customer_id = None
                if 'customer' in actual_columns:
                    customer_name = str(rows[0][actual_columns['customer']]).strip()
                    if customer_name and customer_name != 'nan':
                        # Try to find customer by name (you may want to add this lookup)
                        pass
                
                # Process items
                sale_items = []
                total_amount = Decimal(0)
                
                for row in rows:
                    # Try to match product
                    product_name = str(row[actual_columns['product_name']]).strip()
                    variant = None
                    
                    # Try SKU first
                    if 'sku' in actual_columns:
                        sku = str(row[actual_columns['sku']]).strip().lower()
                        if sku and sku != 'nan':
                            variant = variant_by_sku.get(sku)
                    
                    # Try barcode
                    if not variant and 'sku' in actual_columns:
                        barcode = str(row[actual_columns['sku']]).strip().lower()
                        if barcode and barcode != 'nan':
                            variant = variant_by_barcode.get(barcode)
                    
                    # Try name matching
                    if not variant:
                        name_key = product_name.lower().strip()
                        variant = variant_by_name.get(name_key)
                    
                    if not variant:
                        skipped.append({
                            'invoice': invoice_num,
                            'product': product_name,
                            'reason': 'Product not found'
                        })
                        continue
                    
                    # Get quantity and price
                    try:
                        qty = Decimal(str(row[actual_columns['quantity']]))
                        if 'total' in actual_columns:
                            total = Decimal(str(row[actual_columns['total']]))
                            unit_price = total / qty if qty > 0 else Decimal(0)
                        else:
                            unit_price = Decimal(str(row[actual_columns['price']]))
                            total = unit_price * qty
                    except:
                        skipped.append({
                            'invoice': invoice_num,
                            'product': product_name,
                            'reason': 'Invalid quantity or price'
                        })
                        continue
                    
                    sale_items.append({
                        'product_variant_id': variant.id,
                        'quantity': float(qty),
                        'unit_price': float(unit_price),
                        'line_total': float(total),
                        'gst_rate': 0,  # Default GST rate
                        'gst_amount': 0,
                        'taxable_value': float(total),
                    })
                    
                    total_amount += total
                
                if not sale_items:
                    skipped.append({
                        'invoice': invoice_num,
                        'reason': 'No valid items found'
                    })
                    continue
                
                # Calculate payment breakdown
                amount_cash = Decimal(0)
                amount_upi = Decimal(0)
                amount_card = Decimal(0)
                amount_credit = Decimal(0)
                
                if payment_method:
                    if 'cash' in payment_method:
                        amount_cash = total_amount
                    elif 'upi' in payment_method or 'paytm' in payment_method:
                        amount_upi = total_amount
                    elif 'card' in payment_method or 'debit' in payment_method or 'credit' in payment_method:
                        if 'credit' in payment_method:
                            amount_credit = total_amount
                        else:
                            amount_card = total_amount
                    else:
                        # Default to cash if unknown
                        amount_cash = total_amount
                else:
                    # Default to cash
                    amount_cash = total_amount
                
                total_paid = amount_cash + amount_upi + amount_card
                balance_due = total_amount - total_paid
                
                # Create sale
                sale = Sale(
                    invoice_number=invoice_num if invoice_num != 'nan' else None,
                    invoice_date=invoice_date,
                    invoice_time=invoice_time,
                    customer_id=customer_id,
                    channel='store',  # Paytm POS is typically store sales
                    total_amount=float(total_amount),
                    discount_amount=0,
                    tax_amount=0,
                    net_amount=float(total_amount),
                    amount_cash=float(amount_cash),
                    amount_upi=float(amount_upi),
                    amount_card=float(amount_card),
                    amount_credit=float(amount_credit),
                    total_paid=float(total_paid),
                    balance_due=float(balance_due),
                    remarks=f"Imported from Paytm POS Excel: {file.filename}",
                )
                db.add(sale)
                await db.flush()
                
                # Create sale items
                for item_data in sale_items:
                    sale_item = SaleItem(
                        sale_id=sale.id,
                        product_variant_id=item_data['product_variant_id'],
                        quantity=item_data['quantity'],
                        unit_price=item_data['unit_price'],
                        line_total=item_data['line_total'],
                        gst_rate=item_data['gst_rate'],
                        gst_amount=item_data['gst_amount'],
                        taxable_value=item_data['taxable_value'],
                    )
                    db.add(sale_item)
                
                await db.commit()
                await db.refresh(sale)
                created_sales.append({
                    'invoice_number': sale.invoice_number,
                    'date': str(sale.invoice_date),
                    'items_count': len(sale_items),
                    'total_amount': float(sale.total_amount),
                })
                
            except Exception as e:
                await db.rollback()
                error_msg = f"Invoice {invoice_num}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
        
        return {
            'success': True,
            'created': len(created_sales),
            'skipped': len(skipped),
            'errors': len(errors),
            'sales': created_sales,
            'skipped_details': skipped[:10],  # Limit to first 10
            'error_details': errors[:10],  # Limit to first 10
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing Excel file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing Excel file: {str(e)}"
        )
