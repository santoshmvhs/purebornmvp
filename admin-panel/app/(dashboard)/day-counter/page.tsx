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
import { Calendar, Plus, Edit, Trash2, FileText } from 'lucide-react';
import { dayCountersApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

interface DayCounter {
  id: string;
  date: string;
  opening_cash_balance: number;
  sales_cash: number;
  sales_upi: number;
  sales_card: number;
  sales_credit: number;
  total_sales: number;
  total_expenses_cash: number;
  cash_hand_over: number;
  actual_closing_cash: number;
  system_closing_cash: number;
  difference: number;
  remarks: string | null;
  created_at: string;
}

export default function DayCounterPage() {
  const [dayCounters, setDayCounters] = useState<DayCounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDayCounter, setEditingDayCounter] = useState<DayCounter | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    opening_cash_balance: '',
    sales_cash: '',
    sales_upi: '',
    sales_card: '',
    sales_credit: '',
    total_expenses_cash: '',
    cash_hand_over: '',
    actual_closing_cash: '',
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDayCounters();
  }, []);

  const loadDayCounters = async () => {
    try {
      const data = await dayCountersApi.getAll();
      setDayCounters(data || []);
    } catch (error) {
      logger.error('Failed to load day counters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (dayCounter?: DayCounter) => {
    if (dayCounter) {
      setEditingDayCounter(dayCounter);
      setFormData({
        date: dayCounter.date,
        opening_cash_balance: String(dayCounter.opening_cash_balance || 0),
        sales_cash: String(dayCounter.sales_cash || 0),
        sales_upi: String(dayCounter.sales_upi || 0),
        sales_card: String(dayCounter.sales_card || 0),
        sales_credit: String(dayCounter.sales_credit || 0),
        total_expenses_cash: String(dayCounter.total_expenses_cash || 0),
        cash_hand_over: String(dayCounter.cash_hand_over || 0),
        actual_closing_cash: String(dayCounter.actual_closing_cash || 0),
        remarks: dayCounter.remarks || '',
      });
    } else {
      setEditingDayCounter(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        opening_cash_balance: '',
        sales_cash: '',
        sales_upi: '',
        sales_card: '',
        sales_credit: '',
        total_expenses_cash: '',
        cash_hand_over: '',
        actual_closing_cash: '',
        remarks: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDayCounter(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        date: formData.date,
        opening_cash_balance: parseFloat(formData.opening_cash_balance) || 0,
        sales_cash: parseFloat(formData.sales_cash) || 0,
        sales_upi: parseFloat(formData.sales_upi) || 0,
        sales_card: parseFloat(formData.sales_card) || 0,
        sales_credit: parseFloat(formData.sales_credit) || 0,
        total_expenses_cash: parseFloat(formData.total_expenses_cash) || 0,
        cash_hand_over: parseFloat(formData.cash_hand_over) || 0,
        actual_closing_cash: parseFloat(formData.actual_closing_cash) || 0,
        remarks: formData.remarks || null,
      };

      if (editingDayCounter) {
        await dayCountersApi.update(formData.date, data);
      } else {
        await dayCountersApi.create(data);
      }

      await loadDayCounters();
      handleCloseDialog();
    } catch (error: any) {
      logger.error('Failed to save day counter:', error);
      alert(error.response?.data?.detail || 'Failed to save day counter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!confirm('Are you sure you want to delete this day counter?')) {
      return;
    }
    try {
      await dayCountersApi.delete(date);
      await loadDayCounters();
    } catch (error) {
      logger.error('Failed to delete day counter:', error);
      alert('Failed to delete day counter');
    }
  };

  const calculateTotalSales = (dc: DayCounter) => {
    return (dc.sales_cash || 0) + (dc.sales_upi || 0) + (dc.sales_card || 0) + (dc.sales_credit || 0);
  };

  const calculateSystemClosing = (dc: DayCounter) => {
    return (dc.opening_cash_balance || 0) + (dc.sales_cash || 0) - (dc.total_expenses_cash || 0) - (dc.cash_hand_over || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading day counters...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Day Counter</h1>
          <p className="text-muted-foreground mt-1">Daily cash control and reconciliation</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Day Counter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Day Counters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Opening Cash</TableHead>
                  <TableHead>Total Sales</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>System Closing</TableHead>
                  <TableHead>Actual Closing</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayCounters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No day counters found
                    </TableCell>
                  </TableRow>
                ) : (
                  dayCounters.map((dc) => {
                    const totalSales = calculateTotalSales(dc);
                    const systemClosing = calculateSystemClosing(dc);
                    const difference = (dc.actual_closing_cash || 0) - systemClosing;
                    return (
                      <TableRow key={dc.id}>
                        <TableCell className="font-medium">
                          {format(new Date(dc.date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          ₹{(dc.opening_cash_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ₹{(dc.total_expenses_cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ₹{systemClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          ₹{(dc.actual_closing_cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <span className={difference >= 0 ? 'text-green-400' : 'text-red-400'}>
                            ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {dc.remarks || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(dc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dc.date)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDayCounter ? 'Edit Day Counter' : 'Add Day Counter'}</DialogTitle>
            <DialogDescription>
              {editingDayCounter ? 'Update the day counter details' : 'Create a new day counter entry'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 md:grid-cols-2 py-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="opening_cash_balance">Opening Cash Balance</Label>
                  <Input
                    id="opening_cash_balance"
                    type="number"
                    step="0.01"
                    value={formData.opening_cash_balance}
                    onChange={(e) => setFormData({ ...formData, opening_cash_balance: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sales_cash">Sales - Cash</Label>
                  <Input
                    id="sales_cash"
                    type="number"
                    step="0.01"
                    value={formData.sales_cash}
                    onChange={(e) => setFormData({ ...formData, sales_cash: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sales_upi">Sales - UPI</Label>
                  <Input
                    id="sales_upi"
                    type="number"
                    step="0.01"
                    value={formData.sales_upi}
                    onChange={(e) => setFormData({ ...formData, sales_upi: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sales_card">Sales - Card</Label>
                  <Input
                    id="sales_card"
                    type="number"
                    step="0.01"
                    value={formData.sales_card}
                    onChange={(e) => setFormData({ ...formData, sales_card: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sales_credit">Sales - Credit</Label>
                  <Input
                    id="sales_credit"
                    type="number"
                    step="0.01"
                    value={formData.sales_credit}
                    onChange={(e) => setFormData({ ...formData, sales_credit: e.target.value })}
                    required
                  />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>Total Sales:</span>
                    <span>
                      ₹{(
                        (parseFloat(formData.sales_cash) || 0) +
                        (parseFloat(formData.sales_upi) || 0) +
                        (parseFloat(formData.sales_card) || 0) +
                        (parseFloat(formData.sales_credit) || 0)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="total_expenses_cash">Total Expenses (Cash)</Label>
                  <Input
                    id="total_expenses_cash"
                    type="number"
                    step="0.01"
                    value={formData.total_expenses_cash}
                    onChange={(e) => setFormData({ ...formData, total_expenses_cash: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cash_hand_over">Cash Hand Over</Label>
                  <Input
                    id="cash_hand_over"
                    type="number"
                    step="0.01"
                    value={formData.cash_hand_over}
                    onChange={(e) => setFormData({ ...formData, cash_hand_over: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="actual_closing_cash">Actual Closing Cash</Label>
                  <Input
                    id="actual_closing_cash"
                    type="number"
                    step="0.01"
                    value={formData.actual_closing_cash}
                    onChange={(e) => setFormData({ ...formData, actual_closing_cash: e.target.value })}
                    required
                  />
                </div>
                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between">
                    <span>System Closing Cash:</span>
                    <span>
                      ₹{(
                        (parseFloat(formData.opening_cash_balance) || 0) +
                        (parseFloat(formData.sales_cash) || 0) -
                        (parseFloat(formData.total_expenses_cash) || 0) -
                        (parseFloat(formData.cash_hand_over) || 0)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className={`flex justify-between font-semibold ${
                    ((parseFloat(formData.actual_closing_cash) || 0) -
                    ((parseFloat(formData.opening_cash_balance) || 0) +
                     (parseFloat(formData.sales_cash) || 0) -
                     (parseFloat(formData.total_expenses_cash) || 0) -
                     (parseFloat(formData.cash_hand_over) || 0))) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}>
                    <span>Difference:</span>
                    <span>
                      ₹{(
                        (parseFloat(formData.actual_closing_cash) || 0) -
                        ((parseFloat(formData.opening_cash_balance) || 0) +
                         (parseFloat(formData.sales_cash) || 0) -
                         (parseFloat(formData.total_expenses_cash) || 0) -
                         (parseFloat(formData.cash_hand_over) || 0))
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Input
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Any notes or remarks..."
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingDayCounter ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
