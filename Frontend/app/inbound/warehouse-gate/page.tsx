"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { Radio, Package, Hash, Clock } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface IScanEvent {
  po_number: string;
  item_number: string;
  item_description: string;
  quantity: number;
  lot_no: string;
  timestamp: string;
  epc: string;
}

export default function WarehouseGatePage() {
  const [scans, setScans] = useState<IScanEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastScan, setLastScan] = useState<IScanEvent | null>(null);

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

    // Listen for new scans
    socket.on('inbound:new-scan', (data: IScanEvent) => {
      console.log('📡 New scan received:', data);
      setLastScan(data);
      setScans(prev => [data, ...prev].slice(0, 50)); // Keep last 50 scans
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('inbound:new-scan');
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
        </Card>

        {/* Latest Scan Display */}
        {lastScan && (
          <Card className="border-2 border-green-500 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                Latest Scan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1">PO Number</p>
                  <p className="text-xl font-bold font-mono">{lastScan.po_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Item Number</p>
                  <p className="text-lg font-semibold font-mono">{lastScan.item_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Quantity</p>
                  <p className="text-2xl font-bold text-green-600">{lastScan.quantity.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Time</p>
                  <p className="text-lg font-semibold">{formatTime(lastScan.timestamp)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-600 mb-1">Item Description</p>
                <p className="text-sm font-medium">{lastScan.item_description}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scan History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scan History ({scans.length})
            </CardTitle>
            <CardDescription>
              Real-time feed of incoming RFID scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Radio className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">Waiting for scans...</p>
                <p className="text-sm">Scans will appear here in real-time</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {scans.map((scan, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border transition-all ${
                      index === 0 ? 'bg-green-50 border-green-300 animate-pulse' : 'bg-white'
                    }`}
                  >
                    <div className="grid grid-cols-6 gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-500">PO Number</p>
                        <p className="font-mono font-semibold">{scan.po_number}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Item Number</p>
                        <p className="font-mono text-sm">{scan.item_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-lg font-bold text-green-600">{scan.quantity.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Lot No</p>
                        <p className="text-sm font-medium">{scan.lot_no}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Time</p>
                        <p className="text-sm font-medium">{formatTime(scan.timestamp)}</p>
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

