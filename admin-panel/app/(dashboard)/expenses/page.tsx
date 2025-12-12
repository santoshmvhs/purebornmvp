'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Plus, Edit, Trash2, TrendingUp, CreditCard, Wallet, DollarSign, BarChart3, AlertCircle } from 'lucide-react';
import { expensesApi, vendorsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format, startOfMonth, endOfMonth, isWithinInterval, subMonths } from 'date-fns';

interface Expense {
  id: string;
  date: string;
  name: string;
  description?: string | null;
  expense_category_id?: string | null;
  vendor_id?: string | null;
  amount_cash: number;
  amount_upi: number;
  amount_card: number;
  amount_credit: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  created_at: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  subcategories?: ExpenseSubcategory[];
}

interface ExpenseSubcategory {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
}

interface Vendor {
  id: string;
  name: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    description: '',
    expense_category_id: '',
    expense_subcategory_id: '',
    vendor_id: '',
    total_amount: '',
    amount_cash: '',
    amount_upi: '',
    amount_card: '',
    amount_credit: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExpenses();
    loadCategories();
    loadVendors();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await expensesApi.getAll({ limit: 1000 });
      setExpenses(data);
    } catch (error) {
      logger.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await expensesApi.getCategories();
      setCategories(data || []);
    } catch (error: any) {
      // Silently handle errors - 422 is expected if endpoint has issues
      // Just set empty array and continue
      setCategories([]);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await vendorsApi.getAll();
      setVendors(data || []);
    } catch (error: any) {
      logger.error('Failed to load vendors:', error);
      setVendors([]);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    try {
      const data = await expensesApi.getSubcategories(categoryId);
      setSubcategories(data || []);
    } catch (error: any) {
      logger.error(`Failed to load subcategories for category ${categoryId}:`, error);
      setSubcategories([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { balanceDue } = calculateTotals();
      
      const payload = {
        date: formData.date,
        name: formData.name,
        description: formData.description || undefined,
        expense_category_id: formData.expense_category_id || undefined,
        expense_subcategory_id: formData.expense_subcategory_id || undefined,
        vendor_id: formData.vendor_id || undefined,
        amount_cash: parseFloat(formData.amount_cash) || 0,
        amount_upi: parseFloat(formData.amount_upi) || 0,
        amount_card: parseFloat(formData.amount_card) || 0,
        amount_credit: balanceDue, // Credit equals balance due
      };

      if (editingExpense) {
        await expensesApi.update(editingExpense.id, payload);
      } else {
        await expensesApi.create(payload);
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadExpenses();
    } catch (error: any) {
      logger.error('Failed to save expense:', error);
      alert(error.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      name: expense.name,
      description: expense.description || '',
      expense_category_id: expense.expense_category_id || '',
      expense_subcategory_id: (expense as any).expense_subcategory_id || '',
      vendor_id: expense.vendor_id || '',
      total_amount: expense.total_amount.toString(),
      amount_cash: expense.amount_cash.toString(),
      amount_upi: expense.amount_upi.toString(),
      amount_card: expense.amount_card.toString(),
      amount_credit: expense.balance_due.toString(), // Credit equals balance due
    });
    // Load subcategories for selected category
    if (expense.expense_category_id) {
      loadSubcategories(expense.expense_category_id);
    }
    setIsDialogOpen(true);
  };
  
  const handleCategoryChange = (categoryId: string) => {
    setFormData({ ...formData, expense_category_id: categoryId, expense_subcategory_id: '' });
    loadSubcategories(categoryId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }

    try {
      await expensesApi.delete(id);
      await loadExpenses();
    } catch (error: any) {
      logger.error('Failed to delete expense:', error);
      alert(error.response?.data?.detail || 'Failed to delete expense');
    }
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      name: '',
      description: '',
      expense_category_id: '',
      vendor_id: '',
      total_amount: '',
      amount_cash: '',
      amount_upi: '',
      amount_card: '',
      amount_credit: '',
    });
  };

  // Calculate totals for display
  const calculateTotals = () => {
    const totalAmount = parseFloat(formData.total_amount) || 0;
    const cash = parseFloat(formData.amount_cash) || 0;
    const upi = parseFloat(formData.amount_upi) || 0;
    const card = parseFloat(formData.amount_card) || 0;
    const totalPaid = cash + upi + card;
    const balanceDue = totalAmount - totalPaid;
    // Credit equals balance due
    const creditAmount = balanceDue;
    
    return { totalAmount, totalPaid, balanceDue, creditAmount };
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Total KPIs (all time)
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
    const totalPaid = expenses.reduce((sum, exp) => sum + exp.total_paid, 0);
    const totalBalance = expenses.reduce((sum, exp) => sum + exp.balance_due, 0);
    const totalCount = expenses.length;

    // Payment method totals (all time)
    const totalCash = expenses.reduce((sum, exp) => sum + exp.amount_cash, 0);
    const totalUpi = expenses.reduce((sum, exp) => sum + exp.amount_upi, 0);
    const totalCard = expenses.reduce((sum, exp) => sum + exp.amount_card, 0);
    const totalCredit = expenses.reduce((sum, exp) => sum + exp.amount_credit, 0);

    // Monthly KPIs (current month)
    const monthlyExpenses = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.total_amount, 0);

    const monthlyPaid = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.total_paid, 0);

    const monthlyBalance = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.balance_due, 0);

    const monthlyCount = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
    }).length;

    // Monthly payment methods
    const monthlyCash = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.amount_cash, 0);

    const monthlyUpi = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.amount_upi, 0);

    const monthlyCard = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.amount_card, 0);

    const monthlyCredit = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, exp) => sum + exp.amount_credit, 0);

    // Last month for comparison
    const lastMonthExpenses = expenses
      .filter((exp) => {
        const expDate = new Date(exp.date);
        return isWithinInterval(expDate, { start: lastMonthStart, end: lastMonthEnd });
      })
      .reduce((sum, exp) => sum + exp.total_amount, 0);

    // Calculate averages
    const avgExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
    const avgMonthlyExpense = monthlyCount > 0 ? monthlyExpenses / monthlyCount : 0;
    const dailyAvgExpense = monthlyCount > 0 ? monthlyExpenses / (new Date().getDate()) : 0;

    // Growth calculation
    const expenseGrowth = lastMonthExpenses > 0 
      ? ((monthlyExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0;

    // Credit ratio
    const creditRatio = totalExpenses > 0 ? (totalCredit / totalExpenses) * 100 : 0;

    // Top categories
    const categoryMap: Record<string, { name: string; total: number }> = {};
    expenses.forEach((exp) => {
      const categoryName = categories.find(c => c.id === exp.expense_category_id)?.name || 'Uncategorized';
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = { name: categoryName, total: 0 };
      }
      categoryMap[categoryName].total += exp.total_amount;
    });
    const topCategories = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return {
      totalExpenses,
      totalPaid,
      totalBalance,
      totalCount,
      monthlyExpenses,
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
      avgExpense,
      avgMonthlyExpense,
      dailyAvgExpense,
      expenseGrowth,
      creditRatio,
      topCategories,
      lastMonthExpenses,
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Manage business expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <Button onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? 'Update expense information.' : 'Record a new business expense.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Expense Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Office Rent, Electricity Bill"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Additional details"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="expense_category_id">Category</Label>
                    <select
                      id="expense_category_id"
                      value={formData.expense_category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select Category (Optional)</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expense_subcategory_id">Subcategory</Label>
                    <select
                      id="expense_subcategory_id"
                      value={formData.expense_subcategory_id}
                      onChange={(e) => setFormData({ ...formData, expense_subcategory_id: e.target.value })}
                      disabled={!formData.expense_category_id}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Subcategory (Optional)</option>
                      {subcategories
                        .filter(sub => sub.category_id === formData.expense_category_id)
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor_id">Vendor</Label>
                  <select
                    id="vendor_id"
                    value={formData.vendor_id}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select Vendor (Optional)</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total_amount">Total Amount *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount_cash">Cash Amount</Label>
                    <Input
                      id="amount_cash"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount_cash}
                      onChange={(e) => setFormData({ ...formData, amount_cash: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount_upi">UPI Amount</Label>
                    <Input
                      id="amount_upi"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount_upi}
                      onChange={(e) => setFormData({ ...formData, amount_upi: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount_card">Card Amount</Label>
                    <Input
                      id="amount_card"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount_card}
                      onChange={(e) => setFormData({ ...formData, amount_card: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount_credit">Credit (Balance Due)</Label>
                    <Input
                      id="amount_credit"
                      type="number"
                      step="0.01"
                      value={calculateTotals().creditAmount.toFixed(2)}
                      readOnly
                      className="bg-muted cursor-not-allowed"
                      title="Credit amount equals balance due (automatically calculated)"
                    />
                  </div>
                </div>
                {/* Totals Display */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Amount:</span>
                    <span className="font-semibold">₹{calculateTotals().totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Paid:</span>
                    <span>₹{calculateTotals().totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Balance Due:</span>
                    <span className={calculateTotals().balanceDue > 0 ? 'text-orange-400 font-semibold' : 'font-semibold'}>
                      ₹{calculateTotals().balanceDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (editingExpense ? 'Updating...' : 'Creating...') : (editingExpense ? 'Update Expense' : 'Create Expense')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Expense Overview
        </h2>
        
        {/* Primary KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpis.totalCount} expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.monthlyExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {kpis.monthlyCount} expenses
                {kpis.expenseGrowth !== 0 && (
                  <span className={`flex items-center gap-1 ${kpis.expenseGrowth > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {kpis.expenseGrowth > 0 ? '↑' : '↓'} {Math.abs(kpis.expenseGrowth).toFixed(1)}%
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
                Cash Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">₹{kpis.monthlyCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.monthlyExpenses > 0 ? ((kpis.monthlyCash / kpis.monthlyExpenses) * 100).toFixed(1) : 0}% of monthly
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                UPI Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">₹{kpis.monthlyUpi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.monthlyExpenses > 0 ? ((kpis.monthlyUpi / kpis.monthlyExpenses) * 100).toFixed(1) : 0}% of monthly
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Avg Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{kpis.avgMonthlyExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
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
              <div className="text-2xl font-bold">₹{kpis.dailyAvgExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Credit & Additional Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
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
              <p className="text-xs text-muted-foreground mt-1">Credit expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Card Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">₹{kpis.monthlyCard.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.monthlyExpenses > 0 ? ((kpis.monthlyCard / kpis.monthlyExpenses) * 100).toFixed(1) : 0}% of monthly
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Categories */}
        {kpis.topCategories.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-3">Top Expense Categories</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {kpis.topCategories.map((category, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {category.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">₹{category.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpis.totalExpenses > 0 ? ((category.total / kpis.totalExpenses) * 100).toFixed(1) : 0}% of total
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => {
                  const category = categories.find(c => c.id === expense.expense_category_id);
                  const subcategory = subcategories.find(s => s.id === (expense as any).expense_subcategory_id);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{expense.name}</TableCell>
                      <TableCell>{category?.name || '-'}</TableCell>
                      <TableCell>{subcategory?.name || '-'}</TableCell>
                      <TableCell className="text-right">₹{expense.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">₹{expense.total_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <span className={expense.balance_due > 0 ? 'text-orange-400' : 'text-green-400'}>
                          ₹{expense.balance_due.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
