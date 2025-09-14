"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Edit, Trash2, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { purchaseOrdersApi, IPurchaseOrderWithItems, PurchaseOrderQueryParams, IPoItemWithRfid } from '@/lib/api/purchase-orders'
import { itemsApi, IItem } from '@/lib/api/items'
import { vendorsApi, IVendor } from '@/lib/api/vendors'
import { rfidApi, IRfidTag } from '@/lib/api/rfid'

interface IPaginationOptions {
  page: number;
  limit: number;
}
import { generatePurchaseOrderPDF } from '@/lib/utils/pdf-generator'

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  partially_received: 'bg-orange-100 text-orange-800',
  received: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<IPurchaseOrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<IPurchaseOrderWithItems | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<IPaginationOptions>({
    page: 1,
    limit: 10
  })
  const [meta, setMeta] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<Partial<IPurchaseOrderWithItems>>({
    po_number: '',
    vendor_id: 0,
    total_amount: 0,
    requisition_id: undefined,
    status: 'pending',
    currency: 'BDT',
    status_reason: ''
  })
  
  // Items state
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<IPoItemWithRfid[]>([])
  const [availableItems, setAvailableItems] = useState<IItem[]>([])
  const [availableVendors, setAvailableVendors] = useState<IVendor[]>([])
  const [availableRfidTags, setAvailableRfidTags] = useState<IRfidTag[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  // Debug: Log availableRfidTags whenever it changes
  useEffect(() => {
    console.log('availableRfidTags updated:', availableRfidTags)
    console.log('availableRfidTags length:', availableRfidTags.length)
    if (availableRfidTags.length > 0) {
      console.log('First RFID tag:', availableRfidTags[0])
    }
  }, [availableRfidTags])

  // Refresh available RFID tags when purchase order items change
  useEffect(() => {
    fetchAvailableRfidTags()
  }, [purchaseOrderItems])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchAvailableItems()
    fetchAvailableVendors()
    fetchAvailableRfidTags()
  }, [searchTerm, statusFilter, pagination.page, pagination.limit])

  // Refresh RFID tags when create dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      fetchAvailableRfidTags()
    }
  }, [isCreateDialogOpen])

  // Refresh RFID tags when edit dialog opens
  useEffect(() => {
    if (isEditDialogOpen) {
      fetchAvailableRfidTags()
    }
  }, [isEditDialogOpen])

  const fetchAvailableItems = async () => {
    try {
      setItemsLoading(true)
      const response = await itemsApi.getAll({ limit: 1000, item_status: 'active' })
      setAvailableItems(response.data)
    } catch (error) {
      console.error('Error fetching items:', error)
      toast({
        title: "Error",
        description: "Failed to fetch available items",
        variant: "destructive"
      })
    } finally {
      setItemsLoading(false)
    }
  }

  const fetchAvailableVendors = async () => {
    try {
      const response = await vendorsApi.getAll({ limit: 1000, status: 'active' })
      setAvailableVendors(response.data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      toast({
        title: "Error",
        description: "Failed to fetch available vendors",
        variant: "destructive"
      })
    }
  }

  const fetchAvailableRfidTags = async () => {
    try {
      console.log('Fetching available RFID tags...')
      // Get all RFID tags first to ensure we have the latest status
      let response = await rfidApi.getAll({ limit: 1000 })
      console.log('RFID tags response (all):', response)
      console.log('RFID tags data:', response.data)
      console.log('RFID tags data length:', response.data?.length)
      
      let allRfidTags = response.data || []
      
      // Filter for available status only
      const availableTags = allRfidTags.filter(tag => {
        const isAvailable = tag.status === 'available'
        console.log(`Tag ${tag.tag_uid} status: "${tag.status}", isAvailable: ${isAvailable}`)
        return isAvailable
      })
      console.log('Filtered available RFID tags:', availableTags)
      console.log('Available tags count:', availableTags.length)
      
      // Get already selected RFID IDs from current purchase order items
      const selectedRfidIds = new Set<number>()
      purchaseOrderItems.forEach(item => {
        if (item.rfid_tags) {
          item.rfid_tags.forEach(rfid => {
            if (rfid.rfid_id) {
              selectedRfidIds.add(Number(rfid.rfid_id))
            }
          })
        }
      })
      console.log('Already selected RFID IDs:', Array.from(selectedRfidIds))
      
      // Filter out already selected RFID tags
      const trulyAvailableTags = availableTags.filter(tag => !selectedRfidIds.has(tag.id!))
      console.log('Truly available RFID tags (excluding selected):', trulyAvailableTags)
      console.log('Final available tags count:', trulyAvailableTags.length)
      
      setAvailableRfidTags(trulyAvailableTags)
    } catch (error) {
      console.error('Error fetching RFID tags:', error)
      toast({
        title: "Error",
        description: "Failed to fetch available RFID tags",
        variant: "destructive"
      })
    }
  }

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      const filters: PurchaseOrderQueryParams = {}
      if (searchTerm) filters.searchTerm = searchTerm
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter as 'pending' | 'received' | 'cancelled'
      filters.page = pagination.page
      filters.limit = pagination.limit

      const response = await purchaseOrdersApi.getAll(filters)
      setPurchaseOrders(response.data)
      setMeta(response.meta)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      setCreateLoading(true)
      // Validation
      if (!formData.po_number?.trim()) {
        toast({
          title: "Validation Error",
          description: "Purchase order number is required",
          variant: "destructive"
        })
        return
      }
      
      if (!formData.vendor_id || formData.vendor_id === 0) {
        toast({
          title: "Validation Error",
          description: "Vendor is required",
          variant: "destructive"
        })
        return
      }
      
      if (purchaseOrderItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one item is required",
          variant: "destructive"
        })
        return
      }
      
      // Validate that all items have required fields
      for (let i = 0; i < purchaseOrderItems.length; i++) {
        const item = purchaseOrderItems[i]
        if (!item.item_id || !item.quantity) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1} must have both item and quantity selected`,
            variant: "destructive"
          })
          return
        }
      }
      
      try {
        // Convert string values to proper types for backend validation
        const purchaseOrderData = {
          po_number: formData.po_number!,
          vendor_id: Number(formData.vendor_id),
          total_amount: formData.total_amount ? Number(formData.total_amount) : undefined,
          requisition_id: formData.requisition_id ? Number(formData.requisition_id) : undefined,
          status: formData.status as 'pending' | 'approved' | 'partially_received' | 'received' | 'closed' | 'cancelled',
          currency: formData.currency || 'BDT',
          status_reason: formData.status_reason || undefined,
          items: purchaseOrderItems.map(item => ({
            ...item,
            item_id: Number(item.item_id),
            quantity: Number(item.quantity),
            unit_price: item.unit_price ? Number(item.unit_price) : undefined,
            tax_percent: item.tax_percent ? Number(item.tax_percent) : undefined,
            rfid_tags: item.rfid_tags?.map(rfid => ({
              ...rfid,
              rfid_id: Number(rfid.rfid_id),
              quantity: Number(rfid.quantity)
            })) || []
          }))
        }
        await purchaseOrdersApi.create(purchaseOrderData)
        
        toast({
          title: "Success",
          description: "Purchase order created successfully"
        })
        setIsCreateDialogOpen(false)
        resetForm()
        setPurchaseOrderItems([])
        fetchPurchaseOrders()
        // Add a small delay to ensure backend has updated RFID status
        setTimeout(() => {
          fetchAvailableRfidTags() // Refresh available RFID tags
        }, 500)
      } catch (error) {
        console.error('Error creating purchase order:', error)
        toast({
          title: "Error",
          description: "Failed to create purchase order",
          variant: "destructive"
        })
      }
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedPurchaseOrder?.id) return
    
    try {
      setUpdateLoading(true)
      // Validation
      if (!formData.po_number?.trim()) {
        toast({
          title: "Validation Error",
          description: "Purchase order number is required",
          variant: "destructive"
        })
        return
      }
      
      if (!formData.vendor_id || formData.vendor_id === 0) {
        toast({
          title: "Validation Error",
          description: "Vendor is required",
          variant: "destructive"
        })
        return
      }
      
      if (purchaseOrderItems.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one item is required",
          variant: "destructive"
        })
        return
      }
      
      // Validate that all items have required fields
      for (let i = 0; i < purchaseOrderItems.length; i++) {
        const item = purchaseOrderItems[i]
        if (!item.item_id || !item.quantity) {
          toast({
            title: "Validation Error",
            description: `Item ${i + 1} must have both item and quantity selected`,
            variant: "destructive"
          })
          return
        }
      }
      
      try {
        // Convert string values to proper types for backend validation
        const purchaseOrderData = {
          po_number: formData.po_number!,
          vendor_id: Number(formData.vendor_id),
          total_amount: formData.total_amount ? Number(formData.total_amount) : undefined,
          requisition_id: formData.requisition_id ? Number(formData.requisition_id) : undefined,
          status: formData.status as 'pending' | 'approved' | 'partially_received' | 'received' | 'closed' | 'cancelled',
          currency: formData.currency || 'BDT',
          status_reason: formData.status_reason || undefined,
          items: purchaseOrderItems.map(item => ({
            ...item,
            item_id: Number(item.item_id),
            quantity: Number(item.quantity),
            unit_price: item.unit_price ? Number(item.unit_price) : undefined,
            tax_percent: item.tax_percent ? Number(item.tax_percent) : undefined,
            rfid_tags: item.rfid_tags?.map(rfid => ({
              ...rfid,
              rfid_id: Number(rfid.rfid_id),
              quantity: Number(rfid.quantity)
            })) || []
          }))
        }
        await purchaseOrdersApi.update(selectedPurchaseOrder.id, purchaseOrderData)
        
        toast({
          title: "Success",
          description: "Purchase order updated successfully"
        })
        setIsEditDialogOpen(false)
        resetForm()
        setPurchaseOrderItems([])
        fetchPurchaseOrders()
        // Add a small delay to ensure backend has updated RFID status
        setTimeout(() => {
          fetchAvailableRfidTags() // Refresh available RFID tags
        }, 500)
      } catch (error) {
        console.error('Error updating purchase order:', error)
        toast({
          title: "Error",
          description: "Failed to update purchase order",
          variant: "destructive"
        })
      }
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPurchaseOrder?.id) return
    
    try {
      setDeleteLoading(true)
      
      // Unassign all RFID tags from this purchase order
      if (selectedPurchaseOrder.items) {
        // RFID tags are now automatically unassigned in the backend
      }
      
      await purchaseOrdersApi.delete(selectedPurchaseOrder.id)
      toast({
        title: "Success",
        description: "Purchase order deleted and RFID tags unassigned successfully"
      })
      setIsDeleteDialogOpen(false)
      setSelectedPurchaseOrder(null)
      fetchPurchaseOrders()
      fetchAvailableRfidTags() // Refresh available RFID tags
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive"
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDownloadPDF = async (purchaseOrder: IPurchaseOrderWithItems) => {
    try {
      generatePurchaseOrderPDF(purchaseOrder)
      toast({
        title: "Success",
        description: "PDF downloaded successfully"
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      po_number: '',
      vendor_id: 0,
      total_amount: 0,
      requisition_id: undefined,
      status: 'pending',
      currency: 'BDT',
      status_reason: ''
    })
    setPurchaseOrderItems([])
    // Refresh available RFID tags when form is reset
    fetchAvailableRfidTags()
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPagination({ page: 1, limit: 10 })
  }

  const addPurchaseOrderItem = () => {
    const newItem: IPoItemWithRfid = {
      po_id: 0, // Will be set by backend
      item_id: 0,
      quantity: 1,
      unit: '',
      unit_price: 0,
      tax_percent: 0,
      rfid_tags: []
    }
    setPurchaseOrderItems([...purchaseOrderItems, newItem])
  }

  const removePurchaseOrderItem = (index: number) => {
    setPurchaseOrderItems(purchaseOrderItems.filter((_, i) => i !== index))
  }

  const updatePurchaseOrderItem = (index: number, field: keyof IPoItemWithRfid, value: any) => {
    const updatedItems = [...purchaseOrderItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setPurchaseOrderItems(updatedItems)
  }

  const addRfidTagToItem = (itemIndex: number) => {
    const updatedItems = [...purchaseOrderItems]
    if (!updatedItems[itemIndex].rfid_tags) {
      updatedItems[itemIndex].rfid_tags = []
    }
    updatedItems[itemIndex].rfid_tags!.push({
      po_item_id: 0, // Will be set by backend
      rfid_id: 0,
      quantity: 1
    })
    setPurchaseOrderItems(updatedItems)
  }

  const removeRfidTagFromItem = async (itemIndex: number, rfidIndex: number) => {
    const updatedItems = [...purchaseOrderItems]
    if (updatedItems[itemIndex].rfid_tags) {
      const rfidToRemove = updatedItems[itemIndex].rfid_tags![rfidIndex]
      
      // RFID tags are now automatically unassigned in the backend when removed
      
      updatedItems[itemIndex].rfid_tags = updatedItems[itemIndex].rfid_tags!.filter((_, i) => i !== rfidIndex)
    }
    setPurchaseOrderItems(updatedItems)
    
    // Refresh available RFID tags
    fetchAvailableRfidTags()
  }

  const updateRfidTag = (itemIndex: number, rfidIndex: number, field: keyof any, value: any) => {
    const updatedItems = [...purchaseOrderItems]
    if (updatedItems[itemIndex].rfid_tags) {
      updatedItems[itemIndex].rfid_tags![rfidIndex] = {
        ...updatedItems[itemIndex].rfid_tags![rfidIndex],
        [field]: value
      }
    }
    setPurchaseOrderItems(updatedItems)
    
    // If RFID ID is being set, refresh available RFID tags immediately
    if (field === 'rfid_id' && value) {
      setTimeout(() => {
        fetchAvailableRfidTags()
      }, 100) // Small delay to ensure state is updated
    }
  }

  const openEditDialog = (purchaseOrder: IPurchaseOrderWithItems) => {
    setSelectedPurchaseOrder(purchaseOrder)
    setFormData({
      po_number: purchaseOrder.po_number,
      vendor_id: purchaseOrder.vendor_id,
      total_amount: purchaseOrder.total_amount || 0,
      requisition_id: purchaseOrder.requisition_id,
      status: purchaseOrder.status
    })
    setPurchaseOrderItems(purchaseOrder.items || [])
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (purchaseOrder: IPurchaseOrderWithItems) => {
    setSelectedPurchaseOrder(purchaseOrder)
    setIsViewDialogOpen(true)
  }

  const openDeleteDialog = (purchaseOrder: IPurchaseOrderWithItems) => {
    setSelectedPurchaseOrder(purchaseOrder)
    setIsDeleteDialogOpen(true)
  }

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  return (
    <PageLayout activePage="purchase-orders">
      <PageHeader
        title="Purchase Orders"
        breadcrumbItems={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase Orders", href: "/purchase-orders" }
        ]}
        actions={
          <Button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
              // Refresh available RFID tags when opening create dialog
              fetchAvailableRfidTags()
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Purchase Order
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search purchase orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={resetFilters}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
          onClick={fetchPurchaseOrders}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items Count</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                    Loading purchase orders...
                  </div>
                </TableCell>
              </TableRow>
            ) : purchaseOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              purchaseOrders.map((purchaseOrder) => (
                <TableRow key={purchaseOrder.id}>
                  <TableCell className="font-medium">
                    {purchaseOrder.po_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{purchaseOrder.vendor_name || '-'}</div>
                      <div className="text-sm text-gray-500">{purchaseOrder.vendor_code || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(purchaseOrder.total_amount)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[purchaseOrder.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                      {purchaseOrder.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{purchaseOrder.items?.length || 0}</TableCell>
                  <TableCell>{formatDate(purchaseOrder.created_at || '')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleDownloadPDF(purchaseOrder)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openViewDialog(purchaseOrder)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openEditDialog(purchaseOrder)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog(purchaseOrder)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((meta.page - 1) * meta.limit) + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} results
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page! - 1 }))}
              disabled={!meta.hasPrev}
            >
              Previous
            </Button>
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page! + 1 }))}
              disabled={!meta.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new purchase order
              <div className="mt-2 text-xs text-gray-500">
                Available RFID tags: {availableRfidTags.length}
                {availableRfidTags.length > 0 && (
                  <span className="ml-2 text-green-600">
                    (First: {availableRfidTags[0].tag_uid})
                  </span>
                )}
                {availableRfidTags.length === 0 && (
                  <span className="ml-2 text-red-600">
                    No available RFID tags found
                  </span>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_number">PO Number *</Label>
              <Input
                id="po_number"
                value={formData.po_number}
                onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                placeholder="Enter PO number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor_id">Vendor *</Label>
              <Select 
                value={formData.vendor_id?.toString() || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {availableVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id?.toString() || ''}>
                      {vendor.name} - {vendor.vendor_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter total amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'pending' | 'approved' | 'partially_received' | 'received' | 'closed' | 'cancelled' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="partially_received">Partially Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={formData.currency || 'BDT'}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                placeholder="Enter currency"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status_reason">Status Reason</Label>
              <Input
                id="status_reason"
                value={formData.status_reason || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, status_reason: e.target.value }))}
                placeholder="Enter status reason (optional)"
              />
            </div>
            
            {/* Purchase Order Items Section */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Purchase Order Items</Label>
                  {purchaseOrderItems.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {purchaseOrderItems.length} item(s) | 
                      Quantity: {purchaseOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={addPurchaseOrderItem}
                >
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
                    <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      {/* Item Details */}
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <Label className="text-sm">Item *</Label>
                          <Select
                            value={item.item_id?.toString() || ''}
                            onValueChange={(value) => updatePurchaseOrderItem(index, 'item_id', parseInt(value))}
                            disabled={itemsLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={itemsLoading ? "Loading items..." : "Select item"} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemsLoading ? (
                                <SelectItem value="" disabled>
                                  Loading items...
                                </SelectItem>
                              ) : (
                                availableItems.map((availableItem) => (
                                  <SelectItem key={availableItem.id} value={availableItem.id?.toString() || ''}>
                                    {availableItem.item_code} - {availableItem.item_description || 'No description'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updatePurchaseOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Unit</Label>
                          <Input
                            value={item.unit || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'unit', e.target.value)}
                            placeholder="Unit"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Tax %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.tax_percent || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                            placeholder="Tax %"
                          />
                        </div>
                      </div>

                      {/* RFID Tags Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">RFID Tags</Label>
                            <span className="text-xs text-gray-500">({availableRfidTags.length} available RFID tags)</span>
                            {availableRfidTags.length > 0 && (
                              <span className="text-xs text-green-600">
                                First: {availableRfidTags[0].tag_uid}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => addRfidTagToItem(index)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add RFID
                          </Button>
                        </div>
                        
                        {item.rfid_tags && item.rfid_tags.length > 0 ? (
                          <div className="space-y-2">
                            {item.rfid_tags.map((rfid, rfidIndex) => (
                              <div key={rfidIndex} className="grid grid-cols-3 gap-2 p-2 border rounded bg-white">
                                <div>
                                  <Label className="text-xs">RFID Tag * ({availableRfidTags.length} available)</Label>
                                  <Select
                                    value={rfid.rfid_id?.toString() || ''}
                                    onValueChange={(value) => updateRfidTag(index, rfidIndex, 'rfid_id', parseInt(value))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select RFID" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRfidTags.length > 0 ? (
                                        availableRfidTags.map((rfidTag, index) => {
                                          console.log(`Rendering RFID tag ${index}:`, rfidTag)
                                          const isSelected = purchaseOrderItems.some(item => 
                                            item.rfid_tags?.some(rfid => Number(rfid.rfid_id) === rfidTag.id)
                                          )
                                          return (
                                            <SelectItem 
                                              key={rfidTag.id || index} 
                                              value={rfidTag.id?.toString() || ''}
                                              disabled={isSelected}
                                            >
                                              {rfidTag.tag_uid} ({rfidTag.status}) {isSelected ? ' - Already Selected' : ''}
                                            </SelectItem>
                                          )
                                        })
                                      ) : (
                                        <SelectItem value="no-rfid" disabled>
                                          No available RFID tags ({availableRfidTags.length} found)
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Quantity *</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={rfid.quantity}
                                    onChange={(e) => updateRfidTag(index, rfidIndex, 'quantity', parseInt(e.target.value) || 1)}
                                    placeholder="Qty"
                                    className="h-8"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    onClick={() => removeRfidTagFromItem(index, rfidIndex)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-2 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded">
                            No RFID tags added. Click "Add RFID" to start.
                          </div>
                        )}
                      </div>

                      {/* Remove Item Button */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => removePurchaseOrderItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button  onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={createLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update the purchase order details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_po_number">PO Number *</Label>
              <Input
                id="edit_po_number"
                value={formData.po_number}
                onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                placeholder="Enter PO number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_vendor_id">Vendor *</Label>
              <Select 
                value={formData.vendor_id?.toString() || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {availableVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id?.toString() || ''}>
                      {vendor.name} - {vendor.vendor_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_total_amount">Total Amount</Label>
              <Input
                id="edit_total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter total amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'pending' | 'received' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Purchase Order Items Section */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Purchase Order Items</Label>
                  {purchaseOrderItems.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Total: {purchaseOrderItems.length} item(s) | 
                      Quantity: {purchaseOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={addPurchaseOrderItem}
                >
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
                    <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                      {/* Item Details */}
                      <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-2">
                          <Label className="text-sm">Item *</Label>
                          <Select
                            value={item.item_id?.toString() || ''}
                            onValueChange={(value) => updatePurchaseOrderItem(index, 'item_id', parseInt(value))}
                            disabled={itemsLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={itemsLoading ? "Loading items..." : "Select item"} />
                            </SelectTrigger>
                            <SelectContent>
                              {itemsLoading ? (
                                <SelectItem value="" disabled>
                                  Loading items...
                                </SelectItem>
                              ) : (
                                availableItems.map((availableItem) => (
                                  <SelectItem key={availableItem.id} value={availableItem.id?.toString() || ''}>
                                    {availableItem.item_code} - {availableItem.item_description || 'No description'}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm">Quantity *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updatePurchaseOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Unit</Label>
                          <Input
                            value={item.unit || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'unit', e.target.value)}
                            placeholder="Unit"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="Price"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Tax %</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.tax_percent || ''}
                            onChange={(e) => updatePurchaseOrderItem(index, 'tax_percent', parseFloat(e.target.value) || 0)}
                            placeholder="Tax %"
                          />
                        </div>
                      </div>

                      {/* RFID Tags Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">RFID Tags</Label>
                            <span className="text-xs text-gray-500">({availableRfidTags.length} available RFID tags)</span>
                            {availableRfidTags.length > 0 && (
                              <span className="text-xs text-green-600">
                                First: {availableRfidTags[0].tag_uid}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => addRfidTagToItem(index)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add RFID
                          </Button>
                        </div>
                        
                        {item.rfid_tags && item.rfid_tags.length > 0 ? (
                          <div className="space-y-2">
                            {item.rfid_tags.map((rfid, rfidIndex) => (
                              <div key={rfidIndex} className="grid grid-cols-3 gap-2 p-2 border rounded bg-white">
                                <div>
                                  <Label className="text-xs">RFID Tag * ({availableRfidTags.length} available)</Label>
                                  <Select
                                    value={rfid.rfid_id?.toString() || ''}
                                    onValueChange={(value) => updateRfidTag(index, rfidIndex, 'rfid_id', parseInt(value))}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select RFID" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableRfidTags.length > 0 ? (
                                        availableRfidTags.map((rfidTag, index) => {
                                          console.log(`Rendering RFID tag ${index}:`, rfidTag)
                                          const isSelected = purchaseOrderItems.some(item => 
                                            item.rfid_tags?.some(rfid => Number(rfid.rfid_id) === rfidTag.id)
                                          )
                                          return (
                                            <SelectItem 
                                              key={rfidTag.id || index} 
                                              value={rfidTag.id?.toString() || ''}
                                              disabled={isSelected}
                                            >
                                              {rfidTag.tag_uid} ({rfidTag.status}) {isSelected ? ' - Already Selected' : ''}
                                            </SelectItem>
                                          )
                                        })
                                      ) : (
                                        <SelectItem value="no-rfid" disabled>
                                          No available RFID tags ({availableRfidTags.length} found)
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Quantity *</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={rfid.quantity}
                                    onChange={(e) => updateRfidTag(index, rfidIndex, 'quantity', parseInt(e.target.value) || 1)}
                                    placeholder="Qty"
                                    className="h-8"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    onClick={() => removeRfidTagFromItem(index, rfidIndex)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-2 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded">
                            No RFID tags added. Click "Add RFID" to start.
                          </div>
                        )}
                      </div>

                      {/* Remove Item Button */}
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => removePurchaseOrderItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove Item
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button  onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              View complete purchase order information
            </DialogDescription>
          </DialogHeader>
          {selectedPurchaseOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">PO Number</Label>
                  <p className="text-lg font-semibold">{selectedPurchaseOrder.po_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={`mt-1 ${statusColors[selectedPurchaseOrder.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedPurchaseOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Vendor</Label>
                  <p className="text-base">{selectedPurchaseOrder.vendor_name || '-'}</p>
                  <p className="text-sm text-gray-500">{selectedPurchaseOrder.vendor_code || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Total Amount</Label>
                  <p className="text-base font-semibold">{formatCurrency(selectedPurchaseOrder.total_amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-base">{formatDate(selectedPurchaseOrder.created_at || '')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Updated At</Label>
                  <p className="text-base">{formatDate(selectedPurchaseOrder.updated_at || '')}</p>
                </div>
              </div>

              {/* Items Section */}
              {selectedPurchaseOrder.items && selectedPurchaseOrder.items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Purchase Order Items</Label>
                  <div className="mt-2 space-y-4">
                    {selectedPurchaseOrder.items.map((item, itemIndex) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-4 gap-4 mb-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Item Code</Label>
                            <p className="text-sm font-medium">{item.item_code || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Description</Label>
                            <p className="text-sm">{item.item_description || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Quantity</Label>
                            <p className="text-sm">{item.quantity}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-500">Unit</Label>
                            <p className="text-sm">{item.unit || item.uom_primary || '-'}</p>
                          </div>
                        </div>
                        
                        {/* RFID Tags for this item */}
                        {item.rfid_tags && item.rfid_tags.length > 0 && (
                          <div className="mt-3">
                            <Label className="text-xs font-medium text-gray-500">RFID Tags</Label>
                            <div className="mt-1 space-y-1">
                              {item.rfid_tags.map((rfid, rfidIndex) => (
                                <div key={rfidIndex} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                                  <span className="font-medium">{rfid.tag_uid || `RFID ${rfid.rfid_id}`}</span>
                                  <span className="text-gray-500">Qty: {rfid.quantity}</span>
                                  <Badge  className="text-xs">
                                    {rfid.rfid_status || 'Unknown'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button  onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button 
              onClick={() => selectedPurchaseOrder && handleDownloadPDF(selectedPurchaseOrder)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button  onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
