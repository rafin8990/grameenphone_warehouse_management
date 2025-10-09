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
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/v1/dashboard/data")
        const result = await response.json()
        
        if (result.success) {
          setDashboardData(result.data)
        } else {
          throw new Error('Backend API returned unsuccessful response')
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setDashboardData({
          metrics: [
            { name: "locations", value: 0, icon: "/dashboard/floors.svg", label: "Total Locations" },
            { name: "rfid", value: 0, icon: "/dashboard/readers.svg", label: "Available RFID" },
            { name: "vendors", value: 0, icon: "/dashboard/vendors.svg", label: "Total Vendors" },
            { name: "items", value: 0, icon: "/dashboard/assets.svg", label: "Total Items" },
            { name: "requisitions", value: 0, icon: "/dashboard/readers.svg", label: "Available Requisitions" },
            { name: "purchase_orders", value: 0, icon: "/dashboard/vendors.svg", label: "Total Purchase Orders" },
            { name: "pending_purchase_orders", value: 0, icon: "/dashboard/readers.svg", label: "Pending Purchase Orders" }
          ],
          topAssetCategories: { labels: [], data: [] },
          assetPerformance: { value: 0, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [0, 0, 0, 0, 0, 0] } },
          assetQuantity: { value: 0, status: "Good", statusIcon: "/dashboard/good.svg", chart: { labels: ["Apr", "May", "June", "July", "Aug", "Sept"], data: [0, 0, 0, 0, 0, 0] } },
          serviceScheduleStatus: { labels: [], data: [] },
          checkInOutActivity: { growth: 0, period: "Annually", chart: { labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] } }
        })
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
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

    // Listen for PO status updates
    socket.on('po:status-updated', (data) => {
      console.log('📋 PO status update received:', data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
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
  if (!dashboardData) return <div>No data</div>

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
