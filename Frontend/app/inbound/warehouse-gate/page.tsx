"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { Radio, Package, Hash, Clock, MapPin, ArrowRight, ArrowLeft, TestTube } from 'lucide-react';
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
  location_status?: 'in' | 'out'; // For scan events
  epc?: string;
  timestamp: string;
  isDuplicate?: boolean;
}

export default function WarehouseGatePage() {
  const [events, setEvents] = useState<IUnifiedEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<IUnifiedEvent | null>(null);
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
        quantity: data.quantity,
        scanned_quantity: data.scanned_quantity,
        ordered_quantity: data.ordered_quantity,
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
      setLastEvent(unifiedEvent);
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
        quantity: data.quantity,
        location_code: data.location_code,
        location_name: data.location_name,
        status: data.status,
        epc: data.epc,
        timestamp: data.timestamp || data.created_at
      };
      console.log('📍 Processed location event:', unifiedEvent);
      setLastEvent(unifiedEvent);
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
      setLastEvent(unifiedEvent);
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
      
      // Also update the last event if it matches
      setLastEvent(prev => {
        if (prev && prev.po_number === data.po_number && 
            prev.item_number === data.item_number && 
            prev.type === 'scan') {
          console.log('📍 Updating last event status from', prev.location_status, 'to', data.location_status);
          return {
            ...prev,
            location_status: data.location_status,
            location_code: data.location_code,
            location_name: data.location_name
          };
        }
        return prev;
      });
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

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">RFID Scanner Status</CardTitle>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                onClick={testRealRfidScan} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? 'Testing...' : 'Real Scan Test'}
              </Button>
              
              <Button 
                onClick={testRfidScanWithLocation} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? 'Testing...' : 'RFID Scan Test'}
              </Button>
              
              <Button 
                onClick={testLocationTracking} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? 'Testing...' : 'Location Test'}
              </Button>
              
              <Button 
                onClick={testQuickToggle} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? 'Testing...' : 'Quick Toggle'}
              </Button>
              
              <Button 
                onClick={testMultipleScans} 
                disabled={isTesting}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTesting ? 'Testing...' : 'Full Toggle Test'}
              </Button>
              
              <p className="text-xs text-gray-500">
                Real Scan: No deviceId | RFID Scan: With deviceId | Location: Basic test | Quick Toggle: Fast test | Full Toggle: 35s test
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Latest Event Display */}
        {lastEvent && (
          <Card className={`border-2 ${lastEvent.isDuplicate ? 'border-orange-500 bg-orange-50' : lastEvent.type === 'location' ? (lastEvent.status === 'in' ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50') : 'border-purple-500 bg-purple-50'}`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <div className={`p-1 rounded-full ${getEventBgColor(lastEvent)}`}>
                  <div className={getEventColor(lastEvent)}>
                    {getEventIcon(lastEvent)}
                  </div>
                </div>
                {getEventTitle(lastEvent)}
                {lastEvent.isDuplicate && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                    Duplicate - Already Counted
                  </Badge>
                )}
                {lastEvent.type === 'location' && (
                  <Badge variant="outline" className={getLocationStatusColor(lastEvent)}>
                    {getLocationStatusText(lastEvent)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">PO Number</p>
                  <p className="text-xl font-bold font-mono">{lastEvent.po_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Item Number</p>
                  <p className="text-lg font-semibold font-mono">{lastEvent.item_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">
                    {lastEvent.type === 'scan' ? 'Received / Ordered' : 'Quantity'}
                  </p>
                  {lastEvent.type === 'scan' ? (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-green-600">{lastEvent.quantity.toLocaleString()}</p>
                      <span className="text-gray-400">/</span>
                      <p className="text-xl font-semibold text-blue-600">{lastEvent.ordered_quantity?.toLocaleString()}</p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">{lastEvent.quantity.toLocaleString()}</p>
                  )}
                  {lastEvent.scanned_quantity && (
                    <p className="text-xs text-gray-500">+{lastEvent.scanned_quantity} this scan</p>
                  )}
                  {lastEvent.type === 'scan' && lastEvent.ordered_quantity && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${Math.min((lastEvent.quantity / lastEvent.ordered_quantity) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((lastEvent.quantity / lastEvent.ordered_quantity) * 100)}% complete
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Time</p>
                  <p className="text-lg font-semibold">{formatTime(lastEvent.timestamp)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                {lastEvent.item_description && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">Item Description</p>
                    <p className="text-sm font-medium">{lastEvent.item_description}</p>
                  </div>
                )}
                <div className="mb-2">
                  <p className="text-xs text-gray-600 mb-1">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="text-blue-700 font-semibold">
                      {lastEvent.location_name || lastEvent.location_code || 'Unknown Location'}
                    </span>
                    {lastEvent.location_code && lastEvent.location_name && lastEvent.location_code !== lastEvent.location_name && (
                      <span className="text-gray-500 text-xs">({lastEvent.location_code})</span>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getLocationStatusBadgeColor(lastEvent)}`}
                    >
                      {getLocationStatusText(lastEvent)}
                    </Badge>
                  </div>
                </div>
                {lastEvent.lot_no && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">Lot Number</p>
                    <p className="text-sm font-medium font-mono">{lastEvent.lot_no}</p>
                  </div>
                )}
                {lastEvent.epc && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">EPC</p>
                    <p className="text-sm font-medium font-mono">{lastEvent.epc}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unified Event History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Live Event Feed ({events.length})
            </CardTitle>
            <CardDescription>
              Real-time feed of all warehouse events (scans, location tracking, stock updates)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Waiting for events...</p>
                <p className="text-sm">All warehouse events will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {events.map((event, index) => (
                  <div 
                    key={event.id || index} 
                    className={`p-4 rounded-lg border transition-all ${
                      index === 0 ? 'bg-green-50 border-green-300 animate-pulse' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getEventBgColor(event)}`}>
                          <div className={getEventColor(event)}>
                            {getEventIcon(event)}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {event.item_number}
                            {event.location_code && (
                              <span className="text-sm text-gray-500 ml-2">
                                ({event.location_code})
                              </span>
                            )}
                            {event.isDuplicate && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-700 border-orange-300">
                                Duplicate
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {event.po_number} • Qty: {event.quantity}
                            <span className="ml-2 text-blue-600 font-medium flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.location_name || event.location_code || 'Unknown Location'}
                              <Badge 
                                variant="outline" 
                                className={`text-xs ml-1 ${getLocationStatusBadgeColor(event)}`}
                              >
                                {getLocationStatusText(event)}
                              </Badge>
                            </span>
                            {event.lot_no && (
                              <span className="ml-2 text-gray-500">• Lot: {event.lot_no}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={event.type === 'scan' ? (event.isDuplicate ? 'secondary' : 'default') : 
                                  event.type === 'location' ? (event.status === 'in' ? 'default' : 'secondary') : 
                                  'outline'}
                          className={event.type === 'scan' && !event.isDuplicate ? 'bg-green-100 text-green-700' :
                                    event.type === 'location' && event.status === 'in' ? 'bg-green-100 text-green-700' :
                                    event.type === 'location' && event.status === 'out' ? 'bg-blue-100 text-blue-700' :
                                    event.type === 'stock' ? 'bg-purple-100 text-purple-700' : ''}
                        >
                          {event.type === 'scan' ? (event.isDuplicate ? 'DUPLICATE' : 'SCAN') :
                           event.type === 'location' ? getLocationStatusText(event) :
                           event.type === 'stock' ? 'STOCK UPDATE' : 'EVENT'}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

