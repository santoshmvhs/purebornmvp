#!/usr/bin/env python3
"""
Fresh, simple sales import script.
Usage: python scripts/import_sales_fresh.py <excel_file_path>
"""
import sys
import os
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ['ALEMBIC_CONTEXT'] = 'true'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select
from app.models import Sale, SaleItem, ProductVariant, Product, Customer
from app.config import settings
from decimal import Decimal
from datetime import date, time
from collections import defaultdict

try:
    import pandas as pd
except ImportError:
    print("Error: pandas required. Install with: pip install pandas openpyxl")
    sys.exit(1)

async def import_sales(file_path: str):
    """Import sales from Excel file"""
    
    print(f"Reading Excel file: {file_path}")
    
    # Read Invoice Item Details sheet
    excel_file = pd.ExcelFile(file_path)
    if "Invoice Item Details" not in excel_file.sheet_names:
        print("Error: 'Invoice Item Details' sheet not found")
        return
    
    df = pd.read_excel(file_path, sheet_name="Invoice Item Details", header=0)
    print(f"Found {len(df)} rows in Invoice Item Details")
    
    # Normalize column names
    df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(' ', '_').str.replace('(', '').str.replace(')', '')
    print(f"Columns: {list(df.columns)[:10]}...")
    
    # Setup database - force asyncpg
    db_url = settings.DATABASE_URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    elif db_url.startswith('postgresql+psycopg://'):
        db_url = db_url.replace('postgresql+psycopg://', 'postgresql+asyncpg://', 1)
    
    engine = create_async_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            # Load all product variants
            result = await db.execute(
                select(ProductVariant)
                .options(selectinload(ProductVariant.product))
            )
            all_variants = result.scalars().all()
            
            # Create lookup by Product Code (barcode)
            variant_by_code = {}
            for v in all_variants:
                if v.barcode:
                    code_str = str(v.barcode).strip()
                    variant_by_code[code_str] = v
                    variant_by_code[code_str.lower()] = v
                    # Also try numeric version
                    try:
                        code_num = int(code_str)
                        variant_by_code[str(code_num)] = v
                    except:
                        pass
            
            print(f"Loaded {len(all_variants)} variants for matching")
            
            # Get default variant
            default_variant = all_variants[0] if all_variants else None
            if default_variant:
                print(f"Default variant: {default_variant.variant_name}")
            
            # Group by invoice
            invoices = defaultdict(list)
            for _, row in df.iterrows():
                invoice_id = str(row.get('invoice_id', '')).strip() if pd.notna(row.get('invoice_id')) else None
                if invoice_id and invoice_id.lower() != 'nan':
                    invoices[invoice_id].append(row)
            
            print(f"Found {len(invoices)} unique invoices")
            
            created_sales = 0
            created_items = 0
            skipped = []
            
            # Process invoices in batches
            invoice_list = list(invoices.items())
            batch_size = 10
            
            for batch_start in range(0, len(invoice_list), batch_size):
                batch = invoice_list[batch_start:batch_start + batch_size]
                
                for invoice_num, rows in batch:
                    try:
                        # Get invoice date/time from first row
                        date_val = rows[0].get('date')
                        if pd.isna(date_val) or date_val is None:
                            skipped.append({'invoice': invoice_num, 'reason': 'Missing date'})
                            continue
                        
                        # Parse date
                        if isinstance(date_val, pd.Timestamp):
                            invoice_date = date_val.date()
                            invoice_time = date_val.time() if hasattr(date_val, 'time') else None
                        else:
                            date_str = str(date_val)
                            if ',' in date_str and ':' in date_str:
                                # Format: "1 May 2023, 11:19"
                                dt = pd.to_datetime(date_str, format='%d %b %Y, %H:%M', errors='coerce')
                                if pd.isna(dt):
                                    dt = pd.to_datetime(date_str, errors='coerce')
                                if not pd.isna(dt):
                                    invoice_date = dt.date()
                                    invoice_time = dt.time()
                                else:
                                    invoice_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce').date()
                                    invoice_time = None
                            else:
                                invoice_date = pd.to_datetime(date_str, dayfirst=True, errors='coerce').date()
                                invoice_time = None
                        
                        # Get employee
                        employee = None
                        if pd.notna(rows[0].get('employee')):
                            employee = str(rows[0].get('employee')).strip()
                        
                        # Get channel
                        channel = 'store'
                        if pd.notna(rows[0].get('sales_channel')):
                            ch = str(rows[0].get('sales_channel')).strip().lower()
                            if 'in store' in ch:
                                channel = 'store'
                            elif 'online' in ch:
                                channel = 'online'
                        
                        # Process items
                        sale_items_data = []
                        sub_total = Decimal(0)
                        total_cgst = Decimal(0)
                        total_sgst = Decimal(0)
                        total_gst = Decimal(0)
                        grand_total = Decimal(0)
                        
                        for row in rows:
                            # Get product code
                            product_code = None
                            if pd.notna(row.get('product_code')):
                                pc = row.get('product_code')
                                product_code = str(int(pc)) if isinstance(pc, (int, float)) else str(pc).strip()
                            
                            # Find variant by Product Code
                            variant = None
                            if product_code:
                                variant = variant_by_code.get(product_code)
                                if not variant:
                                    variant = variant_by_code.get(product_code.lower())
                                if not variant:
                                    try:
                                        code_num = int(product_code)
                                        variant = variant_by_code.get(str(code_num))
                                    except:
                                        pass
                            
                            # Use default if not found
                            if not variant:
                                variant = default_variant
                            
                            if not variant:
                                continue
                            
                            # Get item details
                            qty = Decimal(str(row.get('quantity', 1))) if pd.notna(row.get('quantity')) else Decimal(1)
                            selling_price = Decimal(str(row.get('selling_price_per_unit', 0))) if pd.notna(row.get('selling_price_per_unit')) else Decimal(0)
                            
                            # Get GST amounts
                            item_cgst = Decimal(str(row.get('cgst', 0))) if pd.notna(row.get('cgst')) else Decimal(0)
                            item_sgst = Decimal(str(row.get('sgst', 0))) if pd.notna(row.get('sgst')) else Decimal(0)
                            item_gst = item_cgst + item_sgst
                            
                            # Get subtotal and total
                            item_subtotal = Decimal(str(row.get('sub_total', 0))) if pd.notna(row.get('sub_total')) else Decimal(0)
                            item_total = Decimal(str(row.get('total', 0))) if pd.notna(row.get('total')) else Decimal(0)
                            
                            # Calculate taxable value
                            taxable_value = item_subtotal - item_gst if item_gst > 0 else item_subtotal
                            
                            # Calculate GST rate
                            gst_rate = Decimal(0)
                            if taxable_value > 0 and item_gst > 0:
                                gst_rate = (item_gst / taxable_value) * 100
                            
                            sale_items_data.append({
                                'variant': variant,
                                'quantity': float(qty),
                                'unit_price': float(taxable_value),
                                'line_total': float(taxable_value),
                                'gst_rate': float(gst_rate),
                                'gst_amount': float(item_gst),
                                'taxable_value': float(taxable_value),
                            })
                            
                            sub_total += item_subtotal
                            total_cgst += item_cgst
                            total_sgst += item_sgst
                            total_gst += item_gst
                            grand_total += item_total
                        
                        if not sale_items_data:
                            skipped.append({'invoice': invoice_num, 'reason': 'No valid items'})
                            continue
                        
                        # Get payment amounts from first row
                        amount_cash = Decimal(str(rows[0].get('cash', 0))) if pd.notna(rows[0].get('cash')) else Decimal(0)
                        amount_card = Decimal(str(rows[0].get('card', 0))) if pd.notna(rows[0].get('card')) else Decimal(0)
                        amount_upi = Decimal(str(rows[0].get('upi', 0))) if pd.notna(rows[0].get('upi')) else Decimal(0)
                        amount_credit = Decimal(str(rows[0].get('credit_line', 0))) if pd.notna(rows[0].get('credit_line')) else Decimal(0)
                        
                        # Get customer info (skip for now to avoid async issues - can be added later)
                        customer_id = None
                        
                        # Get round off
                        round_off = None
                        if pd.notna(rows[0].get('roundoff')):
                            try:
                                round_off = Decimal(str(rows[0].get('roundoff')))
                            except:
                                pass
                        
                        # Get status
                        status = 'Sales'
                        if pd.notna(rows[0].get('status')):
                            status = str(rows[0].get('status')).strip()
                        
                        total_paid = amount_cash + amount_card + amount_upi
                        balance_due = grand_total - total_paid
                        
                        # Create sale
                        sale = Sale(
                            invoice_number=invoice_num,
                            invoice_date=invoice_date,
                            invoice_time=invoice_time,
                            customer_id=customer_id,
                            channel=channel,
                            employee=employee,
                            total_amount=float(sub_total),
                            discount_amount=0,
                            cgst_amount=float(total_cgst),
                            sgst_amount=float(total_sgst),
                            igst_amount=0,
                            tax_amount=float(total_gst),
                            round_off=float(round_off) if round_off else None,
                            net_amount=float(grand_total),
                            amount_cash=float(amount_cash),
                            amount_upi=float(amount_upi),
                            amount_card=float(amount_card),
                            amount_credit=float(amount_credit),
                            total_paid=float(total_paid),
                            balance_due=float(balance_due),
                            status=status,
                            remarks=f"Imported from Excel: {os.path.basename(file_path)}",
                        )
                        db.add(sale)
                        await db.flush()
                        await db.refresh(sale)
                        
                        # Create sale items
                        for item_data in sale_items_data:
                            sale_item = SaleItem(
                                sale_id=sale.id,
                                product_variant_id=item_data['variant'].id,
                                quantity=item_data['quantity'],
                                unit_price=item_data['unit_price'],
                                line_total=item_data['line_total'],
                                gst_rate=item_data['gst_rate'],
                                gst_amount=item_data['gst_amount'],
                                taxable_value=item_data['taxable_value'],
                            )
                            db.add(sale_item)
                            created_items += 1
                        
                        created_sales += 1
                    
                    except Exception as e:
                        await db.rollback()
                        print(f"  Error processing invoice {invoice_num}: {e}")
                        skipped.append({'invoice': invoice_num, 'reason': str(e)})
                        continue
                
                # Commit batch
                try:
                    await db.commit()
                    if batch_start % 50 == 0:
                        print(f"  Processed {batch_start + len(batch)} invoices...")
                except Exception as commit_err:
                    await db.rollback()
                    print(f"  Batch commit error: {commit_err}")
                    # Mark all in batch as skipped
                    for invoice_num, _ in batch:
                        if invoice_num not in [s.get('invoice') for s in skipped]:
                            skipped.append({'invoice': invoice_num, 'reason': f'Batch commit error: {str(commit_err)}'})
            
            print("\n" + "=" * 60)
            print("Import Summary:")
            print("=" * 60)
            print(f"✓ Created: {created_sales} sales with {created_items} items")
            print(f"⚠ Skipped: {len(skipped)} invoices")
            if skipped:
                print("\nSkipped (first 5):")
                for s in skipped[:5]:
                    print(f"  {s.get('invoice', 'N/A')}: {s.get('reason', 'N/A')}")
            print("=" * 60)
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_sales_fresh.py <excel_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    asyncio.run(import_sales(file_path))

