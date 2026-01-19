"""
Sales router for creating and managing sales transactions.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, cast, Date
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
from app.schemas import SaleNewCreate, SaleNewRead, SaleNewWithItems, SaleNewUpdate
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
            
            # Get GST rate from product's HSN code
            from app.utils.gst_lookup import get_gst_rate_from_hsn
            gst_rate = Decimal(str(get_gst_rate_from_hsn(variant.product.hsn_code)))
            
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

        # Auto-generate invoice number if not provided
        invoice_number = sale_data.invoice_number
        # Handle both None and empty string cases - normalize empty strings to None
        if invoice_number is None or (isinstance(invoice_number, str) and invoice_number.strip() == ''):
            # Get the count of sales for today to generate sequential number
            today = sale_data.invoice_date
            result = await db.execute(
                select(func.count(Sale.id))
                .where(cast(Sale.invoice_date, Date) == today)
            )
            today_count = result.scalar() or 0
            # Format: INV-YYYYMMDD-XXX (e.g., INV-20251228-001)
            invoice_number = f"INV-{today.strftime('%Y%m%d')}-{str(today_count + 1).zfill(3)}"
            logger.info(f"Auto-generated invoice number: {invoice_number} for date {today}")

        # Create Sale record
        sale = Sale(
            invoice_number=invoice_number,
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
        .options(selectinload(Sale.items).selectinload(SaleItem.product_variant).selectinload(ProductVariant.product))
        .options(selectinload(Sale.customer))
        .where(Sale.id == sale_id)
    )
    sale = result.scalar_one_or_none()
    
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found"
        )
    
    # Populate product_name on product_variants for proper serialization
    for item in sale.items:
        if item.product_variant and item.product_variant.product:
            item.product_variant.product_name = item.product_variant.product.name
    
    return sale


@router.put("/{sale_id}", response_model=SaleNewWithItems)
async def update_sale(
    sale_id: UUID = Path(..., description="Sale ID"),
    sale_data: SaleNewUpdate = ...,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update an existing sale transaction.
    
    - Updates sale header information
    - Replaces all items if items are provided
    - Recalculates totals including GST
    """
    try:
        # Get existing sale with items
        result = await db.execute(
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.id == sale_id)
        )
        sale = result.scalar_one_or_none()
        
        if not sale:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )
        
        update_data = sale_data.model_dump(exclude_unset=True)
        
        # If items are being updated, we need to recalculate everything
        if 'items' in update_data and update_data['items']:
            # Delete existing items
            for item in sale.items:
                await db.delete(item)
            await db.flush()
            
            # Fetch product variants for new items
            variant_ids = [item['product_variant_id'] for item in update_data['items']]
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
            
            variant_map = {v.id: v for v in variants}
            
            # Calculate totals with GST
            total_amount = Decimal(0)
            total_tax = Decimal(0)
            sale_items_data = []
            
            for item_data in update_data['items']:
                variant = variant_map[item_data['product_variant_id']]
                
                unit_price = variant.selling_price or variant.mrp or Decimal(0)
                if unit_price == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Product variant '{variant.variant_name}' has no price set"
                    )
                
                # Get GST rate from product's HSN code
                from app.utils.gst_lookup import get_gst_rate_from_hsn
                gst_rate = Decimal(str(get_gst_rate_from_hsn(variant.product.hsn_code)))
                
                quantity = Decimal(str(item_data['quantity']))
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
            
            # Create new sale items
            for item_data in sale_items_data:
                sale_item = SaleItem(sale_id=sale.id, **item_data)
                db.add(sale_item)
            
            # Update calculated fields
            discount_amount = Decimal(str(update_data.get('discount_amount', sale.discount_amount)))
            net_amount = total_amount + total_tax - discount_amount
            
            amount_cash = Decimal(str(update_data.get('amount_cash', sale.amount_cash)))
            amount_upi = Decimal(str(update_data.get('amount_upi', sale.amount_upi)))
            amount_card = Decimal(str(update_data.get('amount_card', sale.amount_card)))
            amount_credit = Decimal(str(update_data.get('amount_credit', sale.amount_credit)))
            total_paid = amount_cash + amount_upi + amount_card
            balance_due = net_amount - total_paid
            
            # Update sale fields
            sale.total_amount = float(total_amount)
            sale.discount_amount = float(discount_amount)
            sale.tax_amount = float(total_tax)
            sale.net_amount = float(net_amount)
            sale.amount_cash = float(amount_cash)
            sale.amount_upi = float(amount_upi)
            sale.amount_card = float(amount_card)
            sale.amount_credit = float(amount_credit)
            sale.total_paid = float(total_paid)
            sale.balance_due = float(balance_due)
        else:
            # Only update header fields, recalculate payment totals
            amount_cash = Decimal(str(update_data.get('amount_cash', sale.amount_cash)))
            amount_upi = Decimal(str(update_data.get('amount_upi', sale.amount_upi)))
            amount_card = Decimal(str(update_data.get('amount_card', sale.amount_card)))
            amount_credit = Decimal(str(update_data.get('amount_credit', sale.amount_credit)))
            total_paid = amount_cash + amount_upi + amount_card
            balance_due = sale.net_amount - total_paid
            
            sale.amount_cash = float(amount_cash)
            sale.amount_upi = float(amount_upi)
            sale.amount_card = float(amount_card)
            sale.amount_credit = float(amount_credit)
            sale.total_paid = float(total_paid)
            sale.balance_due = float(balance_due)
        
        # Update other fields
        if 'invoice_number' in update_data:
            sale.invoice_number = update_data['invoice_number']
        if 'invoice_date' in update_data:
            sale.invoice_date = update_data['invoice_date']
        if 'invoice_time' in update_data:
            sale.invoice_time = update_data['invoice_time']
        if 'customer_id' in update_data:
            sale.customer_id = update_data['customer_id']
        if 'channel' in update_data:
            sale.channel = update_data['channel']
        if 'discount_amount' in update_data and 'items' not in update_data:
            # Recalculate net_amount if discount changed but items didn't
            sale.discount_amount = float(update_data['discount_amount'])
            sale.net_amount = sale.total_amount + sale.tax_amount - sale.discount_amount
            sale.balance_due = sale.net_amount - sale.total_paid
        if 'remarks' in update_data:
            sale.remarks = update_data['remarks']
        
        await db.commit()
        await db.refresh(sale)
        
        # Load relationships for response
        await db.refresh(sale, ["items", "customer"])
        for item in sale.items:
            await db.refresh(item, ["product_variant"])
            if item.product_variant and item.product_variant.product:
                item.product_variant.product_name = item.product_variant.product.name
        
        return sale
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating sale: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating sale: {str(e)}"
        )


