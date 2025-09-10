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
import { Plus, Search, Edit, Trash2, Eye, Filter, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categoriesApi, ICategory, CategoryQueryParams } from '@/lib/api/categories';
import { PageHeader } from '@/components/layout/page-header';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ICategory | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    parent_id: null as number | null,
    status: 'active' as 'active' | 'inactive',
    fusion_category_code: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const itemsPerPage = 10;

  useEffect(() => {
    fetchCategories();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params: CategoryQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        searchTerm: searchTerm || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive'),
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      const response = await categoriesApi.getAll(params);
      setCategories(response.data);
      if (response.meta) {
        setTotalPages(response.meta.totalPages);
        setTotalItems(response.meta.total);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
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
      if (!formData.code.trim()) {
        setFormErrors(prev => ({ ...prev, code: 'Code is required' }));
        return;
      }
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Name is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        parent_id: formData.parent_id || undefined
      };
      await categoriesApi.create(apiData);
      toast({
        title: "Success",
        description: "Category created successfully"
      });
      setIsCreateDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory?.id) return;

    try {
      setFormErrors({});
      
      // Validation
      if (!formData.code.trim()) {
        setFormErrors(prev => ({ ...prev, code: 'Code is required' }));
        return;
      }
      if (!formData.name.trim()) {
        setFormErrors(prev => ({ ...prev, name: 'Name is required' }));
        return;
      }

      // Convert null values to undefined for API compatibility
      const apiData = {
        ...formData,
        parent_id: formData.parent_id || undefined
      };
      await categoriesApi.update(editingCategory.id, apiData);
      toast({
        title: "Success",
        description: "Category updated successfully"
      });
      setIsEditDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.delete(id);
      toast({
        title: "Success",
        description: "Category deleted successfully"
      });
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      });
    }
  };

  const handleView = (category: ICategory) => {
    setViewingCategory(category);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (category: ICategory) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || null,
      status: category.status as 'active' | 'inactive',
      fusion_category_code: category.fusion_category_code || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      parent_id: null,
      status: 'active',
      fusion_category_code: ''
    });
    setFormErrors({});
    setEditingCategory(null);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCategories();
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

  return (
    <PageLayout activePage="categories">
      <div className="space-y-6">
        <PageHeader
          title="Categories"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Categories", href: "/categories" }
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
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Category</DialogTitle>
                      <DialogDescription>
                        Add a new category to organize your items
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="code">Code *</Label>
                        <Input
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="Enter category code"
                          className={formErrors.code ? "border-red-500" : ""}
                        />
                        {formErrors.code && <p className="text-sm text-red-500 mt-1">{formErrors.code}</p>}
                      </div>
                      <div>
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter category name"
                          className={formErrors.name ? "border-red-500" : ""}
                        />
                        {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter category description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fusion_code">Fusion Category Code</Label>
                        <Input
                          id="fusion_code"
                          value={formData.fusion_category_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, fusion_category_code: e.target.value }))}
                          placeholder="Enter fusion category code"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate}>
                        Create Category
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Categories Table */}
        <Card>
          <CardHeader>
            <CardTitle>Categories ({totalItems})</CardTitle>
            <CardDescription>
              Manage and organize your item categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No categories found. Create your first category to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fusion Code</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-sm">{category.code}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                            {category.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {category.fusion_category_code || '-'}
                        </TableCell>
                        <TableCell>{formatDate(category.created_at!)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(category)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(category)}
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
                                  <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => category.id && handleDelete(category.id)}
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
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-code">Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter category code"
                  className={formErrors.code ? "border-red-500" : ""}
                />
                {formErrors.code && <p className="text-sm text-red-500 mt-1">{formErrors.code}</p>}
              </div>
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter category name"
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter category description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-fusion-code">Fusion Category Code</Label>
                <Input
                  id="edit-fusion-code"
                  value={formData.fusion_category_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, fusion_category_code: e.target.value }))}
                  placeholder="Enter fusion category code"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Update Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View Category</DialogTitle>
              <DialogDescription>
                Category details
              </DialogDescription>
            </DialogHeader>
            {viewingCategory && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">{viewingCategory.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Name</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">{viewingCategory.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {viewingCategory.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={viewingCategory.status === 'active' ? 'default' : 'secondary'}>
                    {viewingCategory.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Fusion Category Code</Label>
                  <p className="text-sm font-mono bg-gray-50 p-2 rounded border">
                    {viewingCategory.fusion_category_code || 'Not specified'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded border">
                    {formatDate(viewingCategory.created_at!)}
                  </p>
                </div>
                {viewingCategory.updated_at && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded border">
                      {formatDate(viewingCategory.updated_at)}
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
