"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Edit, Trash2, RefreshCw } from 'lucide-react'
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
// API imports removed - using mock interfaces
interface IRequisition {
  id?: number;
  requisition_number: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
}

interface IRequisitionWithItems extends IRequisition {
  items: IRequisitionItem[];
}

interface IRequisitionFilters {
  searchTerm?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface IPaginationOptions {
  page: number;
  limit: number;
}

interface IRequisitionItem {
  id?: number;
  item_id: number;
  quantity: number;
  unit_price: number;
}

interface IItem {
  id?: number;
  item_code: string;
  item_description?: string;
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800'
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<IRequisitionWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRequisition, setSelectedRequisition] = useState<IRequisitionWithItems | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<IPaginationOptions>({
    page: 1,
    limit: 10
  })
  const [meta, setMeta] = useState<any>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<Partial<IRequisition>>({
    requisition_number: '',
    requester_name: '',
    organization_code: '',
    status: 'open',
    requirement: ''
  })
  
  // Items state
  const [requisitionItems, setRequisitionItems] = useState<IRequisitionItem[]>([])
  const [availableItems, setAvailableItems] = useState<IItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  useEffect(() => {
    fetchRequisitions()
    fetchAvailableItems()
  }, [searchTerm, statusFilter, pagination.page, pagination.limit])

