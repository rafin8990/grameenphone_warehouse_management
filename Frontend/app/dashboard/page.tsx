"use client"

import { PageLayout } from "@/components/layout/page-layout"
import { Card, CardContent } from "@/components/ui/card"
import { AreaChart } from "@/components/charts/AreaChart"
import Image from "next/image"
import { useState, useEffect } from "react"
import { AssetPerformanceCard } from "@/components/charts/AssetPerformanceCard"
import { AssetQuantityCard } from "@/components/charts/AssetQuantityCard"
import { ServiceScheduleStatusCard } from "@/components/charts/ServiceScheduleStatusCard"
import { TopAssetCategories } from "@/components/charts/TopAssetCategories"
import { DashboardAssetTable } from "@/components/dashboard/assetTable"
import { PurchaseOrdersTable } from "@/components/dashboard/purchaseOrdersTable"
import { Asset } from "@/types/asset"
// API import removed
import { toast } from "sonner"
import { Loading } from "@/components/ui/loading"

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
            { name: "categories", value: 0, icon: "/dashboard/assets.svg", label: "Total Categories" },
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

  const { metrics, assetPerformance, assetQuantity, serviceScheduleStatus, checkInOutActivity, topAssetCategories } = dashboardData

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

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 -mt-8 mb-8">
        {metrics.map((metric: DashboardMetric) => (
          <Card key={metric.name} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 relative">
                  <Image 
                    src={metric.icon} 
                    alt={metric.label} 
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="w-full">
                  <h3 className="text-xs font-medium text-gray-600 truncate">{metric.label}</h3>
                  <h2 className="text-lg font-bold text-emerald-600">{metric.value.toLocaleString()}</h2>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Check In/Out Activity</h3>
                  <div className="flex items-center">
                    <span className="text-emerald-500 font-medium text-sm">+{checkInOutActivity.growth}%</span>
                    <span className="text-gray-500 text-xs ml-1">VS THIS YEAR</span>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex gap-2 mt-2 sm:mt-0">
                  {['Daily', 'Weekly', 'Annually'].map(tab => (
                    <button
                      key={tab}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-64">
                <AreaChart labels={areaChartLabels} data={areaChartData} activeTab={activeTab} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Top Asset Categories</h3>
                <div className="text-gray-500 text-xs">LAST YEAR</div>
              </div>
              <div className="h-64 flex justify-center items-center">
                <TopAssetCategories labels={topAssetCategories.labels} data={topAssetCategories.data} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sub Cards: Asset Performance, Asset Quantity, Service Schedule Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <AssetPerformanceCard value={assetPerformance.value} status={assetPerformance.status} statusIcon={assetPerformance.statusIcon} chart={assetPerformance.chart} />
          <AssetQuantityCard value={assetQuantity.value} status={assetQuantity.status} statusIcon={assetQuantity.statusIcon} chart={assetQuantity.chart} />
          <ServiceScheduleStatusCard labels={serviceScheduleStatus.labels} data={serviceScheduleStatus.data} />
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
