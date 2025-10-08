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
import { Plus, Search, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IItem | null>(null);
  const [viewingItem, setViewingItem] = useState<IItem | null>(null);
  const [formData, setFormData] = useState({
    item_number: '',
    item_description: '',
    item_type: '',
    inventory_organization: '',
    primary_uom: '',
    uom_code: '',
    item_status: 'active' as 'active' | 'inactive'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params: ItemQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        item_status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive'),
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
      if (!formData.item_number.trim()) {
        setFormErrors(prev => ({ ...prev, item_number: 'Item number is required' }));
        return;
      }
      if (!formData.uom_code.trim()) {
        setFormErrors(prev => ({ ...prev, uom_code: 'UOM code is required' }));
        return;
      }

      await itemsApi.create(formData);
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
        description: error.message || "Failed to create item",
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
      if (!formData.item_number.trim()) {
        setFormErrors(prev => ({ ...prev, item_number: 'Item number is required' }));
        return;
      }
      if (!formData.uom_code.trim()) {
        setFormErrors(prev => ({ ...prev, uom_code: 'UOM code is required' }));
        return;
      }

      await itemsApi.update(editingItem.id, formData);
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
        description: error.message || "Failed to update item",
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
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (item: IItem) => {
    setEditingItem(item);
    setFormData({
      item_number: item.item_number,
      item_description: item.item_description || '',
      item_type: item.item_type || '',
      inventory_organization: item.inventory_organization || '',
      primary_uom: item.primary_uom || '',
      uom_code: item.uom_code,
      item_status: item.item_status as 'active' | 'inactive'
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (item: IItem) => {
    setViewingItem(item);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      item_number: '',
      item_description: '',
      item_type: '',
      inventory_organization: '',
      primary_uom: '',
      uom_code: '',
      item_status: 'active'
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
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch}>
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
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
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
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Item</DialogTitle>
                      <DialogDescription>
                        Add a new item to your inventory system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item_number">Item Number *</Label>
                        <Input
                          id="item_number"
                          value={formData.item_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, item_number: e.target.value }))}
                          placeholder="Enter item number"
                          className={formErrors.item_number ? "border-red-500" : ""}
                        />
                        {formErrors.item_number && <p className="text-sm text-red-500 mt-1">{formErrors.item_number}</p>}
                      </div>
                      <div>
                        <Label htmlFor="uom_code">UOM Code *</Label>
                        <Input
                          id="uom_code"
                          value={formData.uom_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, uom_code: e.target.value }))}
                          placeholder="Enter UOM code"
                          className={formErrors.uom_code ? "border-red-500" : ""}
                        />
                        {formErrors.uom_code && <p className="text-sm text-red-500 mt-1">{formErrors.uom_code}</p>}
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
                        <Label htmlFor="item_type">Item Type</Label>
                        <Input
                          id="item_type"
                          value={formData.item_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, item_type: e.target.value }))}
                          placeholder="Enter item type"
                        />
                      </div>
                      <div>
                        <Label htmlFor="inventory_organization">Inventory Organization</Label>
                        <Input
                          id="inventory_organization"
                          value={formData.inventory_organization}
                          onChange={(e) => setFormData(prev => ({ ...prev, inventory_organization: e.target.value }))}
                          placeholder="Enter organization"
                        />
                      </div>
                      <div>
                        <Label htmlFor="primary_uom">Primary UOM</Label>
                        <Input
                          id="primary_uom"
                          value={formData.primary_uom}
                          onChange={(e) => setFormData(prev => ({ ...prev, primary_uom: e.target.value }))}
                          placeholder="Enter primary UOM"
                        />
                      </div>
                      <div>
                        <Label htmlFor="item_status">Status</Label>
                        <Select value={formData.item_status} onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, item_status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <TableHead>Item Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Primary UOM</TableHead>
                      <TableHead>UOM Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm font-medium">{item.item_number}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.item_description || '-'}
                        </TableCell>
                        <TableCell>{item.item_type || '-'}</TableCell>
                        <TableCell>{item.inventory_organization || '-'}</TableCell>
                        <TableCell>{item.primary_uom || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.uom_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.item_status)}>
                            {item.item_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
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
                                    Are you sure you want to delete item "{item.item_number}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => item.id && handleDelete(item.id)}
                                    disabled={deleteLoading}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteLoading ? 'Deleting...' : 'Delete'}
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
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Update item information
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-item-number">Item Number *</Label>
                <Input
                  id="edit-item-number"
                  value={formData.item_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, item_number: e.target.value }))}
                  placeholder="Enter item number"
                  className={formErrors.item_number ? "border-red-500" : ""}
                />
                {formErrors.item_number && <p className="text-sm text-red-500 mt-1">{formErrors.item_number}</p>}
              </div>
              <div>
                <Label htmlFor="edit-uom-code">UOM Code *</Label>
                <Input
                  id="edit-uom-code"
                  value={formData.uom_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, uom_code: e.target.value }))}
                  placeholder="Enter UOM code"
                  className={formErrors.uom_code ? "border-red-500" : ""}
                />
                {formErrors.uom_code && <p className="text-sm text-red-500 mt-1">{formErrors.uom_code}</p>}
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
                <Label htmlFor="edit-item-type">Item Type</Label>
                <Input
                  id="edit-item-type"
                  value={formData.item_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, item_type: e.target.value }))}
                  placeholder="Enter item type"
                />
              </div>
              <div>
                <Label htmlFor="edit-inventory-organization">Inventory Organization</Label>
                <Input
                  id="edit-inventory-organization"
                  value={formData.inventory_organization}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventory_organization: e.target.value }))}
                  placeholder="Enter organization"
                />
              </div>
              <div>
                <Label htmlFor="edit-primary-uom">Primary UOM</Label>
                <Input
                  id="edit-primary-uom"
                  value={formData.primary_uom}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_uom: e.target.value }))}
                  placeholder="Enter primary UOM"
                />
              </div>
              <div>
                <Label htmlFor="edit-item-status">Status</Label>
                <Select value={formData.item_status} onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, item_status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Item Details</DialogTitle>
              <DialogDescription>
                Detailed information for item: {viewingItem?.item_number}
              </DialogDescription>
            </DialogHeader>
            {viewingItem && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Item Number</Label>
                  <div className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded mt-1">{viewingItem.item_number}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">UOM Code</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingItem.uom_code}</div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Description</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingItem.item_description || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Item Type</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingItem.item_type || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Inventory Organization</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingItem.inventory_organization || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Primary UOM</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{viewingItem.primary_uom || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <Badge className={`mt-1 ${getStatusColor(viewingItem.item_status)}`}>
                    {viewingItem.item_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created At</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{formatDate(viewingItem.created_at)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">{formatDate(viewingItem.updated_at)}</div>
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
