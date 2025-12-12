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
import { Factory, Plus, Edit, Trash2, X, TrendingUp, Calendar, Package, BarChart3, Download } from 'lucide-react';
import { manufacturingApi, rawMaterialsApi, productsApi, productVariantsApi, purchasesApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';

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
  multiplier: number;
}

interface Purchase {
  id: string;
  invoice_number: string | null;
  invoice_date: string;
  vendor?: { name: string };
  items?: Array<{
    raw_material_id: string;
    raw_material?: { name: string };
    quantity: number;
    unit: string;
    price_per_unit: number;
  }>;
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
  const [showPurchaseSelector, setShowPurchaseSelector] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>('');
  
  // New output structure: product + variants distribution
  const [productOutputs, setProductOutputs] = useState<Array<{
    product_id: string;
    total_quantity: string;
    unit: string;
    quantity_kg?: string; // For kg to L conversion
    quantity_ltr?: string; // Converted L value
    variant_distributions: Array<{
      variant_id: string;
      quantity: string;
    }>;
  }>>([]);
  
  // Byproducts (cake) section
  const [byproducts, setByproducts] = useState<Array<{
    cake_category: string;
    cake_name: string;
    quantity: string;
    unit: string;
  }>>([]);

  useEffect(() => {
    loadBatches();
    loadRawMaterials();
    loadProducts();
  }, []);

