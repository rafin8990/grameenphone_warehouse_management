"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { purchaseOrdersApi, IPurchaseOrderWithItems, PurchaseOrderQueryParams } from '@/lib/api/purchase-orders';
import { itemsApi, IItem } from '@/lib/api/items';

interface IPoItemSimple {
  item_number: string;
  quantity: number;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<IPurchaseOrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<IPurchaseOrderWithItems | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    po_number: '',
    po_description: '',
    supplier_name: '',
    po_type: ''
  });

  // Items state
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<IPoItemSimple[]>([]);
  const [availableItems, setAvailableItems] = useState<IItem[]>([]);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPurchaseOrders();
    fetchAvailableItems();
  }, [searchTerm, currentPage]);

  const fetchAvailableItems = async () => {
    try {
      const response = await itemsApi.getAll({ limit: 1000, item_status: 'active' });
      setAvailableItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch available items",
        variant: "destructive"
      });
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const filters: PurchaseOrderQueryParams = {
        searchTerm: searchTerm || undefined,
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await purchaseOrdersApi.getAll(filters);
      setPurchaseOrders(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);

      // Validation
      if (!formData.supplier_name.trim()) {
        toast({
          title: "Validation Error",
          description: "Supplier name is required",
          variant: "destructive"
        });
        return;
      }

      if (purchaseOrderItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one item is required",
          variant: "destructive"
        });
        return;
      }

      // Validate all items
      for (let i = 0; i < purchaseOrderItems.length; i++) {
        const item = purchaseOrderItems[i];
        if (!item.item_number || !item.quantity) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1} must have both item number and quantity`,
            variant: "destructive"
          });
          return;
        }
      }

      const purchaseOrderData = {
        po_number: formData.po_number || undefined,
        po_description: formData.po_description || undefined,
        supplier_name: formData.supplier_name,
        po_type: formData.po_type || undefined,
        po_items: purchaseOrderItems.map(item => ({
          item_number: item.item_number,
          quantity: Number(item.quantity)
        }))
      };

      // Use auto-create if no PO number provided
      if (!formData.po_number) {
        await purchaseOrdersApi.autoCreate(purchaseOrderData);
      } else {
        await purchaseOrdersApi.create(purchaseOrderData as any);
      }

      toast({
        title: "Success",
        description: "Purchase order created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleQuickGenerate = async () => {
    try {
      setCreateLoading(true);

      // Quick generate - no form needed, uses fixed data
      const result = await purchaseOrdersApi.quickGenerate();

      toast({
        title: "Success",
        description: `Purchase order ${result.po_number} generated successfully with ${result.items?.length || 0} items`,
        duration: 5000
      });
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error quick-generating purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate purchase order. Make sure items 500497359, 500180440, and 3002379 exist in database.",
        variant: "destructive"
      });
    } finally {
      setCreateLoading(false);
    }
  };


  const handleUpdate = async () => {
    if (!selectedPurchaseOrder?.id) return;

    try {
      setUpdateLoading(true);

      // Validation
      if (!formData.supplier_name.trim()) {
        toast({
          title: "Validation Error",
          description: "Supplier name is required",
          variant: "destructive"
        });
        return;
      }

      if (purchaseOrderItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one item is required",
          variant: "destructive"
        });
        return;
      }

      const purchaseOrderData = {
        po_number: formData.po_number,
        po_description: formData.po_description,
        supplier_name: formData.supplier_name,
        po_type: formData.po_type,
        po_items: purchaseOrderItems.map(item => ({
          item_number: item.item_number,
          quantity: Number(item.quantity)
        }))
      };

      await purchaseOrdersApi.update(selectedPurchaseOrder.id, purchaseOrderData);

      toast({
        title: "Success",
        description: "Purchase order updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPurchaseOrder?.id) return;

    try {
      setDeleteLoading(true);
      await purchaseOrdersApi.delete(selectedPurchaseOrder.id);
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
      setSelectedPurchaseOrder(null);
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase order",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };


  const resetForm = () => {
    setFormData({
      po_number: '',
      po_description: '',
      supplier_name: '',
      po_type: ''
    });
    setPurchaseOrderItems([]);
  };

  const addPurchaseOrderItem = () => {
    setPurchaseOrderItems([...purchaseOrderItems, { item_number: '', quantity: 1 }]);
  };

  const removePurchaseOrderItem = (index: number) => {
    setPurchaseOrderItems(purchaseOrderItems.filter((_, i) => i !== index));
  };

  const updatePurchaseOrderItem = (index: number, field: keyof IPoItemSimple, value: any) => {
    const updatedItems = [...purchaseOrderItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setPurchaseOrderItems(updatedItems);
  };

  const openEditDialog = (purchaseOrder: IPurchaseOrderWithItems) => {
    setSelectedPurchaseOrder(purchaseOrder);
    setFormData({
      po_number: purchaseOrder.po_number,
      po_description: purchaseOrder.po_description || '',
      supplier_name: purchaseOrder.supplier_name,
      po_type: purchaseOrder.po_type || ''
    });
    setPurchaseOrderItems(
      (purchaseOrder.items || []).map(item => ({
        item_number: item.item_number,
        quantity: item.quantity
      }))
    );
    setIsEditDialogOpen(true);
  };


  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title="Purchase Orders"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" }
          ]}
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-sm">
                <Label htmlFor="search">Search</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="search"
                    placeholder="Search purchase orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchPurchaseOrders()}
                  />
                  <Button onClick={fetchPurchaseOrders}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleQuickGenerate}
                  disabled={createLoading}
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate PO
                    </>
                  )}
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Purchase Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Purchase Order</DialogTitle>
                      <DialogDescription>
                        Fill in the details to create a new purchase order. Leave PO number empty to auto-generate.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="po_number">PO Number (Optional)</Label>
                          <Input
                            id="po_number"
                            value={formData.po_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                            placeholder="Leave empty to auto-generate"
                          />
                        </div>
                        <div>
                          <Label htmlFor="supplier_name">Supplier Name *</Label>
                          <Input
                            id="supplier_name"
                            value={formData.supplier_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                            placeholder="Enter supplier name"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="po_description">PO Description</Label>
                          <Textarea
                            id="po_description"
                            value={formData.po_description}
                            onChange={(e) => setFormData(prev => ({ ...prev, po_description: e.target.value }))}
                            placeholder="Enter PO description"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="po_type">PO Type</Label>
                          <Input
                            id="po_type"
                            value={formData.po_type}
                            onChange={(e) => setFormData(prev => ({ ...prev, po_type: e.target.value }))}
                            placeholder="e.g., Standard, Express"
                          />
                        </div>
                      </div>

                      {/* PO Items Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Purchase Order Items *</Label>
                          <Button type="button" size="sm" onClick={addPurchaseOrderItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>

                        {purchaseOrderItems.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                            No items added. Click "Add Item" to start.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {purchaseOrderItems.map((item, index) => (
                              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                                <div className="grid grid-cols-12 gap-3">
                                  <div className="col-span-7">
                                    <Label className="text-sm">Item *</Label>
                                    <Select
                                      value={item.item_number}
                                      onValueChange={(value) => updatePurchaseOrderItem(index, 'item_number', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select item" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableItems.map((availableItem) => (
                                          <SelectItem key={availableItem.id} value={availableItem.item_number}>
                                            {availableItem.item_number} - {availableItem.item_description || 'No description'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="col-span-3">
                                    <Label className="text-sm">Quantity *</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => updatePurchaseOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                      placeholder="Qty"
                                    />
                                  </div>
                                  <div className="col-span-2 flex items-end">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removePurchaseOrderItem(index)}
                                      className="w-full"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate} disabled={createLoading}>
                        {createLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          'Create Purchase Order'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders ({totalItems})</CardTitle>
            <CardDescription>
              Manage your purchase orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No purchase orders found. Create your first purchase order to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>PO Type</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium font-mono">{po.po_number}</TableCell>
                        <TableCell>{po.supplier_name}</TableCell>
                        <TableCell>
                          {po.po_type ? <Badge variant="outline">{po.po_type}</Badge> : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge>{po.items?.length || 0} items</Badge>
                        </TableCell>
                        <TableCell>{formatDate(po.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/purchase-orders/${po.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(po)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => setSelectedPurchaseOrder(po)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete PO "{po.po_number}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription>
                Update the purchase order details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_po_number">PO Number *</Label>
                  <Input
                    id="edit_po_number"
                    value={formData.po_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                    placeholder="Enter PO number"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_supplier_name">Supplier Name *</Label>
                  <Input
                    id="edit_supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                    placeholder="Enter supplier name"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit_po_description">PO Description</Label>
                  <Textarea
                    id="edit_po_description"
                    value={formData.po_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_description: e.target.value }))}
                    placeholder="Enter PO description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit_po_type">PO Type</Label>
                  <Input
                    id="edit_po_type"
                    value={formData.po_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, po_type: e.target.value }))}
                    placeholder="e.g., Standard, Express"
                  />
                </div>
              </div>

              {/* PO Items Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Purchase Order Items *</Label>
                  <Button type="button" size="sm" onClick={addPurchaseOrderItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {purchaseOrderItems.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    No items added. Click "Add Item" to start.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchaseOrderItems.map((item, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-7">
                            <Label className="text-sm">Item *</Label>
                            <Select
                              value={item.item_number}
                              onValueChange={(value) => updatePurchaseOrderItem(index, 'item_number', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableItems.map((availableItem) => (
                                  <SelectItem key={availableItem.id} value={availableItem.item_number}>
                                    {availableItem.item_number} - {availableItem.item_description || 'No description'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-sm">Quantity *</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updatePurchaseOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="Qty"
                            />
                          </div>
                          <div className="col-span-2 flex items-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removePurchaseOrderItem(index)}
                              className="w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateLoading}>
                {updateLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  'Update Purchase Order'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </PageLayout>
  );
}
