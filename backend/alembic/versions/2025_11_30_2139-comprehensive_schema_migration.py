"""Comprehensive schema migration

Revision ID: comprehensive_schema
Revises: ed0cc2272b56
Create Date: 2025-11-30 21:39:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'comprehensive_schema'
down_revision = 'ed0cc2272b56'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable UUID extension
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    
    # 1. MASTER TABLES
    
    # Vendors
    op.create_table(
        'vendors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('gst_number', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('vendor_type', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    
    # Customers (update existing or create new)
    op.create_table(
        'customers_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('phone', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('gst_number', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    
    # Raw Materials
    op.create_table(
        'raw_materials',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('unit', sa.Text(), nullable=False),
        sa.Column('hsn_code', sa.Text(), nullable=True),
        sa.Column('reorder_level', sa.Numeric(12, 3), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    
    # Product Categories
    op.create_table(
        'product_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    
    # Products (new structure)
    op.create_table(
        'products_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('product_code', sa.Text(), nullable=True),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('base_unit', sa.Text(), nullable=False),
        sa.Column('hsn_code', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['category_id'], ['product_categories.id'], ondelete='RESTRICT')
    )
    op.create_index('products_new_product_code_key', 'products_new', ['product_code'], unique=True)
    
    # Product Variants
    op.create_table(
        'product_variants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('variant_name', sa.Text(), nullable=False),
        sa.Column('multiplier', sa.Numeric(10, 3), nullable=False),
        sa.Column('sku', sa.Text(), nullable=True),
        sa.Column('barcode', sa.Text(), nullable=True),
        sa.Column('mrp', sa.Numeric(14, 2), nullable=True),
        sa.Column('selling_price', sa.Numeric(14, 2), nullable=True),
        sa.Column('cost_price', sa.Numeric(14, 2), nullable=True),
        sa.Column('channel', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['product_id'], ['products_new.id'], ondelete='CASCADE')
    )
    op.create_index('product_variants_sku_key', 'product_variants', ['sku'], unique=True)
    
    # Expense Categories
    op.create_table(
        'expense_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    
    # 2. PURCHASE MODULE
    
    # Purchases
    op.create_table(
        'purchases',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('invoice_number', sa.Text(), nullable=True),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('purchase_category', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_upi', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_card', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_credit', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_paid', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('balance_due', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='RESTRICT')
    )
    
    # Purchase Items
    op.create_table(
        'purchase_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('purchase_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('raw_material_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('quantity', sa.Numeric(14, 3), nullable=False),
        sa.Column('unit', sa.Text(), nullable=False),
        sa.Column('price_per_unit', sa.Numeric(14, 4), nullable=False),
        sa.Column('line_total', sa.Numeric(14, 2), nullable=False),
        sa.Column('gst_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('gst_amount', sa.Numeric(14, 2), nullable=True),
        sa.Column('taxable_value', sa.Numeric(14, 2), nullable=True),
        sa.ForeignKeyConstraint(['purchase_id'], ['purchases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['raw_material_id'], ['raw_materials.id'], ondelete='RESTRICT')
    )
    
    # 3. EXPENSE MODULE
    
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('expense_category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_upi', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_card', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_credit', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_paid', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('balance_due', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['expense_category_id'], ['expense_categories.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='RESTRICT')
    )
    
    # 4. SALES MODULE (new structure)
    
    # Sales (new structure)
    op.create_table(
        'sales_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('invoice_number', sa.Text(), nullable=True),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('invoice_time', sa.Time(), nullable=True),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('channel', sa.Text(), nullable=True),
        sa.Column('total_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('tax_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_upi', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_card', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('amount_credit', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_paid', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('balance_due', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['customer_id'], ['customers_new.id'], ondelete='RESTRICT')
    )
    
    # Sale Items (new structure)
    op.create_table(
        'sale_items_new',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('sale_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_variant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Numeric(14, 3), nullable=False),
        sa.Column('unit_price', sa.Numeric(14, 4), nullable=False),
        sa.Column('line_total', sa.Numeric(14, 2), nullable=False),
        sa.Column('gst_rate', sa.Numeric(5, 2), nullable=True),
        sa.Column('gst_amount', sa.Numeric(14, 2), nullable=True),
        sa.Column('taxable_value', sa.Numeric(14, 2), nullable=True),
        sa.ForeignKeyConstraint(['sale_id'], ['sales_new.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_variant_id'], ['product_variants.id'], ondelete='RESTRICT')
    )
    
    # 5. MANUFACTURING / BATCHES
    
    # Manufacturing Batches
    op.create_table(
        'manufacturing_batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('batch_code', sa.Text(), nullable=True),
        sa.Column('batch_date', sa.Date(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('manufacturing_batches_batch_code_key', 'manufacturing_batches', ['batch_code'], unique=True)
    
    # Manufacturing Inputs
    op.create_table(
        'manufacturing_inputs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('raw_material_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity', sa.Numeric(14, 3), nullable=False),
        sa.Column('unit', sa.Text(), nullable=False),
        sa.Column('rate', sa.Numeric(14, 4), nullable=False),
        sa.Column('amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('purchase_item_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['manufacturing_batches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['raw_material_id'], ['raw_materials.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['purchase_item_id'], ['purchase_items.id'], ondelete='SET NULL')
    )
    
    # Manufacturing Outputs
    op.create_table(
        'manufacturing_outputs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_variant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('quantity_kg', sa.Numeric(14, 3), nullable=True),
        sa.Column('quantity_ltr', sa.Numeric(14, 3), nullable=True),
        sa.Column('unit', sa.Text(), nullable=True),
        sa.Column('total_output_quantity', sa.Numeric(14, 3), nullable=True),
        sa.Column('unit_cost', sa.Numeric(14, 4), nullable=True),
        sa.Column('total_cost', sa.Numeric(14, 2), nullable=True),
        sa.Column('yield_percentage', sa.Numeric(7, 3), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['manufacturing_batches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products_new.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['product_variant_id'], ['product_variants.id'], ondelete='SET NULL')
    )
    
    # 6. INVENTORY MOVEMENTS
    
    op.create_table(
        'inventory_movements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('date_time', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('item_type', sa.Text(), nullable=False),
        sa.Column('item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quantity_change', sa.Numeric(14, 3), nullable=False),
        sa.Column('unit', sa.Text(), nullable=False),
        sa.Column('cost_per_unit', sa.Numeric(14, 4), nullable=True),
        sa.Column('total_cost', sa.Numeric(14, 2), nullable=True),
        sa.Column('reference_type', sa.Text(), nullable=True),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('inventory_movements_item_idx', 'inventory_movements', ['item_type', 'item_id'])
    
    # 7. DAY COUNTER (CASH CONTROL)
    
    op.create_table(
        'day_counters',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('opening_cash_balance', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('sales_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('sales_upi', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('sales_card', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('sales_credit', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_sales', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_expenses_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('cash_hand_over', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('actual_closing_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('system_closing_cash', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('difference', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('day_counters_date_key', 'day_counters', ['date'], unique=True)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('day_counters_date_key', table_name='day_counters')
    op.drop_table('day_counters')
    op.drop_index('inventory_movements_item_idx', table_name='inventory_movements')
    op.drop_table('inventory_movements')
    op.drop_table('manufacturing_outputs')
    op.drop_table('manufacturing_inputs')
    op.drop_index('manufacturing_batches_batch_code_key', table_name='manufacturing_batches')
    op.drop_table('manufacturing_batches')
    op.drop_table('sale_items_new')
    op.drop_table('sales_new')
    op.drop_table('expenses')
    op.drop_table('purchase_items')
    op.drop_table('purchases')
    op.drop_index('product_variants_sku_key', table_name='product_variants')
    op.drop_table('product_variants')
    op.drop_index('products_new_product_code_key', table_name='products_new')
    op.drop_table('products_new')
    op.drop_table('expense_categories')
    op.drop_table('raw_materials')
    op.drop_table('customers_new')
    op.drop_table('vendors')
    op.drop_table('product_categories')

