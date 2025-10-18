"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Package, Calendar, User, FileText, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { purchaseOrdersApi, IPurchaseOrderWithItems } from '@/lib/api/purchase-orders';

export default function PurchaseOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [purchaseOrder, setPurchaseOrder] = useState<IPurchaseOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const poId = params.id as string;

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrder();
    }
  }, [poId]);

  const fetchPurchaseOrder = async () => {
    try {
      setLoading(true);
      const data = await purchaseOrdersApi.getById(Number(poId));
      setPurchaseOrder(data);
    } catch (error: any) {
      console.error('Error fetching purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch purchase order",
        variant: "destructive"
      });
      router.push('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!purchaseOrder?.id) return;

    try {
      setDeleteLoading(true);
      await purchaseOrdersApi.delete(purchaseOrder.id);
      toast({
        title: "Success",
        description: "Purchase order deleted successfully"
      });
      router.push('/purchase-orders');
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

  const handleStatusUpdate = async (status: 'received' | 'partial' | 'cancelled') => {
    if (!purchaseOrder?.id) return;
    try {
      setStatusLoading(true);
      await purchaseOrdersApi.updateStatus(purchaseOrder.id, status);
      
      // Update local state
      setPurchaseOrder(prev => prev ? { ...prev, status } : null);
      
      toast({
        title: "Success",
        description: `Purchase order status updated to ${status}`
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'received':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isEditingAllowed = () => {
    return purchaseOrder?.status !== 'received' && purchaseOrder?.status !== 'partial';
  };

  const hasReceivedItems = () => {
    if (!purchaseOrder?.items) return false;
    return purchaseOrder.items.some(item => (item.received_quantity || 0) > 0);
  };

  const canMarkAsReceived = () => {
    return hasReceivedItems() && purchaseOrder?.status !== 'received' && purchaseOrder?.status !== 'cancelled';
  };

  const canMarkAsPartiallyReceived = () => {
    return hasReceivedItems() && purchaseOrder?.status !== 'received' && purchaseOrder?.status !== 'cancelled';
  };

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2"></div>
        </div>
      </PageLayout>
    );
  }

  if (!purchaseOrder) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="text-center py-8">
          <h2 className="text-2xl font-semibold text-gray-900">Purchase Order Not Found</h2>
          <p className="text-gray-600 mt-2">The purchase order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/purchase-orders')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Purchase Order ${purchaseOrder.po_number}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" },
            { label: purchaseOrder.po_number, href: `/purchase-orders/${purchaseOrder.id}` }
          ]}
        />

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push('/purchase-orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}/edit`)}
              disabled={!isEditingAllowed()}
              className={!isEditingAllowed() ? 'opacity-50 cursor-not-allowed' : ''}
              title={!isEditingAllowed() ? 'Cannot edit received or partially received purchase orders' : 'Edit purchase order'}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={!isEditingAllowed()}
                  className={!isEditingAllowed() ? 'opacity-50 cursor-not-allowed' : ''}
                  title={!isEditingAllowed() ? 'Cannot delete received or partially received purchase orders' : 'Delete purchase order'}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete PO "{purchaseOrder.po_number}"? This action cannot be undone.
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
        </div>

        {/* Status Update Buttons */}
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={purchaseOrder.status === 'received' ? 'default' : 'outline'}
                  onClick={() => handleStatusUpdate('received')}
                  disabled={!canMarkAsReceived() || statusLoading}
                  className={`${canMarkAsReceived() ? 'bg-green-600 hover:bg-green-700 text-white' : 'opacity-50 cursor-not-allowed'}`}
                  title={!canMarkAsReceived() ? 'No received items found. Items must be received first.' : 'Mark as Received'}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {statusLoading ? 'Updating...' : 'Mark as Received'}
                </Button>
                <Button
                  variant={purchaseOrder.status === 'partial' ? 'default' : 'outline'}
                  onClick={() => handleStatusUpdate('partial')}
                  disabled={!canMarkAsPartiallyReceived() || statusLoading}
                  className={`${canMarkAsPartiallyReceived() ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'opacity-50 cursor-not-allowed'}`}
                  title={!canMarkAsPartiallyReceived() ? 'No received items found. Items must be received first.' : 'Mark as Partially Received'}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {statusLoading ? 'Updating...' : 'Mark as Partially Received'}
                </Button>
                <Button
                  variant={purchaseOrder.status === 'cancelled' ? 'default' : 'outline'}
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={purchaseOrder.status === 'received' || purchaseOrder.status === 'cancelled' || statusLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {statusLoading ? 'Updating...' : 'Cancel Order'}
                </Button>
              </div>
            
            </CardContent>
          </Card>
        </div>

        {/* Purchase Order Information with Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Content */}
          <div>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="items" className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  Items
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-4 w-4" />
                      Purchase Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">PO Number</label>
                        <p className="text-sm font-semibold font-mono mt-1">{purchaseOrder.po_number}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Supplier</label>
                        <p className="text-sm font-semibold mt-1">{purchaseOrder.supplier_name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">PO Type</label>
                        <p className="text-xs mt-1">{purchaseOrder.po_type || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Status</label>
                        <div className="mt-1">
                          <Badge className={`text-xs ${getStatusColor(purchaseOrder.status)}`}>
                            {purchaseOrder.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-600">Description</label>
                      <p className="text-xs mt-1 bg-gray-50 p-2 rounded text-gray-700">
                        {purchaseOrder.po_description || 'No description provided'}
                      </p>
                    </div>

                    {/* Timeline Section */}
                    <div className="border-t pt-3">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Timeline
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium">Created</p>
                            <p className="text-xs text-gray-500">{formatDate(purchaseOrder.created_at)}</p>
                          </div>
                        </div>
                        
                        {purchaseOrder.updated_at && (
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Clock className="h-3 w-3 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium">Updated</p>
                              <p className="text-xs text-gray-500">{formatDate(purchaseOrder.updated_at)}</p>
                            </div>
                          </div>
                        )}
                        
                        {purchaseOrder.received_at && (
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium">Received</p>
                              <p className="text-xs text-gray-500">{formatDate(purchaseOrder.received_at)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="items" className="mt-4">
                {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Package className="h-4 w-4" />
                        Items ({purchaseOrder.items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 ">
                        {purchaseOrder.items.map((item, index) => {
                          const orderedQty = item.ordered_quantity || item.quantity;
                          const receivedQty = item.received_quantity || 0;
                          const remainingQty = orderedQty - receivedQty;
                          const completionPercentage = orderedQty > 0 ? (receivedQty / orderedQty) * 100 : 0;
                          
                          return (
                            <div key={index} className="border rounded-lg p-3 bg-gray-50">
                              <div className="grid grid-cols-1 gap-3">
                                {/* Item Info */}
                                <div>
                                  <h4 className="font-semibold text-sm">{item.item_number}</h4>
                                  <p className="text-xs text-gray-600 mt-1">{item.item_description || 'No description'}</p>
                                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                    <span><span className="font-medium">Type:</span> {item.item_type || '-'}</span>
                                    <span><span className="font-medium">UOM:</span> {item.primary_uom || '-'}</span>
                                    <span><span className="font-medium">Status:</span> {item.item_status || '-'}</span>
                                  </div>
                                </div>

                                {/* Quantity Info */}
                                <div>
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-blue-600">{orderedQty}</div>
                                      <div className="text-xs text-gray-600">Ordered</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-green-600">{receivedQty}</div>
                                      <div className="text-xs text-gray-600">Received</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-bold text-orange-600">{remainingQty}</div>
                                      <div className="text-xs text-gray-600">Remaining</div>
                                    </div>
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600">
                                      <span>Progress</span>
                                      <span>{Math.round(completionPercentage)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${Math.min(100, completionPercentage)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="text-center py-6">
                      <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <h3 className="text-sm font-medium text-gray-900 mb-1">No Items Found</h3>
                      <p className="text-xs text-gray-600">This purchase order doesn't have any items yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Summary Card */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-4 w-4" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {purchaseOrder.total_ordered_quantity || 0}
                  </div>
                  <div className="text-xs text-gray-600">Total Ordered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {purchaseOrder.total_received_quantity || 0}
                  </div>
                  <div className="text-xs text-gray-600">Total Received</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(purchaseOrder.total_ordered_quantity || 0) - (purchaseOrder.total_received_quantity || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Remaining</div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progress</span>
                    <span>
                      {purchaseOrder.total_ordered_quantity && purchaseOrder.total_received_quantity 
                        ? `${Math.round((purchaseOrder.total_received_quantity / purchaseOrder.total_ordered_quantity) * 100)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${purchaseOrder.total_ordered_quantity && purchaseOrder.total_received_quantity 
                          ? Math.min(100, (purchaseOrder.total_received_quantity / purchaseOrder.total_ordered_quantity) * 100)
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
