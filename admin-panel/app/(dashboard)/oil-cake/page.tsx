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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Plus, Edit, Trash2, Search } from 'lucide-react';
import { oilCakeSalesApi, customersApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

interface OilCakeSale {
  id: string;
  date: string;
  customer_id?: string | null;
  customer?: {
    id: string;
    name: string;
  } | null;
  cake_category: string;
  cake: string;
  quantity: number;
  price_per_kg: number;
  total: number;
  is_paid: boolean;
  remarks?: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

export default function OilCakeSalesPage() {
  const [sales, setSales] = useState<OilCakeSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<OilCakeSale | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    customer_id: '',
    cake_category: '',
    cake: '',
    quantity: '',
    price_per_kg: '',
    is_paid: false,
    remarks: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState<string>('all');

  useEffect(() => {
    loadSales();
    loadCustomers();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterCategory !== 'all') {
        params.cake_category = filterCategory;
      }
      if (filterPaid !== 'all') {
        params.is_paid = filterPaid === 'paid';
      }
      const data = await oilCakeSalesApi.getAll(params);
      setSales(data);
    } catch (error) {
      logger.error('Failed to load oil cake sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await customersApi.getAll({ limit: 1000 });
      setCustomers(data || []);
    } catch (error) {
      logger.error('Failed to load customers:', error);
    }
  };

  useEffect(() => {
    loadSales();
  }, [filterCategory, filterPaid]);

  const handleOpenDialog = (sale?: OilCakeSale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        date: sale.date,
        customer_id: sale.customer_id || '',
        cake_category: sale.cake_category,
        cake: sale.cake,
        quantity: sale.quantity.toString(),
        price_per_kg: sale.price_per_kg.toString(),
        is_paid: sale.is_paid,
        remarks: sale.remarks || '',
      });
    } else {
      setEditingSale(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        customer_id: '',
        cake_category: '',
        cake: '',
        quantity: '',
        price_per_kg: '',
        is_paid: false,
        remarks: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSale(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        date: formData.date,
        customer_id: formData.customer_id || undefined,
        cake_category: formData.cake_category,
        cake: formData.cake,
        quantity: parseFloat(formData.quantity),
        price_per_kg: parseFloat(formData.price_per_kg),
        is_paid: formData.is_paid,
        remarks: formData.remarks || undefined,
      };

      if (editingSale) {
        await oilCakeSalesApi.update(editingSale.id, payload);
      } else {
        await oilCakeSalesApi.create(payload);
      }

      await loadSales();
      handleCloseDialog();
    } catch (error: any) {
      logger.error('Failed to save oil cake sale:', error);
      alert(error.response?.data?.detail || 'Failed to save oil cake sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this oil cake sale?')) {
      return;
    }

    try {
      await oilCakeSalesApi.delete(id);
      await loadSales();
    } catch (error) {
      logger.error('Failed to delete oil cake sale:', error);
      alert('Failed to delete oil cake sale');
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      searchQuery === '' ||
      sale.cake.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.cake_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.remarks?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Get unique cake categories for filter
  const cakeCategories = Array.from(new Set(sales.map((s) => s.cake_category)));

  // Calculate totals
  const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalAmount = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const paidAmount = filteredSales.filter((s) => s.is_paid).reduce((sum, s) => sum + s.total, 0);
  const unpaidAmount = filteredSales.filter((s) => !s.is_paid).reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Oil Cake Sales
            </CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by cake, category, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {cakeCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPaid} onValueChange={setFilterPaid}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Total Quantity</div>
                  <div className="text-2xl font-bold">{totalQuantity.toFixed(2)} kg</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Total Amount</div>
                  <div className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Paid</div>
                  <div className="text-2xl font-bold text-green-600">₹{paidAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium text-muted-foreground">Unpaid</div>
                  <div className="text-2xl font-bold text-red-600">₹{unpaidAmount.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No oil cake sales found</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Cake Category</TableHead>
                      <TableHead>Cake</TableHead>
                      <TableHead className="text-right">Quantity (kg)</TableHead>
                      <TableHead className="text-right">Price/kg</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{format(new Date(sale.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{sale.customer?.name || '-'}</TableCell>
                        <TableCell>{sale.cake_category}</TableCell>
                        <TableCell>{sale.cake}</TableCell>
                        <TableCell className="text-right">{sale.quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{sale.price_per_kg.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{sale.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              sale.is_paid
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sale.is_paid ? 'Paid' : 'Not Paid'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(sale)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sale.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSale ? 'Edit Oil Cake Sale' : 'Add Oil Cake Sale'}</DialogTitle>
            <DialogDescription>
              {editingSale
                ? 'Update the oil cake sale details below.'
                : 'Enter the details for the new oil cake sale.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cake_category">Cake Category *</Label>
                  <Input
                    id="cake_category"
                    value={formData.cake_category}
                    onChange={(e) =>
                      setFormData({ ...formData, cake_category: e.target.value })
                    }
                    placeholder="e.g., Groundnut, Coconut"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cake">Cake *</Label>
                  <Input
                    id="cake"
                    value={formData.cake}
                    onChange={(e) => setFormData({ ...formData, cake: e.target.value })}
                    placeholder="e.g., Groundnut Cake, Coconut Cake"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (kg) *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_kg">Price per kg (₹) *</Label>
                  <Input
                    id="price_per_kg"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_per_kg}
                    onChange={(e) => setFormData({ ...formData, price_per_kg: e.target.value })}
                    required
                  />
                </div>
              </div>

              {formData.quantity && formData.price_per_kg && (
                <div className="bg-muted p-3 rounded-md">
                  <div className="text-sm font-medium">
                    Total: ₹
                    {(
                      parseFloat(formData.quantity || '0') *
                      parseFloat(formData.price_per_kg || '0')
                    ).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="is_paid">Payment Status</Label>
                <Select
                  value={formData.is_paid ? 'paid' : 'unpaid'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_paid: value === 'paid' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Not Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Optional remarks"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingSale ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

