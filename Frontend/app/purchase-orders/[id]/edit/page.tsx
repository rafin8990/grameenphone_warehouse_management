"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { purchaseOrdersApi, IPurchaseOrderWithItems } from '@/lib/api/purchase-orders';

interface IPoItemSimple {
  item_number: string;
  quantity: number;
}

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [purchaseOrder, setPurchaseOrder] = useState<IPurchaseOrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    po_number: '',
    po_description: '',
    supplier_name: '',
    po_type: ''
  });

  const [purchaseOrderItems, setPurchaseOrderItems] = useState<IPoItemSimple[]>([]);

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
      
      // Populate form data
      setFormData({
        po_number: data.po_number,
        po_description: data.po_description || '',
        supplier_name: data.supplier_name,
        po_type: data.po_type || ''
      });
      
      // Populate items
      const items = (data.items || []).map(item => {
        const quantity = Number(item.ordered_quantity) || Number(item.quantity) || 1;
        
        return {
          item_number: item.item_number,
          quantity: quantity
        };
      });
      
      // If no items found, create empty array with one empty item
      if (items.length === 0) {
        items.push({ item_number: '', quantity: 1 });
      }
      
      setPurchaseOrderItems(items);
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

  const handleSave = async () => {
    if (!purchaseOrder?.id) return;

    try {
      setSaving(true);
      await purchaseOrdersApi.update(purchaseOrder.id, {
        po_number: formData.po_number,
        po_description: formData.po_description,
        supplier_name: formData.supplier_name,
        po_type: formData.po_type,
        po_items: purchaseOrderItems
      });
      
      toast({
        title: "Success",
        description: "Purchase order updated successfully"
      });
      router.push(`/purchase-orders/${purchaseOrder.id}`);
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update purchase order",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setPurchaseOrderItems([...purchaseOrderItems, { item_number: '', quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setPurchaseOrderItems(purchaseOrderItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof IPoItemSimple, value: string | number) => {
    const updated = [...purchaseOrderItems];
    updated[index] = { ...updated[index], [field]: value };
    setPurchaseOrderItems(updated);
  };

  if (loading) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2"></div>
        </div>
      </PageLayout>
    );
  }

  if (!purchaseOrder) {
    return (
      <PageLayout activePage="purchase-orders">
        <div className="text-center py-16 text-gray-500">
          Purchase Order not found.
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout activePage="purchase-orders">
      <div className="space-y-6">
        <PageHeader
          title={`Edit Purchase Order ${purchaseOrder.po_number}`}
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Purchase Orders", href: "/purchase-orders" },
            { label: purchaseOrder.po_number, href: `/purchase-orders/${purchaseOrder.id}` },
            { label: "Edit", href: `/purchase-orders/${purchaseOrder.id}/edit` }
          ]}
        />

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/purchase-orders/${purchaseOrder.id}`)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details of the purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="po_number">PO Number *</Label>
                <Input
                  id="po_number"
                  value={formData.po_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                  placeholder="Enter PO number"
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
              <div>
                <Label htmlFor="po_type">PO Type</Label>
                <Input
                  id="po_type"
                  value={formData.po_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_type: e.target.value }))}
                  placeholder="Enter PO type"
                />
              </div>
              <div>
                <Label htmlFor="po_description">PO Description</Label>
                <Textarea
                  id="po_description"
                  value={formData.po_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_description: e.target.value }))}
                  placeholder="Enter PO description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                Manage the items in this purchase order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {purchaseOrderItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor={`item_${index}`}>Item Number</Label>
                    <Input
                      id={`item_${index}`}
                      value={item.item_number}
                      onChange={(e) => updateItem(index, 'item_number', e.target.value)}
                      placeholder="Enter item number"
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`qty_${index}`}>Quantity</Label>
                    <Input
                      id={`qty_${index}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      placeholder="Qty"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                Add Item
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
