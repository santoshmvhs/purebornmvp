'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { salesApi } from '@/lib/api';
import { Sale } from '@/lib/types';
import { Eye, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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

  const viewSaleDetails = async (id: string | number) => {
    try {
      const sale = await salesApi.getById(id);
      setSelectedSale(sale);
      setDialogOpen(true);
    } catch (error) {
      logger.error('Failed to load sale details:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await salesApi.importExcel(importFile);
      setImportResult(result);
      
      if (result.success && result.created > 0) {
        // Reload sales after successful import
        await loadSales();
      }
    } catch (error: any) {
      logger.error('Failed to import sales:', error);
      setImportResult({
        success: false,
        error: error.response?.data?.detail || error.message || 'Import failed',
      });
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportDialogOpen(false);
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
            <Button
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import from Excel
            </Button>
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
                      {format(new Date(sale.invoice_date || sale.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{sale.user?.username || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {sale.items?.length || 0} items
                      </Badge>
                    </TableCell>
                    <TableCell>₹{(sale.total_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>₹{((sale.total_tax ?? sale.tax_amount) || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{((sale.grand_total ?? sale.net_amount) || 0).toFixed(2)}
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
                    {format(new Date(selectedSale.invoice_date || selectedSale.created_at), 'MMM dd, yyyy HH:mm:ss')}
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
                    {selectedSale.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product_variant?.product?.name 
                            ? `${item.product_variant.product.name} (${item.product_variant.variant_name})`
                            : item.product_variant?.variant_name || 'Unknown Product'}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{((item.unit_price || 0)).toFixed(2)}</TableCell>
                        <TableCell>₹{((item.line_total || 0)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{((selectedSale.total_amount || 0)).toFixed(2)}</span>
                </div>

                {/* GST Breakdown */}
                {selectedSale.is_interstate ? (
                  <div className="flex justify-between text-sm">
                    <span>IGST:</span>
                    <span>₹{((selectedSale.igst_amount || 0)).toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>CGST:</span>
                      <span>₹{((selectedSale.cgst_amount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST:</span>
                      <span>₹{((selectedSale.sgst_amount || 0)).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-sm font-medium">
                  <span>Total GST:</span>
                  <span>₹{((selectedSale.total_tax ?? selectedSale.tax_amount) || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>₹{((selectedSale.grand_total ?? selectedSale.net_amount) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Sales from Paytm POS Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Upload an Excel file (.xlsx or .xls) exported from Paytm POS. The file should contain:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Invoice Number / Invoice No</li>
                <li>Date / Invoice Date</li>
                <li>Product Name / Item Name</li>
                <li>SKU / Product Code / Barcode</li>
                <li>Quantity</li>
                <li>Price / Unit Price</li>
                <li>Total / Amount</li>
                <li>Payment Method (Cash/UPI/Card) - optional</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={importing}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {importResult && (
              <div className={`p-4 rounded-lg ${
                importResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {importResult.success ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800">
                      Import completed successfully!
                    </p>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>✓ Created: {importResult.created} sales</p>
                      {importResult.skipped > 0 && (
                        <p>⚠ Skipped: {importResult.skipped} items</p>
                      )}
                      {importResult.errors > 0 && (
                        <p>✗ Errors: {importResult.errors}</p>
                      )}
                    </div>
                    {importResult.sales && importResult.sales.length > 0 && (
                      <div className="mt-3 text-sm">
                        <p className="font-medium mb-1">Imported Sales:</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {importResult.sales.slice(0, 5).map((sale: any, idx: number) => (
                            <p key={idx} className="text-xs">
                              • Invoice {sale.invoice_number || 'N/A'} - {sale.date} - ₹{sale.total_amount.toFixed(2)}
                            </p>
                          ))}
                          {importResult.sales.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              ... and {importResult.sales.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {importResult.skipped_details && importResult.skipped_details.length > 0 && (
                      <div className="mt-3 text-sm">
                        <p className="font-medium mb-1">Skipped Items:</p>
                        <div className="max-h-24 overflow-y-auto space-y-1">
                          {importResult.skipped_details.map((item: any, idx: number) => (
                            <p key={idx} className="text-xs">
                              • {item.product || item.invoice}: {item.reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-red-800">Import failed</p>
                    <p className="text-sm text-red-700 mt-1">
                      {importResult.error || 'Unknown error occurred'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={resetImport}
                disabled={importing}
              >
                {importResult ? 'Close' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

