'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { productsApi, productVariantsApi, productCategoriesApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Plus, Search, Edit, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface Product {
  id: string;
  name: string;
  product_code?: string | null;
  base_unit: string;
  hsn_code: string;
  category_id?: string | null;
  category_name?: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  multiplier: number;
  sku?: string | null;
  barcode?: string | null;
  mrp?: number | null;
  selling_price?: number | null;
  cost_price?: number | null;
  channel?: string | null;
  is_active: boolean;
  created_at: string;
}

interface ProductCategory {
  id: string;
  name: string;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Record<string, ProductVariant[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const isAdmin = useAuthStore((state) => state.isAdmin());

  const [productFormData, setProductFormData] = useState({
    name: '',
    product_code: '',
    base_unit: '',
    hsn_code: '',
    category_id: 'none',
  });

  const [variantFormData, setVariantFormData] = useState({
    variant_name: '',
    multiplier: '1',
    sku: '',
    barcode: '',
    mrp: '',
    selling_price: '',
    cost_price: '',
    channel: '',
  });

  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((category) => {
      map[category.id] = category.name;
    });
    return map;
  }, [categories]);

  useEffect(() => {
    loadProducts();
  }, [search, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      const params: Record<string, any> = { search, limit: 100 };
      if (categoryFilter !== 'all') {
        params.category_id = categoryFilter;
      }
      const data = await productsApi.getAll(params);
      setProducts(data);
      // Load variants for all products
      for (const product of data) {
        loadVariants(product.id);
      }
    } catch (error) {
      logger.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVariants = async (productId: string) => {
    try {
      const data = await productVariantsApi.getAll({ product_id: productId, active_only: false });
      setVariants(prev => ({ ...prev, [productId]: data }));
    } catch (error) {
      logger.error('Failed to load variants:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await productCategoriesApi.getAll();
      setCategories(data || []);
    } catch (error) {
      logger.error('Failed to load product categories:', error);
    }
  };

  const handleCategorySelect = (value: string) => {
    setProductFormData((prev) => ({ ...prev, category_id: value }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      alert('Category name is required');
      return;
    }

    setCreatingCategory(true);
    try {
      const category = await productCategoriesApi.create({ name: newCategoryName.trim() });
      await loadCategories();
      setCategoryDialogOpen(false);
      setNewCategoryName('');
      setProductFormData((prev) => ({ ...prev, category_id: category.id }));
    } catch (error: any) {
      logger.error('Failed to create category:', error);
      alert(error.response?.data?.detail || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: productFormData.name,
        product_code: productFormData.product_code || undefined,
        base_unit: productFormData.base_unit,
        hsn_code: productFormData.hsn_code,
        category_id: productFormData.category_id !== 'none' ? productFormData.category_id : undefined,
      };

      if (editingProduct) {
        await productsApi.update(editingProduct.id, data);
      } else {
        await productsApi.create(data);
      }

      setProductDialogOpen(false);
      resetProductForm();
      loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    try {
      const data = {
        product_id: selectedProductId,
        variant_name: variantFormData.variant_name,
        multiplier: parseFloat(variantFormData.multiplier),
        sku: variantFormData.sku || undefined,
        barcode: variantFormData.barcode || undefined,
        mrp: variantFormData.mrp ? parseFloat(variantFormData.mrp) : undefined,
        selling_price: variantFormData.selling_price ? parseFloat(variantFormData.selling_price) : undefined,
        cost_price: variantFormData.cost_price ? parseFloat(variantFormData.cost_price) : undefined,
        channel: variantFormData.channel || undefined,
      };

      if (editingVariant) {
        await productVariantsApi.update(editingVariant.id, data);
      } else {
        await productVariantsApi.create(data);
      }

      setVariantDialogOpen(false);
      resetVariantForm();
      if (selectedProductId) {
        loadVariants(selectedProductId);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save variant');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductFormData({
      name: product.name,
      product_code: product.product_code || '',
      base_unit: product.base_unit,
      hsn_code: product.hsn_code,
      category_id: product.category_id || 'none',
    });
    setProductDialogOpen(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setSelectedProductId(variant.product_id);
    setVariantFormData({
      variant_name: variant.variant_name,
      multiplier: variant.multiplier.toString(),
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      mrp: variant.mrp?.toString() || '',
      selling_price: variant.selling_price?.toString() || '',
      cost_price: variant.cost_price?.toString() || '',
      channel: variant.channel || '',
    });
    setVariantDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also delete all its variants.')) return;
    
    try {
      await productsApi.delete(id);
      loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete product');
    }
  };

  const handleDeleteVariant = async (id: string, productId: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    
    try {
      await productVariantsApi.delete(id);
      loadVariants(productId);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete variant');
    }
  };

  const openAddVariantDialog = (productId: string) => {
    setSelectedProductId(productId);
    resetVariantForm();
    setVariantDialogOpen(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductFormData({
      name: '',
      product_code: '',
      base_unit: '',
      hsn_code: '',
      category_id: 'none',
    });
  };

  const resetVariantForm = () => {
    setEditingVariant(null);
    setVariantFormData({
      variant_name: '',
      multiplier: '1',
      sku: '',
      barcode: '',
      mrp: '',
      selling_price: '',
      cost_price: '',
      channel: '',
    });
  };

  const toggleProductExpanded = (productId: string) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const isProductExpanded = (productId: string) => expandedProducts.has(productId);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.product_code && p.product_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your products and their variants</p>
        </div>
        {isAdmin && (
          <Dialog open={productDialogOpen} onOpenChange={(open) => {
            setProductDialogOpen(open);
            if (!open) resetProductForm();
          }}>
            <Button onClick={() => {
              resetProductForm();
              setProductDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Update product information.' : 'Create a new product. You can add variants after creation.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_code">Product Code</Label>
                  <Input
                    id="product_code"
                    value={productFormData.product_code}
                    onChange={(e) => setProductFormData({ ...productFormData, product_code: e.target.value })}
                    placeholder="e.g., PROD-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <div className="flex gap-2">
                    <Select
                      value={productFormData.category_id}
                      onValueChange={handleCategorySelect}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryDialogOpen(true)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base_unit">Base Unit *</Label>
                    <Input
                      id="base_unit"
                      value={productFormData.base_unit}
                      onChange={(e) => setProductFormData({ ...productFormData, base_unit: e.target.value })}
                      placeholder="e.g., L, kg"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsn_code">HSN Code *</Label>
                    <Input
                      id="hsn_code"
                      value={productFormData.hsn_code}
                      onChange={(e) => setProductFormData({ ...productFormData, hsn_code: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No products found</div>
          ) : (
            <div className="space-y-6">
              {filteredProducts.map((product) => {
                const isExpanded = isProductExpanded(product.id);
                const variantCount = variants[product.id]?.length || 0;
                
                return (
                  <div key={product.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleProductExpanded(product.id)}
                          className="h-8 w-8 p-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{product.name}</h3>
                            {product.product_code && (
                              <Badge variant="outline" className="font-mono">{product.product_code}</Badge>
                            )}
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {variantCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Base Unit: {product.base_unit} | HSN: {product.hsn_code}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Category: {product.category_name || (product.category_id ? categoryNameMap[product.category_id] : null) || 'No category'}
                          </div>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddVariantDialog(product.id)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add Variant
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Variants Table - Only show when expanded */}
                    {isExpanded && (
                      <>
                        {variants[product.id] && variants[product.id].length > 0 ? (
                    <div className="ml-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Variant Name</TableHead>
                            <TableHead>Multiplier</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>MRP</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Status</TableHead>
                            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variants[product.id].map((variant) => (
                            <TableRow key={variant.id}>
                              <TableCell className="font-medium">{variant.variant_name}</TableCell>
                              <TableCell>{variant.multiplier}x</TableCell>
                              <TableCell className="font-mono text-sm">{variant.sku || '-'}</TableCell>
                              <TableCell>{variant.mrp ? `₹${variant.mrp.toFixed(2)}` : '-'}</TableCell>
                              <TableCell>{variant.selling_price ? `₹${variant.selling_price.toFixed(2)}` : '-'}</TableCell>
                              <TableCell>
                                <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                                  {variant.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditVariant(variant)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteVariant(variant.id, product.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                        ) : (
                          <div className="ml-4 text-sm text-muted-foreground flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            No variants yet. Click "Add Variant" to create one.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={(open) => {
        setVariantDialogOpen(open);
        if (!open) resetVariantForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? 'Edit Variant' : 'Add Product Variant'}
            </DialogTitle>
            <DialogDescription>
              {editingVariant ? 'Update variant information.' : 'Create a new variant for this product (e.g., 500ml, 1L, 5L).'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVariantSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variant_name">Variant Name *</Label>
                <Input
                  id="variant_name"
                  value={variantFormData.variant_name}
                  onChange={(e) => setVariantFormData({ ...variantFormData, variant_name: e.target.value })}
                  placeholder="e.g., 500ml, 1L, 5L"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplier">Multiplier *</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.001"
                  value={variantFormData.multiplier}
                  onChange={(e) => setVariantFormData({ ...variantFormData, multiplier: e.target.value })}
                  placeholder="e.g., 0.5, 1, 5"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={variantFormData.sku}
                  onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                  placeholder="Unique SKU"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  value={variantFormData.barcode}
                  onChange={(e) => setVariantFormData({ ...variantFormData, barcode: e.target.value })}
                  placeholder="Barcode"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP (₹)</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={variantFormData.mrp}
                  onChange={(e) => setVariantFormData({ ...variantFormData, mrp: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price (₹)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  value={variantFormData.selling_price}
                  onChange={(e) => setVariantFormData({ ...variantFormData, selling_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_price">Cost Price (₹)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={variantFormData.cost_price}
                  onChange={(e) => setVariantFormData({ ...variantFormData, cost_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Input
                id="channel"
                value={variantFormData.channel}
                onChange={(e) => setVariantFormData({ ...variantFormData, channel: e.target.value })}
                placeholder="e.g., store, online, both"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingVariant ? 'Update Variant' : 'Create Variant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Product Category</DialogTitle>
            <DialogDescription>Create a new category to organize your products.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Oils, Accessories"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingCategory}>
                {creatingCategory ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
