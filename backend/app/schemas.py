from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date, time
from uuid import UUID


# ============================================================================
# Token / Auth Schemas
# ============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    username: str
    role: str = "cashier"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None


class UserRead(UserBase):
    id: int
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Customer Schemas
# ============================================================================

class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    billing_address: Optional[str] = None
    state_code: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    billing_address: Optional[str] = None
    state_code: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerRead(CustomerBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Product Schemas (new schema - matches products_new table)
# ============================================================================

class ProductBase(BaseModel):
    name: str
    product_code: Optional[str] = None
    category_id: Optional[UUID] = None
    base_unit: str
    hsn_code: str


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    category_id: Optional[UUID] = None
    base_unit: Optional[str] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None


class ProductRead(ProductBase):
    id: UUID
    is_active: bool
    created_at: datetime
    category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Sale Item Schemas
# ============================================================================

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: float = Field(gt=0)


class SaleItemRead(BaseModel):
    id: int
    sale_id: int
    product_id: int
    quantity: float
    unit_price: float
    gst_rate: float
    hsn_code: Optional[str] = None
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    line_gst: float
    line_total: float
    line_tax: float  # Deprecated

    model_config = ConfigDict(from_attributes=True)


class SaleItemWithProduct(SaleItemRead):
    product: ProductRead

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Sale Schemas
# ============================================================================

class SaleCreate(BaseModel):
    items: List[SaleItemCreate]
    customer_id: Optional[int] = None
    is_gst_inclusive: bool = False
    is_interstate: bool = False


class SaleRead(BaseModel):
    id: int
    created_at: datetime
    user_id: int
    customer_id: Optional[int]
    total_amount: float
    total_tax: float  # Deprecated
    is_gst_inclusive: bool
    is_interstate: bool
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float
    grand_total: float

    model_config = ConfigDict(from_attributes=True)


class SaleWithItems(SaleRead):
    items: List[SaleItemWithProduct]
    user: UserRead
    customer: Optional[CustomerRead] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Report Schemas
# ============================================================================

class DailySalesReport(BaseModel):
    date: str
    total_sales_count: int
    total_amount: float
    total_tax: float  # Deprecated
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_gst: float
    total_grand_total: float


class MonthlySalesReport(BaseModel):
    year: int
    month: int
    total_sales_count: int
    total_amount: float
    total_tax: float  # Deprecated
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_gst: float
    total_grand_total: float


# ============================================================================
# GST Report Schemas
# ============================================================================

class GSTReportItem(BaseModel):
    """Individual item in GST report"""
    hsn_code: Optional[str]
    gst_rate: float
    taxable_value: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float


class GSTR1Report(BaseModel):
    """GSTR-1 Report - Outward supplies"""
    start_date: str
    end_date: str
    total_taxable_value: float
    total_cgst: float
    total_sgst: float
    total_igst: float
    total_gst: float
    items: List[GSTReportItem]


class GSTR3BReport(BaseModel):
    """GSTR-3B Report - Summary return"""
    month: int
    year: int
    outward_taxable_supplies: float
    outward_cgst: float
    outward_sgst: float
    outward_igst: float
    total_tax: float


# ============================================================================
# NEW SCHEMAS - UUID-based models
# ============================================================================

# ============================================================================
# Vendor Schemas
# ============================================================================

class VendorBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = None


class VendorCreate(VendorBase):
    pass


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    vendor_type: Optional[str] = None
    is_active: Optional[bool] = None


class VendorRead(VendorBase):
    id: UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Customer Schemas (New UUID-based)
# ============================================================================

class CustomerNewBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None


class CustomerNewCreate(CustomerNewBase):
    pass


class CustomerNewUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gst_number: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerNewRead(CustomerNewBase):
    id: UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Raw Material Schemas
# ============================================================================

class RawMaterialBase(BaseModel):
    name: str
    unit: str
    hsn_code: Optional[str] = None
    reorder_level: Optional[float] = None


class RawMaterialCreate(RawMaterialBase):
    pass


class RawMaterialUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    reorder_level: Optional[float] = None
    is_active: Optional[bool] = None


class RawMaterialRead(RawMaterialBase):
    id: UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Product Category Schemas
# ============================================================================

class ProductCategoryBase(BaseModel):
    name: str


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = None


class ProductCategoryRead(ProductCategoryBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Product Schemas (New UUID-based)
# ============================================================================

class ProductNewBase(BaseModel):
    name: str
    product_code: Optional[str] = None
    category_id: Optional[UUID] = None
    base_unit: str
    hsn_code: str


class ProductNewCreate(ProductNewBase):
    pass


class ProductNewUpdate(BaseModel):
    name: Optional[str] = None
    product_code: Optional[str] = None
    category_id: Optional[UUID] = None
    base_unit: Optional[str] = None
    hsn_code: Optional[str] = None
    is_active: Optional[bool] = None


class ProductNewRead(ProductNewBase):
    id: UUID
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Product Variant Schemas
# ============================================================================

class ProductVariantBase(BaseModel):
    product_id: UUID
    variant_name: str
    multiplier: float = Field(gt=0)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    channel: Optional[str] = None


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    variant_name: Optional[str] = None
    multiplier: Optional[float] = Field(None, gt=0)
    sku: Optional[str] = None
    barcode: Optional[str] = None
    mrp: Optional[float] = None
    selling_price: Optional[float] = None
    cost_price: Optional[float] = None
    channel: Optional[str] = None
    is_active: Optional[bool] = None


class ProductVariantRead(ProductVariantBase):
    id: UUID
    is_active: bool
    created_at: datetime
    product_name: Optional[str] = None  # Product name from relationship
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Expense Category Schemas
# ============================================================================

class ExpenseCategoryBase(BaseModel):
    name: str


class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None


class ExpenseCategoryRead(ExpenseCategoryBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Purchase Schemas
# ============================================================================

class PurchaseItemCreate(BaseModel):
    raw_material_id: Optional[UUID] = None
    description: Optional[str] = None
    quantity: float = Field(gt=0)
    unit: str
    price_per_unit: float = Field(gt=0)
    gst_rate: Optional[float] = Field(None, ge=0, le=1)


class PurchaseItemRead(BaseModel):
    id: UUID
    purchase_id: UUID
    raw_material_id: Optional[UUID]
    raw_material: Optional["RawMaterialRead"] = None
    description: Optional[str]
    quantity: float
    unit: str
    price_per_unit: float
    line_total: float
    gst_rate: Optional[float]
    gst_amount: Optional[float]
    taxable_value: Optional[float]
    model_config = ConfigDict(from_attributes=True)


class PurchaseCreate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: date
    vendor_id: UUID
    purchase_category: Optional[str] = None
    items: List[PurchaseItemCreate]
    amount_cash: float = Field(default=0, ge=0)
    amount_upi: float = Field(default=0, ge=0)
    amount_card: float = Field(default=0, ge=0)
    amount_credit: float = Field(default=0, ge=0)
    notes: Optional[str] = None


class PurchaseRead(BaseModel):
    id: UUID
    invoice_number: Optional[str]
    invoice_date: date
    vendor_id: UUID
    purchase_category: Optional[str]
    total_amount: float
    amount_cash: float
    amount_upi: float
    amount_card: float
    amount_credit: float
    total_paid: float
    balance_due: float
    notes: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PurchaseWithItems(PurchaseRead):
    items: List[PurchaseItemRead]
    vendor: VendorRead
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Expense Schemas
# ============================================================================

class ExpenseCreate(BaseModel):
    date: date
    name: str
    description: Optional[str] = None
    expense_category_id: Optional[UUID] = None
    vendor_id: Optional[UUID] = None
    amount_cash: float = Field(default=0, ge=0)
    amount_upi: float = Field(default=0, ge=0)
    amount_card: float = Field(default=0, ge=0)
    amount_credit: float = Field(default=0, ge=0)


class ExpenseRead(BaseModel):
    id: UUID
    date: date
    name: str
    description: Optional[str]
    expense_category_id: Optional[UUID]
    vendor_id: Optional[UUID]
    amount_cash: float
    amount_upi: float
    amount_card: float
    amount_credit: float
    total_amount: float
    total_paid: float
    balance_due: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Sale Schemas (New UUID-based)
# ============================================================================

class SaleItemNewCreate(BaseModel):
    product_variant_id: UUID
    quantity: float = Field(gt=0)


class SaleItemNewRead(BaseModel):
    id: UUID
    sale_id: UUID
    product_variant_id: UUID
    quantity: float
    unit_price: float
    line_total: float
    gst_rate: Optional[float]
    gst_amount: Optional[float]
    taxable_value: Optional[float]
    model_config = ConfigDict(from_attributes=True)


class SaleItemNewWithVariant(SaleItemNewRead):
    product_variant: ProductVariantRead
    model_config = ConfigDict(from_attributes=True)


class SaleNewCreate(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: date
    invoice_time: Optional[time] = None
    customer_id: Optional[UUID] = None
    channel: Optional[str] = None
    items: List[SaleItemNewCreate]
    discount_amount: float = Field(default=0, ge=0)
    amount_cash: float = Field(default=0, ge=0)
    amount_upi: float = Field(default=0, ge=0)
    amount_card: float = Field(default=0, ge=0)
    amount_credit: float = Field(default=0, ge=0)
    remarks: Optional[str] = None


class SaleNewRead(BaseModel):
    id: UUID
    invoice_number: Optional[str]
    invoice_date: date
    invoice_time: Optional[time]
    customer_id: Optional[UUID]
    channel: Optional[str]
    employee: Optional[str] = None
    partner_ref_id: Optional[str] = None
    total_amount: float
    charges: float = 0
    charges_discount: float = 0
    discount_amount: float
    cgst_amount: float = 0
    sgst_amount: float = 0
    igst_amount: float = 0
    tax_amount: float
    round_off: Optional[float] = None
    net_amount: float
    amount_cash: float
    amount_upi: float
    amount_card: float
    amount_credit: float
    total_paid: float
    balance_due: float
    payment_ref_mode: Optional[str] = None
    transaction_ref_id: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SaleNewWithItems(SaleNewRead):
    items: List[SaleItemNewWithVariant]
    customer: Optional[CustomerNewRead] = None
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Oil Cake Sales Schemas
# ============================================================================

class OilCakeSaleBase(BaseModel):
    date: date
    customer_id: Optional[UUID] = None
    cake_category: str
    cake: str
    quantity: float = Field(gt=0, description="Quantity in kg")
    price_per_kg: float = Field(gt=0, description="Price per kg")
    is_paid: bool = False
    remarks: Optional[str] = None


class OilCakeSaleCreate(OilCakeSaleBase):
    pass


class OilCakeSaleUpdate(BaseModel):
    date: Optional[date] = None
    customer_id: Optional[UUID] = None
    cake_category: Optional[str] = None
    cake: Optional[str] = None
    quantity: Optional[float] = Field(None, gt=0)
    price_per_kg: Optional[float] = Field(None, gt=0)
    is_paid: Optional[bool] = None
    remarks: Optional[str] = None


class OilCakeSaleRead(OilCakeSaleBase):
    id: UUID
    total: float  # quantity * price_per_kg
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class OilCakeSaleWithCustomer(OilCakeSaleRead):
    customer: Optional[CustomerNewRead] = None
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Manufacturing Schemas
# ============================================================================

class ManufacturingInputCreate(BaseModel):
    raw_material_id: UUID
    quantity: float = Field(gt=0)
    unit: str
    rate: float = Field(gt=0)
    purchase_item_id: Optional[UUID] = None


class ManufacturingInputRead(BaseModel):
    id: UUID
    batch_id: UUID
    raw_material_id: UUID
    quantity: float
    unit: str
    rate: float
    amount: float
    purchase_item_id: Optional[UUID]
    model_config = ConfigDict(from_attributes=True)


class ManufacturingOutputCreate(BaseModel):
    product_id: UUID
    product_variant_id: Optional[UUID] = None
    quantity_kg: Optional[float] = None
    quantity_ltr: Optional[float] = None
    unit: Optional[str] = None
    total_output_quantity: Optional[float] = None
    yield_percentage: Optional[float] = None


class ManufacturingOutputRead(BaseModel):
    id: UUID
    batch_id: UUID
    product_id: UUID
    product_variant_id: Optional[UUID]
    quantity_kg: Optional[float]
    quantity_ltr: Optional[float]
    unit: Optional[str]
    total_output_quantity: Optional[float]
    unit_cost: Optional[float]
    total_cost: Optional[float]
    yield_percentage: Optional[float]
    model_config = ConfigDict(from_attributes=True)


class ManufacturingBatchCreate(BaseModel):
    batch_code: Optional[str] = None
    batch_date: date
    notes: Optional[str] = None
    inputs: List[ManufacturingInputCreate]
    outputs: List[ManufacturingOutputCreate]


class ManufacturingBatchRead(BaseModel):
    id: UUID
    batch_code: Optional[str]
    batch_date: date
    notes: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ManufacturingBatchWithDetails(ManufacturingBatchRead):
    inputs: List[ManufacturingInputRead]
    outputs: List[ManufacturingOutputRead]
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Day Counter Schemas
# ============================================================================

class DayCounterCreate(BaseModel):
    date: date
    opening_cash_balance: float = Field(default=0, ge=0)
    sales_cash: float = Field(default=0, ge=0)
    sales_upi: float = Field(default=0, ge=0)
    sales_card: float = Field(default=0, ge=0)
    sales_credit: float = Field(default=0, ge=0)
    total_expenses_cash: float = Field(default=0, ge=0)
    cash_hand_over: float = Field(default=0, ge=0)
    actual_closing_cash: float = Field(default=0, ge=0)
    remarks: Optional[str] = None


class DayCounterUpdate(BaseModel):
    opening_cash_balance: Optional[float] = Field(None, ge=0)
    sales_cash: Optional[float] = Field(None, ge=0)
    sales_upi: Optional[float] = Field(None, ge=0)
    sales_card: Optional[float] = Field(None, ge=0)
    sales_credit: Optional[float] = Field(None, ge=0)
    total_expenses_cash: Optional[float] = Field(None, ge=0)
    cash_hand_over: Optional[float] = Field(None, ge=0)
    actual_closing_cash: Optional[float] = Field(None, ge=0)
    remarks: Optional[str] = None


class DayCounterRead(BaseModel):
    id: UUID
    date: date
    opening_cash_balance: float
    sales_cash: float
    sales_upi: float
    sales_card: float
    sales_credit: float
    total_sales: float
    total_expenses_cash: float
    cash_hand_over: float
    actual_closing_cash: float
    system_closing_cash: float
    difference: float
    remarks: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Inventory View Schemas
# ============================================================================

class RawMaterialStock(BaseModel):
    raw_material_id: UUID
    raw_material_name: str
    unit: str
    current_stock: float
    total_cost_value: float


class ProductVariantStock(BaseModel):
    product_variant_id: UUID
    product_name: str
    variant_name: str
    sku: Optional[str]
    channel: Optional[str]
    mrp: Optional[float]
    selling_price: Optional[float]
    current_stock: float
    total_cost_value: float


# ============================================================================
# Balance View Schemas
# ============================================================================

class VendorBalance(BaseModel):
    vendor_id: UUID
    name: str
    phone: Optional[str]
    gst_number: Optional[str]
    total_purchase_amount: float
    total_purchase_paid: float
    total_purchase_balance: float
    total_expense_amount: float
    total_expense_paid: float
    total_expense_balance: float
    grand_total_balance_due: float


class CustomerBalance(BaseModel):
    customer_id: UUID
    name: str
    phone: Optional[str]
    gst_number: Optional[str]
    total_billed: float
    total_paid: float
    total_balance_due: float


# ============================================================================
# GST Summary View Schemas
# ============================================================================

class SalesGSTSummary(BaseModel):
    sale_id: UUID
    invoice_number: Optional[str]
    invoice_date: date
    channel: Optional[str]
    customer_name: Optional[str]
    total_taxable_value: float
    total_gst_amount: float
    total_invoice_amount: float


class PurchaseGSTSummary(BaseModel):
    purchase_id: UUID
    invoice_number: Optional[str]
    invoice_date: date
    vendor_name: Optional[str]
    total_taxable_value: float
    total_gst_amount: float
    total_invoice_amount: float

