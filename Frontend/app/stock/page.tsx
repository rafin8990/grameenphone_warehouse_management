"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Search, RefreshCw, Package, TrendingUp, Clock, Hash, Building2, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { stockApi, IStock, IStockFilters, IStockStats, IStockSummary } from '@/lib/api/stock';
import { getSocket } from '@/lib/socket';

export default function StockPage() {
  const [stocks, setStocks] = useState<IStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
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
  const [summary, setSummary] = useState<IStockSummary[]>([]);
  const [filteredSummary, setFilteredSummary] = useState<IStockSummary[]>([]);
  const { toast } = useToast();

  // Fetch stocks
  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await stockApi.getStocks(filters);
      setStocks(response.data);
      // Note: API doesn't return pagination, so we'll handle it client-side
      setPagination({
        page: 1,
        limit: 10,
        total: response.data.length,
        totalPages: Math.ceil(response.data.length / 10),
        hasNext: response.data.length > 10,
        hasPrev: false,
      });
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

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const response = await stockApi.getStockSummary();
      console.log('📊 Stock summary data received:', response.data);
      setSummary(response.data);
      applyFilters(response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  // Apply filters to summary data
  const applyFilters = (data: IStockSummary[]) => {
    let filtered = [...data];
    console.log('🔍 Applying filters to data:', { originalCount: data.length, filters });

    // Apply search filter
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.item_number.toLowerCase().includes(searchTerm) ||
        item.item_description.toLowerCase().includes(searchTerm)
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

    console.log('🔍 Final filtered data:', { count: filtered.length, items: filtered.slice(0, 3) });
    setFilteredSummary(filtered);
    
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
    fetchSummary();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    if (summary.length > 0) {
      applyFilters(summary);
    }
  }, [filters]);

  // Socket connection for live updates
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to stock dashboard');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from stock dashboard');
    });

    // Listen for stock updates
    socket.on('stock:updated', (data: IStock) => {
      console.log('📦 Live stock update received:', data);
      setStocks(prev => [data, ...prev].slice(0, 50)); // Keep last 50 records
      fetchStats(); // Refresh stats
      fetchSummary(); // Refresh summary
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('stock:updated');
    };
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Get paginated summary items
  const getPaginatedItems = () => {
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    return filteredSummary.slice(startIndex, endIndex);
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
          title="Stock Management - Item Summary"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Stock", href: "/stock" }
          ]}
        />

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live Stock Status</CardTitle>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? 'Live Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

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
              </div>
              <Button onClick={() => { fetchStocks(); fetchStats(); fetchSummary(); }}>
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
                      <TableHead>Item ID</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead className="text-right">Total Quantity</TableHead>
                      <TableHead className="text-right">Lots</TableHead>
                      <TableHead className="text-right">POs</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedItems().length > 0 ? (
                      getPaginatedItems().map((item, index) => (
                        <TableRow 
                          key={item.item_number} 
                          className={index === 0 ? 'bg-green-50 animate-pulse' : ''}
                        >
                          <TableCell className="font-mono text-sm font-semibold">{item.item_number}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={item.item_description}>
                              {item.item_description || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 text-lg">
                            {item.total_quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 font-medium">
                            {item.lot_count}
                          </TableCell>
                          <TableCell className="text-right text-purple-600 font-medium">
                            {item.po_count}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p className="font-medium">{formatTime(item.last_updated)}</p>
                              <p className="text-xs text-gray-500">{formatDate(item.last_updated)}</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
