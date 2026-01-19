#!/usr/bin/env python3
"""
Fresh, simple product import script.
Usage: python scripts/import_products_fresh.py <excel_file_path>
"""
import sys
import os
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ['ALEMBIC_CONTEXT'] = 'true'

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models import Product, ProductCategory, ProductVariant
from app.config import settings
from decimal import Decimal
import re

try:
    import pandas as pd
except ImportError:
    print("Error: pandas required. Install with: pip install pandas openpyxl")
    sys.exit(1)

def normalize_unit(unit_str):
    """Normalize unit to L, kg, or Unit"""
    if not unit_str or pd.isna(unit_str) or str(unit_str).strip().lower() in ['nan', 'none', '']:
        return 'Unit'
    unit = str(unit_str).strip().lower()
    if any(x in unit for x in ['ml', 'litre', 'liter', 'l', 'lt']):
        return 'L'
    elif any(x in unit for x in ['kg', 'gram', 'g', 'gm']):
        return 'kg'
    return 'Unit'

def extract_multiplier(variant_name, base_unit):
    """Extract multiplier from variant name"""
    if not variant_name:
        return Decimal(1)
    variant_lower = str(variant_name).lower().strip()
    numbers = re.findall(r'\d+\.?\d*', variant_lower)
    if numbers:
        num = Decimal(numbers[0])
        # Handle ml -> L conversion (e.g., 500ml = 0.5L, 250ml = 0.25L)
        if 'ml' in variant_lower and base_unit == 'L':
            return num / Decimal(1000)
        # Handle gram/g -> kg conversion
        elif any(x in variant_lower for x in ['gram', 'gm', 'g']) and base_unit == 'kg':
            return num / Decimal(1000)
        # Handle LT/L -> L (already in base unit, e.g., 5LT = 5L, 1L = 1L)
        elif ('lt' in variant_lower or 'l' in variant_lower) and base_unit == 'L':
            # Check if it's not ml (already handled above)
            if 'ml' not in variant_lower:
                return num
        # Handle kg -> kg (already in base unit)
        elif 'kg' in variant_lower and base_unit == 'kg':
            return num
    return Decimal(1)

async def import_products(file_path: str):
    """Import products from Excel file"""
    
    print(f"Reading Excel file: {file_path}")
    df = pd.read_excel(file_path, header=0)
    print(f"Found {len(df)} rows")
    
    # Normalize column names
    df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(' ', '_').str.replace('-', '_')
    print(f"Columns: {list(df.columns)}")
    
    # Setup database
    db_url = settings.DATABASE_URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
    
    # Remove statement_cache_size for psycopg compatibility
    connect_args = {}
    if "asyncpg" in db_url:
        connect_args = {"statement_cache_size": 0}
    
    engine = create_async_engine(db_url, connect_args=connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as db:
            # Load existing categories
            result = await db.execute(select(ProductCategory))
            categories = {cat.name.lower(): cat for cat in result.scalars().all()}
            
            created_products = 0
            created_variants = 0
            updated_variants = 0
            
            # Process each row
            for idx, row in df.iterrows():
                try:
                    # Get category
                    category_name = str(row.get('category', '')).strip() if pd.notna(row.get('category')) else None
                    category_id = None
                    if category_name and category_name.lower() != 'nan':
                        cat_key = category_name.lower()
                        if cat_key in categories:
                            category_id = categories[cat_key].id
                        else:
                            new_cat = ProductCategory(name=category_name)
                            db.add(new_cat)
                            await db.flush()
                            await db.refresh(new_cat)
                            categories[cat_key] = new_cat
                            category_id = new_cat.id
                    
                    # Get product details
                    item_name = str(row.get('item_name', '')).strip() if pd.notna(row.get('item_name')) else None
                    if not item_name or item_name.lower() == 'nan':
                        continue
                    
                    product_code = None
                    if pd.notna(row.get('product_code')):
                        pc = row.get('product_code')
                        product_code = str(int(pc)) if isinstance(pc, (int, float)) else str(pc).strip()
                        if product_code.lower() in ['nan', 'none', '']:
                            product_code = None
                    
                    # Get base unit
                    metric = str(row.get('metric', 'Unit')).strip() if pd.notna(row.get('metric')) else 'Unit'
                    base_unit = normalize_unit(metric)
                    
                    # Get or create product
                    product = None
                    if product_code:
                        result = await db.execute(
                            select(Product).where(Product.product_code == product_code)
                        )
                        product = result.scalar_one_or_none()
                    
                    if not product:
                        product = Product(
                            name=item_name,
                            product_code=product_code,
                            category_id=category_id,
                            base_unit=base_unit,
                            hsn_code='00000000',
                            is_active=True
                        )
                        db.add(product)
                        await db.flush()
                        await db.refresh(product)
                        created_products += 1
                        print(f"  Created product: {item_name}")
                    
                    # Get variant details
                    variant_name = str(row.get('variant_name', item_name)).strip() if pd.notna(row.get('variant_name')) else item_name
                    sku = None
                    if pd.notna(row.get('sku_code')):
                        sku_val = row.get('sku_code')
                        sku = str(int(sku_val)) if isinstance(sku_val, (int, float)) else str(sku_val).strip()
                        if sku.lower() in ['nan', 'none', '']:
                            sku = None
                    
                    selling_price = None
                    if pd.notna(row.get('selling_price')):
                        try:
                            selling_price = Decimal(str(row.get('selling_price')))
                        except:
                            pass
                    
                    channel = None
                    if pd.notna(row.get('channel')):
                        ch = str(row.get('channel')).strip().lower()
                        if 'in store' in ch:
                            channel = 'store'
                        elif 'online' in ch:
                            channel = 'online'
                    
                    multiplier = extract_multiplier(variant_name, base_unit)
                    
                    # Get or create variant
                    variant = None
                    if sku:
                        result = await db.execute(
                            select(ProductVariant).where(ProductVariant.sku == sku)
                        )
                        variant = result.scalar_one_or_none()
                    
                    if variant:
                        # Update existing
                        variant.product_id = product.id
                        variant.variant_name = variant_name
                        variant.selling_price = float(selling_price) if selling_price else None
                        variant.channel = channel
                        variant.barcode = product_code  # Use Product Code as barcode
                        updated_variants += 1
                    else:
                        # Create new
                        variant = ProductVariant(
                            product_id=product.id,
                            variant_name=variant_name,
                            multiplier=float(multiplier),
                            sku=sku,
                            barcode=product_code,  # Use Product Code as barcode
                            selling_price=float(selling_price) if selling_price else None,
                            channel=channel,
                            is_active=True
                        )
                        db.add(variant)
                        created_variants += 1
                        print(f"    Created variant: {variant_name} (Code: {product_code})")
                    
                    # Commit every 10 items
                    if (idx + 1) % 10 == 0:
                        await db.commit()
                        print(f"  Committed {idx + 1} rows...")
                
                except Exception as e:
                    print(f"  Error on row {idx + 1}: {e}")
                    await db.rollback()
                    continue
            
            # Final commit
            await db.commit()
            
            print("\n" + "=" * 60)
            print("Import Summary:")
            print("=" * 60)
            print(f"✓ Created: {created_products} products, {created_variants} variants")
            print(f"↻ Updated: {updated_variants} variants")
            print("=" * 60)
    
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_products_fresh.py <excel_file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    asyncio.run(import_products(file_path))

