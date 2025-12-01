export interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  tax_rate: number;
  stock_qty: number;
  is_active: boolean;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  line_tax: number;
  product?: Product;
}

export interface Sale {
  id: number;
  created_at: string;
  user_id: number;
  customer_id?: number;
  total_amount: number;
  total_tax: number;
  grand_total: number;
  items?: SaleItem[];
  user?: User;
}

export interface DailySalesReport {
  date: string;
  total_sales_count: number;
  total_amount: number;
  total_tax: number;
  total_grand_total: number;
}

export interface MonthlySalesReport {
  year: number;
  month: number;
  total_sales_count: number;
  total_amount: number;
  total_tax: number;
  total_grand_total: number;
}

