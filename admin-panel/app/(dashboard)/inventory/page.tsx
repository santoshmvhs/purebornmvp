'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Package, Box } from 'lucide-react';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';

interface RawMaterialStock {
  raw_material_id: string;
  raw_material_name: string;
  unit: string;
  current_stock: number;
  total_cost_value: number;
}

interface ProductVariantStock {
  product_variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string | null;
  channel: string | null;
  mrp: number | null;
  selling_price: number | null;
  current_stock: number;
  total_cost_value: number;
}

export default function InventoryPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStock[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariantStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRaw, setSearchRaw] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const [rawRes, productRes] = await Promise.all([
        api.get('/views/inventory/raw-materials'),
        api.get('/views/inventory/product-variants'),
      ]);
      setRawMaterials(rawRes.data);
      setProductVariants(productRes.data);
    } catch (error) {
      logger.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRawMaterials = rawMaterials.filter((rm) =>
    rm.raw_material_name.toLowerCase().includes(searchRaw.toLowerCase())
  );

  const filteredProductVariants = productVariants.filter((pv) =>
    `${pv.product_name} ${pv.variant_name} ${pv.sku || ''}`.toLowerCase().includes(searchProduct.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-gray-600 mt-1">Current stock levels for raw materials and products</p>
      </div>

      <div className="space-y-6">
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Raw Materials Stock
                </CardTitle>
                <Input
                  placeholder="Search raw materials..."
                  value={searchRaw}
                  onChange={(e) => setSearchRaw(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Total Cost Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRawMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        No raw materials found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRawMaterials.map((rm) => (
                      <TableRow key={rm.raw_material_id}>
                        <TableCell className="font-medium">{rm.raw_material_name}</TableCell>
                        <TableCell>{rm.unit}</TableCell>
                        <TableCell className="text-right">
                          {rm.current_stock.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{rm.total_cost_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Variants Stock
                </CardTitle>
                <Input
                  placeholder="Search products..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full md:w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductVariants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500">
                        No product variants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProductVariants.map((pv) => (
                      <TableRow key={pv.product_variant_id}>
                        <TableCell className="font-medium">{pv.product_name}</TableCell>
                        <TableCell>{pv.variant_name}</TableCell>
                        <TableCell>{pv.sku || '-'}</TableCell>
                        <TableCell>{pv.channel || '-'}</TableCell>
                        <TableCell className="text-right">
                          {pv.mrp ? `₹${pv.mrp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pv.selling_price ? `₹${pv.selling_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pv.current_stock.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{pv.total_cost_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

