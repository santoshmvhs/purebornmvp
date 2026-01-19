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
  id: string; // UUID
  sale_id: string; // UUID
  product_variant_id: string; // UUID
  quantity: number;
  unit_price: number;
  line_total: number;
  gst_rate?: number;
  gst_amount?: number;
  taxable_value?: number;
  product_variant?: {
    id: string;
    product_id: string;
    variant_name: string;
    product_name?: string;
    product?: {
      id: string;
      name: string;
    };
  };
  // Legacy fields for backward compatibility
  product_id?: number;
  line_tax?: number;
  product?: Product;
}

export interface Sale {
  id: string; // UUID
  invoice_number?: string;
  invoice_date: string;
  invoice_time?: string;
  customer_id?: string;
  channel?: string;
  total_amount: number;
  discount_amount?: number;
  tax_amount: number;
  net_amount: number;
  amount_cash?: number;
  amount_upi?: number;
  amount_card?: number;
  amount_credit?: number;
  total_paid?: number;
  balance_due?: number;
  remarks?: string;
  created_at: string;
  items?: SaleItem[];
  customer?: any;
  // Legacy fields for backward compatibility
  total_tax?: number; // Alias for tax_amount
  grand_total?: number; // Alias for net_amount
  user_id?: number;
  user?: User;
  is_interstate?: boolean;
  igst_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
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

