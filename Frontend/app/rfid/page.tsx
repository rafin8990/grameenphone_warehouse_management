"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Radio, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { rfidApi, IRfidTag, RfidQueryParams } from '@/lib/api/rfid';
import { PageHeader } from '@/components/layout/page-header';

export default function RfidPage() {
  const [rfidTags, setRfidTags] = useState<IRfidTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingRfidTag, setEditingRfidTag] = useState<IRfidTag | null>(null);
  const [viewingRfidTag, setViewingRfidTag] = useState<IRfidTag | null>(null);
  const [formData, setFormData] = useState({
    tag_uid: '',
    status: 'available' as 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchRfidTags();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchRfidTags = async () => {
    try {
      setLoading(true);
      const params: RfidQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await rfidApi.getAll(params);
      setRfidTags(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching RFID tags:', error);
      toast({
        title: "Error",
        description: "Failed to fetch RFID tags",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setFormErrors({});
      
      // Validation
      if (!formData.tag_uid.trim()) {
        setFormErrors(prev => ({ ...prev, tag_uid: 'Tag UID is required' }));
        return;
      }

      await rfidApi.create(formData);
      toast({
        title: "Success",
        description: "RFID tag created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error creating RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create RFID tag",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingRfidTag?.id) return;

    try {
      setFormErrors({});
      
      // Validation
      if (!formData.tag_uid.trim()) {
        setFormErrors(prev => ({ ...prev, tag_uid: 'Tag UID is required' }));
        return;
      }

      await rfidApi.update(editingRfidTag.id, formData);
      toast({
        title: "Success",
        description: "RFID tag updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error updating RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update RFID tag",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await rfidApi.delete(id);
      toast({
        title: "Success",
        description: "RFID tag deleted successfully"
      });
      fetchRfidTags();
    } catch (error: any) {
      console.error('Error deleting RFID tag:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete RFID tag",
        variant: "destructive"
      });
    }
  };

  const handleView = (rfidTag: IRfidTag) => {
    setViewingRfidTag(rfidTag);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (rfidTag: IRfidTag) => {
    setEditingRfidTag(rfidTag);
    setFormData({
      tag_uid: rfidTag.tag_uid,
      status: rfidTag.status
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      tag_uid: '',
      status: 'available'
    });
    setFormErrors({});
    setEditingRfidTag(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRfidTags();
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'reserved':
        return 'secondary';
      case 'assigned':
        return 'outline';
      case 'consumed':
        return 'destructive';
      case 'lost':
        return 'destructive';
      case 'damaged':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'reserved':
        return 'text-blue-600 bg-blue-100';
      case 'assigned':
        return 'text-purple-600 bg-purple-100';
      case 'consumed':
        return 'text-red-600 bg-red-100';
      case 'lost':
        return 'text-red-600 bg-red-100';
      case 'damaged':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <PageLayout activePage="rfid">
      <div className="space-y-6">
        <PageHeader
          title="RFID Tags"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "RFID", href: "/rfid" }
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
                      placeholder="Search by tag UID..."
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
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="consumed">Consumed</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
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
                      Add RFID Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New RFID Tag</DialogTitle>
                      <DialogDescription>
                        Add a new RFID tag to your inventory system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tag_uid">Tag UID *</Label>
                        <Input
                          id="tag_uid"
                          value={formData.tag_uid}
                          onChange={(e) => setFormData(prev => ({ ...prev, tag_uid: e.target.value }))}
                          placeholder="Enter tag UID"
                          className={formErrors.tag_uid ? "border-red-500" : ""}
                        />
                        {formErrors.tag_uid && <p className="text-sm text-red-500 mt-1">{formErrors.tag_uid}</p>}
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged') => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="consumed">Consumed</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate}>
                        Create RFID Tag
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* RFID Tags Table */}
        <Card>
          <CardHeader>
            <CardTitle>RFID Tags ({totalItems})</CardTitle>
            <CardDescription>
              Manage and track your RFID tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : rfidTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No RFID tags found. Create your first RFID tag to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag UID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfidTags.map((rfidTag) => (
                      <TableRow key={rfidTag.id}>
                        <TableCell className="font-mono text-sm">{rfidTag.tag_uid}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={getStatusBadgeVariant(rfidTag.status)}
                            className={getStatusColor(rfidTag.status)}
                          >
                            {rfidTag.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(rfidTag.created_at!)}</TableCell>
                        <TableCell>{formatDate(rfidTag.updated_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(rfidTag)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(rfidTag)}
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
                                  <AlertDialogTitle>Delete RFID Tag</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete RFID tag "{rfidTag.tag_uid}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rfidTag.id && handleDelete(rfidTag.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit RFID Tag</DialogTitle>
              <DialogDescription>
                Update RFID tag information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-tag-uid">Tag UID *</Label>
                <Input
                  id="edit-tag-uid"
                  value={formData.tag_uid}
                  onChange={(e) => setFormData(prev => ({ ...prev, tag_uid: e.target.value }))}
                  placeholder="Enter tag UID"
                  className={formErrors.tag_uid ? "border-red-500" : ""}
                />
                {formErrors.tag_uid && <p className="text-sm text-red-500 mt-1">{formErrors.tag_uid}</p>}
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="consumed">Consumed</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update RFID Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View RFID Tag</DialogTitle>
              <DialogDescription>
                RFID tag details
              </DialogDescription>
            </DialogHeader>
            {viewingRfidTag && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Tag UID</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingRfidTag.tag_uid}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge 
                    variant={getStatusBadgeVariant(viewingRfidTag.status)}
                    className={getStatusColor(viewingRfidTag.status)}
                  >
                    {viewingRfidTag.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingRfidTag.created_at!)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingRfidTag.updated_at!)}
                  </p>
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
