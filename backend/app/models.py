from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, Text, Date, Time, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from datetime import datetime
import uuid


# ============================================================================
# AUTHENTICATION
# ============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="cashier")  # admin / cashier


# ============================================================================
# MASTER DATA - PARTIES
# ============================================================================

class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    gst_number = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    vendor_type = Column(Text, nullable=True)  # e.g. 'raw_material', 'service', 'both'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    purchases = relationship("Purchase", back_populates="vendor")
    expenses = relationship("Expense", back_populates="vendor")


class Customer(Base):
    __tablename__ = "customers_new"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    phone = Column(Text, nullable=True)
    email = Column(Text, nullable=True)
    gst_number = Column(Text, nullable=True)
    address = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    sales = relationship("Sale", back_populates="customer")
    oil_cake_sales = relationship("OilCakeSale", back_populates="customer")


# ============================================================================
# MASTER DATA - PRODUCTS
# ============================================================================

class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products_new"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    product_code = Column(Text, unique=True, nullable=True)  # your internal code
    category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id", ondelete="RESTRICT"), nullable=True)
    base_unit = Column(Text, nullable=False)  # 'L', 'kg'
    hsn_code = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    manufacturing_outputs = relationship("ManufacturingOutput", back_populates="product")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    product_id = Column(UUID(as_uuid=True), ForeignKey("products_new.id", ondelete="CASCADE"), nullable=False)
    variant_name = Column(Text, nullable=False)  # '500 ml', '1 L', etc.
    multiplier = Column(Numeric(10, 3), nullable=False)  # 0.5, 1, 5, 15 in base unit
    sku = Column(Text, unique=True, nullable=True)
    barcode = Column(Text, nullable=True)
    mrp = Column(Numeric(14, 2), nullable=True)
    selling_price = Column(Numeric(14, 2), nullable=True)
    cost_price = Column(Numeric(14, 2), nullable=True)
    channel = Column(Text, nullable=True)  # 'store', 'online', 'both'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="variants")
    sale_items = relationship("SaleItem", back_populates="product_variant")
    manufacturing_outputs = relationship("ManufacturingOutput", back_populates="product_variant")


# ============================================================================
# MASTER DATA - MATERIALS & CATEGORIES
# ============================================================================

