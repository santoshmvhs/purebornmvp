-- Enable UUID generator (Supabase usually has this, but keep it here)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";



------------------------------------------------------------

-- 1. MASTER TABLES

------------------------------------------------------------



-- Vendors: who you buy from / pay

CREATE TABLE public.vendors (

  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name         text NOT NULL,

  phone        text,

  email        text,

  gst_number   text,

  address      text,

  vendor_type  text, -- e.g. 'raw_material', 'service', 'both'

  is_active    boolean NOT NULL DEFAULT true,

  created_at   timestamptz NOT NULL DEFAULT now()

);



-- Customers: who you sell to (for credit tracking)

CREATE TABLE public.customers (

  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name         text NOT NULL,

  phone        text,

  email        text,

  gst_number   text,

  address      text,

  is_active    boolean NOT NULL DEFAULT true,

  created_at   timestamptz NOT NULL DEFAULT now()

);



-- Raw Materials: seeds, etc.

CREATE TABLE public.raw_materials (

  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name          text NOT NULL,

  unit          text NOT NULL, -- e.g. 'kg', 'ltr'

  hsn_code      text,

  reorder_level numeric(12,3),

  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now()

);



-- Product Categories

CREATE TABLE public.product_categories (

  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name       text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()

);



-- Products (oil type, not pack size)

CREATE TABLE public.products (

  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name          text NOT NULL,

  product_code  text UNIQUE, -- your internal code

  category_id   uuid REFERENCES public.product_categories(id) ON DELETE RESTRICT,

  base_unit     text NOT NULL, -- 'L', 'kg'

  hsn_code      text NOT NULL,

  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now()

);



-- Product Variants (500ml, 1L, 5L, 15L)

CREATE TABLE public.product_variants (

  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id    uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,

  variant_name  text NOT NULL,  -- '500 ml', '1 L', etc.

  multiplier    numeric(10,3) NOT NULL, -- 0.5, 1, 5, 15 in base unit

  sku           text UNIQUE,

  barcode       text,

  mrp           numeric(14,2),

  selling_price numeric(14,2),

  cost_price    numeric(14,2),

  channel       text, -- 'store', 'online', 'both'

  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now()

);



-- Expense Categories

CREATE TABLE public.expense_categories (

  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name       text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now()

);



------------------------------------------------------------

-- 2. PURCHASE MODULE

------------------------------------------------------------



-- Purchase header

CREATE TABLE public.purchases (

  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_number  text,

  invoice_date    date NOT NULL,

  vendor_id       uuid NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,

  purchase_category text, -- 'raw_material', 'packing', 'service', etc.

  total_amount    numeric(14,2) NOT NULL DEFAULT 0,

  amount_cash     numeric(14,2) NOT NULL DEFAULT 0,

  amount_upi      numeric(14,2) NOT NULL DEFAULT 0,

  amount_card     numeric(14,2) NOT NULL DEFAULT 0,

  amount_credit   numeric(14,2) NOT NULL DEFAULT 0,

  total_paid      numeric(14,2) NOT NULL DEFAULT 0,

  balance_due     numeric(14,2) NOT NULL DEFAULT 0,

  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now()

);



-- Purchase line items (multiple raw materials per purchase)

CREATE TABLE public.purchase_items (

  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  purchase_id     uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,

  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE RESTRICT,

  description     text,

  quantity        numeric(14,3) NOT NULL,

  unit            text NOT NULL,

  price_per_unit  numeric(14,4) NOT NULL,

  line_total      numeric(14,2) NOT NULL,

  gst_rate        numeric(5,2),   -- percent

  gst_amount      numeric(14,2),

  taxable_value   numeric(14,2)

);



------------------------------------------------------------

-- 3. EXPENSE MODULE

------------------------------------------------------------



CREATE TABLE public.expenses (

  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  date                date NOT NULL,

  name                text NOT NULL,

  description         text,

  expense_category_id uuid REFERENCES public.expense_categories(id) ON DELETE RESTRICT,

  vendor_id           uuid REFERENCES public.vendors(id) ON DELETE RESTRICT,

  amount_cash         numeric(14,2) NOT NULL DEFAULT 0,

  amount_upi          numeric(14,2) NOT NULL DEFAULT 0,

  amount_card         numeric(14,2) NOT NULL DEFAULT 0,

  amount_credit       numeric(14,2) NOT NULL DEFAULT 0,

  total_amount        numeric(14,2) NOT NULL DEFAULT 0,

  total_paid          numeric(14,2) NOT NULL DEFAULT 0,

  balance_due         numeric(14,2) NOT NULL DEFAULT 0,

  created_at          timestamptz NOT NULL DEFAULT now()

);



------------------------------------------------------------

-- 4. SALES MODULE (STORE + ONLINE)

------------------------------------------------------------



-- Sales header

