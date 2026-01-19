'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { vendorsApi, rawMaterialsApi, purchasesApi } from '@/lib/api';

type PurchaseItemForm = {
  raw_material_id: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  gst_rate: number;
  description?: string;
};

type Vendor = {
  id: string;
  name: string;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
};

export default function NewPurchasePage() {
  const router = useRouter();
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState('raw_material');
  const [amountCash, setAmountCash] = useState(0);
  const [amountUpi, setAmountUpi] = useState(0);
  const [amountCard, setAmountCard] = useState(0);
  const [amountCredit, setAmountCredit] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItemForm[]>([
    { raw_material_id: '', quantity: 0, unit: 'kg', price_per_unit: 0, gst_rate: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Dropdown data
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadVendors();
    loadRawMaterials();
  }, []);

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
    } catch (error) {
      logger.error('Failed to load raw materials:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const updateItem = (index: number, field: keyof PurchaseItemForm, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      
      // Auto-update unit when raw material changes
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

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => {
      return sum + (item.quantity * item.price_per_unit);
    }, 0);
    const totalPaid = amountCash + amountUpi + amountCard;
    const balanceDue = total - totalPaid;
    // Credit should equal balance due (amount owed)
    
    return { total, totalPaid, balanceDue };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { total, balanceDue } = calculateTotals();

      const data = await purchasesApi.create({
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate,
        vendor_id: vendorId,
        purchase_category: category,
        amount_cash: amountCash,
        amount_upi: amountUpi,
        amount_card: amountCard,
        amount_credit: balanceDue, // Credit equals balance due
        notes: notes || undefined,
        items: items
          .filter(item => item.raw_material_id && item.quantity > 0)
          .map((it) => ({
            raw_material_id: it.raw_material_id,
            quantity: Number(it.quantity),
            unit: it.unit,
            price_per_unit: Number(it.price_per_unit),
            gst_rate: Number(it.gst_rate) / 100, // Convert percentage to decimal
            description: it.description || undefined,
          })),
      });

      setMessage({ type: 'success', text: `Purchase created successfully! ID: ${data.id}` });
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/purchases');
      }, 2000);
    } catch (err: any) {
      logger.error('Failed to create purchase:', err);
      setMessage({ type: 'error', text: err.response?.data?.detail || err.message || 'Failed to create purchase' });
    } finally {
      setLoading(false);
    }
  };

  const { total, totalPaid, balanceDue } = calculateTotals();

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>New Purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_id">Vendor *</Label>
                <select
                  id="vendor_id"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="raw_material">Raw Material</option>
                  <option value="packing">Packing</option>
                  <option value="service">Service</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Items</h3>
                <Button type="button" onClick={addRow} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Item {idx + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Raw Material *</Label>
                        <select
                          value={item.raw_material_id}
                          onChange={(e) => updateItem(idx, 'raw_material_id', e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select material</option>
                          {rawMaterials.map((rm) => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name} ({rm.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Price/Unit *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.price_per_unit || ''}
                          onChange={(e) => updateItem(idx, 'price_per_unit', Number(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>GST %</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.gst_rate || ''}
                          onChange={(e) => updateItem(idx, 'gst_rate', Number(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Optional description"
                      />
                    </div>

                    <div className="text-sm text-gray-600">
                      Line Total: ₹{(item.quantity * item.price_per_unit).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount_cash">Cash</Label>
                  <Input
                    id="amount_cash"
                    type="number"
                    step="0.01"
                    value={amountCash || ''}
                    onChange={(e) => setAmountCash(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_upi">UPI</Label>
                  <Input
                    id="amount_upi"
                    type="number"
                    step="0.01"
                    value={amountUpi || ''}
                    onChange={(e) => setAmountUpi(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_card">Card</Label>
                  <Input
                    id="amount_card"
                    type="number"
                    step="0.01"
                    value={amountCard || ''}
                    onChange={(e) => setAmountCard(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_credit">Credit (Balance Due)</Label>
                  <Input
                    id="amount_credit"
                    type="number"
                    step="0.01"
                    value={balanceDue.toFixed(2)}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    title="Credit amount equals balance due (automatically calculated)"
                  />
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-semibold">₹{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Paid:</span>
                <span>₹{totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Balance Due:</span>
                <span className={balanceDue > 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>
                  ₹{balanceDue.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Additional notes..."
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating Purchase...' : 'Create Purchase'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

