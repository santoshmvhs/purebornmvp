'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Factory, Plus, Edit, Trash2, X, TrendingUp, Calendar, Package, BarChart3 } from 'lucide-react';
import { manufacturingApi, rawMaterialsApi, productsApi, productVariantsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ManufacturingBatch {
  id: string;
  batch_code?: string | null;
  batch_date: string;
  notes?: string | null;
  created_at: string;
  inputs?: any[];
  outputs?: any[];
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface Product {
  id: string;
  name: string;
  base_unit: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
}

export default function ManufacturingPage() {
  const [batches, setBatches] = useState<ManufacturingBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ManufacturingBatch | null>(null);
  const [formData, setFormData] = useState({
    batch_code: '',
    batch_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [inputs, setInputs] = useState<Array<{ raw_material_id: string; quantity: string; unit: string; rate: string }>>([]);
  const [outputs, setOutputs] = useState<Array<{ product_id: string; product_variant_id: string; total_output_quantity: string; unit: string }>>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productVariants, setProductVariants] = useState<Record<string, ProductVariant[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBatches();
    loadRawMaterials();
    loadProducts();
  }, []);

  const loadRawMaterials = async () => {
    try {
      const data = await rawMaterialsApi.getAll();
      setRawMaterials(data);
    } catch (error) {
      logger.error('Failed to load raw materials:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll({ limit: 100 });
      setProducts(data);
      // Load variants for each product
      for (const product of data) {
        const variants = await productVariantsApi.getAll({ product_id: product.id, active_only: false });
        setProductVariants(prev => ({ ...prev, [product.id]: variants }));
      }
    } catch (error) {
      logger.error('Failed to load products:', error);
    }
  };

  const loadBatches = async () => {
    try {
      const data = await manufacturingApi.getAll({ limit: 100 });
      setBatches(data);
    } catch (error) {
      logger.error('Failed to load manufacturing batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        batch_code: formData.batch_code || undefined,
        batch_date: formData.batch_date,
        notes: formData.notes || undefined,
        inputs: inputs.map(inp => ({
          raw_material_id: inp.raw_material_id,
          quantity: parseFloat(inp.quantity),
          unit: inp.unit,
          rate: parseFloat(inp.rate),
        })),
        outputs: outputs.map(out => ({
          product_id: out.product_id,
          product_variant_id: out.product_variant_id || undefined,
          total_output_quantity: parseFloat(out.total_output_quantity),
          unit: out.unit,
        })),
      };

      if (editingBatch) {
        await manufacturingApi.update(editingBatch.id, payload);
      } else {
        await manufacturingApi.create(payload);
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadBatches();
    } catch (error: any) {
      logger.error('Failed to save batch:', error);
      alert(error.response?.data?.detail || 'Failed to save manufacturing batch');
    } finally {
      setSubmitting(false);
    }
  };

  const addInput = () => {
    setInputs([...inputs, { raw_material_id: '', quantity: '', unit: 'kg', rate: '' }]);
  };

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const updateInput = (index: number, field: string, value: string) => {
    const updated = [...inputs];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill unit from raw material
    if (field === 'raw_material_id' && value) {
      const rm = rawMaterials.find(r => r.id === value);
      if (rm) {
        updated[index].unit = rm.unit;
      }
    }
    setInputs(updated);
  };

  const addOutput = () => {
    setOutputs([...outputs, { product_id: '', product_variant_id: '', total_output_quantity: '', unit: '' }]);
  };

  const removeOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const updateOutput = (index: number, field: string, value: string) => {
    const updated = [...outputs];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-fill unit from product
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].unit = product.base_unit;
      }
    }
    setOutputs(updated);
  };

  const handleEdit = async (batch: ManufacturingBatch) => {
    try {
      // Load full batch details with inputs/outputs
      const fullBatch = await manufacturingApi.getById(batch.id);
      setEditingBatch(fullBatch);
      setFormData({
        batch_code: fullBatch.batch_code || '',
        batch_date: fullBatch.batch_date,
        notes: fullBatch.notes || '',
      });
      setInputs(fullBatch.inputs?.map((inp: any) => ({
        raw_material_id: inp.raw_material_id,
        quantity: inp.quantity.toString(),
        unit: inp.unit,
        rate: inp.rate.toString(),
      })) || []);
      setOutputs(fullBatch.outputs?.map((out: any) => ({
        product_id: out.product_id,
        product_variant_id: out.product_variant_id || '',
        total_output_quantity: out.total_output_quantity?.toString() || '',
        unit: out.unit || '',
      })) || []);
      setIsDialogOpen(true);
    } catch (error) {
      logger.error('Failed to load batch details:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this manufacturing batch? This action cannot be undone.')) {
      return;
    }

    try {
      await manufacturingApi.delete(id);
      await loadBatches();
    } catch (error: any) {
      logger.error('Failed to delete batch:', error);
      alert(error.response?.data?.detail || 'Failed to delete manufacturing batch');
    }
  };

  const resetForm = () => {
    setEditingBatch(null);
    setFormData({
      batch_code: '',
      batch_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setInputs([]);
    setOutputs([]);
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalBatches = batches.length;

    const monthlyBatches = batches.filter((batch) => {
      const batchDate = new Date(batch.batch_date);
      return isWithinInterval(batchDate, { start: monthStart, end: monthEnd });
    }).length;

    // Calculate average inputs and outputs per batch
    let totalInputs = 0;
    let totalOutputs = 0;
    batches.forEach((batch) => {
      if (batch.inputs) {
        totalInputs += batch.inputs.length;
      }
      if (batch.outputs) {
        totalOutputs += batch.outputs.length;
      }
    });

    const avgInputsPerBatch = totalBatches > 0 ? totalInputs / totalBatches : 0;
    const avgOutputsPerBatch = totalBatches > 0 ? totalOutputs / totalBatches : 0;

    return {
      totalBatches,
      monthlyBatches,
      avgInputsPerBatch,
      avgOutputsPerBatch,
      totalInputs,
      totalOutputs,
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading manufacturing batches...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing</h1>
          <p className="text-muted-foreground mt-1">Manage manufacturing batches</p>
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
            New Batch
          </Button>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingBatch ? 'Edit Batch' : 'New Manufacturing Batch'}</DialogTitle>
                <DialogDescription>
                  {editingBatch ? 'Update batch information, inputs, and outputs.' : 'Create a new manufacturing batch with raw material inputs and product outputs.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="batch_code">Batch Code</Label>
                    <Input
                      id="batch_code"
                      placeholder="e.g., BATCH-2025-001"
                      value={formData.batch_code}
                      onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="batch_date">Batch Date *</Label>
                    <Input
                      id="batch_date"
                      type="date"
                      value={formData.batch_date}
                      onChange={(e) => setFormData({ ...formData, batch_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes about this batch"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                {/* Inputs Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Raw Material Inputs (Consumed)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addInput}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Input
                    </Button>
                  </div>
                  {inputs.map((input, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                      <select
                        value={input.raw_material_id}
                        onChange={(e) => updateInput(index, 'raw_material_id', e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select Raw Material</option>
                        {rawMaterials.map((rm) => (
                          <option key={rm.id} value={rm.id}>{rm.name}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Quantity"
                        value={input.quantity}
                        onChange={(e) => updateInput(index, 'quantity', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Unit"
                        value={input.unit}
                        onChange={(e) => updateInput(index, 'unit', e.target.value)}
                        required
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Rate"
                        value={input.rate}
                        onChange={(e) => updateInput(index, 'rate', e.target.value)}
                        required
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeInput(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Outputs Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Product Outputs (Produced)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOutput}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Output
                    </Button>
                  </div>
                  {outputs.map((output, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                      <select
                        value={output.product_id}
                        onChange={(e) => updateOutput(index, 'product_id', e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={output.product_variant_id}
                        onChange={(e) => updateOutput(index, 'product_variant_id', e.target.value)}
                        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        disabled={!output.product_id}
                      >
                        <option value="">Select Variant (Optional)</option>
                        {output.product_id && productVariants[output.product_id]?.map((v) => (
                          <option key={v.id} value={v.id}>{v.variant_name}</option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Quantity"
                        value={output.total_output_quantity}
                        onChange={(e) => updateOutput(index, 'total_output_quantity', e.target.value)}
                        required
                      />
                      <Input
                        placeholder="Unit"
                        value={output.unit}
                        onChange={(e) => updateOutput(index, 'unit', e.target.value)}
                        required
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeOutput(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
                  {submitting ? (editingBatch ? 'Updating...' : 'Creating...') : (editingBatch ? 'Update Batch' : 'Create Batch')}
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
          Manufacturing Overview
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalBatches}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.monthlyBatches}</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Avg Inputs/Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.avgInputsPerBatch.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">Raw materials per batch</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Avg Outputs/Batch
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.avgOutputsPerBatch.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">Products per batch</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacturing Batches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No manufacturing batches found
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batch_code || '-'}</TableCell>
                    <TableCell>{format(new Date(batch.batch_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="max-w-xs truncate">{batch.notes || '-'}</TableCell>
                    <TableCell>{format(new Date(batch.created_at), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(batch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(batch.id)}
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
        </CardContent>
      </Card>
    </div>
  );
}
