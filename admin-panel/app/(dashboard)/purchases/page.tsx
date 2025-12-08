'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, Plus, Edit, Trash2, Eye, TrendingUp, Wallet, CreditCard, DollarSign, BarChart3, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { purchasesApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditPurchaseDialog } from './edit-dialog';

interface PurchaseItem {
  id: string;
  raw_material_id?: string;
  raw_material?: { name: string };
  description?: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  line_total: number;
}

interface Purchase {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  vendor_id: string;
  vendor?: { name: string };
  purchase_category?: string;
  amount_cash?: number;
  amount_upi?: number;
  amount_card?: number;
  amount_credit?: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  items?: PurchaseItem[];
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      const data = await purchasesApi.getAll();
      setPurchases(data);
    } catch (error) {
      logger.error('Failed to load purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id: string) => {
    try {
      const purchase = await purchasesApi.getById(id);
      setSelectedPurchase(purchase);
      setViewDialogOpen(true);
    } catch (error) {
      logger.error('Failed to load purchase details:', error);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const purchase = await purchasesApi.getById(id);
      setSelectedPurchase(purchase);
      setEditDialogOpen(true);
    } catch (error) {
      logger.error('Failed to load purchase for editing:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase? This will reverse all inventory movements. This action cannot be undone.')) {
      return;
    }

    try {
      await purchasesApi.delete(id);
      await loadPurchases();
    } catch (error: any) {
      logger.error('Failed to delete purchase:', error);
      alert(error.response?.data?.detail || 'Failed to delete purchase');
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Total KPIs (all time)
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
    const totalPaid = purchases.reduce((sum, p) => sum + p.total_paid, 0);
    const totalBalance = purchases.reduce((sum, p) => sum + p.balance_due, 0);
    const totalCount = purchases.length;

    // Payment method totals (all time)
    const totalCash = purchases.reduce((sum, p) => sum + (p.amount_cash || 0), 0);
    const totalUpi = purchases.reduce((sum, p) => sum + (p.amount_upi || 0), 0);
    const totalCard = purchases.reduce((sum, p) => sum + (p.amount_card || 0), 0);
    const totalCredit = purchases.reduce((sum, p) => sum + (p.amount_credit || 0), 0);

    // Monthly KPIs (current month)
    const monthlyPurchases = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.total_amount, 0);

    const monthlyPaid = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.total_paid, 0);

    const monthlyBalance = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.balance_due, 0);

    const monthlyCount = purchases.filter((p) => {
      const purchaseDate = new Date(p.invoice_date);
      return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
    }).length;

    // Monthly payment methods
    const monthlyCash = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + (p.amount_cash || 0), 0);

    const monthlyUpi = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + (p.amount_upi || 0), 0);

    const monthlyCard = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + (p.amount_card || 0), 0);

    const monthlyCredit = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + (p.amount_credit || 0), 0);

    // Last month for comparison
    const lastMonthPurchases = purchases
      .filter((p) => {
        const purchaseDate = new Date(p.invoice_date);
        return isWithinInterval(purchaseDate, { start: lastMonthStart, end: lastMonthEnd });
      })
      .reduce((sum, p) => sum + p.total_amount, 0);

    // Calculate averages
    const avgPurchase = totalCount > 0 ? totalPurchases / totalCount : 0;
    const avgMonthlyPurchase = monthlyCount > 0 ? monthlyPurchases / monthlyCount : 0;
    const dailyAvgPurchase = monthlyCount > 0 ? monthlyPurchases / (new Date().getDate()) : 0;

    // Growth calculation
    const purchaseGrowth = lastMonthPurchases > 0 
      ? ((monthlyPurchases - lastMonthPurchases) / lastMonthPurchases) * 100 
      : 0;

    // Credit ratio
    const creditRatio = totalPurchases > 0 ? (totalCredit / totalPurchases) * 100 : 0;

    return {
      totalPurchases,
      totalPaid,
      totalBalance,
      totalCount,
      monthlyPurchases,
      monthlyPaid,
      monthlyBalance,
      monthlyCount,
      totalCash,
      totalUpi,
      totalCard,
      totalCredit,
      monthlyCash,
      monthlyUpi,
      monthlyCard,
      monthlyCredit,
      avgPurchase,
      avgMonthlyPurchase,
      dailyAvgPurchase,
      purchaseGrowth,
      creditRatio,
      lastMonthPurchases,
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading purchases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchases</h1>
          <p className="text-muted-foreground mt-1">View and manage purchase transactions</p>
        </div>
        <Link href="/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </Link>
      </div>

      {/* KPIs Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Purchase Overview
        </h2>
        
        {/* Primary KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpis.totalCount} purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.monthlyPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {kpis.monthlyCount} purchases
                {kpis.purchaseGrowth !== 0 && (
                  <span className={`flex items-center gap-1 ${kpis.purchaseGrowth > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {kpis.purchaseGrowth > 0 ? '↑' : '↓'} {Math.abs(kpis.purchaseGrowth).toFixed(1)}%
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">₹{kpis.monthlyPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Balance Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.monthlyBalance > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                ₹{kpis.monthlyBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs - Payment Methods & Averages */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Cash Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">₹{kpis.monthlyCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.monthlyPurchases > 0 ? ((kpis.monthlyCash / kpis.monthlyPurchases) * 100).toFixed(1) : 0}% of monthly
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                UPI Purchases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">₹{kpis.monthlyUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.monthlyPurchases > 0 ? ((kpis.monthlyUpi / kpis.monthlyPurchases) * 100).toFixed(1) : 0}% of monthly
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Avg Purchase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.avgMonthlyPurchase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">Per transaction (monthly)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Daily Average
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.dailyAvgPurchase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit & Additional Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">₹{kpis.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.totalBalance > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                ₹{kpis.totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Credit Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.creditRatio > 30 ? 'text-orange-400' : 'text-green-400'}`}>
                {kpis.creditRatio.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Credit purchases</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All Purchases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No purchases found
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium">{purchase.invoice_number || '-'}</TableCell>
                    <TableCell>{format(new Date(purchase.invoice_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{purchase.vendor?.name || '-'}</TableCell>
                    <TableCell className="text-right">₹{purchase.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">₹{purchase.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <span className={purchase.balance_due > 0 ? 'text-red-400' : 'text-green-400'}>
                        ₹{purchase.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(purchase.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(purchase.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(purchase.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Purchase Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
          </DialogHeader>
          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedPurchase.invoice_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedPurchase.invoice_date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedPurchase.vendor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium">₹{selectedPurchase.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              
              {selectedPurchase.items && selectedPurchase.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Material</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Price/Unit</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchase.items.map((item: PurchaseItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.raw_material?.name || item.description || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">₹{item.price_per_unit.toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{item.line_total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Dialog */}
      <EditPurchaseDialog
        purchase={selectedPurchase}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          loadPurchases();
          setSelectedPurchase(null);
        }}
      />
    </div>
  );
}

