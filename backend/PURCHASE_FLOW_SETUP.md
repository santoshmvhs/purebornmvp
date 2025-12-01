# Purchase Flow - End-to-End Setup

## ✅ What's Been Wired Up

### Backend (FastAPI + Async)
1. **Database**: Converted to async with `asyncpg`
   - `app/database.py` - Uses `create_async_engine` with `postgresql+asyncpg://`
   - Automatically converts `postgresql+psycopg://` to `postgresql+asyncpg://`

2. **Purchase Router**: Fully async implementation
   - `POST /purchases` - Creates purchase with multiple items
   - Automatically creates inventory movements (stock IN)
   - Calculates totals, GST, and balances
   - `GET /purchases` - List purchases with filtering
   - `GET /purchases/{id}` - Get purchase details

3. **Supporting Routers**:
   - `/vendors` - CRUD for vendors (async)
   - `/raw-materials` - CRUD for raw materials (async)
   - `/customers` - CRUD for customers (async)

### Frontend (Next.js)
1. **Purchase Form**: `app/(dashboard)/purchases/new/page.tsx`
   - Multi-item form with dynamic rows
   - Vendor and raw material dropdowns
   - Real-time total calculations
   - Payment method tracking (Cash, UPI, Card, Credit)
   - Auto-creates inventory movements via backend

2. **API Functions**: Added to `lib/api.ts`
   - `purchasesApi.create()`
   - `purchasesApi.getAll()`
   - `vendorsApi.getAll()`
   - `rawMaterialsApi.getAll()`

## 🔧 Setup Instructions

### 1. Update .env File
Make sure your `.env` has the Supabase connection string:
```bash
DATABASE_URL=postgresql+asyncpg://postgres.<USER>:<PASSWORD>@db.<hash>.supabase.co:5432/postgres
```

The code automatically converts `postgresql+psycopg://` to `postgresql+asyncpg://` if needed.

### 2. Install Dependencies
```bash
cd backend
source .venv/bin/activate
pip install asyncpg sqlalchemy[asyncio] python-dotenv
```

### 3. Start Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 9000
```

### 4. Start Frontend
```bash
cd admin-panel
npm run dev
```

## 📋 How It Works

### Purchase Creation Flow

1. **User fills form** in `/purchases/new`
   - Selects vendor, date, category
   - Adds multiple items (raw materials)
   - Enters payment details

2. **Frontend sends request** to `POST /purchases`
   ```json
   {
     "invoice_date": "2025-11-30",
     "vendor_id": "uuid",
     "purchase_category": "raw_material",
     "items": [
       {
         "raw_material_id": "uuid",
         "quantity": 500,
         "unit": "kg",
         "price_per_unit": 20,
         "gst_rate": 0.05
       }
     ],
     "amount_cash": 2000,
     "amount_upi": 3000,
     "amount_card": 0,
     "amount_credit": 5000
   }
   ```

3. **Backend processes**:
   - Validates vendor exists
   - Validates raw materials exist
   - Calculates line totals and GST
   - Creates `purchases` record
   - Creates `purchase_items` records
   - **Automatically creates `inventory_movements` records** (stock IN)
   - Calculates payment totals and balance due

4. **Inventory automatically updated**:
   - Stock increases via `inventory_movements` table
   - View `raw_material_current_stock` shows updated quantities

## 🎯 Testing the Flow

1. **Create a vendor**:
   ```bash
   curl -X POST http://localhost:9000/vendors \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Vendor",
       "phone": "1234567890",
       "vendor_type": "raw_material"
     }'
   ```

2. **Create a raw material**:
   ```bash
   curl -X POST http://localhost:9000/raw-materials \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Sesame Seeds",
       "unit": "kg",
       "hsn_code": "1207"
     }'
   ```

3. **Create a purchase** via the UI:
   - Navigate to `/purchases/new`
   - Fill in the form
   - Submit

4. **Verify inventory**:
   ```bash
   curl http://localhost:9000/views/inventory/raw-materials \
     -H "Authorization: Bearer <token>"
   ```

## 📝 Notes

- **Async vs Sync**: The purchase router is fully async. Other routers (auth, products, sales) still use sync sessions. They can be converted later.
- **GST Calculation**: GST rate is expected as a decimal (0.05 for 5%). The frontend converts percentage to decimal.
- **Inventory Movements**: Automatically created for each purchase item with `reference_type='purchase'`.
- **Balance Calculation**: `balance_due = total_amount - (cash + upi + card) + credit`

## 🔄 Next Steps

1. Convert remaining routers to async (optional)
2. Add purchase list page (`/purchases`)
3. Add purchase detail page (`/purchases/[id]`)
4. Apply same pattern to Sales, Manufacturing, etc.

