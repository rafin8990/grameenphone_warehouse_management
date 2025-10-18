"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { poHexCodesApi, IPoHexCode } from '@/lib/api/po-hex-codes';
import { purchaseOrdersApi, IPurchaseOrderWithItems } from '@/lib/api/purchase-orders';
import { itemsApi, IItem } from '@/lib/api/items';
import { PageHeader } from '@/components/layout/page-header';

export default function PoHexCodesPage() {
  const [poHexCodes, setPoHexCodes] = useState<IPoHexCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IPoHexCode | null>(null);
  const [formData, setFormData] = useState({
    po_number: '',
    lot_no: '',
    item_number: '',
    quantity: 0,
    uom: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [availablePOs, setAvailablePOs] = useState<IPurchaseOrderWithItems[]>([]);
  const [availableItems, setAvailableItems] = useState<IItem[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchPoHexCodes();
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchPoHexCodes = async () => {
    try {
      setLoading(true);
      const response = await poHexCodesApi.getAll({
        page: currentPage,
        limit: itemsPerPage,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      setPoHexCodes(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching PO hex codes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch PO hex codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePOs = async () => {
    try {
      console.log('Fetching POs...');
      const response = await purchaseOrdersApi.getAll({ limit: 1000 });
      console.log('POs response:', response);
      console.log('POs data:', response.data);
      console.log('POs data length:', response.data?.length);
      setAvailablePOs(response.data || []);
    } catch (error) {
      console.error('Error fetching POs:', error);
      setAvailablePOs([]);
    }
  };

  const fetchAvailableItems = async () => {
    try {
      console.log('Fetching items...');
      const response = await itemsApi.getAll({ limit: 1000, item_status: 'active' });
      console.log('Items response:', response);
      console.log('Items data:', response.data);
      console.log('Items data length:', response.data?.length);
      setAvailableItems(response.data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      setAvailableItems([]);
    }
  };

  const fetchAllData = async () => {
    setLoadingDropdowns(true);
    try {
      await Promise.all([fetchAvailablePOs(), fetchAvailableItems()]);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  const getItemDescription = (itemNumber: string) => {
    const item = availableItems.find(i => i.item_number === itemNumber);
    return item?.item_description || 'No description';
  };

  // Debug logging
  useEffect(() => {
    console.log('Available POs:', availablePOs);
    console.log('Available Items:', availableItems);
  }, [availablePOs, availableItems]);

  const handlePOChange = (poNumber: string) => {
    setFormData(prev => ({ ...prev, po_number: poNumber }));
  };

  const handleItemChange = (itemNumber: string) => {
    const item = availableItems.find(i => i.item_number === itemNumber);
    setFormData(prev => ({ 
      ...prev, 
      item_number: itemNumber,
      uom: item?.primary_uom || ''
    }));
  };

  const handleCreate = async () => {
    try {
      setCreateLoading(true);
      setFormErrors({});

      // Validation
      if (!formData.po_number.trim()) {
        setFormErrors(prev => ({ ...prev, po_number: 'PO number is required' }));
        return;
      }
      if (!formData.lot_no.trim()) {
        setFormErrors(prev => ({ ...prev, lot_no: 'Lot number is required' }));
        return;
      }
      if (!formData.item_number.trim()) {
        setFormErrors(prev => ({ ...prev, item_number: 'Item number is required' }));
        return;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        setFormErrors(prev => ({ ...prev, quantity: 'Quantity must be positive' }));
        return;
      }
      if (!formData.uom.trim()) {
        setFormErrors(prev => ({ ...prev, uom: 'UOM is required' }));
        return;
      }

      await poHexCodesApi.create(formData);
      toast({
        title: "Success",
        description: "PO hex code created successfully with auto-generated hex code"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchPoHexCodes();
    } catch (error: any) {
      console.error('Error creating PO hex code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create PO hex code",
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
      if (!formData.po_number.trim()) {
        setFormErrors(prev => ({ ...prev, po_number: 'PO number is required' }));
        return;
      }
      if (!formData.lot_no.trim()) {
        setFormErrors(prev => ({ ...prev, lot_no: 'Lot number is required' }));
        return;
      }
      if (!formData.item_number.trim()) {
        setFormErrors(prev => ({ ...prev, item_number: 'Item number is required' }));
        return;
      }
      if (!formData.quantity || formData.quantity <= 0) {
        setFormErrors(prev => ({ ...prev, quantity: 'Quantity must be positive' }));
        return;
      }
      if (!formData.uom.trim()) {
        setFormErrors(prev => ({ ...prev, uom: 'UOM is required' }));
        return;
      }

      await poHexCodesApi.update(editingItem.id, formData);
      toast({
        title: "Success",
        description: "PO hex code updated successfully (hex code unchanged)"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchPoHexCodes();
    } catch (error: any) {
      console.error('Error updating PO hex code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update PO hex code",
        variant: "destructive"
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleteLoading(true);
      await poHexCodesApi.delete(id);
      toast({
        title: "Success",
        description: "PO hex code deleted successfully"
      });
      fetchPoHexCodes();
    } catch (error: any) {
      console.error('Error deleting PO hex code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete PO hex code",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (item: IPoHexCode) => {
    setEditingItem(item);
    setFormData({
      po_number: item.po_number,
      lot_no: item.lot_no,
      item_number: item.item_number,
      quantity: item.quantity,
      uom: item.uom
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      lot_no: '',
      item_number: '',
      quantity: 0,
      uom: ''
    });
    setFormErrors({});
    setEditingItem(null);
  };

  return (
    <PageLayout activePage="po-hex-codes">
      <div className="space-y-4">
        <PageHeader
          title="PO Hex Codes"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "PO Hex Codes", href: "/po-hex-codes" }
          ]}
        />

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New PO Hex Code</CardTitle>
            <CardDescription>
              Fill in the form to generate a unique 16-digit hex code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label htmlFor="form_po_number" className="text-xs">PO Number *</Label>
                <Select value={formData.po_number} onValueChange={handlePOChange}>
                  <SelectTrigger className={`h-9 ${formErrors.po_number ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select PO number"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDropdowns ? (
                      <SelectItem value="loading" disabled>
                        Loading POs...
                      </SelectItem>
                    ) : availablePOs.length > 0 ? (
                      availablePOs.map((po) => (
                        <SelectItem key={po.id} value={po.po_number}>
                          {po.po_number} - {po.supplier_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No POs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="form_lot_no" className="text-xs">Lot No *</Label>
                <Input
                  id="form_lot_no"
                  value={formData.lot_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, lot_no: e.target.value }))}
                  placeholder="Lot number"
                  className={`h-9 ${formErrors.lot_no ? "border-red-500" : ""}`}
                />
              </div>
              <div>
                <Label htmlFor="form_item_number" className="text-xs">Item No *</Label>
                <Select value={formData.item_number} onValueChange={handleItemChange}>
                  <SelectTrigger className={`h-9 ${formErrors.item_number ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={loadingDropdowns ? "Loading..." : "Select item number"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDropdowns ? (
                      <SelectItem value="loading" disabled>
                        Loading items...
                      </SelectItem>
                    ) : availableItems.length > 0 ? (
                      availableItems.map((item) => (
                        <SelectItem key={item.id} value={item.item_number}>
                          {item.item_number} - {item.item_description}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No items available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="form_quantity" className="text-xs">Qty *</Label>
                <Input
                  id="form_quantity"
                  type="number"
                  min="1"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  placeholder="Qty"
                  className={`h-9 ${formErrors.quantity ? "border-red-500" : ""}`}
                />
              </div>
              <div>
                <Label htmlFor="form_uom" className="text-xs">UOM *</Label>
                <Input
                  id="form_uom"
                  value={formData.uom}
                  onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
                  placeholder="UOM"
                  className={`h-9 ${formErrors.uom ? "border-red-500" : ""}`}
                />
              </div>
              <div className="col-span-2 md:col-span-5 flex justify-end">
                <Button 
                  onClick={handleCreate}
                  disabled={createLoading}
                  className="w-full md:w-auto"
                >
                  {createLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Hex Code
                    </>
                  )}
                </Button>
              </div>
              
              {/* Item Description Display */}
              {formData.item_number && (
                <div className="col-span-2 md:col-span-5">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Selected Item Description:</strong> {getItemDescription(formData.item_number)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table - Only Serial No and Hex Code */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Hex Codes ({totalItems})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2"></div>
              </div>
            ) : poHexCodes.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No hex codes generated yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Serial No</TableHead>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Hex Code</TableHead>
                      <TableHead className="text-right w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poHexCodes.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {((currentPage - 1) * itemsPerPage) + index + 1}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.item_number}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-lg font-bold tracking-wider">
                          {item.hex_code}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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
                                  <AlertDialogTitle>Delete Hex Code</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete hex code "{item.hex_code}"? This action cannot be undone.
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
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-gray-600">
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </div>
                <div className="flex gap-1">
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit PO Hex Code</DialogTitle>
              <DialogDescription>
                Update PO hex code information. Hex code will remain unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_po_number">PO Number *</Label>
                <Select value={formData.po_number} onValueChange={handlePOChange}>
                  <SelectTrigger className={formErrors.po_number ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select PO number" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePOs.length > 0 ? (
                      availablePOs.map((po) => (
                        <SelectItem key={po.id} value={po.po_number}>
                          {po.po_number} - {po.supplier_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No POs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.po_number && <p className="text-sm text-red-500 mt-1">{formErrors.po_number}</p>}
              </div>
              <div>
                <Label htmlFor="edit_lot_no">Lot Number *</Label>
                <Input
                  id="edit_lot_no"
                  value={formData.lot_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, lot_no: e.target.value }))}
                  placeholder="Enter lot number"
                  className={formErrors.lot_no ? "border-red-500" : ""}
                />
                {formErrors.lot_no && <p className="text-sm text-red-500 mt-1">{formErrors.lot_no}</p>}
              </div>
              <div>
                <Label htmlFor="edit_item_number">Item Number *</Label>
                <Select value={formData.item_number} onValueChange={handleItemChange}>
                  <SelectTrigger className={formErrors.item_number ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select item number" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.length > 0 ? (
                      availableItems.map((item) => (
                        <SelectItem key={item.id} value={item.item_number}>
                          {item.item_number} - {item.item_description}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No items available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {formErrors.item_number && <p className="text-sm text-red-500 mt-1">{formErrors.item_number}</p>}
              </div>
              <div>
                <Label htmlFor="edit_quantity">Quantity *</Label>
                <Input
                  id="edit_quantity"
                  type="number"
                  min="1"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  placeholder="Enter quantity"
                  className={formErrors.quantity ? "border-red-500" : ""}
                />
                {formErrors.quantity && <p className="text-sm text-red-500 mt-1">{formErrors.quantity}</p>}
              </div>
              <div>
                <Label htmlFor="edit_uom">UOM *</Label>
                <Input
                  id="edit_uom"
                  value={formData.uom}
                  onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
                  placeholder="Enter UOM"
                  className={formErrors.uom ? "border-red-500" : ""}
                />
                {formErrors.uom && <p className="text-sm text-red-500 mt-1">{formErrors.uom}</p>}
              </div>
              <div className="flex items-center">
                <div className="w-full">
                  <Label className="text-sm font-medium text-gray-600">Current Hex Code</Label>
                  <div className="font-mono text-lg font-bold bg-gray-100 p-2 rounded mt-1">
                    {editingItem?.hex_code}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Hex code cannot be changed</p>
                </div>
              </div>
              
              {/* Item Description Display in Edit Dialog */}
              {formData.item_number && (
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <strong>Selected Item Description:</strong> {getItemDescription(formData.item_number)}
                  </div>
                </div>
              )}
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
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

