"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Search, RefreshCw, Package, TrendingUp, Hash, Building2, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stockApi, IStock, IStockFilters, IStockStats, IStockSummary } from '@/lib/api/stock';

export default function StockPage() {
  const [stocks, setStocks] = useState<IStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState<IStockFilters>({
    searchTerm: '',
  });
  const [stats, setStats] = useState<IStockStats | null>(null);
  const [filteredStocks, setFilteredStocks] = useState<IStock[]>([]);
  const { toast } = useToast();

  // Fetch stocks
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await stockApi.getStocks(filters);
      setStocks(response.data);
      applyFilters(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await stockApi.getStockStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Apply filters to stock data
  const applyFilters = (data: IStock[]) => {
    let filtered = [...data];
    console.log('🔍 Applying filters to stock data:', { originalCount: data.length, filters });

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.item_number.toLowerCase().includes(searchTerm) ||
        (item.item_description && item.item_description.toLowerCase().includes(searchTerm)) ||
        item.lot_no.toLowerCase().includes(searchTerm) ||
        item.po_number.toLowerCase().includes(searchTerm)
      );
      console.log('🔍 After search filter:', { count: filtered.length, searchTerm });
    }

    // Apply item number filter
    if (filters.item_number) {
      filtered = filtered.filter(item => 
        item.item_number.toLowerCase().includes(filters.item_number!.toLowerCase())
      );
      console.log('🔍 After item number filter:', { count: filtered.length, itemNumber: filters.item_number });
    }

    // Apply lot number filter
    if (filters.lot_no) {
      filtered = filtered.filter(item => 
        item.lot_no.toLowerCase().includes(filters.lot_no!.toLowerCase())
      );
      console.log('🔍 After lot number filter:', { count: filtered.length, lotNo: filters.lot_no });
    }

    // Apply PO number filter
    if (filters.po_number) {
      filtered = filtered.filter(item => 
        item.po_number.toLowerCase().includes(filters.po_number!.toLowerCase())
      );
      console.log('🔍 After PO number filter:', { count: filtered.length, poNumber: filters.po_number });
    }

    console.log('🔍 Final filtered data:', { count: filtered.length, items: filtered.slice(0, 3) });
    setFilteredStocks(filtered);
    
    // Update pagination
    const totalPages = Math.ceil(filtered.length / pagination.limit);
    setPagination(prev => ({
      ...prev,
      total: filtered.length,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    }));
  };

  useEffect(() => {
    fetchStocks();
    fetchStats();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (stocks.length > 0) {
      applyFilters(stocks);
    }
  }, [filters]);


  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Get paginated stock items
  const getPaginatedItems = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredStocks.slice(startIndex, endIndex);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <PageLayout activePage="stock">
      <div className="space-y-6">
        <PageHeader
          title="Stock Management - Aggregated by Item & Lot"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stock", href: "/stock" }
          ]}
        />

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_items}</div>
                <p className="text-xs text-muted-foreground">Stock records</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.total_quantity.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Units in stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Items</CardTitle>
                <Hash className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.unique_items}</div>
                <p className="text-xs text-muted-foreground">Different items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
                <Building2 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.unique_pos}</div>
                <p className="text-xs text-muted-foreground">Active POs</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.recent_updates}</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Item Summary Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search items by ID or description..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Input
                  placeholder="Item Number"
                  value={filters.item_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, item_number: e.target.value }))}
                  className="w-[150px]"
                />
                <Input
                  placeholder="Lot Number"
                  value={filters.lot_no || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, lot_no: e.target.value }))}
                  className="w-[150px]"
                />
                <Input
                  placeholder="PO Number"
                  value={filters.po_number || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, po_number: e.target.value }))}
                  className="w-[150px]"
                />
              </div>
              <Button onClick={() => { fetchStocks(); fetchStats(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading stock data...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Item ID</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedItems().length > 0 ? (
                      getPaginatedItems().map((item, index) => (
                        <TableRow 
                          key={item.id}
                        >
                          <TableCell className="font-mono text-sm font-semibold">{item.id}</TableCell>
                          <TableCell className="font-mono text-sm text-blue-600 font-medium">
                            {item.po_number}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{item.item_number}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={item.item_description}>
                              {item.item_description || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-purple-600 font-medium">
                            {item.lot_no}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 text-lg">
                            {item.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{formatTime(item.created_at)}</p>
                              <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{formatTime(item.updated_at)}</p>
                              <p className="text-xs text-gray-500">{formatDate(item.updated_at)}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-gray-400" />
                            <p>No stock data available</p>
                            <p className="text-sm">Items will appear here once they are scanned and added to stock</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Items per page selector */}
                <div className="mt-4 flex justify-end items-center gap-2 text-sm text-gray-600">
                  <span>Items per page:</span>
                  <Select 
                    value={pagination.limit.toString()} 
                    onValueChange={(value) => {
                      setPagination(prev => ({ ...prev, limit: parseInt(value), page: 1 }));
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </PageLayout>
  );
}