  const fetchAvailableItems = async () => {
    try {
      setItemsLoading(true)
      const response = await itemApi.getAll({ limit: 1000, item_status: 'active' })
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

  const fetchRequisitions = async () => {
    try {
      setLoading(true)
      const filters: IRequisitionFilters = {}
      if (searchTerm) filters.searchTerm = searchTerm
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter

      const response = await getAllRequisitions(filters, pagination)
      setRequisitions(response.data)
      setMeta(response.meta)
    } catch (error) {
      console.error('Error fetching requisitions:', error)
      toast({
        title: "Error",
        description: "Failed to fetch requisitions",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    // Validation
    if (!formData.requisition_number?.trim()) {
      toast({
        title: "Validation Error",
        description: "Requisition number is required",
        variant: "destructive"
      })
      return
    }
    
    if (requisitionItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one item is required",
        variant: "destructive"
      })
      return
    }
    
    // Validate that all items have required fields
    for (let i = 0; i < requisitionItems.length; i++) {
      const item = requisitionItems[i]
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
      const requisitionData = {
        ...formData,
        items: requisitionItems
      }
      await createRequisition(requisitionData)
      toast({
        title: "Success",
        description: "Requisition created successfully"
      })
      setIsCreateDialogOpen(false)
      resetForm()
      setRequisitionItems([])
      fetchRequisitions()
    } catch (error) {
      console.error('Error creating requisition:', error)
      toast({
        title: "Error",
        description: "Failed to create requisition",
        variant: "destructive"
      })
    }
  }

  const handleUpdate = async () => {
    if (!selectedRequisition?.id) return
    
    // Validation
    if (!formData.requisition_number?.trim()) {
      toast({
        title: "Validation Error",
        description: "Requisition number is required",
        variant: "destructive"
      })
      return
    }
    
    if (requisitionItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one item is required",
        variant: "destructive"
      })
      return
    }
    
    // Validate that all items have required fields
    for (let i = 0; i < requisitionItems.length; i++) {
      const item = requisitionItems[i]
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
      const requisitionData = {
        ...formData,
        items: requisitionItems
      }
      await updateRequisition(selectedRequisition.id, requisitionData)
      toast({
        title: "Success",
        description: "Requisition updated successfully"
      })
      setIsEditDialogOpen(false)
      resetForm()
      setRequisitionItems([])
      fetchRequisitions()
    } catch (error) {
      console.error('Error updating requisition:', error)
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedRequisition?.id) return
    
    try {
      await deleteRequisition(selectedRequisition.id)
      toast({
        title: "Success",
        description: "Requisition deleted successfully"
      })
      setIsDeleteDialogOpen(false)
      setSelectedRequisition(null)
      fetchRequisitions()
    } catch (error) {
      console.error('Error deleting requisition:', error)
      toast({
        title: "Error",
        description: "Failed to delete requisition",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setFormData({
      requisition_number: '',
      requester_name: '',
      organization_code: '',
      status: 'open',
      requirement: ''
    })
    setRequisitionItems([])
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setPagination({ page: 1, limit: 10 })
  }

  const addRequisitionItem = () => {
    const newItem: IRequisitionItem = {
      requisition_id: 0, // Will be set by backend
      item_id: 0,
      quantity: 1,
      uom: '',
      remarks: ''
    }
    setRequisitionItems([...requisitionItems, newItem])
  }

  const removeRequisitionItem = (index: number) => {
    setRequisitionItems(requisitionItems.filter((_, i) => i !== index))
  }

  const updateRequisitionItem = (index: number, field: keyof IRequisitionItem, value: any) => {
    const updatedItems = [...requisitionItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setRequisitionItems(updatedItems)
  }

  const openEditDialog = (requisition: IRequisitionWithItems) => {
    setSelectedRequisition(requisition)
    setFormData({
      requisition_number: requisition.requisition_number,
      requester_name: requisition.requester_name || '',
      organization_code: requisition.organization_code || '',
      status: requisition.status,
      requirement: requisition.requirement || ''
    })
    setRequisitionItems(requisition.items || [])
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (requisition: IRequisitionWithItems) => {
    setSelectedRequisition(requisition)
    setIsViewDialogOpen(true)
  }

  const openDeleteDialog = (requisition: IRequisitionWithItems) => {
    setSelectedRequisition(requisition)
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

  return (
    <PageLayout activePage="requisitions">
      <PageHeader
        title="Requisitions"
        breadcrumbItems={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Requisitions", href: "/requisitions" }
        ]}
        actions={
          <Button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Requisition
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search requisitions..."
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
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={resetFilters}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={fetchRequisitions}
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
              <TableHead>Requisition #</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requirement</TableHead>
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
                    Loading requisitions...
                  </div>
                </TableCell>
              </TableRow>
            ) : requisitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No requisitions found
                </TableCell>
              </TableRow>
            ) : (
              requisitions.map((requisition) => (
                <TableRow key={requisition.id}>
                  <TableCell className="font-medium">
                    {requisition.requisition_number}
                  </TableCell>
                  <TableCell>{requisition.requester_name || '-'}</TableCell>
                  <TableCell>{requisition.organization_code || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[requisition.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                      {requisition.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {requisition.requirement || '-'}
                  </TableCell>
                  <TableCell>{formatDate(requisition.created_at || '')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewDialog(requisition)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(requisition)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(requisition)}
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
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page! - 1 }))}
              disabled={!meta.hasPrev}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Requisition</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new requisition
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requisition_number">Requisition Number *</Label>
              <Input
                id="requisition_number"
                value={formData.requisition_number}
                onChange={(e) => setFormData(prev => ({ ...prev, requisition_number: e.target.value }))}
                placeholder="Enter requisition number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester_name">Requester Name</Label>
              <Input
                id="requester_name"
                value={formData.requester_name}
                onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                placeholder="Enter requester name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_code">Organization Code</Label>
              <Input
                id="organization_code"
                value={formData.organization_code}
                onChange={(e) => setFormData(prev => ({ ...prev, organization_code: e.target.value }))}
                placeholder="Enter organization code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
                         <div className="space-y-2 col-span-2">
               <Label htmlFor="requirement">Requirement</Label>
               <Textarea
                 id="requirement"
                 value={formData.requirement}
                 onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                 placeholder="Enter requirement details"
                 rows={3}
               />
             </div>
             
             {/* Requisition Items Section */}
             <div className="col-span-2 space-y-4">
               <div className="flex items-center justify-between">
                 <div>
                   <Label className="text-base font-medium">Requisition Items</Label>
                   {requisitionItems.length > 0 && (
                     <p className="text-sm text-gray-600 mt-1">
                       Total: {requisitionItems.length} item(s) | 
                       Quantity: {requisitionItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                     </p>
                   )}
                 </div>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={addRequisitionItem}
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Item
                 </Button>
               </div>
               
               {requisitionItems.length === 0 ? (
                 <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                   No items added. Click "Add Item" to start.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {requisitionItems.map((item, index) => (
                     <div key={index} className="grid grid-cols-6 gap-3 p-4 border rounded-lg bg-gray-50">
                       <div className="col-span-2">
                         <Label className="text-sm">Item *</Label>
                         <Select
                           value={item.item_id?.toString() || ''}
                           onValueChange={(value) => updateRequisitionItem(index, 'item_id', parseInt(value))}
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
                           onChange={(e) => updateRequisitionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                           placeholder="Qty"
                         />
                       </div>
                       <div>
                         <Label className="text-sm">UOM</Label>
                         <Input
                           value={item.uom || ''}
                           onChange={(e) => updateRequisitionItem(index, 'uom', e.target.value)}
                           placeholder="UOM"
                         />
                       </div>
                       <div>
                         <Label className="text-sm">Remarks</Label>
                         <Input
                           value={item.remarks || ''}
                           onChange={(e) => updateRequisitionItem(index, 'remarks', e.target.value)}
                           placeholder="Remarks"
                         />
                       </div>
                       <div className="flex items-end">
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => removeRequisitionItem(index)}
                           className="text-red-600 hover:text-red-700 hover:bg-red-50"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
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
            <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
              Create Requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Requisition</DialogTitle>
            <DialogDescription>
              Update the requisition details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_requisition_number">Requisition Number *</Label>
              <Input
                id="edit_requisition_number"
                value={formData.requisition_number}
                onChange={(e) => setFormData(prev => ({ ...prev, requisition_number: e.target.value }))}
                placeholder="Enter requisition number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_requester_name">Requester Name</Label>
              <Input
                id="edit_requester_name"
                value={formData.requester_name}
                onChange={(e) => setFormData(prev => ({ ...prev, requester_name: e.target.value }))}
                placeholder="Enter requester name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_organization_code">Organization Code</Label>
              <Input
                id="edit_organization_code"
                value={formData.organization_code}
                onChange={(e) => setFormData(prev => ({ ...prev, organization_code: e.target.value }))}
                placeholder="Enter organization code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
                         <div className="space-y-2 col-span-2">
               <Label htmlFor="edit_requirement">Requirement</Label>
               <Textarea
                 id="edit_requirement"
                 value={formData.requirement}
                 onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                 placeholder="Enter requirement details"
                 rows={3}
               />
             </div>
             
             {/* Requisition Items Section */}
             <div className="col-span-2 space-y-4">
               <div className="flex items-center justify-between">
                 <div>
                   <Label className="text-base font-medium">Requisition Items</Label>
                   {requisitionItems.length > 0 && (
                     <p className="text-sm text-gray-600 mt-1">
                       Total: {requisitionItems.length} item(s) | 
                       Quantity: {requisitionItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                     </p>
                   )}
                 </div>
                 <Button
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={addRequisitionItem}
                 >
                   <Plus className="h-4 w-4 mr-2" />
                   Add Item
                 </Button>
               </div>
               
               {requisitionItems.length === 0 ? (
                 <div className="text-center py-6 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                   No items added. Click "Add Item" to start.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {requisitionItems.map((item, index) => (
                     <div key={index} className="grid grid-cols-6 gap-3 p-4 border rounded-lg bg-gray-50">
                       <div className="col-span-2">
                         <Label className="text-sm">Item *</Label>
                         <Select
                           value={item.item_id?.toString() || ''}
                           onValueChange={(value) => updateRequisitionItem(index, 'item_id', parseInt(value))}
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
                           onChange={(e) => updateRequisitionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                           placeholder="Qty"
                         />
                       </div>
                       <div>
                         <Label className="text-sm">UOM</Label>
                         <Input
                           value={item.uom || ''}
                           onChange={(e) => updateRequisitionItem(index, 'uom', e.target.value)}
                           placeholder="UOM"
                         />
                       </div>
                       <div>
                         <Label className="text-sm">Remarks</Label>
                         <Input
                           value={item.remarks || ''}
                           onChange={(e) => updateRequisitionItem(index, 'remarks', e.target.value)}
                           placeholder="Remarks"
                         />
                       </div>
                       <div className="flex items-end">
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           onClick={() => removeRequisitionItem(index)}
                           className="text-red-600 hover:text-red-700 hover:bg-red-50"
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
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
            <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700">
              Update Requisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>
              View complete requisition information
            </DialogDescription>
          </DialogHeader>
          {selectedRequisition && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requisition Number</Label>
                  <p className="text-lg font-semibold">{selectedRequisition.requisition_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge className={`mt-1 ${statusColors[selectedRequisition.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                    {selectedRequisition.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requester Name</Label>
                  <p className="text-base">{selectedRequisition.requester_name || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Organization Code</Label>
                  <p className="text-base">{selectedRequisition.organization_code || '-'}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-gray-500">Requirement</Label>
                  <p className="text-base mt-1">{selectedRequisition.requirement || '-'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created At</Label>
                  <p className="text-base">{formatDate(selectedRequisition.created_at || '')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Updated At</Label>
                  <p className="text-base">{formatDate(selectedRequisition.updated_at || '')}</p>
                </div>
              </div>

              {/* Items Section */}
              {selectedRequisition.items && selectedRequisition.items.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requisition Items</Label>
                  <div className="mt-2 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequisition.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.item?.item_code || '-'}
                            </TableCell>
                            <TableCell>{item.item?.item_description || '-'}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.uom || item.item?.uom_primary || '-'}</TableCell>
                            <TableCell>{item.remarks || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Requisition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this requisition? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
