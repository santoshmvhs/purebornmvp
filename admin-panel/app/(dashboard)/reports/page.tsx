'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reportsApi } from '@/lib/api';
import { DailySalesReport, MonthlySalesReport } from '@/lib/types';
import { format } from 'date-fns';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [dailyReport, setDailyReport] = useState<DailySalesReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlySalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const [daily, monthly] = await Promise.all([
        reportsApi.getDailySales(today),
        reportsApi.getMonthlySales(currentYear, currentMonth),
      ]);

      setDailyReport(daily);
      setMonthlyReport(monthly);
    } catch (error) {
      logger.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-1">Sales analytics and insights</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Today's Sales</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${dailyReport?.total_grand_total.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Including ${dailyReport?.total_tax.toFixed(2) || '0.00'} tax
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Transactions
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dailyReport?.total_sales_count || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sales completed today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Sale
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${dailyReport && dailyReport.total_sales_count > 0
                  ? (dailyReport.total_grand_total / dailyReport.total_sales_count).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Per transaction
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">This Month's Sales</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${monthlyReport?.total_grand_total.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Including ${monthlyReport?.total_tax.toFixed(2) || '0.00'} tax
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Transactions
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyReport?.total_sales_count || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sales this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Average Sale
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${monthlyReport && monthlyReport.total_sales_count > 0
                  ? (monthlyReport.total_grand_total / monthlyReport.total_sales_count).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Per transaction
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