  useEffect(() => {
    if (showPurchaseSelector) {
      loadPurchases();
    }
  }, [showPurchaseSelector]);

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
      // Load variants for each product with multiplier
      for (const product of data) {
        const variants = await productVariantsApi.getAll({ product_id: product.id, active_only: false });
        setProductVariants(prev => ({ ...prev, [product.id]: variants }));
      }
    } catch (error) {
      logger.error('Failed to load products:', error);
    }
  };

  const loadPurchases = async () => {
    setLoadingPurchases(true);
    try {
      // Load purchases from last 30 days
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const data = await purchasesApi.getAll({ start_date: startDate, end_date: endDate, limit: 100 });
      setPurchases(data || []);
    } catch (error) {
      logger.error('Failed to load purchases:', error);
      setPurchases([]);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleLoadFromPurchase = () => {
    if (!selectedPurchaseId) {
      alert('Please select a purchase first');
      return;
    }
    
    const purchase = purchases.find(p => p.id === selectedPurchaseId);
    if (!purchase || !purchase.items || purchase.items.length === 0) {
      alert('Selected purchase has no items');
      return;
    }

    // Auto-fill inputs from purchase items
    const purchaseInputs = purchase.items.map(item => ({
      raw_material_id: item.raw_material_id,
      quantity: item.quantity.toString(),
      unit: item.unit,
      rate: item.price_per_unit.toString(),
    }));
    
    setInputs(purchaseInputs);
    setShowPurchaseSelector(false);
    setSelectedPurchaseId('');
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
      // Use new productOutputs if available, otherwise fall back to old outputs format
      const outputData = productOutputs.length > 0 
        ? convertProductOutputsToOutputs()
        : outputs.map(out => ({
            product_id: out.product_id,
            product_variant_id: out.product_variant_id || undefined,
            total_output_quantity: parseFloat(out.total_output_quantity),
            unit: out.unit,
          }));

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
        outputs: outputData,
        byproducts: byproducts.filter(bp => bp.cake_category && bp.cake_name && bp.quantity).map(bp => ({
          cake_category: bp.cake_category,
          cake_name: bp.cake_name,
          quantity: parseFloat(bp.quantity),
          unit: bp.unit,
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

  const addProductOutput = () => {
    setProductOutputs([...productOutputs, {
      product_id: '',
      total_quantity: '',
      unit: '',
      variant_distributions: [],
    }]);
  };

  const addByproduct = () => {
    setByproducts([...byproducts, {
      cake_category: '',
      cake_name: '',
      quantity: '',
      unit: 'kg',
    }]);
  };

  const removeByproduct = (index: number) => {
    setByproducts(byproducts.filter((_, i) => i !== index));
  };

  const updateByproduct = (index: number, field: string, value: string) => {
    const updated = [...byproducts];
    updated[index] = { ...updated[index], [field]: value };
    setByproducts(updated);
  };

  const removeProductOutput = (index: number) => {
    setProductOutputs(productOutputs.filter((_, i) => i !== index));
  };

  const updateProductOutput = (index: number, field: string, value: string) => {
    const updated = [...productOutputs];
    
    if (field === 'product_id') {
      updated[index] = { ...updated[index], [field]: value };
      // Auto-fill unit from product and load variants
      if (value) {
        const product = products.find(p => p.id === value);
        if (product) {
          updated[index].unit = product.base_unit;
          // Initialize variant distributions with all variants
          const variants = productVariants[value] || [];
          updated[index].variant_distributions = variants.map(v => ({
            variant_id: v.id,
            quantity: '',
          }));
        }
      } else {
        // Clear variant distributions if product is cleared
        updated[index].variant_distributions = [];
        updated[index].unit = '';
      }
    } else if (field === 'total_quantity') {
      updated[index] = { ...updated[index], [field]: value };
      // Auto-convert kg to L (1 kg = 1.10 L)
      const unit = updated[index].unit?.toLowerCase();
      if (unit === 'kg' || unit === 'kgs') {
        const kgValue = parseFloat(value) || 0;
        const ltrValue = kgValue * 1.10;
        updated[index].quantity_kg = value;
        updated[index].quantity_ltr = ltrValue.toFixed(3);
      } else {
        // Clear conversion if not kg
        updated[index].quantity_kg = undefined;
        updated[index].quantity_ltr = undefined;
      }
    } else if (field === 'unit') {
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate conversion if unit changes to/from kg
      const unit = value?.toLowerCase();
      const totalQty = updated[index].total_quantity;
      if ((unit === 'kg' || unit === 'kgs') && totalQty) {
        const kgValue = parseFloat(totalQty) || 0;
        const ltrValue = kgValue * 1.10;
        updated[index].quantity_kg = totalQty;
        updated[index].quantity_ltr = ltrValue.toFixed(3);
      } else {
        updated[index].quantity_kg = undefined;
        updated[index].quantity_ltr = undefined;
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setProductOutputs(updated);
  };

  const updateVariantDistribution = (outputIndex: number, variantId: string, quantity: string) => {
    const updated = [...productOutputs];
    const distIndex = updated[outputIndex].variant_distributions.findIndex(d => d.variant_id === variantId);
    if (distIndex >= 0) {
      updated[outputIndex].variant_distributions[distIndex].quantity = quantity;
      setProductOutputs(updated);
    }
  };

  // Convert productOutputs to old outputs format for backward compatibility during transition
  const convertProductOutputsToOutputs = () => {
    const converted: Array<{ 
      product_id: string; 
      product_variant_id: string; 
      total_output_quantity: string; 
      unit: string;
      quantity_kg?: number;
      quantity_ltr?: number;
    }> = [];
    
    productOutputs.forEach(productOutput => {
      productOutput.variant_distributions.forEach(dist => {
        if (dist.quantity && parseFloat(dist.quantity) > 0) {
          const output: any = {
            product_id: productOutput.product_id,
            product_variant_id: dist.variant_id,
            total_output_quantity: dist.quantity,
            unit: productOutput.unit,
          };
          
          // Add kg and L values if conversion was done
          if (productOutput.quantity_kg && productOutput.quantity_ltr) {
            // Distribute the conversion proportionally to each variant
            const totalQty = parseFloat(productOutput.total_quantity) || 0;
            const variantQty = parseFloat(dist.quantity) || 0;
            if (totalQty > 0) {
              const ratio = variantQty / totalQty;
              output.quantity_kg = parseFloat(productOutput.quantity_kg) * ratio;
              output.quantity_ltr = parseFloat(productOutput.quantity_ltr) * ratio;
            }
          }
          
          converted.push(output);
        }
      });
    });
    
    return converted;
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
      
      // Convert outputs to new format: group by product_id
      if (fullBatch.outputs && fullBatch.outputs.length > 0) {
        const outputsByProduct: Record<string, any[]> = {};
        fullBatch.outputs.forEach((out: any) => {
          if (!outputsByProduct[out.product_id]) {
            outputsByProduct[out.product_id] = [];
          }
          outputsByProduct[out.product_id].push(out);
        });
        
        const convertedOutputs = Object.entries(outputsByProduct).map(([productId, productOutputs]) => {
          // Get unit from first output
          const unit = productOutputs[0]?.unit || '';
          // Calculate total quantity
          const totalQuantity = productOutputs.reduce((sum, out) => sum + (parseFloat(out.total_output_quantity) || 0), 0);
          
          // Get kg and L values if they exist
          const firstOutput = productOutputs[0];
          const quantityKg = firstOutput?.quantity_kg?.toString();
          const quantityLtr = firstOutput?.quantity_ltr?.toString();
          
          // Create variant distributions
          const variantDistributions = productOutputs
            .filter(out => out.product_variant_id)
            .map(out => ({
              variant_id: out.product_variant_id,
              quantity: out.total_output_quantity?.toString() || '',
            }));
          
          const output: any = {
            product_id: productId,
            total_quantity: totalQuantity.toString(),
            unit: unit,
            variant_distributions: variantDistributions,
          };
          
          // Add conversion values if they exist
          if (quantityKg && quantityLtr) {
            output.quantity_kg = quantityKg;
            output.quantity_ltr = quantityLtr;
          } else if ((unit?.toLowerCase() === 'kg' || unit?.toLowerCase() === 'kgs') && totalQuantity > 0) {
            // Auto-calculate conversion if unit is kg
            output.quantity_kg = totalQuantity.toString();
            output.quantity_ltr = (totalQuantity * 1.10).toFixed(3);
          }
          
          return output;
        });
        
        setProductOutputs(convertedOutputs);
        // Keep old outputs for backward compatibility
        setOutputs(fullBatch.outputs?.map((out: any) => ({
          product_id: out.product_id,
          product_variant_id: out.product_variant_id || '',
          total_output_quantity: out.total_output_quantity?.toString() || '',
          unit: out.unit || '',
        })) || []);
      } else {
        setProductOutputs([]);
        setOutputs([]);
      }
      
      // Load byproducts
      if (fullBatch.byproducts && Array.isArray(fullBatch.byproducts)) {
        setByproducts(fullBatch.byproducts.map((bp: any) => ({
          cake_category: bp.cake_category || '',
          cake_name: bp.cake_name || '',
          quantity: bp.quantity?.toString() || '',
          unit: bp.unit || 'kg',
        })));
      } else {
        setByproducts([]);
      }
      
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
    setProductOutputs([]);
    setByproducts([]);
    setShowPurchaseSelector(false);
    setSelectedPurchaseId('');
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
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPurchaseSelector(true)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Load from Purchase
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addInput}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Input
                      </Button>
                    </div>
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
                    <Button type="button" variant="outline" size="sm" onClick={addProductOutput}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Product Output
                    </Button>
                  </div>
                  {productOutputs.map((productOutput, outputIndex) => {
                    const variants = productOutput.product_id ? (productVariants[productOutput.product_id] || []) : [];
                    const totalDistributed = productOutput.variant_distributions.reduce((sum, dist) => {
                      return sum + (parseFloat(dist.quantity) || 0);
                    }, 0);
                    const remaining = (parseFloat(productOutput.total_quantity) || 0) - totalDistributed;
                    
                    return (
                      <div key={outputIndex} className="p-4 border rounded-lg space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          <select
                            value={productOutput.product_id}
                            onChange={(e) => updateProductOutput(outputIndex, 'product_id', e.target.value)}
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            required
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            step="0.001"
                            placeholder="Total Quantity"
                            value={productOutput.total_quantity}
                            onChange={(e) => updateProductOutput(outputIndex, 'total_quantity', e.target.value)}
                            required
                          />
                          <Input
                            placeholder="Unit"
                            value={productOutput.unit}
                            onChange={(e) => updateProductOutput(outputIndex, 'unit', e.target.value)}
                            required
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeProductOutput(outputIndex)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Auto-conversion display for kg to L */}
                        {(productOutput.unit?.toLowerCase() === 'kg' || productOutput.unit?.toLowerCase() === 'kgs') && productOutput.quantity_ltr && productOutput.total_quantity && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Auto-converted:</span>
                              <span className="font-semibold">{productOutput.total_quantity} kg</span>
                              <span className="text-muted-foreground">=</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{productOutput.quantity_ltr} L</span>
                              <span className="text-xs text-muted-foreground">(1 kg = 1.10 L)</span>
                            </div>
                          </div>
                        )}
                        
                        {productOutput.product_id && variants.length > 0 && (
                          <div className="pl-4 border-l-2 space-y-2">
                            <Label className="text-sm text-muted-foreground">Distribute among variants:</Label>
                            {variants.map((variant) => {
                              const dist = productOutput.variant_distributions.find(d => d.variant_id === variant.id);
                              const distQuantity = parseFloat(dist?.quantity || '0');
                              const totalQuantity = parseFloat(productOutput.total_quantity || '0');
                              const percentage = totalQuantity > 0 ? (distQuantity / totalQuantity) * 100 : 0;
                              
                              return (
                                <div key={variant.id} className="grid grid-cols-4 gap-2 items-center">
                                  <span className="text-sm">{variant.variant_name}</span>
                                  <span className="text-xs text-muted-foreground">({variant.multiplier}x multiplier)</span>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="Quantity"
                                    value={dist?.quantity || ''}
                                    onChange={(e) => updateVariantDistribution(outputIndex, variant.id, e.target.value)}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {distQuantity > 0 && totalQuantity > 0
                                      ? `= ${percentage.toFixed(1)}%`
                                      : ''}
                                  </span>
                                </div>
                              );
                            })}
                            {productOutput.total_quantity && (
                              <div className="text-xs pt-2 border-t">
                                <span className={remaining === 0 ? 'text-green-400' : remaining > 0 ? 'text-orange-400' : 'text-red-400'}>
                                  Total Distributed: {totalDistributed.toFixed(3)} / {productOutput.total_quantity} 
                                  {remaining !== 0 && ` (${remaining > 0 ? '+' : ''}${remaining.toFixed(3)} remaining)`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Byproducts Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Byproducts (Cake)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addByproduct}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Byproduct
                    </Button>
                  </div>
                  {byproducts.map((byproduct, index) => (
                    <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                      <Input
                        placeholder="Category (e.g., Groundnut)"
                        value={byproduct.cake_category}
                        onChange={(e) => updateByproduct(index, 'cake_category', e.target.value)}
                      />
                      <Input
                        placeholder="Cake Name (e.g., Groundnut cake)"
                        value={byproduct.cake_name}
                        onChange={(e) => updateByproduct(index, 'cake_name', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Quantity"
                        value={byproduct.quantity}
                        onChange={(e) => updateByproduct(index, 'quantity', e.target.value)}
                      />
                      <Input
                        placeholder="Unit"
                        value={byproduct.unit}
                        onChange={(e) => updateByproduct(index, 'unit', e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeByproduct(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {byproducts.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3 border rounded-lg text-center">
                      No byproducts added. Click "Add Byproduct" to record cake production.
                    </div>
                  )}
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

        {/* Purchase Selector Dialog */}
        <Dialog open={showPurchaseSelector} onOpenChange={setShowPurchaseSelector}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Load Raw Materials from Purchase</DialogTitle>
              <DialogDescription>
                Select a purchase to auto-fill raw material inputs. Purchases from the last 30 days are shown.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {loadingPurchases ? (
                <div className="text-center py-4">Loading purchases...</div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No purchases found in the last 30 days</div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Purchase</Label>
                    <select
                      value={selectedPurchaseId}
                      onChange={(e) => setSelectedPurchaseId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a purchase...</option>
                      {purchases.map((purchase) => (
                        <option key={purchase.id} value={purchase.id}>
                          {purchase.invoice_number || 'No Invoice'} - {format(new Date(purchase.invoice_date), 'dd MMM yyyy')} 
                          {purchase.vendor?.name && ` - ${purchase.vendor.name}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedPurchaseId && (
                    <div className="border rounded-lg p-4">
                      <Label className="text-sm font-semibold mb-2 block">Purchase Items:</Label>
                      {purchases.find(p => p.id === selectedPurchaseId)?.items?.map((item, idx) => (
                        <div key={idx} className="text-sm py-1">
                          • {item.raw_material?.name || 'Unknown'} - {item.quantity} {item.unit} @ ₹{item.price_per_unit}/unit
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPurchaseSelector(false);
                  setSelectedPurchaseId('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleLoadFromPurchase}
                disabled={!selectedPurchaseId}
              >
                Load Inputs
              </Button>
            </DialogFooter>
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
