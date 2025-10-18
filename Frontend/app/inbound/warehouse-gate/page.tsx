"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { Radio, Package, Hash, Clock, MapPin, ArrowRight, ArrowLeft, TestTube, Activity } from 'lucide-react';
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
  remaining_quantity?: number;
  lot_no?: string;
  location_code?: string;
  location_name?: string;
  status?: 'in' | 'out';
  location_status?: 'in' | 'out'; // For scan events
  epc?: string;
  timestamp: string;
  isDuplicate?: boolean;
}

export default function WarehouseGatePage() {
  const [events, setEvents] = useState<IUnifiedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to warehouse gate');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from warehouse gate');
    });

    // Listen for scan events
    socket.on('inbound:new-scan', (data: any) => {
      console.log('📡 New scan received:', data);
      const unifiedEvent: IUnifiedEvent = {
        id: Date.now(), // Generate ID for frontend
        type: 'scan',
        po_number: data.po_number,
        item_number: data.item_number,
        item_description: data.item_description,
        quantity: data.received_quantity || data.quantity, // Use received_quantity from backend
        scanned_quantity: data.scanned_quantity,
        ordered_quantity: data.ordered_quantity,
        remaining_quantity: data.remaining_quantity, // Add remaining quantity
        lot_no: data.lot_no,
        epc: data.epc,
        timestamp: data.timestamp,
        isDuplicate: data.isDuplicate,
        location_code: data.location_code,
        location_name: data.location_name,
        location_status: data.location_status || 'in' // Default to 'in' for scan events
      };
      console.log('📡 Processed scan event:', unifiedEvent);
      console.log('📍 Location info:', { 
        location_code: unifiedEvent.location_code, 
        location_name: unifiedEvent.location_name,
        location_status: unifiedEvent.location_status
      });
      setEvents(prev => [unifiedEvent, ...prev].slice(0, 100)); // Keep last 100 events
    });

    // Listen for location tracking events
    socket.on('location-tracker:new-activity', (data: any) => {
      console.log('📍 New location event received:', data);
      const unifiedEvent: IUnifiedEvent = {
        id: data.id || Date.now(),
        type: 'location',
        po_number: data.po_number,
        item_number: data.item_number,
        quantity: data.received_quantity || data.quantity, // Use received_quantity if available
        ordered_quantity: data.ordered_quantity,
        remaining_quantity: data.remaining_quantity,
        location_code: data.location_code,
        location_name: data.location_name,
        status: data.status,
        epc: data.epc,
        timestamp: data.timestamp || data.created_at
      };
      console.log('📍 Processed location event:', unifiedEvent);
      setEvents(prev => [unifiedEvent, ...prev].slice(0, 100)); // Keep last 100 events
    });

    // Debug: Listen for all socket events to troubleshoot
    socket.onAny((eventName: string, ...args: any[]) => {
      console.log(`🔍 Socket event received: ${eventName}`, args);
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
      setEvents(prev => [unifiedEvent, ...prev].slice(0, 100)); // Keep last 100 events
    });

    // Listen for location status updates
    socket.on('inbound:location-status-update', (data: any) => {
      console.log('📍 Location status update received:', data);
      console.log('📍 Updating status to:', data.location_status);
      
      // Update the most recent event with the correct location status
      setEvents(prev => {
        const updatedEvents = prev.map(event => {
          if (event.po_number === data.po_number && 
              event.item_number === data.item_number && 
              event.type === 'scan' &&
              Math.abs(new Date(event.timestamp).getTime() - new Date(data.timestamp).getTime()) < 10000) {
            console.log('📍 Updating event status from', event.location_status, 'to', data.location_status);
            return {
              ...event,
              location_status: data.location_status,
              location_code: data.location_code,
              location_name: data.location_name
            };
          }
          return event;
        });
        return updatedEvents;
      });
      
      // Note: Individual events are now tracked in the events array, no need to update lastEvent
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('inbound:new-scan');
      socket.off('location-tracker:new-activity');
      socket.off('stock:updated');
      socket.off('inbound:location-status-update');
    };
  }, []);

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


  const getLocationStatusColor = (event: IUnifiedEvent) => {
    if (event.type === 'location') {
      return event.status === 'in' ? 'text-green-700 bg-green-100 border-green-300' : 'text-blue-700 bg-blue-100 border-blue-300';
    }
    return '';
  };

  const getLocationStatusText = (event: IUnifiedEvent) => {
    if (event.type === 'scan') {
      return event.location_status === 'in' ? 'IN' : 'OUT';
    } else if (event.type === 'location') {
      return event.status === 'in' ? 'ENTERED' : 'EXITED';
    }
    return '';
  };

  const getLocationStatusBadgeColor = (event: IUnifiedEvent) => {
    if (event.type === 'scan') {
      return event.location_status === 'in' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300';
    } else if (event.type === 'location') {
      return event.status === 'in' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300';
    }
    return '';
  };

  // Test function to trigger location tracking
  const testLocationTracking = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing single location tracking...');
      const response = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_001',
          item_number: 'ITEM_TEST_001',
          quantity: 5,
          epc: 'TEST_EPC_001'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test location event sent:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Test location event failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Test location error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Test function to simulate RFID scan with location
  const testRfidScanWithLocation = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing RFID scan with location...');
      const response = await fetch('/api/inbound/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epc: 'TEST_SCAN_001',
          deviceId: 'WAREHOUSE_A',
          rssi: '-45',
          count: 1,
          timestamp: Date.now()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test RFID scan sent:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Test RFID scan failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Test RFID scan error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Test function to simulate real RFID scan without deviceId (should use default location)
  const testRealRfidScan = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing real RFID scan (no deviceId - should use default location)...');
      const response = await fetch('/api/inbound/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          epc: '500497359', // Use the same EPC from the image
          rssi: '-50',
          count: 1,
          timestamp: Date.now()
          // No deviceId - should trigger default location
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real RFID scan sent:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Real RFID scan failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Real RFID scan error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Test function for multiple scans to test toggle behavior
  const testMultipleScans = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing location tracking toggle behavior...');
      
      // First scan - should be "in"
      console.log('🔄 Test 1: First scan (should be IN)');
      const response1 = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_002',
          item_number: 'ITEM_TEST_002',
          quantity: 3,
          epc: 'TEST_EPC_002'
        }),
      });
      console.log('Response 1:', response1.ok ? 'Success' : 'Failed');

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Second scan within 30s - should be skipped
      console.log('🔄 Test 2: Second scan within 30s (should be SKIPPED)');
      const response2 = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_002',
          item_number: 'ITEM_TEST_002',
          quantity: 3,
          epc: 'TEST_EPC_002'
        }),
      });
      console.log('Response 2:', response2.ok ? 'Success' : 'Failed');

      // Wait 35 seconds to test the 30-second rule
      console.log('⏳ Waiting 35 seconds to test 30-second toggle rule...');
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Third scan after 30s - should be "out" (toggle)
      console.log('🔄 Test 3: Third scan after 35s (should be OUT - toggled)');
      const response3 = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_002',
          item_number: 'ITEM_TEST_002',
          quantity: 3,
          epc: 'TEST_EPC_002'
        }),
      });
      console.log('Response 3:', response3.ok ? 'Success' : 'Failed');

      console.log('✅ Multiple scan test completed - Check the live feed for location events!');
    } catch (error) {
      console.error('❌ Multiple scan test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // Quick test function for 30-second toggle (simulates old timestamps)
  const testQuickToggle = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 Testing quick toggle behavior...');
      
      // First scan - should be "in"
      console.log('🔄 Test 1: First scan (should be IN)');
      const response1 = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_003',
          item_number: 'ITEM_TEST_003',
          quantity: 1,
          epc: 'TEST_EPC_003'
        }),
      });
      console.log('Response 1:', response1.ok ? 'Success' : 'Failed');

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second scan - simulate old timestamp to trigger toggle
      console.log('🔄 Test 2: Second scan with old timestamp (should toggle to OUT)');
      const response2 = await fetch('/api/inbound/test-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_code: 'WAREHOUSE_A',
          po_number: 'PO_TEST_003',
          item_number: 'ITEM_TEST_003',
          quantity: 1,
          epc: 'TEST_EPC_003'
        }),
      });
      console.log('Response 2:', response2.ok ? 'Success' : 'Failed');

      console.log('✅ Quick toggle test completed - Check the live feed for status changes!');
    } catch (error) {
      console.error('❌ Quick toggle test error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <PageLayout activePage="inbound">
      <div className="space-y-4">
        <PageHeader
          title="Warehouse Gate - Live Dashboard"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Inbound", href: "/inbound/warehouse-gate" },
            { label: "Warehouse Gate", href: "/inbound/warehouse-gate" }
          ]}
        />

       

        {/* RFID Scan Design - Show when no events */}
        {events.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Radio className="h-12 w-12 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Ready to Scan RFID</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Place your RFID tag near the reader to start scanning items. 
                  Scanned items will appear here in real-time.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Scanner is active and ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Events Summary */}
        {events.length > 0 && (
          <Card className="border-2 border-blue-500 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activity Summary
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {events.length} Events
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Total Scans</p>
                  <p className="text-4xl font-bold text-green-600 mb-2">
                    {events.filter(e => e.type === 'scan' && !e.isDuplicate).length}
                  </p>
                  <p className="text-sm text-gray-600">Unique scans</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Duplicate Scans</p>
                  <p className="text-4xl font-bold text-orange-600 mb-2">
                    {events.filter(e => e.type === 'scan' && e.isDuplicate).length}
                  </p>
                  <p className="text-sm text-gray-600">Ignored scans</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Purchase Orders</p>
                  <p className="text-4xl font-bold text-blue-600 mb-2">
                    {new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.po_number)).size}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">Active POs</p>
                  <div className="text-sm text-gray-700 font-medium">
                    {Array.from(new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.po_number))).slice(0, 2).join(', ')}
                    {new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.po_number)).size > 2 && '...'}
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Locations</p>
                  <p className="text-4xl font-bold text-purple-600 mb-2">
                    {new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.location_name || e.location_code).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">Active locations</p>
                  <div className="text-sm text-gray-700 font-medium">
                    {Array.from(new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.location_name || e.location_code).filter(Boolean))).slice(0, 2).join(', ')}
                    {new Set(events.filter(e => e.type === 'scan' && !e.isDuplicate).map(e => e.location_name || e.location_code).filter(Boolean)).size > 2 && '...'}
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <p className="text-lg font-semibold text-gray-700 mb-4">Latest Unique Items:</p>
                <div className="space-y-3">
                  {events
                    .filter(e => e.type === 'scan' && !e.isDuplicate)
                    .reduce((unique, event) => {
                      const key = `${event.item_number}-${event.po_number}`;
                      if (!unique.find(e => `${e.item_number}-${e.po_number}` === key)) {
                        unique.push(event);
                      }
                      return unique;
                    }, [] as IUnifiedEvent[])
                    .slice(0, 3)
                    .map((event, index) => (
                    <div key={event.id || index} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getEventBgColor(event)}`}>
                          <div className={getEventColor(event)}>
                            {getEventIcon(event)}
                          </div>
                        </div>
                        <div>
                          <span className="text-lg font-semibold text-gray-900">{event.item_number}</span>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="text-gray-500">
                              ({event.item_description || event.po_number})
                            </span>
                            <span className="text-blue-600 font-medium ml-2">
                              [{event.po_number}]
                            </span>
                            <span className="text-purple-600 font-medium ml-2">
                              @{event.location_name || event.location_code || 'Unknown'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-700 mb-2">
                          {event.ordered_quantity && event.quantity ? (
                            <span>
                              <span className="text-green-600 font-bold text-lg">{event.quantity.toLocaleString()}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-blue-600 font-bold text-lg">{event.ordered_quantity.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="text-green-600 font-bold text-lg">{event.quantity?.toLocaleString() || 'N/A'}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{formatTime(event.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </PageLayout>
  );
}

