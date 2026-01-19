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
import { Building2, Plus, Edit, Trash2, TrendingUp, CheckCircle, FileText, Calendar } from 'lucide-react';
import { vendorsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  vendor_type: string | null;
  is_active: boolean;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    gst_number: '',
    address: '',
    vendor_type: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const data = await vendorsApi.getAll();
      setVendors(data);
    } catch (error) {
      logger.error('Failed to load vendors:', error);
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
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        gst_number: formData.gst_number || undefined,
        address: formData.address || undefined,
        vendor_type: formData.vendor_type || undefined,
      };

      if (editingVendor) {
        await vendorsApi.update(editingVendor.id, payload);
      } else {
        await vendorsApi.create(payload);
      }
      
      setIsDialogOpen(false);
      resetForm();
      await loadVendors();
    } catch (error: any) {
      logger.error('Failed to save vendor:', error);
      alert(error.response?.data?.detail || 'Failed to save vendor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone || '',
      email: vendor.email || '',
      gst_number: vendor.gst_number || '',
      address: vendor.address || '',
      vendor_type: vendor.vendor_type || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      await vendorsApi.delete(id);
      await loadVendors();
    } catch (error: any) {
      logger.error('Failed to delete vendor:', error);
      alert(error.response?.data?.detail || 'Failed to delete vendor');
    }
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData({ name: '', phone: '', email: '', gst_number: '', address: '', vendor_type: '' });
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search)) ||
    (v.gst_number && v.gst_number.includes(search))
  );

  // Calculate KPIs
  const calculateKPIs = () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.is_active).length;
    const vendorsWithGST = vendors.filter(v => v.gst_number && v.gst_number.trim() !== '').length;
    
    // Note: We don't have created_at in the interface, so we'll skip recent vendors for now
    // If you add created_at later, you can calculate recent vendors like this:
    // const recentVendors = vendors.filter(v => {
    //   const createdDate = new Date(v.created_at);
    //   return isWithinInterval(createdDate, { start: monthStart, end: monthEnd });
    // }).length;

    const activePercentage = totalVendors > 0 ? (activeVendors / totalVendors) * 100 : 0;
    const gstPercentage = totalVendors > 0 ? (vendorsWithGST / totalVendors) * 100 : 0;

    return {
      totalVendors,
      activeVendors,
      inactiveVendors: totalVendors - activeVendors,
      vendorsWithGST,
      vendorsWithoutGST: totalVendors - vendorsWithGST,
      activePercentage,
      gstPercentage,
    };
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage your suppliers and vendors</p>
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
            Add Vendor
          </Button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
                <DialogDescription>
                  {editingVendor ? 'Update vendor information.' : 'Create a new vendor or supplier in your system.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., ABC Suppliers"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., +91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., contact@vendor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gst_number">GST Number</Label>
                  <Input
                    id="gst_number"
                    placeholder="e.g., 27ABCDE1234F1Z5"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor_type">Vendor Type</Label>
                  <Input
                    id="vendor_type"
                    placeholder="e.g., Supplier, Manufacturer, Distributor"
                    value={formData.vendor_type}
                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  {submitting ? (editingVendor ? 'Updating...' : 'Creating...') : (editingVendor ? 'Update Vendor' : 'Create Vendor')}
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
          Vendor Overview
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalVendors}</div>
              <p className="text-xs text-muted-foreground mt-1">All vendors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Active Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{kpis.activeVendors}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.activePercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                With GST Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{kpis.vendorsWithGST}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.gstPercentage.toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{kpis.inactiveVendors}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpis.totalVendors > 0 ? ((kpis.inactiveVendors / kpis.totalVendors) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Vendors
            </CardTitle>
            <Input
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No vendors found
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.phone || '-'}</TableCell>
                    <TableCell>{vendor.email || '-'}</TableCell>
                    <TableCell>{vendor.gst_number || '-'}</TableCell>
                    <TableCell>{vendor.vendor_type || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${vendor.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(vendor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(vendor.id)}
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
    </div>
  );
}

