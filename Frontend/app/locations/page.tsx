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
import { Plus, Search, Edit, Trash2, MapPin, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationsApi, ILocation, LocationQueryParams } from '@/lib/api/locations';
import { PageHeader } from '@/components/layout/page-header';

export default function LocationsPage() {
  const [locations, setLocations] = useState<ILocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ILocation | null>(null);
  const [viewingLocation, setViewingLocation] = useState<ILocation | null>(null);
  const [formData, setFormData] = useState({
    sub_inventory_code: '',
    locator_code: '',
    name: '',
    description: '',
    org_code: '',
    status: 'active' as 'active' | 'inactive' | 'obsolete',
    capacity: null as number | null,
    attributes: {} as Record<string, any>
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchLocations();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const params: LocationQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await locationsApi.getAll(params);
      setLocations(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
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
      if (!formData.sub_inventory_code.trim()) {
        setFormErrors(prev => ({ ...prev, sub_inventory_code: 'Sub inventory code is required' }));
        return;
      }
      if (!formData.locator_code.trim()) {
        setFormErrors(prev => ({ ...prev, locator_code: 'Locator code is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        capacity: formData.capacity || undefined
      };
      await locationsApi.create(apiData);
      toast({
        title: "Success",
        description: "Location created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      console.error('Error creating location:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create location",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingLocation?.id) return;

    try {
      setFormErrors({});
      
      // Validation
      if (!formData.sub_inventory_code.trim()) {
        setFormErrors(prev => ({ ...prev, sub_inventory_code: 'Sub inventory code is required' }));
        return;
      }
      if (!formData.locator_code.trim()) {
        setFormErrors(prev => ({ ...prev, locator_code: 'Locator code is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        capacity: formData.capacity || undefined
      };
      await locationsApi.update(editingLocation.id, apiData);
      toast({
        title: "Success",
        description: "Location updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchLocations();
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update location",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await locationsApi.delete(id);
      toast({
        title: "Success",
        description: "Location deleted successfully"
      });
      fetchLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete location",
        variant: "destructive"
      });
    }
  };

  const handleView = (location: ILocation) => {
    setViewingLocation(location);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (location: ILocation) => {
    setEditingLocation(location);
    setFormData({
      sub_inventory_code: location.sub_inventory_code,
      locator_code: location.locator_code,
      name: location.name || '',
      description: location.description || '',
      org_code: location.org_code || '',
      status: location.status as 'active' | 'inactive' | 'obsolete',
      capacity: location.capacity || null,
      attributes: location.attributes || {}
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      sub_inventory_code: '',
      locator_code: '',
      name: '',
      description: '',
      org_code: '',
      status: 'active',
      capacity: null,
      attributes: {}
    });
    setFormErrors({});
    setEditingLocation(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLocations();
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

  return (
    <PageLayout activePage="locations">
      <div className="space-y-6">
        <PageHeader
          title="Locations"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Locations", href: "/locations" }
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
                      placeholder="Search by code, name..."
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
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Location</DialogTitle>
                      <DialogDescription>
                        Add a new location to organize your inventory
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sub_inventory_code">Sub Inventory Code *</Label>
                        <Input
                          id="sub_inventory_code"
                          value={formData.sub_inventory_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, sub_inventory_code: e.target.value }))}
                          placeholder="Enter sub inventory code"
                          className={formErrors.sub_inventory_code ? "border-red-500" : ""}
                        />
                        {formErrors.sub_inventory_code && <p className="text-sm text-red-500 mt-1">{formErrors.sub_inventory_code}</p>}
                      </div>
                      <div>
                        <Label htmlFor="locator_code">Locator Code *</Label>
                        <Input
                          id="locator_code"
                          value={formData.locator_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, locator_code: e.target.value }))}
                          placeholder="Enter locator code"
                          className={formErrors.locator_code ? "border-red-500" : ""}
                        />
                        {formErrors.locator_code && <p className="text-sm text-red-500 mt-1">{formErrors.locator_code}</p>}
                      </div>
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter location name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter location description"
                          rows={3}
                        />
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
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, status: value }))}>
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
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Enter capacity"
                          min="0"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate}>
                        Create Location
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Locations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Locations ({totalItems})</CardTitle>
            <CardDescription>
              Manage and organize your inventory locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No locations found. Create your first location to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sub Inventory Code</TableHead>
                      <TableHead>Locator Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-mono text-sm">{location.sub_inventory_code}</TableCell>
                        <TableCell className="font-mono text-sm">{location.locator_code}</TableCell>
                        <TableCell className="font-medium">{location.name || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {location.description || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {location.org_code || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(location.status)}>
                            {location.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {location.capacity ? location.capacity.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>{formatDate(location.created_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(location)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(location)}
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
                                  <AlertDialogTitle>Delete Location</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{location.name || location.locator_code}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => location.id && handleDelete(location.id)}
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
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update location information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-sub-inventory-code">Sub Inventory Code *</Label>
                <Input
                  id="edit-sub-inventory-code"
                  value={formData.sub_inventory_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, sub_inventory_code: e.target.value }))}
                  placeholder="Enter sub inventory code"
                  className={formErrors.sub_inventory_code ? "border-red-500" : ""}
                />
                {formErrors.sub_inventory_code && <p className="text-sm text-red-500 mt-1">{formErrors.sub_inventory_code}</p>}
              </div>
              <div>
                <Label htmlFor="edit-locator-code">Locator Code *</Label>
                <Input
                  id="edit-locator-code"
                  value={formData.locator_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, locator_code: e.target.value }))}
                  placeholder="Enter locator code"
                  className={formErrors.locator_code ? "border-red-500" : ""}
                />
                {formErrors.locator_code && <p className="text-sm text-red-500 mt-1">{formErrors.locator_code}</p>}
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter location name"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter location description"
                  rows={3}
                />
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
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'obsolete') => setFormData(prev => ({ ...prev, status: value }))}>
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
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter capacity"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View Location</DialogTitle>
              <DialogDescription>
                Location details
              </DialogDescription>
            </DialogHeader>
            {viewingLocation && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Sub Inventory Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingLocation.sub_inventory_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Locator Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingLocation.locator_code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Name</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {viewingLocation.name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {viewingLocation.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Organization Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                    {viewingLocation.org_code || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={getStatusBadgeVariant(viewingLocation.status)}>
                    {viewingLocation.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Capacity</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {viewingLocation.capacity ? viewingLocation.capacity.toLocaleString() : 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingLocation.created_at!)}
                  </p>
                </div>
                {viewingLocation.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {formatDate(viewingLocation.updated_at)}
                    </p>
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
      </div>
    </PageLayout>
  );
}
