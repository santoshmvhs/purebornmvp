'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { vendorsApi, rawMaterialsApi, purchasesApi } from '@/lib/api';
import { logger } from '@/lib/logger';

interface PurchaseItemForm {
  raw_material_id: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  gst_rate: number;
  description?: string;
}

interface PurchaseItem {
  id?: string;
  raw_material_id?: string;
  raw_material?: { name: string };
  description?: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  line_total?: number;
  gst_rate?: number;
}

interface Purchase {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  vendor_id: string;
  purchase_category?: string;
  amount_cash?: number;
  amount_upi?: number;
  amount_card?: number;
  amount_credit?: number;
  notes?: string;
  items?: PurchaseItem[];
}

interface EditPurchaseDialogProps {
  purchase: Purchase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPurchaseDialog({ purchase, open, onOpenChange, onSuccess }: EditPurchaseDialogProps) {
  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    purchase_category: 'raw_material',
    amount_cash: 0,
    amount_upi: 0,
    amount_card: 0,
    amount_credit: 0,
    notes: '',
  });
  const [items, setItems] = useState<PurchaseItemForm[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [rawMaterials, setRawMaterials] = useState<Array<{ id: string; name: string; unit: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open) {
      loadVendors();
      loadRawMaterials();
      if (purchase) {
        setFormData({
          invoice_number: purchase.invoice_number || '',
          invoice_date: purchase.invoice_date.split('T')[0],
          vendor_id: purchase.vendor_id,
          purchase_category: purchase.purchase_category || 'raw_material',
          amount_cash: purchase.amount_cash || 0,
          amount_upi: purchase.amount_upi || 0,
          amount_card: purchase.amount_card || 0,
          amount_credit: purchase.amount_credit || 0,
          notes: purchase.notes || '',
        });
        if (purchase.items) {
          setItems(purchase.items.map(item => ({
            raw_material_id: item.raw_material_id || '',
            quantity: item.quantity || 0,
            unit: item.unit || 'kg',
            price_per_unit: item.price_per_unit || 0,
            gst_rate: (item.gst_rate || 0) * 100, // Convert to percentage
            description: item.description,
          })));
        }
      }
    }
  }, [open, purchase]);

  const loadVendors = async () => {
    try {
      const data = await vendorsApi.getAll();
      setVendors(data);
    } catch (error) {
      logger.error('Failed to load vendors:', error);
    }
  };

  const loadRawMaterials = async () => {
    try {
      const data = await rawMaterialsApi.getAll();
      setRawMaterials(data);
      setLoadingData(false);
    } catch (error) {
      logger.error('Failed to load raw materials:', error);
      setLoadingData(false);
    }
  };

  const updateItem = (index: number, field: keyof PurchaseItemForm, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      if (field === 'raw_material_id') {
        const rawMaterial = rawMaterials.find(rm => rm.id === value);
        if (rawMaterial) {
          copy[index].unit = rawMaterial.unit;
        }
      }
      
      return copy;
    });
  };

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { raw_material_id: '', quantity: 0, unit: 'kg', price_per_unit: 0, gst_rate: 0 },
    ]);
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;

    setLoading(true);
    try {
      const { balanceDue } = calculateTotals();
      
      const payload = {
        invoice_number: formData.invoice_number || undefined,
        invoice_date: formData.invoice_date,
        vendor_id: formData.vendor_id,
        purchase_category: formData.purchase_category,
        amount_cash: formData.amount_cash,
        amount_upi: formData.amount_upi,
        amount_card: formData.amount_card,
        amount_credit: balanceDue, // Credit equals balance due
        notes: formData.notes || undefined,
        items: items
          .filter(item => item.raw_material_id && item.quantity > 0)
          .map((it) => ({
            raw_material_id: it.raw_material_id,
            quantity: Number(it.quantity),
            unit: it.unit,
            price_per_unit: Number(it.price_per_unit),
            gst_rate: Number(it.gst_rate) / 100,
            description: it.description || undefined,
          })),
      };

      // Validate payload before sending
      if (!payload.vendor_id) {
        throw new Error('Vendor is required');
      }
      if (!payload.items || payload.items.length === 0) {
        throw new Error('At least one item is required');
      }

      await purchasesApi.update(purchase.id, payload);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      logger.error('Failed to update purchase:', err);
      
      // Handle different error types
      let errorMessage = 'Failed to update purchase';
      
      if (err.response) {
        // Server responded with an error
        errorMessage = err.response.data?.detail || err.response.data?.message || errorMessage;
      } else if (err.request) {
        // Request was made but no response received (network/CORS error)
        if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
          errorMessage = 'Network error: Unable to connect to server. Please check:\n' +
            '1. Your internet connection\n' +
            '2. If the backend server is running\n' +
            '3. Browser console for more details\n' +
            '4. Try refreshing the page';
        } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errorMessage = 'Request timeout: The server took too long to respond. Please try again.';
        } else if (err.message?.includes('CORS')) {
          errorMessage = 'CORS error: Cross-origin request blocked. Please contact support.';
        } else {
          errorMessage = 'Network error: ' + (err.message || 'Unable to reach server');
        }
      } else {
        // Something else happened
        errorMessage = err.message || errorMessage;
      }
      
      // Log detailed error info for debugging
      console.error('Purchase update error details:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        request: err.request,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          baseURL: err.config?.baseURL,
        },
      });
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.price_per_unit;
      const gstAmount = itemTotal * (item.gst_rate / 100);
      return sum + itemTotal + gstAmount;
    }, 0);
    const totalPaid = formData.amount_cash + formData.amount_upi + formData.amount_card;
    const balanceDue = total - totalPaid;
    return { total, totalPaid, balanceDue };
  };

  const { total, totalPaid, balanceDue } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
          <DialogDescription>Update purchase transaction details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="vendor_id">Vendor *</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="purchase_category">Category</Label>
                <Select
                  value={formData.purchase_category}
                  onValueChange={(value) => setFormData({ ...formData, purchase_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="packing">Packing</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Select
                        value={item.raw_material_id}
                        onValueChange={(value) => updateItem(index, 'raw_material_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Raw Material" />
                        </SelectTrigger>
                        <SelectContent>
                          {rawMaterials.map((rm) => (
                            <SelectItem key={rm.id} value={rm.id}>
                              {rm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        placeholder="Unit"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        placeholder="Price/Unit"
                        value={item.price_per_unit || ''}
                        onChange={(e) => updateItem(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        placeholder="GST%"
                        value={item.gst_rate || ''}
                        onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount_cash">Cash</Label>
                <Input
                  id="amount_cash"
                  type="number"
                  value={formData.amount_cash}
                  onChange={(e) => setFormData({ ...formData, amount_cash: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="amount_upi">UPI</Label>
                <Input
                  id="amount_upi"
                  type="number"
                  value={formData.amount_upi}
                  onChange={(e) => setFormData({ ...formData, amount_upi: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="amount_card">Card</Label>
                <Input
                  id="amount_card"
                  type="number"
                  value={formData.amount_card}
                  onChange={(e) => setFormData({ ...formData, amount_card: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="amount_credit">Credit (Balance Due)</Label>
                <Input
                  id="amount_credit"
                  type="number"
                  value={balanceDue.toFixed(2)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  title="Credit amount equals balance due (automatically calculated)"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total: ₹{total.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Paid: ₹{totalPaid.toFixed(2)}</p>
                  <p className="text-sm font-semibold">Balance: ₹{balanceDue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Purchase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