class RawMaterial(Base):
    __tablename__ = "raw_materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    unit = Column(Text, nullable=False)  # e.g. 'kg', 'ltr'
    hsn_code = Column(Text, nullable=True)
    reorder_level = Column(Numeric(12, 3), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    purchase_items = relationship("PurchaseItem", back_populates="raw_material")
    manufacturing_inputs = relationship("ManufacturingInput", back_populates="raw_material")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    expenses = relationship("Expense", back_populates="expense_category")


# ============================================================================
# PURCHASE MODULE
# ============================================================================

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    invoice_number = Column(Text, nullable=True)
    invoice_date = Column(Date, nullable=False)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=False)
    purchase_category = Column(Text, nullable=True)  # 'raw_material', 'packing', 'service', etc.
    total_amount = Column(Numeric(14, 2), nullable=False, default=0)
    amount_cash = Column(Numeric(14, 2), nullable=False, default=0)
    amount_upi = Column(Numeric(14, 2), nullable=False, default=0)
    amount_card = Column(Numeric(14, 2), nullable=False, default=0)
    amount_credit = Column(Numeric(14, 2), nullable=False, default=0)
    total_paid = Column(Numeric(14, 2), nullable=False, default=0)
    balance_due = Column(Numeric(14, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    vendor = relationship("Vendor", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    purchase_id = Column(UUID(as_uuid=True), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    raw_material_id = Column(UUID(as_uuid=True), ForeignKey("raw_materials.id", ondelete="RESTRICT"), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(Text, nullable=False)
    price_per_unit = Column(Numeric(14, 4), nullable=False)
    line_total = Column(Numeric(14, 2), nullable=False)
    gst_rate = Column(Numeric(5, 2), nullable=True)  # percent
    gst_amount = Column(Numeric(14, 2), nullable=True)
    taxable_value = Column(Numeric(14, 2), nullable=True)

    # Relationships
    purchase = relationship("Purchase", back_populates="items")
    raw_material = relationship("RawMaterial", back_populates="purchase_items")
    manufacturing_inputs = relationship("ManufacturingInput", back_populates="purchase_item", foreign_keys="[ManufacturingInput.purchase_item_id]")


# ============================================================================
# EXPENSE MODULE
# ============================================================================

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    date = Column(Date, nullable=False)
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    expense_category_id = Column(UUID(as_uuid=True), ForeignKey("expense_categories.id", ondelete="RESTRICT"), nullable=True)
    vendor_id = Column(UUID(as_uuid=True), ForeignKey("vendors.id", ondelete="RESTRICT"), nullable=True)
    amount_cash = Column(Numeric(14, 2), nullable=False, default=0)
    amount_upi = Column(Numeric(14, 2), nullable=False, default=0)
    amount_card = Column(Numeric(14, 2), nullable=False, default=0)
    amount_credit = Column(Numeric(14, 2), nullable=False, default=0)
    total_amount = Column(Numeric(14, 2), nullable=False, default=0)
    total_paid = Column(Numeric(14, 2), nullable=False, default=0)
    balance_due = Column(Numeric(14, 2), nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    expense_category = relationship("ExpenseCategory", back_populates="expenses")
    vendor = relationship("Vendor", back_populates="expenses")


# ============================================================================
# SALES MODULE (STORE + ONLINE)
# ============================================================================

class Sale(Base):
    __tablename__ = "sales_new"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    invoice_number = Column(Text, nullable=True)
    invoice_date = Column(Date, nullable=False)
    invoice_time = Column(Time, nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers_new.id", ondelete="RESTRICT"), nullable=True)
    channel = Column(Text, nullable=True)  # 'store', 'online'
    employee = Column(Text, nullable=True)  # Employee name who made the sale
    partner_ref_id = Column(Text, nullable=True)  # Partner reference ID
    total_amount = Column(Numeric(14, 2), nullable=False, default=0)  # Sub Total
    charges = Column(Numeric(14, 2), nullable=False, default=0)  # Additional charges
    charges_discount = Column(Numeric(14, 2), nullable=False, default=0)  # Discount on charges
    discount_amount = Column(Numeric(14, 2), nullable=False, default=0)  # Discounts
    cgst_amount = Column(Numeric(14, 2), nullable=False, default=0)  # CGST amount
    sgst_amount = Column(Numeric(14, 2), nullable=False, default=0)  # SGST amount
    igst_amount = Column(Numeric(14, 2), nullable=False, default=0)  # IGST amount (for interstate)
    tax_amount = Column(Numeric(14, 2), nullable=False, default=0)  # Total tax (CGST + SGST + IGST)
    round_off = Column(Numeric(14, 2), nullable=True, default=0)  # Round off amount
    net_amount = Column(Numeric(14, 2), nullable=False, default=0)  # Grand Total
    amount_cash = Column(Numeric(14, 2), nullable=False, default=0)
    amount_upi = Column(Numeric(14, 2), nullable=False, default=0)
    amount_card = Column(Numeric(14, 2), nullable=False, default=0)
    amount_credit = Column(Numeric(14, 2), nullable=False, default=0)
    total_paid = Column(Numeric(14, 2), nullable=False, default=0)
    balance_due = Column(Numeric(14, 2), nullable=False, default=0)
    payment_ref_mode = Column(Text, nullable=True)  # Payment reference mode
    transaction_ref_id = Column(Text, nullable=True)  # Transaction reference ID
    status = Column(Text, nullable=True)  # Sale status (e.g., 'Sales', 'Return', etc.)
    remarks = Column(Text, nullable=True)  # Comments
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items_new"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    sale_id = Column(UUID(as_uuid=True), ForeignKey("sales_new.id", ondelete="CASCADE"), nullable=False)
    product_variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit_price = Column(Numeric(14, 4), nullable=False)
    line_total = Column(Numeric(14, 2), nullable=False)
    gst_rate = Column(Numeric(5, 2), nullable=True)
    gst_amount = Column(Numeric(14, 2), nullable=True)
    taxable_value = Column(Numeric(14, 2), nullable=True)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    product_variant = relationship("ProductVariant", back_populates="sale_items")


# ============================================================================
# OIL CAKE SALES MODULE
# ============================================================================

class OilCakeSale(Base):
    __tablename__ = "oil_cake_sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    date = Column(Date, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers_new.id", ondelete="RESTRICT"), nullable=True)
    cake_category = Column(Text, nullable=False)  # e.g., 'Groundnut', 'Coconut', etc.
    cake = Column(Text, nullable=False)  # Specific cake type
    quantity = Column(Numeric(14, 3), nullable=False)  # in kg
    price_per_kg = Column(Numeric(14, 2), nullable=False)
    total = Column(Numeric(14, 2), nullable=False)  # quantity * price_per_kg
    is_paid = Column(Boolean, nullable=False, default=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="oil_cake_sales")


# ============================================================================
# MANUFACTURING MODULE
# ============================================================================

class ManufacturingBatch(Base):
    __tablename__ = "manufacturing_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    batch_code = Column(Text, unique=True, nullable=True)
    batch_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    inputs = relationship("ManufacturingInput", back_populates="batch", cascade="all, delete-orphan")
    outputs = relationship("ManufacturingOutput", back_populates="batch", cascade="all, delete-orphan")


class ManufacturingInput(Base):
    __tablename__ = "manufacturing_inputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    batch_id = Column(UUID(as_uuid=True), ForeignKey("manufacturing_batches.id", ondelete="CASCADE"), nullable=False)
    raw_material_id = Column(UUID(as_uuid=True), ForeignKey("raw_materials.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(Text, nullable=False)
    rate = Column(Numeric(14, 4), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    purchase_item_id = Column(UUID(as_uuid=True), ForeignKey("purchase_items.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    batch = relationship("ManufacturingBatch", back_populates="inputs")
    raw_material = relationship("RawMaterial", back_populates="manufacturing_inputs")
    purchase_item = relationship("PurchaseItem", back_populates="manufacturing_inputs")


class ManufacturingOutput(Base):
    __tablename__ = "manufacturing_outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    batch_id = Column(UUID(as_uuid=True), ForeignKey("manufacturing_batches.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products_new.id", ondelete="RESTRICT"), nullable=False)
    product_variant_id = Column(UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    quantity_kg = Column(Numeric(14, 3), nullable=True)
    quantity_ltr = Column(Numeric(14, 3), nullable=True)
    unit = Column(Text, nullable=True)
    total_output_quantity = Column(Numeric(14, 3), nullable=True)
    unit_cost = Column(Numeric(14, 4), nullable=True)
    total_cost = Column(Numeric(14, 2), nullable=True)
    yield_percentage = Column(Numeric(7, 3), nullable=True)

    # Relationships
    batch = relationship("ManufacturingBatch", back_populates="outputs")
    product = relationship("Product", back_populates="manufacturing_outputs")
    product_variant = relationship("ProductVariant", back_populates="manufacturing_outputs")


# ============================================================================
# INVENTORY MODULE
# ============================================================================

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    date_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    item_type = Column(Text, nullable=False)  # 'raw_material' or 'product_variant'
    item_id = Column(UUID(as_uuid=True), nullable=False)  # raw_materials.id OR product_variants.id
    quantity_change = Column(Numeric(14, 3), nullable=False)  # +ve IN, -ve OUT
    unit = Column(Text, nullable=False)
    cost_per_unit = Column(Numeric(14, 4), nullable=True)
    total_cost = Column(Numeric(14, 2), nullable=True)
    reference_type = Column(Text, nullable=True)  # 'purchase', 'manufacturing_input', 'manufacturing_output', 'sale', 'adjustment'
    reference_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# ============================================================================
# DAY COUNTER MODULE (CASH CONTROL)
# ============================================================================

class DayCounter(Base):
    __tablename__ = "day_counters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid())
    date = Column(Date, nullable=False, unique=True)
    opening_cash_balance = Column(Numeric(14, 2), nullable=False, default=0)
    sales_cash = Column(Numeric(14, 2), nullable=False, default=0)
    sales_upi = Column(Numeric(14, 2), nullable=False, default=0)
    sales_card = Column(Numeric(14, 2), nullable=False, default=0)
    sales_credit = Column(Numeric(14, 2), nullable=False, default=0)
    total_sales = Column(Numeric(14, 2), nullable=False, default=0)
    total_expenses_cash = Column(Numeric(14, 2), nullable=False, default=0)
    cash_hand_over = Column(Numeric(14, 2), nullable=False, default=0)
    actual_closing_cash = Column(Numeric(14, 2), nullable=False, default=0)
    system_closing_cash = Column(Numeric(14, 2), nullable=False, default=0)
    difference = Column(Numeric(14, 2), nullable=False, default=0)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

