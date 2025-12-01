-- ============================================================================
-- 1. INVENTORY VIEWS
-- ============================================================================

-- 1.1 Raw material current stock
CREATE OR REPLACE VIEW public.raw_material_current_stock AS
SELECT
  rm.id                   AS raw_material_id,
  rm.name                 AS raw_material_name,
  rm.unit                 AS unit,
  COALESCE(SUM(CASE 
      WHEN im.item_type = 'raw_material' THEN im.quantity_change
      ELSE 0
  END), 0)                AS current_stock,
  COALESCE(SUM(CASE 
      WHEN im.item_type = 'raw_material' THEN im.total_cost
      ELSE 0
  END), 0)                AS total_cost_value
FROM public.raw_materials rm
LEFT JOIN public.inventory_movements im
  ON im.item_id = rm.id
  AND im.item_type = 'raw_material'
GROUP BY rm.id, rm.name, rm.unit;

-- 1.2 Product variant current stock
CREATE OR REPLACE VIEW public.product_variant_current_stock AS
SELECT
  pv.id                    AS product_variant_id,
  p.name                   AS product_name,
  pv.variant_name,
  pv.sku,
  pv.channel,
  pv.mrp,
  pv.selling_price,
  COALESCE(SUM(CASE 
      WHEN im.item_type = 'product_variant' THEN im.quantity_change
      ELSE 0
  END), 0)                 AS current_stock,
  COALESCE(SUM(CASE 
      WHEN im.item_type = 'product_variant' THEN im.total_cost
      ELSE 0
  END), 0)                 AS total_cost_value
FROM public.product_variants pv
JOIN public.products_new p ON p.id = pv.product_id
LEFT JOIN public.inventory_movements im
  ON im.item_id = pv.id
  AND im.item_type = 'product_variant'
GROUP BY pv.id, p.name, pv.variant_name, pv.sku, pv.channel, pv.mrp, pv.selling_price;

-- ============================================================================
-- 2. VENDOR / CUSTOMER BALANCE VIEWS
-- ============================================================================

-- 2.1 Vendor balances (purchases + expenses)
CREATE OR REPLACE VIEW public.vendor_balances AS
WITH vendor_activity AS (
  SELECT
    v.id AS vendor_id,
    v.name,
    v.phone,
    v.gst_number,
    -- Purchases
    COALESCE(SUM(p.total_amount), 0) AS total_purchase_amount,
    COALESCE(SUM(p.total_paid), 0)   AS total_purchase_paid,
    COALESCE(SUM(p.balance_due), 0)  AS total_purchase_balance
  FROM public.vendors v
  LEFT JOIN public.purchases p
    ON p.vendor_id = v.id
  GROUP BY v.id, v.name, v.phone, v.gst_number
),
vendor_expenses AS (
  SELECT
    v.id AS vendor_id,
    COALESCE(SUM(e.total_amount), 0) AS total_expense_amount,
    COALESCE(SUM(e.total_paid), 0)   AS total_expense_paid,
    COALESCE(SUM(e.balance_due), 0)  AS total_expense_balance
  FROM public.vendors v
  LEFT JOIN public.expenses e
    ON e.vendor_id = v.id
  GROUP BY v.id
)
SELECT
  va.vendor_id,
  va.name,
  va.phone,
  va.gst_number,
  va.total_purchase_amount,
  va.total_purchase_paid,
  va.total_purchase_balance,
  ve.total_expense_amount,
  ve.total_expense_paid,
  ve.total_expense_balance,
  (va.total_purchase_balance + ve.total_expense_balance) AS grand_total_balance_due
FROM vendor_activity va
LEFT JOIN vendor_expenses ve
  ON ve.vendor_id = va.vendor_id;

-- 2.2 Customer balances (who owes you)
CREATE OR REPLACE VIEW public.customer_balances AS
SELECT
  c.id AS customer_id,
  c.name,
  c.phone,
  c.gst_number,
  COALESCE(SUM(s.net_amount), 0)    AS total_billed,
  COALESCE(SUM(s.total_paid), 0)    AS total_paid,
  COALESCE(SUM(s.balance_due), 0)   AS total_balance_due
FROM public.customers_new c
LEFT JOIN public.sales_new s
  ON s.customer_id = c.id
GROUP BY c.id, c.name, c.phone, c.gst_number;

-- ============================================================================
-- 3. GST SUMMARY VIEWS
-- ============================================================================

-- 3.1 Sales GST per invoice
CREATE OR REPLACE VIEW public.sales_gst_summary AS
SELECT
  s.id            AS sale_id,
  s.invoice_number,
  s.invoice_date,
  s.channel,
  c.name          AS customer_name,
  SUM(si.taxable_value) AS total_taxable_value,
  SUM(si.gst_amount)    AS total_gst_amount,
  SUM(si.line_total)    AS total_invoice_amount
FROM public.sales_new s
JOIN public.sale_items_new si ON si.sale_id = s.id
LEFT JOIN public.customers_new c ON c.id = s.customer_id
GROUP BY s.id, s.invoice_number, s.invoice_date, s.channel, c.name;

-- 3.2 Purchase GST per invoice
CREATE OR REPLACE VIEW public.purchase_gst_summary AS
SELECT
  p.id            AS purchase_id,
  p.invoice_number,
  p.invoice_date,
  v.name          AS vendor_name,
  SUM(pi.taxable_value) AS total_taxable_value,
  SUM(pi.gst_amount)    AS total_gst_amount,
  SUM(pi.line_total)    AS total_invoice_amount
FROM public.purchases p
JOIN public.purchase_items pi ON pi.purchase_id = p.id
LEFT JOIN public.vendors v     ON v.id = p.vendor_id
GROUP BY p.id, p.invoice_number, p.invoice_date, v.name;

