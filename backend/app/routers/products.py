"""
Products router for CRUD operations on products.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
import pandas as pd
import io
import logging
import re

from app.database import get_db
from app.models import User, Product, ProductCategory, ProductVariant
from app.schemas import ProductCreate, ProductUpdate, ProductRead
from app.deps import get_current_active_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=List[ProductRead])
async def list_products(
    search: Optional[str] = Query(None, description="Search by name or product code"),
    category_id: Optional[UUID] = Query(None, description="Filter by category ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=1000, description="Items per page"),
    active_only: bool = Query(True, description="Show only active products"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    List all products with optional search and pagination.
    """
    stmt = select(Product).options(selectinload(Product.category))
    
    # Filter by active status
    if active_only:
        stmt = stmt.where(Product.is_active == True)

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    
    # Search filter
    if search:
        search_filter = f"%{search}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(search_filter),
                Product.product_code.ilike(search_filter)
            )
        )
    
    # Pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    result = await db.execute(stmt)
    products = result.scalars().unique().all()
    
    # Attach category names for serialization
    for product in products:
        if product.category:
            product.category_name = product.category.name
        else:
            product.category_name = None
    
    return products


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific product by ID.
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Create a new product (Admin only).
    """
    # Check if product_code already exists (if provided)
    if product_data.product_code:
        existing = await db.execute(
            select(Product).where(Product.product_code == product_data.product_code)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with code '{product_data.product_code}' already exists"
            )
    
    product = Product(**product_data.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    return product


@router.put("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Update a product (Admin only).
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Update only provided fields
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    hard_delete: bool = Query(False, description="Permanently delete instead of soft delete"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Delete a product (Admin only).
    
    By default performs soft delete (sets is_active=False).
    Use hard_delete=true to permanently remove.
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if hard_delete:
        await db.delete(product)
    else:
        product.is_active = False
    
    await db.commit()
    return None


@router.post("/import-excel", status_code=status.HTTP_200_OK)
async def import_products_from_excel(
    file: UploadFile = File(..., description="Excel file (.xlsx or .xls)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Import products and variants from Excel file.
    
    Expected Excel format:
    - Category / Sub-Category
    - Item-name (product name)
    - Variant-name
    - Product-code
    - SKU-code
    - Metric (unit: ml, Litre, kg, etc.)
    - Selling Price
    - Channel
    - Tax Class (optional)
    
    Creates products, variants, and categories as needed.
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an Excel file (.xlsx or .xls)"
        )
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), header=0)
        
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Excel file is empty"
            )
        
        # Normalize column names
        df.columns = df.columns.astype(str).str.strip().str.lower().str.replace(' ', '_').str.replace('-', '_').str.replace('.', '')
        
        # Remove rows that are completely empty
        df = df.dropna(how='all')
        
        logger.info(f"Importing products from Excel file: {file.filename}, {len(df)} rows, columns: {list(df.columns)}")
        
        # Map column names
        column_mapping = {
            'category': ['category'],
            'sub_category': ['sub_category', 'subcategory'],
            'item_name': ['item_name', 'itemname', 'product_name', 'product'],
            'variant_name': ['variant_name', 'variantname', 'variant'],
            'product_code': ['product_code', 'productcode', 'product_code_alias'],
            'sku_code': ['sku_code', 'skucode', 'sku'],
            'metric': ['metric', 'unit'],
            'selling_price': ['selling_price', 'sellingprice', 'price'],
            'channel': ['channel'],
            'tax_class': ['tax_class', 'taxclass'],
        }
        
        # Find actual column names
        actual_columns = {}
        for key, variations in column_mapping.items():
            for col in df.columns:
                col_normalized = col.lower().strip()
                if col_normalized in variations:
                    actual_columns[key] = col
                    break
        
        # Validate required columns
        required = ['item_name', 'variant_name']
        missing = [col for col in required if col not in actual_columns]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required columns: {missing}. Found columns: {list(df.columns)}"
            )
        
        # Helper function to normalize unit
        def normalize_unit(unit_str):
            if not unit_str or pd.isna(unit_str):
                return 'Unit'
            unit = str(unit_str).strip().lower()
            # Convert common units
            unit_map = {
                'ml': 'L',
                'litre': 'L',
                'liter': 'L',
                'l': 'L',
                'kg': 'kg',
                'gram': 'kg',
                'g': 'kg',
                'unit': 'Unit',
                'btl': 'Unit',
                'piece': 'Unit',
                'pcs': 'Unit',
            }
            for key, value in unit_map.items():
                if key in unit:
                    return value
            return 'Unit'
        
        # Helper function to extract multiplier from variant name
        def extract_multiplier(variant_name, base_unit):
            if not variant_name:
                return Decimal(1)
            variant_lower = str(variant_name).lower().strip()
            # Try to extract number from variant name (e.g., "250ml" -> 0.25 if base_unit is L)
            numbers = re.findall(r'\d+\.?\d*', variant_lower)
            if numbers:
                num = Decimal(numbers[0])
                # Convert to base unit
                # Handle ml -> L conversion (e.g., 500ml = 0.5L, 250ml = 0.25L)
                if 'ml' in variant_lower and base_unit == 'L':
                    return num / Decimal(1000)
                # Handle gram/g -> kg conversion
                elif ('gram' in variant_lower or 'g' in variant_lower) and base_unit == 'kg':
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
        
        # Load existing categories
        result = await db.execute(select(ProductCategory))
        existing_categories = {cat.name.lower(): cat for cat in result.scalars().all()}
        
        # Load existing products by product_code
        result = await db.execute(select(Product))
        existing_products = {p.product_code: p for p in result.scalars().all() if p.product_code}
        
        # Load existing variants by SKU
        result = await db.execute(select(ProductVariant))
        existing_variants = {v.sku: v for v in result.scalars().all() if v.sku}
        
        created_products = []
        created_variants = []
        updated_products = []
        updated_variants = []
        skipped = []
        errors = []
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                # Get category
                category_name = None
                if 'category' in actual_columns:
                    category_name = str(row[actual_columns['category']]).strip()
                    if category_name and category_name.lower() != 'nan':
                        category_name = category_name.strip()
                
                # Get or create category
                category_id = None
                if category_name:
                    category_key = category_name.lower()
                    if category_key in existing_categories:
                        category_id = existing_categories[category_key].id
                    else:
                        # Create new category
                        new_category = ProductCategory(name=category_name)
                        db.add(new_category)
                        await db.flush()
                        await db.refresh(new_category)
                        existing_categories[category_key] = new_category
                        category_id = new_category.id
                
                # Get product details
                item_name = str(row[actual_columns['item_name']]).strip()
                if not item_name or item_name.lower() == 'nan':
                    skipped.append({'row': idx + 1, 'reason': 'Missing item name'})
                    continue
                
                product_code = None
                if 'product_code' in actual_columns:
                    code_val = row[actual_columns['product_code']]
                    if pd.notna(code_val):
                        product_code = str(code_val).strip()
                        if product_code.lower() == 'nan':
                            product_code = None
                
                # Get base unit
                base_unit = 'Unit'
                if 'metric' in actual_columns:
                    metric_val = row[actual_columns['metric']]
                    if pd.notna(metric_val):
                        base_unit = normalize_unit(str(metric_val))
                
                # Default HSN code (you may want to add this to Excel or use a mapping)
                hsn_code = '00000000'
                
                # Get or create product
                product = None
                if product_code and product_code in existing_products:
                    product = existing_products[product_code]
                    # Update product if needed
                    if product.name != item_name:
                        product.name = item_name
                        updated_products.append(product_code)
                else:
                    # Create new product
                    product = Product(
                        name=item_name,
                        product_code=product_code,
                        category_id=category_id,
                        base_unit=base_unit,
                        hsn_code=hsn_code,
                        is_active=True
                    )
                    db.add(product)
                    await db.flush()
                    await db.refresh(product)
                    if product_code:
                        existing_products[product_code] = product
                    created_products.append(item_name)
                
                # Get variant details
                variant_name = str(row[actual_columns['variant_name']]).strip()
                if not variant_name or variant_name.lower() == 'nan':
                    variant_name = item_name  # Use product name as variant name
                
                sku = None
                if 'sku_code' in actual_columns:
                    sku_val = row[actual_columns['sku_code']]
                    if pd.notna(sku_val):
                        sku = str(sku_val).strip()
                        if sku.lower() == 'nan':
                            sku = None
                
                selling_price = None
                if 'selling_price' in actual_columns:
                    price_val = row[actual_columns['selling_price']]
                    if pd.notna(price_val):
                        try:
                            selling_price = Decimal(str(price_val))
                        except:
                            pass
                
                channel = None
                if 'channel' in actual_columns:
                    channel_val = row[actual_columns['channel']]
                    if pd.notna(channel_val):
                        channel = str(channel_val).strip()
                
                # Calculate multiplier
                multiplier = extract_multiplier(variant_name, base_unit)
                
                # Get or create variant
                variant = None
                if sku and sku in existing_variants:
                    variant = existing_variants[sku]
                    # Update variant if needed
                    if variant.product_id != product.id:
                        variant.product_id = product.id
                    if variant.variant_name != variant_name:
                        variant.variant_name = variant_name
                    if selling_price and variant.selling_price != selling_price:
                        variant.selling_price = selling_price
                    if channel and variant.channel != channel:
                        variant.channel = channel
                    updated_variants.append(sku)
                else:
                    # Create new variant
                    variant = ProductVariant(
                        product_id=product.id,
                        variant_name=variant_name,
                        multiplier=float(multiplier),
                        sku=sku,
                        selling_price=float(selling_price) if selling_price else None,
                        channel=channel,
                        is_active=True
                    )
                    db.add(variant)
                    await db.flush()
                    await db.refresh(variant)
                    if sku:
                        existing_variants[sku] = variant
                    created_variants.append(variant_name)
                
            except Exception as e:
                error_msg = f"Row {idx + 1}: {str(e)}"
                logger.error(error_msg, exc_info=True)
                errors.append(error_msg)
        
        await db.commit()
        
        return {
            'success': True,
            'created_products': len(created_products),
            'created_variants': len(created_variants),
            'updated_products': len(updated_products),
            'updated_variants': len(updated_variants),
            'skipped': len(skipped),
            'errors': len(errors),
            'details': {
                'created_products': created_products[:10],  # Limit to first 10
                'created_variants': created_variants[:10],
                'skipped': skipped[:10],
                'errors': errors[:10],
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error importing products: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error importing products: {str(e)}"
        )

