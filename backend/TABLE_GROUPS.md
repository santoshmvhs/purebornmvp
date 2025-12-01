# Database Schema - Table Groups

This document organizes all database tables by functional area.

## 1. Authentication
- **users** - User accounts and authentication

## 2. Master Data - Parties
- **vendors** - Suppliers/vendors (who you buy from)
- **customers_new** - Customers (who you sell to)

## 3. Master Data - Products
- **product_categories** - Product category classification
- **products_new** - Products (oil types, not pack sizes)
- **product_variants** - Product variants (500ml, 1L, 5L, 15L, etc.)

## 4. Master Data - Materials & Categories
- **raw_materials** - Raw materials (seeds, etc.)
- **expense_categories** - Expense category classification

## 5. Purchase Module
- **purchases** - Purchase invoices/transactions
- **purchase_items** - Purchase line items (raw materials purchased)

## 6. Expense Module
- **expenses** - Business expenses

## 7. Sales Module
- **sales_new** - Sales invoices/transactions (store + online)
- **sale_items_new** - Sales line items

## 8. Manufacturing Module
- **manufacturing_batches** - Manufacturing batch headers
- **manufacturing_inputs** - Raw materials used in batches
- **manufacturing_outputs** - Products produced from batches

## 9. Inventory Module
- **inventory_movements** - Stock ledger for raw materials and product variants

## 10. Day Counter Module
- **day_counters** - Daily cash control and reconciliation

---

## Table Relationships Summary

### Purchase Flow
- `vendors` → `purchases` → `purchase_items` → `raw_materials`

### Sales Flow
- `customers_new` → `sales_new` → `sale_items_new` → `product_variants` → `products_new`

### Manufacturing Flow
- `manufacturing_batches` → `manufacturing_inputs` → `raw_materials`
- `manufacturing_batches` → `manufacturing_outputs` → `products_new` / `product_variants`

### Inventory Tracking
- `inventory_movements` tracks changes for both `raw_materials` and `product_variants`

### Expense Tracking
- `expense_categories` → `expenses` → `vendors` (optional)

