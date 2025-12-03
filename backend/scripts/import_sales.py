#!/usr/bin/env python3
"""
Script to import sales from Excel file directly.
Usage: python scripts/import_sales.py <excel_file_path> [--delete-first]
"""
import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set environment variable to skip validation during script execution
os.environ['ALEMBIC_CONTEXT'] = 'true'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select, delete
from app.database import get_db
from app.models import Sale, SaleItem, ProductVariant, Product
from app.config import settings
from decimal import Decimal
from datetime import date, time
from collections import defaultdict
import logging

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    print("Warning: pandas not available. Install with: pip install pandas openpyxl")
    sys.exit(1)

try:
    from openpyxl import load_workbook
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


async def delete_all_sales(db: AsyncSession):
    """Delete all sales and sale items."""
    
    # Count before deletion
    result = await db.execute(select(Sale))
    sale_count = len(result.scalars().all())
    
    result = await db.execute(select(SaleItem))
    item_count = len(result.scalars().all())
    
    if sale_count == 0 and item_count == 0:
        print("No sales or sale items to delete.")
        return 0, 0
    
    print(f"\nDeleting {sale_count} sales and {item_count} sale items...")
    
    # Delete sale items first (due to foreign key constraint)
    await db.execute(delete(SaleItem))
    
    # Delete sales
    await db.execute(delete(Sale))
    
    await db.commit()
    
    print(f"✓ Deleted {sale_count} sales and {item_count} sale items\n")
    return sale_count, item_count


