"use client"

import { useState, useEffect, useRef } from 'react'
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
import { requisitionsApi, IRequisition, IRequisitionWithItems, RequisitionQueryParams, IRequisitionItem } from '@/lib/api/requisitions'
import { itemsApi, IItem } from '@/lib/api/items'

interface IPaginationOptions {
  page: number;
  limit: number;
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
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRequisition, setSelectedRequisition] = useState<IRequisitionWithItems | null>(null)
  const [viewMode, setViewMode] = useState<'clean' | 'stock'>('clean')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [pagination, setPagination] = useState<IPaginationOptions>({
    page: 1,
    limit: 10
  })

  // PDF export ref
  const invoiceRef = useRef<HTMLDivElement | null>(null)

  const handleDownloadPdf = async () => {
    if (!selectedRequisition) return
    
    // Dynamic import to keep initial bundle light
    const jsPDF = (await import('jspdf')).default
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Colors matching website theme
    const colors = {
      primary: '#10b981', // emerald-500
      primaryLight: '#d1fae5', // emerald-100
      secondary: '#3b82f6', // blue-500
      secondaryLight: '#dbeafe', // blue-100
      success: '#059669', // emerald-600
      warning: '#d97706', // amber-600
      danger: '#dc2626', // red-600
      dangerLight: '#fecaca', // red-200
      gray: '#6b7280', // gray-500
      grayLight: '#f3f4f6', // gray-100
      dark: '#111827', // gray-900
      white: '#ffffff'
    }
    
    let yPosition = 20
    
    // Header with gradient background effect
    pdf.setFillColor(16, 185, 129) // emerald-500
    pdf.rect(0, 0, pageWidth, 50, 'F')
    
    // Company name
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Grameenphone Warehouse', 20, 25)
    
    // Requisition title
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Requisition Document', 20, 35)
    
    // Requisition number
    pdf.setFontSize(14)
    pdf.text(`#${selectedRequisition.requisition_number}`, pageWidth - 20, 25, { align: 'right' })
    
    // Status badge
    const statusColor = selectedRequisition.status === 'open' ? colors.secondary :
                       selectedRequisition.status === 'approved' ? colors.success :
                       selectedRequisition.status === 'rejected' ? colors.danger : colors.gray
    
    pdf.setFillColor(statusColor)
    pdf.roundedRect(pageWidth - 35, 30, 30, 8, 2, 2, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(selectedRequisition.status.toUpperCase(), pageWidth - 20, 35, { align: 'center' })
    
    yPosition = 70
    
    // Requisition details section
    pdf.setTextColor(colors.dark)
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Requisition Details', 20, yPosition)
    
    yPosition += 15
    
    // Details grid
    const details = [
      { label: 'Requester Name', value: selectedRequisition.requester_name || 'N/A' },
      { label: 'Organization Code', value: selectedRequisition.organization_code || 'N/A' },
      { label: 'Created Date', value: formatDate(selectedRequisition.created_at || '') },
      { label: 'Updated Date', value: formatDate(selectedRequisition.updated_at || '') }
    ]
    
    details.forEach((detail, index) => {
      const x = index % 2 === 0 ? 20 : pageWidth / 2 + 10
      const y = yPosition + (Math.floor(index / 2) * 12)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(colors.gray)
      pdf.text(detail.label + ':', x, y)
      
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(colors.dark)
      pdf.text(detail.value, x + 50, y)
    })
    
    yPosition += 30
    
    // Requirement section
    if (selectedRequisition.requirement) {
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(colors.dark)
      pdf.text('Requirement Description:', 20, yPosition)
      
      yPosition += 8
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(colors.gray)
      
      // Split long text into multiple lines
      const requirement = selectedRequisition.requirement
      const maxWidth = pageWidth - 40
      const lines = pdf.splitTextToSize(requirement, maxWidth)
      
      lines.forEach((line: string) => {
        pdf.text(line, 20, yPosition)
        yPosition += 5
      })
      
      yPosition += 10
    }
    
    // Items section
    if (selectedRequisition.items && selectedRequisition.items.length > 0) {
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(colors.dark)
      pdf.text('Requested Items', 20, yPosition)
      
      yPosition += 15
      
      // Table header
      pdf.setFillColor(colors.grayLight)
      pdf.rect(20, yPosition - 5, pageWidth - 40, 10, 'F')
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(colors.dark)
      
      pdf.text('Item Code', 25, yPosition)
      pdf.text('Description', 70, yPosition)
      pdf.text('Qty', pageWidth - 80, yPosition)
      pdf.text('UOM', pageWidth - 60, yPosition)
      pdf.text('Remarks', pageWidth - 30, yPosition)
      
      yPosition += 5
      
      // Table rows
      selectedRequisition.items.forEach((item, index) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage()
          yPosition = 20
        }
        
        // Alternate row colors
        if (index % 2 === 0) {
          pdf.setFillColor(248, 250, 252) // gray-50
          pdf.rect(20, yPosition - 2, pageWidth - 40, 8, 'F')
        }
        
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(colors.dark)
        
        // Item code
        pdf.text(item.item?.item_code || 'N/A', 25, yPosition)
        
        // Description (truncate if too long)
        const description = item.item?.item_description || 'N/A'
        const truncatedDesc = description.length > 35 ? description.substring(0, 32) + '...' : description
        pdf.text(truncatedDesc, 70, yPosition)
        
        // Quantity
        pdf.text(Number(item.quantity).toFixed(2), pageWidth - 80, yPosition)
        
        // UOM
        pdf.text(item.uom || item.item?.uom_primary || 'N/A', pageWidth - 60, yPosition)
        
        // Remarks
        const remarks = item.remarks || 'N/A'
        const truncatedRemarks = remarks.length > 15 ? remarks.substring(0, 12) + '...' : remarks
        pdf.text(truncatedRemarks, pageWidth - 30, yPosition)
        
        yPosition += 8
      })
    }
    
    // Add total quantity summary
    if (selectedRequisition.items && selectedRequisition.items.length > 0) {
      yPosition += 10
      
      // Summary box
      pdf.setFillColor(colors.primaryLight)
      pdf.rect(20, yPosition, pageWidth - 40, 15, 'F')
      
      const totalQuantity = selectedRequisition.items.reduce((sum, item) => sum + Number(item.quantity), 0)
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(colors.dark)
      pdf.text(`Total Items: ${selectedRequisition.items.length}`, 25, yPosition + 6)
      pdf.text(`Total Quantity: ${totalQuantity.toFixed(2)} units`, 25, yPosition + 12)
      
      yPosition += 20
    }
    
    // Footer
    yPosition = pageHeight - 20
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(colors.gray)
    pdf.text('This document was generated electronically and is valid without a signature.', 20, yPosition)
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - 20, yPosition, { align: 'right' })
    
    // Save the PDF
    const fileName = selectedRequisition.requisition_number
      ? `${selectedRequisition.requisition_number}.pdf`
      : 'requisition.pdf'
    pdf.save(fileName)
  }
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

  const fetchRequisitions = async () => {
    try {
      setLoading(true)
      const filters: RequisitionQueryParams = {}
      if (searchTerm) filters.searchTerm = searchTerm
      if (statusFilter && statusFilter !== 'all') filters.status = statusFilter as 'open' | 'approved' | 'rejected' | 'closed'
      filters.page = pagination.page
      filters.limit = pagination.limit

      const response = await requisitionsApi.getAll(filters)
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
    try {
      setCreateLoading(true)
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
          requisition_number: formData.requisition_number!,
          requester_name: formData.requester_name,
          organization_code: formData.organization_code,
          status: formData.status as 'open' | 'approved' | 'rejected' | 'closed',
          requirement: formData.requirement,
          items: requisitionItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            uom: item.uom,
            remarks: item.remarks
          }))
        }
        await requisitionsApi.create(requisitionData)
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
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRequisition?.id) return
    
    try {
      setUpdateLoading(true)
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
          requisition_number: formData.requisition_number,
          requester_name: formData.requester_name,
          organization_code: formData.organization_code,
          status: formData.status as 'open' | 'approved' | 'rejected' | 'closed',
          requirement: formData.requirement,
          items: requisitionItems.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            uom: item.uom,
            remarks: item.remarks
          }))
        }
        await requisitionsApi.update(selectedRequisition.id, requisitionData)
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
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRequisition?.id) return
    
    try {
      setDeleteLoading(true)
      await requisitionsApi.delete(selectedRequisition.id)
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
    } finally {
      setDeleteLoading(false)
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
          onClick={resetFilters}
          disabled={loading}
        >
          Reset
        </Button>
        <Button
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
              <TableHead>Items</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                    Loading requisitions...
                  </div>
                </TableCell>
              </TableRow>
            ) : requisitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No requisitions found
                </TableCell>
              </TableRow>
            ) : (
              requisitions.map((requisition) => {
                // Calculate stock status for this requisition
                const stockStatus = requisition.items?.reduce((acc, item) => {
                  if (item.stock_balance) {
                    const isAvailable = item.stock_balance.total_on_hand >= item.quantity;
                    acc.totalItems += 1;
                    if (isAvailable) {
                      acc.availableItems += 1;
                    }
                  }
                  return acc;
                }, { totalItems: 0, availableItems: 0 }) || { totalItems: 0, availableItems: 0 };

                const allAvailable = stockStatus.totalItems > 0 && stockStatus.availableItems === stockStatus.totalItems;
                const someAvailable = stockStatus.availableItems > 0;
                const noneAvailable = stockStatus.totalItems > 0 && stockStatus.availableItems === 0;

                return (
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
                    <TableCell>
                      <div className="text-sm">
                        {requisition.items?.length || 0} item(s)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {stockStatus.totalItems > 0 ? (
                          <>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              allAvailable 
                                ? 'bg-green-100 text-green-800' 
                                : someAvailable 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {allAvailable ? '✓ All Available' : someAvailable ? '⚠ Partial' : '✗ None Available'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {stockStatus.availableItems}/{stockStatus.totalItems}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No items</span>
                        )}
                      </div>
                  </TableCell>
                  <TableCell>{formatDate(requisition.created_at || '')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => openViewDialog(requisition)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openEditDialog(requisition)}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog(requisition)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
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
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requisition_number: e.target.value }))}
                placeholder="Enter requisition number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requester_name">Requester Name</Label>
              <Input
                id="requester_name"
                value={formData.requester_name}
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requester_name: e.target.value }))}
                placeholder="Enter requester name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization_code">Organization Code</Label>
              <Input
                id="organization_code"
                value={formData.organization_code}
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, organization_code: e.target.value }))}
                placeholder="Enter organization code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, status: value }))}>
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
                 onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requirement: e.target.value }))}
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
                       Quantity: {requisitionItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toFixed(2)}
                     </p>
                   )}
                 </div>
                 <Button
                   type="button"
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
            <Button onClick={() => setIsCreateDialogOpen(false)}>
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
                'Create Requisition'
              )}
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
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requisition_number: e.target.value }))}
                placeholder="Enter requisition number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_requester_name">Requester Name</Label>
              <Input
                id="edit_requester_name"
                value={formData.requester_name}
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requester_name: e.target.value }))}
                placeholder="Enter requester name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_organization_code">Organization Code</Label>
              <Input
                id="edit_organization_code"
                value={formData.organization_code}
                onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, organization_code: e.target.value }))}
                placeholder="Enter organization code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, status: value }))}>
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
                 onChange={(e) => setFormData((prev: Partial<IRequisition>) => ({ ...prev, requirement: e.target.value }))}
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
                       Quantity: {requisitionItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toFixed(2)}
                     </p>
                   )}
                 </div>
                 <Button
                   type="button"
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
            <Button onClick={() => setIsEditDialogOpen(false)}>
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
                'Update Requisition'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>
                  {viewMode === 'clean' ? 'Clean view for PDF generation' : 'Detailed view with stock information'}
            </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('clean')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'clean'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Clean View
                  </button>
                  <button
                    onClick={() => setViewMode('stock')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      viewMode === 'stock'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Stock View
                  </button>
                </div>
                {viewMode === 'clean' && (
                  <Button 
                    onClick={handleDownloadPdf}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
          {selectedRequisition && (
              <div className="space-y-6 pb-4">
              {/* Header - Same for both views */}
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 rounded-lg">
                <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Grameenphone Warehouse</h2>
                    <p className="text-emerald-100 mt-1">Requisition Document</p>
                    <p className="text-sm text-emerald-200 mt-2">#{selectedRequisition.requisition_number}</p>
                </div>
                  <div className="text-right">
                    <div className="inline-block">
                      <Badge className={`${statusColors[selectedRequisition.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-xs`}>
                        {selectedRequisition.status.toUpperCase()}
                  </Badge>
                </div>
                    <p className="text-xs text-emerald-200 mt-2">Created: {formatDate(selectedRequisition.created_at || '')}</p>
                    <p className="text-xs text-emerald-200">Updated: {formatDate(selectedRequisition.updated_at || '')}</p>
                  </div>
                </div>
              </div>

              {/* Requisition Details - Enhanced for both views */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Requisition Details</h3>
                <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Requester Name</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedRequisition.requester_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Organization Code</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedRequisition.organization_code || 'N/A'}</p>
                </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Requisition Number</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{selectedRequisition.requisition_number}</p>
                </div>
                <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge className={`${statusColors[selectedRequisition.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-xs`}>
                        {selectedRequisition.status.toUpperCase()}
                      </Badge>
                    </div>
                </div>
                <div>
                    <Label className="text-sm font-medium text-gray-500">Created Date</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{formatDate(selectedRequisition.created_at || '')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-base font-medium text-gray-900 mt-1">{formatDate(selectedRequisition.updated_at || '')}</p>
                </div>
              </div>

                {selectedRequisition.requirement && (
                  <div className="mt-6">
                    <Label className="text-sm font-medium text-gray-500">Requirement Description</Label>
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-md">{selectedRequisition.requirement}</p>
                  </div>
                )}
              </div>

              {/* Items Section - Different based on view mode */}
              {selectedRequisition.items && selectedRequisition.items.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Requested Items</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Item Code</TableHead>
                          <TableHead className="font-semibold text-gray-700">Description</TableHead>
                          <TableHead className="font-semibold text-gray-700">Requested Qty</TableHead>
                          {viewMode === 'stock' && (
                            <TableHead className="font-semibold text-gray-700">Stock Available</TableHead>
                          )}
                          <TableHead className="font-semibold text-gray-700">UOM</TableHead>
                          <TableHead className="font-semibold text-gray-700">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequisition.items.map((item, index) => (
                          <TableRow key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <TableCell className="font-medium text-gray-900">
                              {item.item?.item_code || 'N/A'}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {item.item?.item_description || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{Number(item.quantity).toFixed(2)}</span>
                                {viewMode === 'stock' && item.stock_balance && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    item.stock_balance.total_on_hand >= item.quantity 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.stock_balance.total_on_hand >= item.quantity ? '✓ Available' : '⚠ Low Stock'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            {viewMode === 'stock' && (
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {item.stock_balance?.total_on_hand?.toFixed(2) || '0.00'}
                                  </span>
                                  {item.stock_balance?.available_locations && item.stock_balance.available_locations.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {item.stock_balance.available_locations.slice(0, 2).map((loc, idx) => (
                                        <div key={idx}>
                                          {loc.sub_inventory_code}-{loc.locator_code}: {loc.on_hand_qty.toFixed(2)}
                                        </div>
                                      ))}
                                      {item.stock_balance.available_locations.length > 2 && (
                                        <div>+{item.stock_balance.available_locations.length - 2} more locations</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-gray-700">
                              {item.uom || item.item?.uom_primary || 'N/A'}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {item.remarks || 'N/A'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Summary - Enhanced for both views */}
                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-emerald-800">
                          <span className="font-semibold">Total Items:</span> {selectedRequisition.items.length} item(s) requested
                        </p>
                        <p className="text-sm text-emerald-800 mt-1">
                          <span className="font-semibold">Total Quantity:</span> {selectedRequisition.items.reduce((sum, item) => sum + Number(item.quantity), 0).toFixed(2)} units
                        </p>
                      </div>
                      {viewMode === 'stock' && (
                        <div>
                          {(() => {
                            const stockStatus = selectedRequisition.items?.reduce((acc, item) => {
                              acc.totalItems += 1;
                              if (item.stock_balance && item.stock_balance.total_on_hand >= item.quantity) {
                                acc.availableItems += 1;
                              }
                              return acc;
                            }, { totalItems: 0, availableItems: 0 }) || { totalItems: 0, availableItems: 0 };
                            const allAvailable = stockStatus.totalItems > 0 && stockStatus.availableItems === stockStatus.totalItems;
                            const someAvailable = stockStatus.availableItems > 0;
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-emerald-800">
                                    <span className="font-semibold">Stock Status:</span>
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    allAvailable
                                      ? 'bg-green-100 text-green-800'
                                      : someAvailable
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}>
                                    {allAvailable ? '✓ All Available' : someAvailable ? '⚠ Partial' : '✗ None Available'}
                                  </span>
                                </div>
                                <p className="text-xs text-emerald-700">
                                  {stockStatus.availableItems}/{stockStatus.totalItems} items in stock
                                </p>
                              </div>
                            );
                          })()}
                </div>
              )}
                    </div>
                  </div>
            </div>
          )}

              {/* Footer Note */}
              <div className="text-center text-xs text-gray-500 bg-gray-50 p-4 rounded-lg">
                This document was generated electronically and is valid without a signature.
              </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button onClick={() => setIsViewDialogOpen(false)}>
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
            <Button onClick={() => setIsDeleteDialogOpen(false)}>
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