CREATE TABLE public.sales (

  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_number text,

  invoice_date   date NOT NULL,

  invoice_time   time,

  customer_id    uuid REFERENCES public.customers(id) ON DELETE RESTRICT,

  channel        text, -- 'store', 'online'

  total_amount   numeric(14,2) NOT NULL DEFAULT 0,

  discount_amount numeric(14,2) NOT NULL DEFAULT 0,

  tax_amount     numeric(14,2) NOT NULL DEFAULT 0,

  net_amount     numeric(14,2) NOT NULL DEFAULT 0,

  amount_cash    numeric(14,2) NOT NULL DEFAULT 0,

  amount_upi     numeric(14,2) NOT NULL DEFAULT 0,

  amount_card    numeric(14,2) NOT NULL DEFAULT 0,

  amount_credit  numeric(14,2) NOT NULL DEFAULT 0,

  total_paid     numeric(14,2) NOT NULL DEFAULT 0,

  balance_due    numeric(14,2) NOT NULL DEFAULT 0,

  remarks        text,

  created_at     timestamptz NOT NULL DEFAULT now()

);



-- Sales line items

CREATE TABLE public.sale_items (

  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sale_id           uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,

  product_variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,

  quantity          numeric(14,3) NOT NULL,

  unit_price        numeric(14,4) NOT NULL,

  line_total        numeric(14,2) NOT NULL,

  gst_rate          numeric(5,2),

  gst_amount        numeric(14,2),

  taxable_value     numeric(14,2)

);



------------------------------------------------------------

-- 5. MANUFACTURING / BATCHES

------------------------------------------------------------



-- Batch header

CREATE TABLE public.manufacturing_batches (

  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_code text UNIQUE,

  batch_date date NOT NULL,

  notes      text,

  created_at timestamptz NOT NULL DEFAULT now()

);



-- Batch inputs: multiple raw materials per batch

CREATE TABLE public.manufacturing_inputs (

  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_id        uuid NOT NULL REFERENCES public.manufacturing_batches(id) ON DELETE CASCADE,

  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE RESTRICT,

  quantity        numeric(14,3) NOT NULL,

  unit            text NOT NULL,

  rate            numeric(14,4) NOT NULL,

  amount          numeric(14,2) NOT NULL,

  purchase_item_id uuid REFERENCES public.purchase_items(id) ON DELETE SET NULL

);



-- Batch outputs: products/products_variants from that batch

CREATE TABLE public.manufacturing_outputs (

  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  batch_id           uuid NOT NULL REFERENCES public.manufacturing_batches(id) ON DELETE CASCADE,

  product_id         uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,

  product_variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,

  quantity_kg        numeric(14,3),

  quantity_ltr       numeric(14,3),

  unit               text,

  total_output_quantity numeric(14,3),

  unit_cost          numeric(14,4),

  total_cost         numeric(14,2),

  yield_percentage   numeric(7,3)

);



------------------------------------------------------------

-- 6. INVENTORY MOVEMENTS

------------------------------------------------------------



-- Generic stock ledger for raw materials + product variants

CREATE TABLE public.inventory_movements (

  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  date_time      timestamptz NOT NULL DEFAULT now(),

  item_type      text NOT NULL, -- 'raw_material' or 'product_variant'

  item_id        uuid NOT NULL, -- raw_materials.id OR product_variants.id (enforced in app)

  quantity_change numeric(14,3) NOT NULL, -- +ve IN, -ve OUT

  unit           text NOT NULL,

  cost_per_unit  numeric(14,4),

  total_cost     numeric(14,2),

  reference_type text, -- 'purchase', 'manufacturing_input', 'manufacturing_output', 'sale', 'adjustment'

  reference_id   uuid,

  created_at     timestamptz NOT NULL DEFAULT now()

);



-- (Optional) You can add an index for faster stock/report queries

CREATE INDEX inventory_movements_item_idx

  ON public.inventory_movements (item_type, item_id);



------------------------------------------------------------

-- 7. DAY COUNTER (CASH CONTROL)

------------------------------------------------------------



CREATE TABLE public.day_counters (

  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  date                  date NOT NULL UNIQUE,

  opening_cash_balance  numeric(14,2) NOT NULL DEFAULT 0,

  sales_cash            numeric(14,2) NOT NULL DEFAULT 0,

  sales_upi             numeric(14,2) NOT NULL DEFAULT 0,

  sales_card            numeric(14,2) NOT NULL DEFAULT 0,

  sales_credit          numeric(14,2) NOT NULL DEFAULT 0,

  total_sales           numeric(14,2) NOT NULL DEFAULT 0,

  total_expenses_cash   numeric(14,2) NOT NULL DEFAULT 0,

  cash_hand_over        numeric(14,2) NOT NULL DEFAULT 0,

  actual_closing_cash   numeric(14,2) NOT NULL DEFAULT 0,

  system_closing_cash   numeric(14,2) NOT NULL DEFAULT 0,

  difference            numeric(14,2) NOT NULL DEFAULT 0,

  remarks               text,

  created_at            timestamptz NOT NULL DEFAULT now()

);

