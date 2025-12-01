'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { salesApi } from '@/lib/api';
import { Sale } from '@/lib/types';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const data = await salesApi.getAll({ limit: 100 });
      setSales(data);
    } catch (error) {
      logger.error('Failed to load sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewSaleDetails = async (id: number) => {
    try {
      const sale = await salesApi.getById(id);
      setSelectedSale(sale);
      setDialogOpen(true);
    } catch (error) {
      logger.error('Failed to load sale details:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales</h1>
        <p className="text-gray-600 mt-1">View all sales transactions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading sales...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No sales found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono">#{sale.id}</TableCell>
                    <TableCell>
                      {format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{sale.user?.username || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sale.items?.length || 0} items
                      </Badge>
                    </TableCell>
                    <TableCell>₹{sale.total_amount.toFixed(2)}</TableCell>
                    <TableCell>₹{(sale.total_gst || sale.total_tax).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{sale.grand_total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewSaleDetails(sale.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details - #{selectedSale?.id}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.created_at), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Cashier</p>
                  <p className="font-medium">{selectedSale.user?.username}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>₹{item.line_total.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{selectedSale.total_amount.toFixed(2)}</span>
                </div>

                {/* GST Breakdown */}
                {selectedSale.is_interstate ? (
                  <div className="flex justify-between text-sm">
                    <span>IGST:</span>
                    <span>₹{selectedSale.igst_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>CGST:</span>
                      <span>₹{selectedSale.cgst_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST:</span>
                      <span>₹{selectedSale.sgst_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm font-medium">
                  <span>Total GST:</span>
                  <span>₹{selectedSale.total_gst?.toFixed(2) || selectedSale.total_tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>₹{selectedSale.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

