'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Receipt, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { purchasesApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
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

