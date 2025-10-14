"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { MapPin, Calendar, Search, ArrowUpDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface LocationTrackerEvent {
  id: number;
  location_code: string;
  location_name?: string;
  po_number: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  status: 'in' | 'out';
  epc?: string;
  created_at: string;
  updated_at: string;
}

interface LocationTrackerResponse {
  data: LocationTrackerEvent[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function LocationTrackerStatusPage() {
  const [events, setEvents] = useState<LocationTrackerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    searchTerm: '',
    fromDate: '',
    toDate: '',
    status: '',
    location_code: ''
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchLocationTrackers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(filters.searchTerm && { searchTerm: filters.searchTerm }),
        ...(filters.fromDate && { fromDate: filters.fromDate }),
        ...(filters.toDate && { toDate: filters.toDate }),
        ...(filters.status && { status: filters.status }),
        ...(filters.location_code && { location_code: filters.location_code })
      });

       const response = await fetch(`/api/location-trackers?${params}`);
      if (response.ok) {
        const data: LocationTrackerResponse = await response.json();
        setEvents(data.data);
        setPagination(data.meta);
      } else {
        console.error('Failed to fetch location trackers');
      }
    } catch (error) {
      console.error('Error fetching location trackers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocationTrackers();
  }, [pagination.page, sortBy, sortOrder, filters]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      fromDate: '',
      toDate: '',
      status: '',
      location_code: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status: 'in' | 'out') => {
    return status === 'in' 
      ? <Badge className="bg-green-100 text-green-700 border-green-300">IN</Badge>
      : <Badge className="bg-red-100 text-red-700 border-red-300">OUT</Badge>;
  };

  const getStatusIcon = (status: 'in' | 'out') => {
    return status === 'in' 
      ? <ArrowRight className="h-4 w-4 text-green-600" />
      : <ArrowLeft className="h-4 w-4 text-red-600" />;
  };

  return (
    <PageLayout activePage="location-tracker-status">
      <div className="space-y-6">
        <PageHeader
          title="Location Tracker Status"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Location Tracker Status", href: "/location-tracker-status" }
          ]}
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            <CardDescription>
              Filter location tracker events by date, status, and location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by PO, item, EPC..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="fromDate">From Date</Label>
                <Input
                  id="fromDate"
                  type="datetime-local"
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="toDate">To Date</Label>
                <Input
                  id="toDate"
                  type="datetime-local"
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="in">IN</option>
                  <option value="out">OUT</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Location code..."
                  value={filters.location_code}
                  onChange={(e) => handleFilterChange('location_code', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Tracker Events
            </CardTitle>
            <CardDescription>
              Showing {events.length} of {pagination.total} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading events...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No events found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search criteria</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Date & Time
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('location_code')}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('po_number')}
                        >
                          PO Number
                          <ArrowUpDown className="h-4 w-4" />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('item_number')}
                        >
                          Item
                          <ArrowUpDown className="h-4 w-4" />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('quantity')}
                        >
                          Quantity
                          <ArrowUpDown className="h-4 w-4" />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <ArrowUpDown className="h-4 w-4" />
                        </TableHead>
                        <TableHead>EPC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {format(new Date(event.created_at), 'MMM dd, yyyy')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(event.created_at), 'HH:mm:ss')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-500" />
                              <div>
                                <div className="font-medium">{event.location_code}</div>
                                {event.location_name && (
                                  <div className="text-sm text-muted-foreground">
                                    {event.location_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{event.po_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{event.item_number}</div>
                              {event.item_description && (
                                <div className="text-sm text-muted-foreground">
                                  {event.item_description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {event.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(event.status)}
                              {getStatusBadge(event.status)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {event.epc || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                 {/* Pagination */}
                 {pagination.totalPages > 1 && (
                   <div className="mt-4">
                     <Pagination
                       currentPage={pagination.page}
                       totalPages={pagination.totalPages}
                       totalItems={pagination.total}
                       itemsPerPage={pagination.limit}
                       onPageChange={handlePageChange}
                     />
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
