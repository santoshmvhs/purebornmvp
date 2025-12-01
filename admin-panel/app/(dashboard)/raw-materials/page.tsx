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
import { Box, Plus, Edit, Trash2 } from 'lucide-react';
import { rawMaterialsApi } from '@/lib/api';
import { logger } from '@/lib/logger';

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  hsn_code?: string | null;
  reorder_level?: number | null;
  is_active: boolean;
}

export default function RawMaterialsPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRawMaterial, setEditingRawMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    hsn_code: '',
    reorder_level: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRawMaterials();
  }, []);

  const loadRawMaterials = async () => {
    try {
      const data = await rawMaterialsApi.getAll();
      setRawMaterials(data);
    } catch (error) {
      logger.error('Failed to load raw materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        unit: formData.unit,
        hsn_code: formData.hsn_code || undefined,
        reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : undefined,
      };

      if (editingRawMaterial) {
        await rawMaterialsApi.update(editingRawMaterial.id, payload);
      } else {
        await rawMaterialsApi.create(payload);
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadRawMaterials();
    } catch (error: any) {
      logger.error('Failed to save raw material:', error);
      alert(error.response?.data?.detail || 'Failed to save raw material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rawMaterial: RawMaterial) => {
    setEditingRawMaterial(rawMaterial);
    setFormData({
      name: rawMaterial.name,
      unit: rawMaterial.unit,
      hsn_code: rawMaterial.hsn_code || '',
      reorder_level: rawMaterial.reorder_level?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this raw material? This action cannot be undone.')) {
      return;
    }

    try {
      await rawMaterialsApi.delete(id);
      await loadRawMaterials();
    } catch (error: any) {
      logger.error('Failed to delete raw material:', error);
      alert(error.response?.data?.detail || 'Failed to delete raw material');
    }
  };

  const resetForm = () => {
    setEditingRawMaterial(null);
    setFormData({ name: '', unit: '', hsn_code: '', reorder_level: '' });
  };

  const filteredRawMaterials = rawMaterials.filter((rm) =>
    rm.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading raw materials...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Raw Materials</h1>
          <p className="text-muted-foreground mt-1">Manage raw materials inventory</p>
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
            Add Raw Material
          </Button>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingRawMaterial ? 'Edit Raw Material' : 'Add Raw Material'}</DialogTitle>
                <DialogDescription>
                  {editingRawMaterial ? 'Update raw material information.' : 'Create a new raw material entry in your inventory.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Sunflower Oil"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., L, kg, pcs"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hsn_code">HSN Code</Label>
                  <Input
                    id="hsn_code"
                    placeholder="e.g., 1509"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 100"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                  />
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
                  {submitting ? (editingRawMaterial ? 'Updating...' : 'Creating...') : (editingRawMaterial ? 'Update Raw Material' : 'Create Raw Material')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              All Raw Materials
            </CardTitle>
            <Input
              placeholder="Search raw materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRawMaterials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No raw materials found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRawMaterials.map((rm) => (
                  <TableRow key={rm.id}>
                    <TableCell className="font-medium">{rm.name}</TableCell>
                    <TableCell>{rm.unit}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${rm.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {rm.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rm)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(rm.id)}
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

