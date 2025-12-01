'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  reportsApi, salesApi, productsApi, viewsApi, purchasesApi, 
  expensesApi, manufacturingApi, dayCountersApi, dashboardApi
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { 
  DollarSign, ShoppingCart, Package, TrendingUp, AlertTriangle, 
  TrendingDown, Users, Receipt, Factory, CreditCard, Wallet,
  BarChart3, PieChart, Activity, Target, Zap
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, 
  Pie, Cell, AreaChart, Area 
} from 'recharts';
import Link from 'next/link';

interface ComprehensiveStats {
  // Financial KPIs
  grossProfit: number;
  grossProfitMargin: number;
  netProfit: number;
  cashFlow: number;
  avgTransactionValue: number;
  expenseToSalesRatio: number;
  
  // Inventory KPIs
  totalInventoryValue: number;
  inventoryTurnover: number;
  stockOutRisk: number;
  
  // Sales Performance
  salesGrowthDoD: number;
  salesGrowthWoW: number;
  salesGrowthMoM: number;
  totalDiscounts: number;
  discountPercentage: number;
  
  // Purchase/Vendor
  avgPurchaseOrderValue: number;
  purchaseFrequency: number;
  
  // Manufacturing
  manufacturingBatches: number;
  avgYieldPercentage: number;
  productionValue: number;
  
  // Operational
  cashAccuracy: number;
  creditSalesRatio: number;
  
  // Basic stats
  todaySales: number;
  todayCount: number;
  monthlySales: number;
  monthlyCount: number;
  totalProducts: number;
  lowStock: number;
  vendorBalance: number;
  customerBalance: number;
}

interface PaymentMethodData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

interface TopItem {
  name: string;
  value: number;
}

interface AgingBucket {
  range: string;
  amount: number;
  count: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const [stats, setStats] = useState<ComprehensiveStats>({
    grossProfit: 0,
    grossProfitMargin: 0,
    netProfit: 0,
    cashFlow: 0,
    avgTransactionValue: 0,
    expenseToSalesRatio: 0,
    totalInventoryValue: 0,
    inventoryTurnover: 0,
    stockOutRisk: 0,
    salesGrowthDoD: 0,
    salesGrowthWoW: 0,
    salesGrowthMoM: 0,
    totalDiscounts: 0,
    discountPercentage: 0,
    avgPurchaseOrderValue: 0,
    purchaseFrequency: 0,
    manufacturingBatches: 0,
    avgYieldPercentage: 0,
    productionValue: 0,
    cashAccuracy: 0,
    creditSalesRatio: 0,
    todaySales: 0,
    todayCount: 0,
    monthlySales: 0,
    monthlyCount: 0,
    totalProducts: 0,
    lowStock: 0,
    vendorBalance: 0,
    customerBalance: 0,
  });
  
