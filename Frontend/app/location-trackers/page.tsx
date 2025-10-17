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
import { Search, RefreshCw, MapPin, Package, ArrowRight, ArrowLeft, Activity, Radio, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { locationTrackersApi, ILocationTracker, ILocationTrackerFilters, ILocationTrackerStats, ILocationStatus } from '@/lib/api/location-trackers';
import { getSocket } from '@/lib/socket';

interface IUnifiedEvent {
  id?: number;
  type: 'scan' | 'location' | 'stock';
  po_number: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  scanned_quantity?: number;
  ordered_quantity?: number;
  lot_no?: string;
  location_code?: string;
  location_name?: string;
  status?: 'in' | 'out';
  epc?: string;
  timestamp: string;
  isDuplicate?: boolean;
}

export default function LocationTrackersPage() {
  const [trackers, setTrackers] = useState<ILocationTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [unifiedEvents, setUnifiedEvents] = useState<IUnifiedEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<IUnifiedEvent | null>(null);
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
      console.log('🔍 Fetching current status...');
      const response = await locationTrackersApi.getCurrentLocationStatus();
      console.log('📊 Current status data:', response.data);
      setCurrentStatus(response.data);
    } catch (error) {
      console.error('❌ Failed to fetch current status:', error);
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

    // Listen for scan events
    socket.on('inbound:new-scan', (data: any) => {
      console.log('📡 New scan received:', data);
      const unifiedEvent: IUnifiedEvent = {
        id: Date.now(),
        type: 'scan',
        po_number: data.po_number,
        item_number: data.item_number,
        item_description: data.item_description,
        quantity: data.quantity,
        scanned_quantity: data.scanned_quantity,
        ordered_quantity: data.ordered_quantity,
        lot_no: data.lot_no,
        epc: data.epc,
        timestamp: data.timestamp,
        isDuplicate: data.isDuplicate
      };
      setLastEvent(unifiedEvent);
      setUnifiedEvents(prev => [unifiedEvent, ...prev].slice(0, 100));
    });

    // Listen for location tracking events
    socket.on('location-tracker:new-activity', (data: any) => {
      console.log('📍 New location event received:', data);
      const unifiedEvent: IUnifiedEvent = {
        id: data.id || Date.now(),
        type: 'location',
        po_number: data.po_number,
        item_number: data.item_number,
        quantity: data.quantity,
        location_code: data.location_code,
        location_name: data.location_name,
        status: data.status,
        epc: data.epc,
        timestamp: data.timestamp || data.created_at
      };
      setLastEvent(unifiedEvent);
      setUnifiedEvents(prev => [unifiedEvent, ...prev].slice(0, 100));
      setTrackers(prev => [data, ...prev].slice(0, 50)); // Keep last 50 records
      fetchStats(); // Refresh stats
      
      // Immediately update current status with new data
      fetchCurrentStatus().then(() => {
        console.log('🔄 Current location status refreshed');
      });
    });

    // Listen for stock update events
    socket.on('stock:updated', (data: any) => {
      console.log('📦 New stock update received:', data);
      const unifiedEvent: IUnifiedEvent = {
        id: data.id || Date.now(),
        type: 'stock',
        po_number: data.po_number,
        item_number: data.item_number,
        quantity: data.quantity,
        lot_no: data.lot_no,
        epc: data.epc,
        timestamp: data.timestamp || data.updated_at
      };
      setLastEvent(unifiedEvent);
      setUnifiedEvents(prev => [unifiedEvent, ...prev].slice(0, 100));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('inbound:new-scan');
      socket.off('location-tracker:new-activity');
      socket.off('stock:updated');
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

  const getEventIcon = (event: IUnifiedEvent) => {
    switch (event.type) {
      case 'scan':
        return <Radio className="h-4 w-4" />;
      case 'location':
        return event.status === 'in' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />;
      case 'stock':
        return <Package className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: IUnifiedEvent) => {
    switch (event.type) {
      case 'scan':
        return event.isDuplicate ? 'text-orange-600' : 'text-green-600';
      case 'location':
        return event.status === 'in' ? 'text-green-600' : 'text-blue-600';
      case 'stock':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEventBgColor = (event: IUnifiedEvent) => {
    switch (event.type) {
      case 'scan':
        return event.isDuplicate ? 'bg-orange-100' : 'bg-green-100';
      case 'location':
        return event.status === 'in' ? 'bg-green-100' : 'bg-blue-100';
      case 'stock':
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getEventTitle = (event: IUnifiedEvent) => {
    switch (event.type) {
      case 'scan':
        return event.isDuplicate ? 'Duplicate Scan' : 'New Scan';
      case 'location':
        return event.status === 'in' ? 'Item Entered Location' : 'Item Exited Location';
      case 'stock':
        return 'Stock Updated';
      default:
        return 'Event';
    }
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

        {/* Live Location Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live Location Summary
            </CardTitle>
            <CardDescription>
              Real-time totals by location and item (aggregated from recent activity)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trackers.length > 0 ? (
              <div className="space-y-4">
                {/* Group recent trackers by location name (user) */}
                {Object.entries(
                  trackers.reduce((acc, t) => {
                    const loc = t.location_name || 'Unknown';
                    if (!acc[loc]) acc[loc] = [] as typeof trackers;
                    acc[loc].push(t);
                    return acc;
                  }, {} as Record<string, typeof trackers>)
                ).map(([locationName, items]) => {
                  // Aggregate by item_number within this location
                  const totals = Object.values(
                    items.reduce((m, it) => {
                      const key = it.item_number;
                      if (!m[key]) {
                        m[key] = {
                          item_number: it.item_number,
                          item_description: it.item_description,
                          total_quantity: 0,
                          last_status: it.status,
                          last_time: it.created_at
                        };
                      }
                      m[key].total_quantity += Number(it.quantity || 0);
                      // Update last seen info
                      if (new Date(it.created_at) > new Date(m[key].last_time)) {
                        m[key].last_time = it.created_at;
                        m[key].last_status = it.status;
                      }
                      return m;
                    }, {} as Record<string, { item_number: string; item_description?: string; total_quantity: number; last_status?: 'in' | 'out'; last_time: string; }>)
                  );

                  return (
                    <div key={locationName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <span className="text-blue-800">{locationName}</span>
                        </h3>
                        <Badge variant="outline" className="text-sm">
                          {totals.length} item{totals.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {totals.map((row) => (
                          <div
                            key={`${locationName}-${row.item_number}`}
                            className={`p-3 rounded-lg border-l-4 ${row.last_status === 'in' ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge 
                                variant={row.last_status === 'in' ? 'default' : 'secondary'}
                                className="text-xs flex items-center gap-1"
                              >
                                {row.last_status === 'in' ? (
                                  <>
                                    <ArrowRight className="h-3 w-3" /> IN
                                  </>
                                ) : (
                                  <>
                                    <ArrowLeft className="h-3 w-3" /> OUT
                                  </>
                                )}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatTime(row.last_time)}
                              </span>
                            </div>
                            <p className="font-medium text-sm">{row.item_number}</p>
                            {row.item_description && (
                              <p className="text-xs text-gray-600">{row.item_description}</p>
                            )}
                            <p className="text-sm font-semibold mt-1">Total: {Number(row.total_quantity).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No recent activity</p>
                <p className="text-sm">Items will appear here when they are scanned and tracked</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time location tracking events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trackers.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {trackers.slice(0, 20).map((tracker, index) => (
                  <div 
                    key={tracker.id} 
                    className={`p-3 rounded-lg border transition-all ${
                      index === 0 ? 'bg-green-50 border-green-300 animate-pulse' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tracker.status === 'in' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {tracker.status === 'in' ? (
                            <ArrowRight className="h-4 w-4" />
                          ) : (
                            <ArrowLeft className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {tracker.item_number} 
                            {tracker.item_description && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({tracker.item_description})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {tracker.location_code} • {tracker.po_number} • Qty: {tracker.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={tracker.status === 'in' ? 'default' : 'secondary'}>
                          {tracker.status.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(tracker.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No activity yet</p>
                <p className="text-sm">Location tracking events will appear here in real-time</p>
              </div>
            )}
          </CardContent>
        </Card>

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
