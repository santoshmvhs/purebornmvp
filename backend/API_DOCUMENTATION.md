# API Documentation - Comprehensive Schema

This document outlines all API endpoints for the comprehensive POS system.

## Base URL
- Development: `http://localhost:9000`
- Production: Configure via `NEXT_PUBLIC_API_URL`

## Authentication
All endpoints (except `/auth/login` and `/auth/register`) require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 🔐 Authentication Endpoints

### POST `/auth/login`
Login and get access token.

**Request:**
```json
Content-Type: application/x-www-form-urlencoded
username=admin&password=admin123
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

### POST `/auth/register`
Register new user (Admin only).

---

## 👥 User Management

### GET `/users/me`
Get current user info.

### GET `/users`
List all users (Admin only).

### PATCH `/users/{user_id}`
Update user (Admin only).

---

## 🏪 Vendors

### GET `/vendors`
List all vendors.
- Query params: `search`, `active_only`

### GET `/vendors/{vendor_id}`
Get vendor by ID.

### POST `/vendors`
Create vendor (Admin only).

### PUT `/vendors/{vendor_id}`
Update vendor (Admin only).

### DELETE `/vendors/{vendor_id}`
Delete vendor (Admin only).

---

## 👤 Customers

### GET `/customers`
List all customers.
- Query params: `search`, `active_only`

### GET `/customers/{customer_id}`
Get customer by ID.

### POST `/customers`
Create customer.

### PUT `/customers/{customer_id}`
Update customer.

### DELETE `/customers/{customer_id}`
Delete customer (Admin only).

---

## 📦 Purchases

### POST `/purchases`
Create a new purchase transaction.

**Request:**
```json
{
  "invoice_number": "INV-001",
  "invoice_date": "2025-11-30",
  "vendor_id": "uuid-here",
  "purchase_category": "raw_material",
  "items": [
    {
      "raw_material_id": "uuid-here",
      "quantity": 500,
      "unit": "kg",
      "price_per_unit": 20,
      "gst_rate": 0.05
    }
  ],
  "amount_cash": 2000,
  "amount_upi": 3000,
  "amount_card": 0,
  "amount_credit": 5000,
  "notes": "Sesame seeds purchase"
}
```

**Response:** Purchase with items and vendor details.

### GET `/purchases`
List purchases.
- Query params: `vendor_id`, `start_date`, `end_date`, `page`, `limit`

### GET `/purchases/{purchase_id}`
Get purchase by ID with all items.

---

## 💰 Expenses

### POST `/expenses`
Create expense.

### GET `/expenses`
List expenses.

### GET `/expenses/{expense_id}`
Get expense by ID.

---

## 🛒 Sales (New Schema)

### POST `/sales`
Create sale (uses new schema with product variants).

**Request:**
```json
{
  "invoice_number": "S-2025-11-30-001",
  "invoice_date": "2025-11-30",
  "invoice_time": "10:15:00",
  "customer_id": "uuid-here",
  "channel": "store",
  "items": [
    {
      "product_variant_id": "uuid-here",
      "quantity": 1
    }
  ],
  "discount_amount": 0,
  "amount_cash": 500,
  "amount_upi": 680,
  "amount_card": 0,
  "amount_credit": 0,
  "remarks": "Walk-in customer"
}
```

### GET `/sales`
List sales.

### GET `/sales/{sale_id}`
Get sale by ID.

---

## 📊 Views & Reports

### GET `/views/inventory/raw-materials`
Get current stock for all raw materials.

**Response:**
```json
[
  {
    "raw_material_id": "uuid",
    "raw_material_name": "Sesame Seeds",
    "unit": "kg",
    "current_stock": 500.0,
    "total_cost_value": 10000.0
  }
]
```

### GET `/views/inventory/product-variants`
Get current stock for all product variants.

### GET `/views/balances/vendors`
Get outstanding balances for all vendors.

**Response:**
```json
[
  {
    "vendor_id": "uuid",
    "name": "Supplier ABC",
    "total_purchase_balance": 5000.0,
    "total_expense_balance": 2000.0,
    "grand_total_balance_due": 7000.0
  }
]
```

### GET `/views/balances/customers`
Get outstanding balances for all customers.

### GET `/views/gst/sales`
Get GST summary for sales invoices.
- Query params: `start_date`, `end_date`

### GET `/views/gst/purchases`
Get GST summary for purchase invoices.
- Query params: `start_date`, `end_date`

---

## 📈 Reports

### GET `/reports/daily`
Get daily sales report.
- Query param: `report_date` (YYYY-MM-DD)

### GET `/reports/monthly`
Get monthly sales report.
- Query params: `year`, `month`

### GET `/reports/gstr1`
Get GSTR-1 report.
- Query params: `start_date`, `end_date`

### GET `/reports/gstr3b`
Get GSTR-3B report.
- Query params: `year`, `month`

---

## 🏭 Manufacturing (TODO)

Endpoints for manufacturing batches will be added:
- `POST /manufacturing/batches` - Create batch
- `GET /manufacturing/batches` - List batches
- `GET /manufacturing/batches/{batch_id}` - Get batch details

---

## 📅 Day Counters (TODO)

Endpoints for day counters will be added:
- `POST /day-counters` - Create/update day counter
- `GET /day-counters/{date}` - Get day counter by date
- `GET /day-counters` - List day counters

---

## 🎯 Screen → API Mapping

### Purchase Screen
- **Create Purchase:** `POST /purchases`
- **List Purchases:** `GET /purchases`
- **Vendor List:** `GET /vendors`
- **Raw Material Stock:** `GET /views/inventory/raw-materials`

### Expense Screen
- **Create Expense:** `POST /expenses`
- **List Expenses:** `GET /expenses`
- **Vendor List:** `GET /vendors`
- **Expense Categories:** (TODO - create router)

### Sales Screen
- **Create Sale:** `POST /sales`
- **List Sales:** `GET /sales`
- **Customer List:** `GET /customers`
- **Product Variant Stock:** `GET /views/inventory/product-variants`

### Day Counter Screen
- **Create/Update:** `POST /day-counters` (TODO)
- **Get by Date:** `GET /day-counters/{date}` (TODO)
- **Auto-calc from sales/expenses:** Use existing endpoints

### Manufacturing Screen
- **Create Batch:** `POST /manufacturing/batches` (TODO)
- **List Batches:** `GET /manufacturing/batches` (TODO)
- **Raw Material Stock:** `GET /views/inventory/raw-materials`

### Products/Masters Screens
- **Vendors:** `GET /vendors`, `POST /vendors`, etc.
- **Customers:** `GET /customers`, `POST /customers`, etc.
- **Raw Materials:** (TODO - create router)
- **Products:** (TODO - create router for new schema)
- **Product Variants:** (TODO - create router)
- **Expense Categories:** (TODO - create router)

---

## 🔄 Data Flow Examples

### Purchase Flow
1. User creates purchase via `POST /purchases`
2. Backend:
   - Creates `purchases` record
   - Creates `purchase_items` records
   - Creates `inventory_movements` records (stock IN)
3. Stock automatically updated via view: `GET /views/inventory/raw-materials`

### Sales Flow
1. User creates sale via `POST /sales`
2. Backend:
   - Creates `sales_new` record
   - Creates `sale_items_new` records
   - Creates `inventory_movements` records (stock OUT)
3. Stock automatically updated via view: `GET /views/inventory/product-variants`

### Manufacturing Flow
1. User creates batch via `POST /manufacturing/batches` (TODO)
2. Backend:
   - Creates `manufacturing_batches` record
   - Creates `manufacturing_inputs` records
   - Creates `manufacturing_outputs` records
   - Creates `inventory_movements` records (raw material OUT, product IN)

---

## 📝 Notes

- All IDs are UUIDs (except User which still uses integer for backward compatibility)
- All monetary values are in the smallest currency unit (paise for INR, or use decimals)
- GST rates are stored as decimals (0.18 for 18%)
- Dates are in ISO format (YYYY-MM-DD)
- Timestamps are in ISO 8601 format with timezone