  const [salesChartData, setSalesChartData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [topProducts, setTopProducts] = useState<TopItem[]>([]);
  const [topVendors, setTopVendors] = useState<TopItem[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<PaymentMethodData[]>([]);
  const [receivablesAging, setReceivablesAging] = useState<AgingBucket[]>([]);
  const [payablesAging, setPayablesAging] = useState<AgingBucket[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endOfCurrentMonth = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch KPIs from backend (single optimized call)
      const [kpis, variantStock, rawMaterialStock, recentSales, recentPurchases, allSales] = await Promise.all([
        dashboardApi.getKPIs({ start_date: startOfCurrentMonth, end_date: endOfCurrentMonth }).catch(() => null),
        viewsApi.getProductVariantStock().catch(() => []),
        viewsApi.getRawMaterialStock().catch(() => []),
        salesApi.getAll({ limit: 10 }).catch(() => []),
        purchasesApi.getAll({ limit: 10 }).catch(() => []),
        salesApi.getAll({ start_date: startOfCurrentMonth, end_date: endOfCurrentMonth, limit: 1000 }).catch(() => []),
      ]);

      // Use backend KPIs if available, otherwise fallback to zeros
      const kpiData = kpis || {
        gross_profit: 0,
        gross_profit_margin: 0,
        net_profit: 0,
        cash_flow: 0,
        avg_transaction_value: 0,
        expense_to_sales_ratio: 0,
        sales_growth_dod: 0,
        sales_growth_wow: 0,
        sales_growth_mom: 0,
        total_discounts: 0,
        discount_percentage: 0,
        avg_purchase_order_value: 0,
        purchase_frequency: 0,
        manufacturing_batches: 0,
        cash_accuracy: 0,
        credit_sales_ratio: 0,
        today_sales: 0,
        today_count: 0,
        monthly_sales: 0,
        monthly_count: 0,
        total_products: 0,
        vendor_balance: 0,
        customer_balance: 0,
      };
      
      // Payment Method Distribution (still needs sales data)
      const paymentMethods: PaymentMethodData[] = [
        {
          name: 'Cash',
          value: (allSales as any[]).reduce((sum, s) => sum + (s.amount_cash || 0), 0),
          color: '#10b981',
        },
        {
          name: 'UPI',
          value: (allSales as any[]).reduce((sum, s) => sum + (s.amount_upi || 0), 0),
          color: '#3b82f6',
        },
        {
          name: 'Card',
          value: (allSales as any[]).reduce((sum, s) => sum + (s.amount_card || 0), 0),
          color: '#f59e0b',
        },
        {
          name: 'Credit',
          value: (allSales as any[]).reduce((sum, s) => sum + (s.amount_credit || 0), 0),
          color: '#ef4444',
        },
      ].filter(p => p.value > 0);
      
      // Top Products (by sales quantity)
      const productSales: Record<string, number> = {};
      (allSales as any[]).forEach((sale: any) => {
        if (sale.items) {
          sale.items.forEach((item: any) => {
            const productName = item.product_variant?.product?.name || item.product_variant?.variant_name || 'Unknown';
            productSales[productName] = (productSales[productName] || 0) + (item.quantity || 0);
          });
        }
      });
      const topProductsList = Object.entries(productSales)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      // Top Vendors (simplified - would need purchase data with vendor info)
      const topVendorsList: TopItem[] = [];
      
      // Inventory KPIs
      const totalInventoryValue = 
        (variantStock as any[]).reduce((sum, v) => sum + (v.total_cost_value || 0), 0) +
        (rawMaterialStock as any[]).reduce((sum, r) => sum + (r.total_cost_value || 0), 0);
      
      // Inventory Turnover (simplified)
      const inventoryTurnover = 0; // Would need COGS from backend
      
      // Stock Out Risk
      const stockOutRisk = (variantStock as any[]).filter((v: any) => (v.current_stock || 0) < 5).length;
      
      // Low Stock Items
      const lowStockVariants = (variantStock as any[]).filter((v: any) => (v.current_stock || 0) < 10);
      const lowStockList = lowStockVariants
        .slice(0, 10)
        .map((v: any) => ({
          product_variant_id: v.product_variant_id,
          product_name: v.product_name,
          variant_name: v.variant_name,
          current_stock: v.current_stock,
        }));
      
      // Recent Transactions
      const transactions: any[] = [
        ...(recentSales as any[]).map((sale: any) => ({
          id: sale.id,
          date: sale.invoice_date || sale.created_at,
          type: 'sale' as const,
          amount: sale.net_amount || sale.total_amount || 0,
          customer: sale.customer?.name,
        })),
        ...(recentPurchases as any[]).map((purchase: any) => ({
          id: purchase.id,
          date: purchase.invoice_date || purchase.created_at,
          type: 'purchase' as const,
          amount: purchase.total_amount || 0,
          vendor: purchase.vendor?.name,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);
      
      // Generate chart data for last 7 days (simplified - would need daily sales data)
      const chartData: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        chartData.push({
          date: format(date, 'MMM dd'),
          sales: i === 0 ? kpiData.today_sales : 0, // Only today's data available
          count: i === 0 ? kpiData.today_count : 0,
        });
      }
      
      // Expense Breakdown (simplified - would need expense data)
      const expenseBreakdownList: PaymentMethodData[] = [];
      
      // Receivables/Payables Aging (simplified - would need balance data with dates)
      const receivablesAgingData: AgingBucket[] = [
        { range: '0-30 days', amount: 0, count: 0 },
        { range: '31-60 days', amount: 0, count: 0 },
        { range: '61-90 days', amount: 0, count: 0 },
        { range: '90+ days', amount: 0, count: 0 },
      ];
      
      const payablesAgingData: AgingBucket[] = [
        { range: '0-30 days', amount: 0, count: 0 },
        { range: '31-60 days', amount: 0, count: 0 },
        { range: '61-90 days', amount: 0, count: 0 },
        { range: '90+ days', amount: 0, count: 0 },
      ];
      
      setStats({
        grossProfit: kpiData.gross_profit,
        grossProfitMargin: kpiData.gross_profit_margin,
        netProfit: kpiData.net_profit,
        cashFlow: kpiData.cash_flow,
        avgTransactionValue: kpiData.avg_transaction_value,
        expenseToSalesRatio: kpiData.expense_to_sales_ratio,
        totalInventoryValue,
        inventoryTurnover,
        stockOutRisk,
        salesGrowthDoD: kpiData.sales_growth_dod,
        salesGrowthWoW: kpiData.sales_growth_wow,
        salesGrowthMoM: kpiData.sales_growth_mom,
        totalDiscounts: kpiData.total_discounts,
        discountPercentage: kpiData.discount_percentage,
        avgPurchaseOrderValue: kpiData.avg_purchase_order_value,
        purchaseFrequency: kpiData.purchase_frequency,
        manufacturingBatches: kpiData.manufacturing_batches,
        avgYieldPercentage: 85, // Placeholder - would need manufacturing data
        productionValue: 0, // Placeholder
        cashAccuracy: kpiData.cash_accuracy,
        creditSalesRatio: kpiData.credit_sales_ratio,
        todaySales: kpiData.today_sales,
        todayCount: kpiData.today_count,
        monthlySales: kpiData.monthly_sales,
        monthlyCount: kpiData.monthly_count,
        totalProducts: kpiData.total_products,
        lowStock: lowStockVariants.length,
        vendorBalance: kpiData.vendor_balance,
        customerBalance: kpiData.customer_balance,
      });
      
      setSalesChartData(chartData);
      setPaymentMethodData(paymentMethods);
      setTopProducts(topProductsList);
      setTopVendors(topVendorsList);
      setExpenseBreakdown(expenseBreakdownList);
      setReceivablesAging(receivablesAgingData);
      setPayablesAging(payablesAgingData);
      setLowStockItems(lowStockList);
      setRecentTransactions(transactions);
    } catch (err: any) {
      logger.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading dashboard...</div>
          <div className="text-sm text-muted-foreground">Please wait while we fetch your data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button onClick={loadDashboardData} className="ml-2 underline hover:no-underline">
              Try again
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Comprehensive business analytics and KPIs</p>
      </div>

      {/* Financial KPIs Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Financial Performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gross Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.grossProfitMargin.toFixed(1)}% margin</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{stats.cashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Net inflow/outflow</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.avgTransactionValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Per sale</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expense Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expenseToSalesRatio.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">of sales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditSalesRatio.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">of total sales</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sales Performance Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Sales Performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.todayCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.monthlySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.monthlyCount} transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Growth (DoD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-1 ${stats.salesGrowthDoD >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.salesGrowthDoD >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {stats.salesGrowthDoD.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Growth (MoM)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-1 ${stats.salesGrowthMoM >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.salesGrowthMoM >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {stats.salesGrowthMoM.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">vs last month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory & Operations Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory & Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">At cost</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inventoryTurnover.toFixed(2)}x</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock-Out Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{stats.stockOutRisk}</div>
              <p className="text-xs text-muted-foreground mt-1">Critical items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground mt-1">Need restock</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Purchase & Vendor Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Purchases & Vendors
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg PO Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.avgPurchaseOrderValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Per order</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.purchaseFrequency}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendor Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">₹{stats.vendorBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Customer Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">₹{stats.customerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Receivables</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manufacturing Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Manufacturing
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Batches This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.manufacturingBatches}</div>
              <p className="text-xs text-muted-foreground mt-1">Production batches</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Yield %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgYieldPercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Efficiency</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Production Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.productionValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Sales']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Method Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Vendors */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" stroke="currentColor" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vendors by Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topVendors}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" stroke="currentColor" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value: any) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown & Aging Reports */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[300px]">
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${stats.cashAccuracy >= 95 ? 'text-green-400' : stats.cashAccuracy >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stats.cashAccuracy.toFixed(1)}%
                </div>
                <p className="text-muted-foreground">Today's accuracy</p>
                <Badge variant={stats.cashAccuracy >= 95 ? 'default' : 'destructive'} className="mt-4">
                  {stats.cashAccuracy >= 95 ? 'Excellent' : stats.cashAccuracy >= 90 ? 'Good' : 'Needs Attention'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Reports */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receivables Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age Range</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivablesAging.map((bucket, index) => (
                    <TableRow key={index}>
                      <TableCell>{bucket.range}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{bucket.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{bucket.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payables Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Age Range</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payablesAging.map((bucket, index) => (
                    <TableRow key={index}>
                      <TableCell>{bucket.range}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{bucket.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">{bucket.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions & Low Stock */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link href="/sales" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent transactions
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.slice(0, 5).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell className="text-sm">
                          {format(new Date(txn.date), 'MMM dd')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={txn.type === 'sale' ? 'default' : 'secondary'}>
                            {txn.type === 'sale' ? 'Sale' : 'Purchase'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Low Stock Items</CardTitle>
              <Link href="/inventory" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All items are well stocked</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.product_variant_id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.variant_name}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${
                            item.current_stock < 5 
                              ? 'text-red-400' 
                              : item.current_stock < 10 
                              ? 'text-orange-400' 
                              : 'text-yellow-400'
                          }`}>
                            {item.current_stock.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
