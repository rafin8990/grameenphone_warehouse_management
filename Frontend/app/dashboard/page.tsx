"use client"

import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { AreaChart } from "@/components/charts/AreaChart"
import Image from "next/image"
import { useState, useEffect } from "react"
import { AssetPerformanceCard } from "@/components/charts/AssetPerformanceCard"
import { AssetQuantityCard } from "@/components/charts/AssetQuantityCard"
import { ServiceScheduleStatusCard } from "@/components/charts/ServiceScheduleStatusCard"
import { DashboardAssetTable } from "@/components/dashboard/assetTable"
import { PurchaseOrdersTable } from "@/components/dashboard/purchaseOrdersTable"
import { LiveStockDashboard } from "@/components/dashboard/live-stock-dashboard"
import { LivePOStatusDashboard } from "@/components/dashboard/live-po-status-dashboard"
import { Asset } from "@/types/asset"
// API import removed
import { toast } from "sonner"
import { Loading } from "@/components/ui/loading"
import { getSocket } from "@/lib/socket"

interface DashboardMetric {
  name: string
  value: number
  icon: string
  label: string
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("Annually")
  const [assets, setAssets] = useState<Asset[]>([])
  const [totalAssets, setTotalAssets] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC")
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const fetchLive = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/inbound/live`)
        const result = await response.json()

        if (result.success) {
          // Map unified payload into existing dashboardData shape
          const stats = result.data.dashboard;
          setDashboardData({
            metrics: [
              { name: "locations", value: stats.totalLocations, icon: "/dashboard/floors.svg", label: "Total Locations" },
              { name: "rfid", value: stats.totalAvailableRfid, icon: "/dashboard/readers.svg", label: "Available RFID" },
              { name: "vendors", value: stats.totalVendors, icon: "/dashboard/vendors.svg", label: "Total Vendors" },
              { name: "items", value: stats.totalItems, icon: "/dashboard/assets.svg", label: "Total Items" },
              { name: "stock_items", value: stats.totalStockItems, icon: "/dashboard/assets.svg", label: "Live Stock Items" },
              { name: "stock_quantity", value: stats.totalStockQuantity, icon: "/dashboard/readers.svg", label: "Total Stock Quantity" },
              { name: "purchase_orders", value: stats.totalPurchaseOrders, icon: "/dashboard/vendors.svg", label: "Total Purchase Orders" },
              { name: "pending_purchase_orders", value: stats.pendingPurchaseOrders, icon: "/dashboard/readers.svg", label: "Pending Purchase Orders" }
            ],
            assetPerformance: { value: stats.totalStockItems, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [1,1,1,1,1,1].map(() => Math.floor((stats.totalStockItems || 0) * 0.5)) } },
            assetQuantity: { value: stats.totalStockQuantity, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [1,1,1,1,1,1].map(() => Math.floor((stats.totalStockQuantity || 0) * 0.5)) } },
            serviceScheduleStatus: { labels: [], data: [] },
            checkInOutActivity: { growth: 0, period: "Annually", chart: { labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], data: new Array(12).fill(0) } }
          })
        } else {
          throw new Error('Backend API returned unsuccessful response')
        }
      } catch (error) {
        console.error("Error fetching unified live data:", error)
        // Set some default data when API fails
        setDashboardData({
          metrics: [
            { name: "locations", value: 0, icon: "/dashboard/floors.svg", label: "Total Locations" },
            { name: "rfid", value: 0, icon: "/dashboard/readers.svg", label: "Available RFID" },
            { name: "vendors", value: 0, icon: "/dashboard/vendors.svg", label: "Total Vendors" },
            { name: "items", value: 0, icon: "/dashboard/assets.svg", label: "Total Items" },
            { name: "stock_items", value: 0, icon: "/dashboard/assets.svg", label: "Live Stock Items" },
            { name: "stock_quantity", value: 0, icon: "/dashboard/readers.svg", label: "Total Stock Quantity" },
            { name: "purchase_orders", value: 0, icon: "/dashboard/vendors.svg", label: "Total Purchase Orders" },
            { name: "pending_purchase_orders", value: 0, icon: "/dashboard/readers.svg", label: "Pending Purchase Orders" }
          ],
          assetPerformance: { value: 0, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [0,0,0,0,0,0] } },
          assetQuantity: { value: 0, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [0,0,0,0,0,0] } },
          serviceScheduleStatus: { labels: [], data: [] },
          checkInOutActivity: { growth: 0, period: "Annually", chart: { labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], data: new Array(12).fill(0) } }
        })
      } finally {
        setLoading(false)
      }
    }
    fetchLive()
  }, [])

  useEffect(() => {
    loadAssets()
  }, [currentPage, itemsPerPage, searchQuery, sortBy, sortOrder])

  // Socket connection for live updates
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to dashboard');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from dashboard');
    });

    const refreshFromLive = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE}/api/v1/inbound/live`)
        const result = await response.json()
        if (result.success) {
          const stats = result.data.dashboard;
          setDashboardData((prev: any) => ({
            ...(prev || {}),
            metrics: [
              { name: "locations", value: stats.totalLocations, icon: "/dashboard/floors.svg", label: "Total Locations" },
              { name: "rfid", value: stats.totalAvailableRfid, icon: "/dashboard/readers.svg", label: "Available RFID" },
              { name: "vendors", value: stats.totalVendors, icon: "/dashboard/vendors.svg", label: "Total Vendors" },
              { name: "items", value: stats.totalItems, icon: "/dashboard/assets.svg", label: "Total Items" },
              { name: "stock_items", value: stats.totalStockItems, icon: "/dashboard/assets.svg", label: "Live Stock Items" },
              { name: "stock_quantity", value: stats.totalStockQuantity, icon: "/dashboard/readers.svg", label: "Total Stock Quantity" },
              { name: "purchase_orders", value: stats.totalPurchaseOrders, icon: "/dashboard/vendors.svg", label: "Total Purchase Orders" },
              { name: "pending_purchase_orders", value: stats.pendingPurchaseOrders, icon: "/dashboard/readers.svg", label: "Pending Purchase Orders" }
            ],
            assetPerformance: { value: stats.totalStockItems, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [1,1,1,1,1,1].map(() => Math.floor((stats.totalStockItems || 0) * 0.5)) } },
            assetQuantity: { value: stats.totalStockQuantity, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [1,1,1,1,1,1].map(() => Math.floor((stats.totalStockQuantity || 0) * 0.5)) } },
            serviceScheduleStatus: { labels: [], data: [] },
            checkInOutActivity: { growth: 0, period: "Annually", chart: { labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], data: new Array(12).fill(0) } }
          }))
        }
      } catch (e) {
        console.error('Failed to refresh live dashboard', e)
      }
    };

    // Listen for key live events
    socket.on('inbound:new-scan', refreshFromLive);
    socket.on('stock:updated', refreshFromLive);
    socket.on('po:status-updated', refreshFromLive);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('inbound:new-scan');
      socket.off('stock:updated');
      socket.off('po:status-updated');
    };
  }, [])

  async function loadAssets() {
    setIsLoading(true)
    try {
      setAssets([])
      setTotalAssets(0)
    } catch (err) {
      setError("An error occurred while fetching assets.")
      toast("Failed to fetch assets. Please try again.")
    }
    setIsLoading(false)
  } 

  if (loading) return <Loading variant="fullscreen" />
  if (!dashboardData) {
    return (
      <PageLayout activePage="dashboard">
        <div className="container mx-auto px-4 py-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">Welcome to the Dashboard!</h2>
            <p className="text-yellow-700 mb-4">
              You have successfully logged in. The dashboard is loading data from the backend.
            </p>
            <div className="text-sm text-yellow-600">
              <p>User: {typeof window !== 'undefined' ? localStorage.getItem('user') : 'Loading...'}</p>
              <p>Role: {typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}').role : 'Loading...'}</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const { metrics, assetPerformance, assetQuantity, serviceScheduleStatus, checkInOutActivity } = dashboardData

  // Example: you can add logic to switch data based on activeTab if you have different datasets
  const areaChartLabels = checkInOutActivity.chart.labels
  const areaChartData = checkInOutActivity.chart.data

  return (
    <PageLayout activePage="dashboard">
      <div className="container mx-auto px-4 py-6">
        {/* Banner */}
        <div className="bg-[#4DC591] mb-6 flex justify-between items-center rounded-xl overflow-hidden">
          <Image src="/dashboard/right.svg" alt="left" width={150} height={80} className="object-contain" />
          <Image src="/dashboard/litelogo.svg" alt="center" width={300} height={120} className="object-contain" />
          <Image src="/dashboard/left.svg" alt="right" width={150} height={80} className="object-contain" />
        </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AssetPerformanceCard
            value={assetPerformance.value}
            status={assetPerformance.status}
            statusIcon={assetPerformance.statusIcon}
            chart={assetPerformance.chart}
          />
          <AssetQuantityCard
            value={assetQuantity.value}
            status={assetQuantity.status}
            statusIcon={assetQuantity.statusIcon}
            chart={assetQuantity.chart}
          />
        </div>

        {/* Live Stock Dashboard */}
        <div className="mb-8">
          <LiveStockDashboard isConnected={isConnected} />
        </div>

        {/* Live PO Status Dashboard */}
        <div className="mb-8">
          <LivePOStatusDashboard isConnected={isConnected} />
        </div>

        {/* Purchase Orders Section */}
        <div className="mb-8">
          <PurchaseOrdersTable limit={5} showViewAll={true} />
        </div>

        {/* Assets Table */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Assets Table</h3>
            <DashboardAssetTable
              assets={assets}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
