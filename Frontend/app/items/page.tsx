"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, RefreshCw, Ruler, Weight, Hash, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { itemsApi, IItem, ItemQueryParams } from '@/lib/api/items';
import { PageHeader } from '@/components/layout/page-header';

export default function ItemsPage() {
  const [items, setItems] = useState<IItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trackingFilter, setTrackingFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IItem | null>(null);
  const [viewingItem, setViewingItem] = useState<IItem | null>(null);
  const [formData, setFormData] = useState({
    item_code: '',
    item_description: '',
    item_status: 'active' as 'active' | 'inactive' | 'obsolete',
    org_code: '',
    category_id: null as number | null,
    capex_opex: null as 'CAPEX' | 'OPEX' | null,
    tracking_method: 'NONE' as 'NONE' | 'SERIAL' | 'LOT',
    uom_primary: '',
    uom_secondary: '',
    conversion_to_primary: null as number | null,
    brand: '',
    model: '',
    manufacturer: '',
    hsn_code: '',
    barcode_upc: '',
    barcode_ean: '',
    gs1_gtin: '',
    rfid_supported: true,
    default_location_id: null as number | null,
    min_qty: null as number | null,
    max_qty: null as number | null,
    unit_weight_kg: null as number | null,
    unit_length_cm: null as number | null,
    unit_width_cm: null as number | null,
    unit_height_cm: null as number | null,
    fusion_item_id: '',
    fusion_category: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, trackingFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params: ItemQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        item_status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive' | 'obsolete'),
        tracking_method: trackingFilter === 'all' ? undefined : (trackingFilter as 'NONE' | 'SERIAL' | 'LOT'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await itemsApi.getAll(params);
      setItems(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.item_code.trim()) {
        setFormErrors(prev => ({ ...prev, item_code: 'Item code is required' }));
        return;
      }
      if (!formData.uom_primary.trim()) {
        setFormErrors(prev => ({ ...prev, uom_primary: 'Primary UOM is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        category_id: formData.category_id || undefined,
        capex_opex: formData.capex_opex || undefined,
        conversion_to_primary: formData.conversion_to_primary || undefined,
        default_location_id: formData.default_location_id || undefined,
        min_qty: formData.min_qty || undefined,
        max_qty: formData.max_qty || undefined,
        unit_weight_kg: formData.unit_weight_kg || undefined,
        unit_length_cm: formData.unit_length_cm || undefined,
        unit_width_cm: formData.unit_width_cm || undefined,
        unit_height_cm: formData.unit_height_cm || undefined
      };
      
      await itemsApi.create(apiData);
      toast({
        title: "Success",
        description: "Item created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      console.error('Error creating item:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create item",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem?.id) return;

    try {
      setUpdateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.item_code.trim()) {
        setFormErrors(prev => ({ ...prev, item_code: 'Item code is required' }));
        return;
      }
      if (!formData.uom_primary.trim()) {
        setFormErrors(prev => ({ ...prev, uom_primary: 'Primary UOM is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        category_id: formData.category_id || undefined,
        capex_opex: formData.capex_opex || undefined,
        conversion_to_primary: formData.conversion_to_primary || undefined,
        default_location_id: formData.default_location_id || undefined,
        min_qty: formData.min_qty || undefined,
        max_qty: formData.max_qty || undefined,
        unit_weight_kg: formData.unit_weight_kg || undefined,
        unit_length_cm: formData.unit_length_cm || undefined,
        unit_width_cm: formData.unit_width_cm || undefined,
        unit_height_cm: formData.unit_height_cm || undefined
      };
      
      await itemsApi.update(editingItem.id, apiData);
      toast({
        title: "Success",
        description: "Item updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: any) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update item",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await itemsApi.delete(id);
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete item",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (item: IItem) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      item_description: item.item_description || '',
      item_status: item.item_status as 'active' | 'inactive' | 'obsolete',
      org_code: item.org_code || '',
      category_id: item.category_id || null,
      capex_opex: item.capex_opex || null,
      tracking_method: item.tracking_method as 'NONE' | 'SERIAL' | 'LOT',
      uom_primary: item.uom_primary,
      uom_secondary: item.uom_secondary || '',
      conversion_to_primary: item.conversion_to_primary || null,
      brand: item.brand || '',
      model: item.model || '',
      manufacturer: item.manufacturer || '',
      hsn_code: item.hsn_code || '',
      barcode_upc: item.barcode_upc || '',
      barcode_ean: item.barcode_ean || '',
      gs1_gtin: item.gs1_gtin || '',
      rfid_supported: item.rfid_supported ?? true,
      default_location_id: item.default_location_id || null,
      min_qty: item.min_qty || null,
      max_qty: item.max_qty || null,
      unit_weight_kg: item.unit_weight_kg || null,
      unit_length_cm: item.unit_length_cm || null,
      unit_width_cm: item.unit_width_cm || null,
      unit_height_cm: item.unit_height_cm || null,
      fusion_item_id: item.fusion_item_id || '',
      fusion_category: item.fusion_category || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (item: IItem) => {
    setViewingItem(item);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      item_code: '',
      item_description: '',
      item_status: 'active',
      org_code: '',
      category_id: null,
      capex_opex: null,
      tracking_method: 'NONE',
      uom_primary: '',
      uom_secondary: '',
      conversion_to_primary: null,
      brand: '',
      model: '',
      manufacturer: '',
      hsn_code: '',
      barcode_upc: '',
      barcode_ean: '',
      gs1_gtin: '',
      rfid_supported: true,
      default_location_id: null,
      min_qty: null,
      max_qty: null,
      unit_weight_kg: null,
      unit_length_cm: null,
      unit_width_cm: null,
      unit_height_cm: null,
      fusion_item_id: '',
      fusion_category: ''
    });
    setFormErrors({});
    setEditingItem(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchItems();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTrackingFilter('all');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'obsolete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'inactive':
        return 'text-blue-600 bg-blue-100';
      case 'obsolete':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrackingBadgeVariant = (tracking: string) => {
    switch (tracking) {
      case 'SERIAL':
        return 'default';
      case 'LOT':
        return 'secondary';
      case 'NONE':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTrackingColor = (tracking: string) => {
    switch (tracking) {
      case 'SERIAL':
        return 'text-green-600 bg-green-100';
      case 'LOT':
        return 'text-blue-600 bg-blue-100';
      case 'NONE':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <PageLayout activePage="items">
      <div className="space-y-6">
        <PageHeader
          title="Items"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Items", href: "/items" }
          ]}
        />

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 max-w-sm">
                  <Label htmlFor="search">Search</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="search"
                      placeholder="Search by code, description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} size="sm">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="w-40">
                  <Label htmlFor="status">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="obsolete">Obsolete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40">
                  <Label htmlFor="tracking">Tracking</Label>
                  <Select value={trackingFilter} onValueChange={setTrackingFilter}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tracking</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="SERIAL">Serial</SelectItem>
                      <SelectItem value="LOT">Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Item</DialogTitle>
                      <DialogDescription>
                        Add a new item to your inventory system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item_code">Item Code *</Label>
                        <Input
                          id="item_code"
                          value={formData.item_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, item_code: e.target.value }))}
                          placeholder="Enter item code"
                          className={formErrors.item_code ? "border-red-500" : ""}
                        />
                        {formErrors.item_code && <p className="text-sm text-red-500 mt-1">{formErrors.item_code}</p>}
                      </div>
                      <div>
                        <Label htmlFor="uom_primary">Primary UOM *</Label>
                        <Input
                          id="uom_primary"
                          value={formData.uom_primary}
                          onChange={(e) => setFormData(prev => ({ ...prev, uom_primary: e.target.value }))}
                          placeholder="Enter primary UOM"
                          className={formErrors.uom_primary ? "border-red-500" : ""}
                        />
                        {formErrors.uom_primary && <p className="text-sm text-red-500 mt-1">{formErrors.uom_primary}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="item_description">Description</Label>
                        <Textarea
                          id="item_description"
                          value={formData.item_description}
                          onChange={(e) => setFormData(prev => ({ ...prev, item_description: e.target.value }))}
                          placeholder="Enter item description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="item_status">Status</Label>
                        <Select value={formData.item_status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, item_status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="obsolete">Obsolete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tracking_method">Tracking Method</Label>
                        <Select value={formData.tracking_method} onValueChange={(value: 'NONE' | 'SERIAL' | 'LOT') => setFormData(prev => ({ ...prev, tracking_method: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="SERIAL">Serial</SelectItem>
                            <SelectItem value="LOT">Lot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="org_code">Organization Code</Label>
                        <Input
                          id="org_code"
                          value={formData.org_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, org_code: e.target.value }))}
                          placeholder="Enter organization code"
                        />
                      </div>
                      {/* FIXED: No empty string as SelectItem value; use "NONE" sentinel */}
                      <div>
                        <Label htmlFor="capex_opex">CAPEX/OPEX</Label>
                        <Select
                          value={formData.capex_opex ?? "NONE"}
                          onValueChange={(value: 'CAPEX' | 'OPEX' | 'NONE') =>
                            setFormData(prev => ({ ...prev, capex_opex: value === 'NONE' ? null : value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">None</SelectItem>
                            <SelectItem value="CAPEX">CAPEX</SelectItem>
                            <SelectItem value="OPEX">OPEX</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="brand">Brand</Label>
                        <Input
                          id="brand"
                          value={formData.brand}
                          onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                          placeholder="Enter brand"
                        />
                      </div>
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Input
                          id="model"
                          value={formData.model}
                          onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="Enter model"
                        />
                      </div>
                      <div>
                        <Label htmlFor="manufacturer">Manufacturer</Label>
                        <Input
                          id="manufacturer"
                          value={formData.manufacturer}
                          onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                          placeholder="Enter manufacturer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="hsn_code">HSN Code</Label>
                        <Input
                          id="hsn_code"
                          value={formData.hsn_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
                          placeholder="Enter HSN code"
                        />
                      </div>
                      <div>
                        <Label htmlFor="barcode_upc">UPC Barcode</Label>
                        <Input
                          id="barcode_upc"
                          value={formData.barcode_upc}
                          onChange={(e) => setFormData(prev => ({ ...prev, barcode_upc: e.target.value }))}
                          placeholder="Enter UPC barcode"
                        />
                      </div>
                      <div>
                        <Label htmlFor="barcode_ean">EAN Barcode</Label>
                        <Input
                          id="barcode_ean"
                          value={formData.barcode_ean}
                          onChange={(e) => setFormData(prev => ({ ...prev, barcode_ean: e.target.value }))}
                          placeholder="Enter EAN barcode"
                        />
                      </div>
                      <div>
                        <Label htmlFor="gs1_gtin">GS1 GTIN</Label>
                        <Input
                          id="gs1_gtin"
                          value={formData.gs1_gtin}
                          onChange={(e) => setFormData(prev => ({ ...prev, gs1_gtin: e.target.value }))}
                          placeholder="Enter GS1 GTIN"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rfid_supported">RFID Supported</Label>
                        <Select value={formData.rfid_supported ? 'true' : 'false'} onValueChange={(value) => setFormData(prev => ({ ...prev, rfid_supported: value === 'true' }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="min_qty">Minimum Quantity</Label>
                        <Input
                          id="min_qty"
                          type="number"
                          value={formData.min_qty || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, min_qty: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter minimum quantity"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_qty">Maximum Quantity</Label>
                        <Input
                          id="max_qty"
                          type="number"
                          value={formData.max_qty || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_qty: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter maximum quantity"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_weight_kg">Unit Weight (kg)</Label>
                        <Input
                          id="unit_weight_kg"
                          type="number"
                          value={formData.unit_weight_kg || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_weight_kg: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter unit weight"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_length_cm">Unit Length (cm)</Label>
                        <Input
                          id="unit_length_cm"
                          type="number"
                          value={formData.unit_length_cm || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_length_cm: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter unit length"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_width_cm">Unit Width (cm)</Label>
                        <Input
                          id="unit_width_cm"
                          type="number"
                          value={formData.unit_width_cm || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_width_cm: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter unit width"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit_height_cm">Unit Height (cm)</Label>
                        <Input
                          id="unit_height_cm"
                          type="number"
                          value={formData.unit_height_cm || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, unit_height_cm: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter unit height"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fusion_item_id">Fusion Item ID</Label>
                        <Input
                          id="fusion_item_id"
                          value={formData.fusion_item_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, fusion_item_id: e.target.value }))}
                          placeholder="Enter fusion item ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fusion_category">Fusion Category</Label>
                        <Input
                          id="fusion_category"
                          value={formData.fusion_category}
                          onChange={(e) => setFormData(prev => ({ ...prev, fusion_category: e.target.value }))}
                          placeholder="Enter fusion category"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreate}
                        disabled={createLoading}
                      >
                        {createLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          'Create Item'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Items ({totalItems})</CardTitle>
            <CardDescription>
              Manage and track your inventory items
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items found. Create your first item to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Brand/Model</TableHead>
                      <TableHead>Dimensions</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.item_description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(item.item_status)}
                            className={getStatusColor(item.item_status)}
                          >
                            {item.item_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getTrackingBadgeVariant(item.tracking_method)}
                            className={getTrackingColor(item.tracking_method)}
                          >
                            {item.tracking_method}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Hash className="h-3 w-3" />
                              <span className="font-medium">{item.uom_primary}</span>
                            </div>
                            {item.uom_secondary && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>Secondary: {item.uom_secondary}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.brand && (
                              <div className="text-sm font-medium">{item.brand}</div>
                            )}
                            {item.model && (
                              <div className="text-xs text-gray-500">{item.model}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.unit_weight_kg && (
                              <div className="flex items-center gap-1 text-xs">
                                <Weight className="h-3 w-3" />
                                <span>{item.unit_weight_kg}kg</span>
                              </div>
                            )}
                            {(item.unit_length_cm || item.unit_width_cm || item.unit_height_cm) && (
                              <div className="flex items-center gap-1 text-xs">
                                <Ruler className="h-3 w-3" />
                                <span>
                                  {item.unit_length_cm || 0}×{item.unit_width_cm || 0}×{item.unit_height_cm || 0}cm
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(item.created_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete item "{item.item_code}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => item.id && handleDelete(item.id)}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteLoading ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Deleting...
                                      </>
                                    ) : (
                                      'Delete'
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Update item information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-item-code">Item Code *</Label>
                <Input
                  id="edit-item-code"
                  value={formData.item_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, item_code: e.target.value }))}
                  placeholder="Enter item code"
                  className={formErrors.item_code ? "border-red-500" : ""}
                />
                {formErrors.item_code && <p className="text-sm text-red-500 mt-1">{formErrors.item_code}</p>}
              </div>
              <div>
                <Label htmlFor="edit-uom-primary">Primary UOM *</Label>
                <Input
                  id="edit-uom-primary"
                  value={formData.uom_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, uom_primary: e.target.value }))}
                  placeholder="Enter primary UOM"
                  className={formErrors.uom_primary ? "border-red-500" : ""}
                />
                {formErrors.uom_primary && <p className="text-sm text-red-500 mt-1">{formErrors.uom_primary}</p>}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="edit-item-description">Description</Label>
                <Textarea
                  id="edit-item-description"
                  value={formData.item_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, item_description: e.target.value }))}
                  placeholder="Enter item description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-item-status">Status</Label>
                <Select value={formData.item_status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, item_status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="obsolete">Obsolete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-tracking-method">Tracking Method</Label>
                <Select value={formData.tracking_method} onValueChange={(value: 'NONE' | 'SERIAL' | 'LOT') => setFormData(prev => ({ ...prev, tracking_method: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="SERIAL">Serial</SelectItem>
                    <SelectItem value="LOT">Lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-org-code">Organization Code</Label>
                <Input
                  id="edit-org-code"
                  value={formData.org_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, org_code: e.target.value }))}
                  placeholder="Enter organization code"
                />
              </div>
              {/* FIXED: No empty string as SelectItem value; use "NONE" sentinel */}
              <div>
                <Label htmlFor="edit-capex-opex">CAPEX/OPEX</Label>
                <Select
                  value={formData.capex_opex ?? "NONE"}
                  onValueChange={(value: 'CAPEX' | 'OPEX' | 'NONE') =>
                    setFormData(prev => ({ ...prev, capex_opex: value === 'NONE' ? null : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="CAPEX">CAPEX</SelectItem>
                    <SelectItem value="OPEX">OPEX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Enter brand"
                />
              </div>
              <div>
                <Label htmlFor="edit-model">Model</Label>
                <Input
                  id="edit-model"
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Enter model"
                />
              </div>
              <div>
                <Label htmlFor="edit-manufacturer">Manufacturer</Label>
                <Input
                  id="edit-manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="Enter manufacturer"
                />
              </div>
              <div>
                <Label htmlFor="edit-hsn-code">HSN Code</Label>
                <Input
                  id="edit-hsn-code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
                  placeholder="Enter HSN code"
                />
              </div>
              <div>
                <Label htmlFor="edit-barcode-upc">UPC Barcode</Label>
                <Input
                  id="edit-barcode-upc"
                  value={formData.barcode_upc}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode_upc: e.target.value }))}
                  placeholder="Enter UPC barcode"
                />
              </div>
              <div>
                <Label htmlFor="edit-barcode-ean">EAN Barcode</Label>
                <Input
                  id="edit-barcode-ean"
                  value={formData.barcode_ean}
                  onChange={(e) => setFormData(prev => ({ ...prev, barcode_ean: e.target.value }))}
                  placeholder="Enter EAN barcode"
                />
              </div>
              <div>
                <Label htmlFor="edit-gs1-gtin">GS1 GTIN</Label>
                <Input
                  id="edit-gs1-gtin"
                  value={formData.gs1_gtin}
                  onChange={(e) => setFormData(prev => ({ ...prev, gs1_gtin: e.target.value }))}
                  placeholder="Enter GS1 GTIN"
                />
              </div>
              <div>
                <Label htmlFor="edit-rfid-supported">RFID Supported</Label>
                <Select value={formData.rfid_supported ? 'true' : 'false'} onValueChange={(value) => setFormData(prev => ({ ...prev, rfid_supported: value === 'true' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-min-qty">Minimum Quantity</Label>
                <Input
                  id="edit-min-qty"
                  type="number"
                  value={formData.min_qty || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_qty: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter minimum quantity"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-max-qty">Maximum Quantity</Label>
                <Input
                  id="edit-max-qty"
                  type="number"
                  value={formData.max_qty || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_qty: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter maximum quantity"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit-weight-kg">Unit Weight (kg)</Label>
                <Input
                  id="edit-unit-weight-kg"
                  type="number"
                  value={formData.unit_weight_kg || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_weight_kg: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter unit weight"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit-length-cm">Unit Length (cm)</Label>
                <Input
                  id="edit-unit-length-cm"
                  type="number"
                  value={formData.unit_length_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_length_cm: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter unit length"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit-width-cm">Unit Width (cm)</Label>
                <Input
                  id="edit-unit-width-cm"
                  type="number"
                  value={formData.unit_width_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_width_cm: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter unit width"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="edit-unit-height-cm">Unit Height (cm)</Label>
                <Input
                  id="edit-unit-height-cm"
                  type="number"
                  value={formData.unit_height_cm || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit_height_cm: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter unit height"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <Label htmlFor="edit-fusion-item-id">Fusion Item ID</Label>
                <Input
                  id="edit-fusion-item-id"
                  value={formData.fusion_item_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, fusion_item_id: e.target.value }))}
                  placeholder="Enter fusion item ID"
                />
              </div>
              <div>
                <Label htmlFor="edit-fusion-category">Fusion Category</Label>
                <Input
                  id="edit-fusion-category"
                  value={formData.fusion_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, fusion_category: e.target.value }))}
                  placeholder="Enter fusion category"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Item'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Item Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Item Details</DialogTitle>
              <DialogDescription>
                Detailed information for item: {viewingItem?.item_code}
              </DialogDescription>
            </DialogHeader>
            {viewingItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Item Code</Label>
                      <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">{viewingItem.item_code}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Description</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.item_description || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Status</Label>
                      <Badge 
                        variant={getStatusBadgeVariant(viewingItem.item_status)}
                        className={getStatusColor(viewingItem.item_status)}
                      >
                        {viewingItem.item_status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Organization Code</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.org_code || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">CAPEX/OPEX</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.capex_opex || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Tracking & UOM */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tracking & UOM</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Tracking Method</Label>
                      <Badge 
                        variant={getTrackingBadgeVariant(viewingItem.tracking_method)}
                        className={getTrackingColor(viewingItem.tracking_method)}
                      >
                        {viewingItem.tracking_method}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Primary UOM</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.uom_primary}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Secondary UOM</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.uom_secondary || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Conversion to Primary</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.conversion_to_primary || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Brand & Manufacturer */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Brand & Manufacturer</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Brand</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.brand || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Model</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.model || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Manufacturer</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.manufacturer || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">HSN Code</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.hsn_code || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Barcodes & RFID */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Barcodes & RFID</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">UPC Barcode</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.barcode_upc || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">EAN Barcode</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.barcode_ean || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">GS1 GTIN</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.gs1_gtin || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">RFID Supported</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingItem.rfid_supported ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dimensions & Weight */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Dimensions & Weight</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Unit Weight (kg)</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.unit_weight_kg || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Dimensions (L×W×H cm)</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {viewingItem.unit_length_cm || 0} × {viewingItem.unit_width_cm || 0} × {viewingItem.unit_height_cm || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Quantities</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Minimum Quantity</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.min_qty || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Maximum Quantity</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.max_qty || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Fusion Integration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Fusion Integration</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Fusion Item ID</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.fusion_item_id || '-'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Fusion Category</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{viewingItem.fusion_category || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Timestamps</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Created At</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(viewingItem.created_at!)}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{formatDate(viewingItem.updated_at!)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
