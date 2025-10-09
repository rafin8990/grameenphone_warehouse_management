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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Search, RefreshCw, MapPin, Package, ArrowRight, ArrowLeft, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationTrackersApi, ILocationTracker, ILocationTrackerFilters, ILocationTrackerStats, ILocationStatus } from '@/lib/api/location-trackers';
import { getSocket } from '@/lib/socket';

export default function LocationTrackersPage() {
  const [trackers, setTrackers] = useState<ILocationTracker[]>([]);
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
  const [filters, setFilters] = useState<ILocationTrackerFilters>({
    searchTerm: '',
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [stats, setStats] = useState<ILocationTrackerStats | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ILocationStatus[]>([]);
  const { toast } = useToast();

  // Fetch trackers
  const fetchTrackers = async () => {
    try {
      setLoading(true);
      const response = await locationTrackersApi.getLocationTrackers(filters);
      setTrackers(response.data);
      setPagination(response.meta);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch location trackers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await locationTrackersApi.getLocationTrackerStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch current status
  const fetchCurrentStatus = async () => {
    try {
      const response = await locationTrackersApi.getCurrentLocationStatus();
      setCurrentStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch current status:', error);
    }
  };

  useEffect(() => {
    fetchTrackers();
    fetchStats();
    fetchCurrentStatus();
  }, [filters]);

  // Socket connection for live updates
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to location trackers');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from location trackers');
    });

    // Listen for new location tracker activity
    socket.on('location-tracker:new-activity', (data: ILocationTracker) => {
      console.log('📡 New location tracker activity:', data);
      setTrackers(prev => [data, ...prev].slice(0, 50)); // Keep last 50 records
      fetchStats(); // Refresh stats
      fetchCurrentStatus(); // Refresh current status
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('location-tracker:new-activity');
    };
  }, []);

  // Handle search
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, searchTerm: value, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  // Handle sort
  const handleSort = (sortBy: string) => {
    const sortOrder = filters.sortBy === sortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({ 
      ...prev, 
      status: status === 'all' ? undefined : status as 'in' | 'out',
      page: 1 
    }));
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

  const getStatusBadgeVariant = (status: 'in' | 'out') => {
    return status === 'in' ? 'default' : 'secondary';
  };

  const getStatusIcon = (status: 'in' | 'out') => {
    return status === 'in' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />;
  };

  return (
    <PageLayout activePage="location-trackers">
      <div className="space-y-6">
        <PageHeader
          title="Location Trackers - Live Dashboard"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Location Trackers", href: "/location-trackers" }
          ]}
        />

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Live Tracking Status</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_trackers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently In</CardTitle>
                <ArrowRight className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.current_in}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Currently Out</CardTitle>
                <ArrowLeft className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.current_out}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Package className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.recent_activity}</div>
                <p className="text-xs text-muted-foreground">Last hour</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Status Overview */}
        {currentStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Current Location Status
              </CardTitle>
              <CardDescription>
                Real-time status of items across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStatus.slice(0, 6).map((status, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getStatusBadgeVariant(status.last_status)}>
                        {status.last_status.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTime(status.last_updated)}
                      </span>
                    </div>
                    <p className="font-medium">{status.location_code}</p>
                    <p className="text-sm text-gray-600">{status.po_number}</p>
                    <p className="text-sm text-gray-500">{status.item_number}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search trackers..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={handleStatusFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in">In</SelectItem>
                    <SelectItem value="out">Out</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value, page: 1 }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date</SelectItem>
                    <SelectItem value="location_code">Location</SelectItem>
                    <SelectItem value="po_number">PO Number</SelectItem>
                    <SelectItem value="item_number">Item</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: 'asc' | 'desc') => setFilters(prev => ({ ...prev, sortOrder: value, page: 1 }))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { fetchTrackers(); fetchStats(); fetchCurrentStatus(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading trackers...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('location_code')}
                      >
                        Location {filters.sortBy === 'location_code' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('po_number')}
                      >
                        PO Number {filters.sortBy === 'po_number' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('item_number')}
                      >
                        Item {filters.sortBy === 'item_number' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('status')}
                      >
                        Status {filters.sortBy === 'status' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('created_at')}
                      >
                        Time {filters.sortBy === 'created_at' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trackers.map((tracker, index) => (
                      <TableRow 
                        key={tracker.id} 
                        className={index === 0 ? 'bg-green-50 animate-pulse' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            {tracker.location_code}
                          </div>
                          {tracker.location_name && (
                            <p className="text-xs text-gray-500">{tracker.location_name}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{tracker.po_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-sm">{tracker.item_number}</p>
                            {tracker.item_description && (
                              <p className="text-xs text-gray-500">{tracker.item_description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{tracker.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(tracker.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(tracker.status)}
                            {tracker.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{formatTime(tracker.created_at)}</p>
                            <p className="text-xs text-gray-500">{formatDate(tracker.created_at)}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(pagination.page - 1)}
                            className={!pagination.hasPrev ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === pagination.page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(pagination.page + 1)}
                            className={!pagination.hasNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