async def import_sales_from_excel(file_path: str, db: AsyncSession):
    """Import sales from Excel file."""
    
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        return
    
    if not file_path.endswith(('.xlsx', '.xls')):
        print(f"Error: File must be an Excel file (.xlsx or .xls)")
        return
    
    try:
        # Read Excel file
        if HAS_PANDAS:
            # Try reading with header in row 3 (for Paytm POS format)
            # First try row 3, then fallback to row 0
            df = None
            header_row = None
            
            # Try different header rows - Paytm POS often has headers in row 2 or 3
            for row_num in [2, 1, 0]:  # Try row 3, 2, then 1 (0-indexed)
                try:
                    df_test = pd.read_excel(file_path, header=row_num)
                    # Check if we got meaningful column names
                    cols = df_test.columns.tolist()
                    if cols and not all('unnamed' in str(col).lower() for col in cols):
                        # Check if columns contain header keywords
                        col_str = ' '.join([str(c).lower() for c in cols])
                        header_keywords = ['date', 'invoice', 'item', 'quantity', 'price', 'amount', 'qty']
                        if any(keyword in col_str for keyword in header_keywords):
                            df = df_test
                            header_row = row_num
                            break
                except Exception as e:
                    continue
            
            # If still no good header, try reading without header and manually set
            if df is None or all('unnamed' in str(col).lower() for col in df.columns):
                df = pd.read_excel(file_path, header=None)
                # Try to find header row by checking first few rows
                for row_idx in range(min(10, len(df))):
                    row_values = df.iloc[row_idx].astype(str).str.lower().tolist()
                    row_str = ' '.join(row_values)
                    # Check if this row looks like headers (contains common header words)
                    header_keywords = ['date', 'invoice', 'item', 'quantity', 'price', 'amount', 'qty', 'product']
                    if any(keyword in row_str for keyword in header_keywords):
                        df.columns = df.iloc[row_idx]
                        df = df.iloc[row_idx + 1:].reset_index(drop=True)
                        print(f"Found header row at index {row_idx}")
                        break
            
            if df.empty:
                print("Error: Excel file is empty or could not be parsed")
                return
            
            # Normalize column names (case-insensitive, remove spaces, handle special chars)
            df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(' ', '_').str.replace('.', '').str.replace('/', '_').str.replace('\\', '_')
            
            # Remove rows that are completely empty or have all NaN values
            df = df.dropna(how='all')
        else:
            print("Error: pandas is required for sales import")
            return
        
        print(f"Importing sales from: {file_path}")
        print(f"Found {len(df)} rows")
        print(f"Columns: {list(df.columns)}")
        
        # Map common column name variations (including Paytm POS specific)
        column_mapping = {
            'invoice_number': ['invoice_number', 'invoice_no', 'invoice', 'invoice_id', 'bill_no', 'invoice_no_txn_no', 'txn_no'],
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
        
        # Check if this is a summary format (one row per sale) or line item format
        has_line_items = 'quantity' in actual_columns and 'price' in actual_columns
        has_total_amount = 'total' in actual_columns
        
        if not has_line_items and has_total_amount:
            # Summary format - each row is a complete sale
            print("Detected summary format (one row per sale)")
            required = ['invoice_number', 'date', 'total']
            missing = [col for col in required if col not in actual_columns]
            if missing:
                print(f"Error: Missing required columns: {missing}")
                print(f"Found columns: {list(df.columns)}")
                return
            summary_format = True
        else:
            # Line item format - multiple rows per invoice
            print("Detected line item format (multiple rows per invoice)")
            required = ['invoice_number', 'date', 'product_name', 'quantity', 'price']
            missing = [col for col in required if col not in actual_columns]
            if missing:
                print(f"Error: Missing required columns: {missing}")
                print(f"Found columns: {list(df.columns)}")
                return
            summary_format = False
        
        # Load all product variants for matching
        # For summary format, we'll use a default product or create a generic item
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
        
        print(f"Loaded {len(all_variants)} product variants for matching")
        
        # Get a default product variant for summary format sales
        default_variant = None
        if summary_format and all_variants:
            # Use the first active variant as default
            default_variant = all_variants[0]
            print(f"Using default product variant: {default_variant.variant_name} (ID: {default_variant.id})")
        
        # Group rows by invoice number (for line item format) or process individually (for summary format)
        if summary_format:
            # Each row is a separate sale
            invoices = {str(i): [row] for i, row in df.iterrows()}
        else:
            # Group rows by invoice number
            invoices = defaultdict(list)
            for _, row in df.iterrows():
                invoice_num = str(row[actual_columns['invoice_number']]).strip()
                invoices[invoice_num].append(row)
        
        print(f"Found {len(invoices)} unique invoices/sales")
        
        # Process each invoice
        created_sales = []
        errors = []
        skipped = []
        created_items = []
        
        for invoice_num, rows in invoices.items():
            try:
                # Get invoice date (use first row's date)
                date_val = rows[0][actual_columns['date']]
                
                # Check for NaT (Not a Time) or None
                if pd.isna(date_val) or date_val is None:
                    skipped.append({
                        'invoice': invoice_num,
                        'reason': 'Invalid or missing date'
                    })
                    continue
                
                try:
                    if isinstance(date_val, pd.Timestamp):
                        if pd.isna(date_val):
                            raise ValueError("NaT timestamp")
                        invoice_date = date_val.date()
                    else:
                        date_str = str(date_val)
                        if date_str.lower() in ['nat', 'nan', 'none', '']:
                            raise ValueError("Invalid date string")
                        # Try parsing date formats like "02/09/2022"
                        invoice_date = pd.to_datetime(date_str, dayfirst=True, errors='raise').date()
                except Exception as e:
                    skipped.append({
                        'invoice': invoice_num,
                        'reason': f'Could not parse date: {str(e)}'
                    })
                    continue
                
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
                    payment_method = str(rows[0][actual_columns['payment_method']]).strip().lower()
                
                # Get customer if available
                customer_id = None
                if 'customer' in actual_columns:
                    customer_name = str(rows[0][actual_columns['customer']]).strip()
                    if customer_name and customer_name != 'nan' and customer_name.lower() != 'cash sale':
                        # Try to find customer by name (you may want to add this lookup)
                        pass
                
                # Process items
                sale_items = []
                total_amount = Decimal(0)
                
                if summary_format:
                    # Summary format: one row = one sale with total amount
                    row = rows[0]
                    try:
                        total_amount = Decimal(str(row[actual_columns['total']]))
                        
                        # Use default variant or create a generic sale item
                        if default_variant:
                            sale_items.append({
                                'product_variant_id': default_variant.id,
                                'quantity': 1.0,  # Default quantity
                                'unit_price': float(total_amount),
                                'line_total': float(total_amount),
                                'gst_rate': 0,
                                'gst_amount': 0,
                                'taxable_value': float(total_amount),
                            })
                            created_items.append(f"Sale Item (Total: ₹{total_amount})")
                        else:
                            skipped.append({
                                'invoice': invoice_num,
                                'reason': 'No product variants available for default item'
                            })
                            continue
                    except Exception as e:
                        skipped.append({
                            'invoice': invoice_num,
                            'reason': f'Invalid total amount: {str(e)}'
                        })
                        continue
                else:
                    # Line item format: process each row as an item
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
                        except Exception as e:
                            skipped.append({
                                'invoice': invoice_num,
                                'product': product_name,
                                'reason': f'Invalid quantity or price: {str(e)}'
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
                        created_items.append(product_name)
                
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
                    remarks=f"Imported from Excel: {os.path.basename(file_path)}",
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
                print(f"  Created sale: Invoice {sale.invoice_number} ({len(sale_items)} items, ₹{sale.total_amount:.2f})")
                
            except Exception as e:
                await db.rollback()
                error_msg = f"Invoice {invoice_num}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
                print(f"  Error processing invoice {invoice_num}: {e}")
        
        print("\n" + "=" * 60)
        print("Import Summary:")
        print("=" * 60)
        print(f"✓ Created: {len(created_sales)} sales with {len(created_items)} items")
        print(f"⚠ Skipped: {len(skipped)} items")
        print(f"✗ Errors: {len(errors)}")
        
        if skipped:
            print("\nSkipped items (first 10):")
            for item in skipped[:10]:
                if 'product' in item:
                    print(f"  Invoice {item.get('invoice', 'N/A')}: {item.get('product', 'N/A')} - {item.get('reason', 'N/A')}")
                else:
                    print(f"  Invoice {item.get('invoice', 'N/A')}: {item.get('reason', 'N/A')}")
        
        if errors:
            print("\nErrors (first 10):")
            for error in errors[:10]:
                print(f"  {error}")
        
        print("=" * 60)
        
    except Exception as e:
        logger.error(f"Error importing sales: {e}", exc_info=True)
        print(f"\nError: {e}")
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import sales from Excel file')
    parser.add_argument('file_path', help='Path to Excel file (.xlsx or .xls)')
    parser.add_argument('--delete-first', action='store_true', help='Delete all existing sales and sale items before importing')
    args = parser.parse_args()
    
    file_path = args.file_path
    
    # Check if DATABASE_URL is set
    if not settings.DATABASE_URL or settings.DATABASE_URL == "postgresql://user:password@localhost:5432/posdb":
        print("Warning: DATABASE_URL not configured!")
        print("Please set DATABASE_URL in your .env file or as an environment variable")
        print("Example: export DATABASE_URL='postgresql+asyncpg://user:pass@localhost:5432/dbname'")
        sys.exit(1)
    
    async def run_import():
        # Create database connection
        db_url = settings.DATABASE_URL
        if db_url.startswith('postgresql://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        elif db_url.startswith('postgresql+psycopg'):
            db_url = db_url.replace('postgresql+psycopg', 'postgresql+asyncpg', 1)
        
        engine = create_async_engine(
            db_url,
            connect_args={"statement_cache_size": 0} if "asyncpg" in db_url else {}
        )
        async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        
        try:
            async with async_session() as db:
                if args.delete_first:
                    await delete_all_sales(db)
                await import_sales_from_excel(file_path, db)
        finally:
            await engine.dispose()
    
    try:
        asyncio.run(run_import())
    except Exception as e:
        print(f"\nError: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure DATABASE_URL is correct in .env file")
        print("2. Make sure the database is running and accessible")
        print("3. Make sure you have the required permissions")
        sys.exit(1)