@router.get("", response_model=List[SaleNewWithItems])
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
    Includes items and customer relationships.
    """
    query = select(Sale).options(
        selectinload(Sale.items).selectinload(SaleItem.product_variant).selectinload(ProductVariant.product),
        selectinload(Sale.customer)
    )
    
    # Date range filtering - use invoice_date if available, otherwise created_at
    if start_date:
        query = query.where(Sale.invoice_date >= start_date)
    if end_date:
        query = query.where(Sale.invoice_date <= end_date)
    
    # Order by most recent first (use invoice_date if available)
    query = query.order_by(Sale.invoice_date.desc().nullslast(), Sale.created_at.desc())
    
    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    sales = result.scalars().unique().all()
    
    # Populate product_name on product_variants for proper serialization
    for sale in sales:
        for item in sale.items:
            if item.product_variant and item.product_variant.product:
                item.product_variant.product_name = item.product_variant.product.name
    
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
        
        # Try reading with header in row 3 (for Paytm POS format)
        # First try row 3, then fallback to row 0
        df = None
        header_row = None
        
        for row_num in [2, 0]:  # Try row 3 (0-indexed = 2), then row 1 (0-indexed = 0)
            try:
                df = pd.read_excel(io.BytesIO(contents), header=row_num)
                # Check if we got meaningful column names
                if df.columns.tolist() and not all('unnamed' in str(col).lower() for col in df.columns):
                    header_row = row_num
                    break
            except:
                continue
        
        # If still no good header, try reading without header and manually set
        if df is None or all('unnamed' in str(col).lower() for col in df.columns):
            df = pd.read_excel(io.BytesIO(contents), header=None)
            # Try to find header row by checking first few rows
            for row_idx in range(min(5, len(df))):
                row_values = df.iloc[row_idx].astype(str).str.lower().tolist()
                # Check if this row looks like headers (contains common header words)
                header_keywords = ['date', 'invoice', 'item', 'quantity', 'price', 'amount']
                if any(keyword in ' '.join(row_values) for keyword in header_keywords):
                    df.columns = df.iloc[row_idx]
                    df = df.iloc[row_idx + 1:].reset_index(drop=True)
                    break
        
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file is empty or could not be parsed"
            )
        
        # Normalize column names (case-insensitive, remove spaces, handle special chars)
        df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(' ', '_').str.replace('.', '').str.replace('/', '_').str.replace('\\', '_')
        
        # Remove rows that are completely empty or have all NaN values
        df = df.dropna(how='all')
        
        logger.info(f"Importing sales from Excel file: {file.filename}, {len(df)} rows, columns: {list(df.columns)}")
        
        # Map common column name variations (including Paytm POS specific)
        column_mapping = {
            'invoice_number': ['invoice_number', 'invoice_no', 'invoice', 'invoice_id', 'bill_no', 'invoice_no_txn_no', 'txn_no', 'invoice_no_txn_no'],
            'date': ['date', 'invoice_date', 'transaction_date', 'sale_date', 'bill_date'],
            'time': ['time', 'invoice_time', 'transaction_time', 'sale_time'],
            'product_name': ['product_name', 'item_name', 'product', 'item', 'description'],
            'sku': ['sku', 'product_code', 'barcode', 'code', 'item_code'],
            'quantity': ['quantity', 'qty', 'qty.', 'count'],
            'price': ['price', 'unit_price', 'rate', 'unit_rate', 'unitprice'],
            'total': ['total', 'amount', 'line_total', 'item_total'],
            'payment_method': ['payment_method', 'payment_type', 'payment', 'pay_mode', 'transaction_type'],
            'customer': ['customer', 'customer_name', 'customer_id', 'party_name']
        }
        
        # Find actual column names (fuzzy matching for variations)
        actual_columns = {}
        for key, variations in column_mapping.items():
            for col in df.columns:
                col_normalized = col.lower().strip()
                # Exact match
                if col_normalized in variations:
                    actual_columns[key] = col
                    break
                # Partial match (for cases like "invoice_no_txn_no")
                for variation in variations:
                    if variation.replace('_', '') in col_normalized.replace('_', '') or col_normalized.replace('_', '') in variation.replace('_', ''):
                        actual_columns[key] = col
                        break
                if key in actual_columns:
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
                # Check Party Name for payment hints (e.g., "Cash Sale")
                party_name = None
                if 'customer' in actual_columns:
                    party_name = str(rows[0][actual_columns['customer']]).strip().lower() if rows[0][actual_columns['customer']] else None
                
                amount_cash = Decimal(0)
                amount_upi = Decimal(0)
                amount_card = Decimal(0)
                amount_credit = Decimal(0)
                
                # Determine payment method from Transaction Type or Party Name
                payment_hint = None
                if payment_method:
                    payment_hint = payment_method
                elif party_name:
                    payment_hint = party_name
                
                if payment_hint:
                    if 'cash' in payment_hint or 'cash sale' in payment_hint:
                        amount_cash = total_amount
                    elif 'upi' in payment_hint or 'paytm' in payment_hint:
                        amount_upi = total_amount
                    elif 'card' in payment_hint or 'debit' in payment_hint:
                        amount_card = total_amount
                    elif 'credit' in payment_hint:
                        amount_credit = total_amount
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
