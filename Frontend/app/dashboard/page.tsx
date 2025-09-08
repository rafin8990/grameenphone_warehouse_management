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
import { fetchAssets } from "@/lib/api/asset"
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
        const response = await fetch("/api/dashboard")
        const data = await response.json()
        setDashboardData(data)
        console.log("Dashboard data:", data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
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
      const response = await fetchAssets(
        currentPage,
        itemsPerPage,
        searchQuery,
        sortBy,
        sortOrder
      )
      setAssets(response.items)
      setTotalAssets(response.total)
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
      {/* Banner */}
      <div className="bg-[#4DC591] mb-6 flex justify-between rounded-xl">
        <Image src="/dashboard/right.svg" alt="left" width={200} height={100} />
        <Image src="/dashboard/litelogo.svg" alt="center" width={400} height={200} />
        <Image src="/dashboard/left.svg" alt="right" width={200} height={100} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 -mt-12 mx-4 md:mx-6 mb-6">
        {metrics.map((metric: DashboardMetric) => (
          <Card key={metric.name} className="bg-white rounded-xl w-full shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 justify-between">
                <div className="w-16 h-16 md:w-20 md:h-20 relative">
                  <Image 
                    src={metric.icon} 
                    alt={metric.label} 
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-center flex-1">
                  <h3 className="text-sm md:text-base font-medium text-emerald-500 truncate">{metric.label}</h3>
                  <h2 className="pt-1 md:pt-2 text-xl md:text-2xl lg:text-3xl font-bold text-emerald-500">{metric.value.toLocaleString()}</h2>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white">
          <CardContent className="px-6 py-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Check In/Out Activity</h3>
                <div className="flex items-center">
                  <span className="text-emerald-500 font-medium text-sm">+{checkInOutActivity.growth}%</span>
                  <span className="text-gray-500 text-xs ml-1">VS THIS YEAR</span>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex gap-2">
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

        <Card className="bg-white">
          <CardContent className="px-6 py-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Top Asset Categories</h3>
                <div className="text-gray-500 text-xs">LAST YEAR</div>
              </div>
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
      <div className="mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Assets Table</h3>
          <DashboardAssetTable
            assets={assets}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      </div>
    </PageLayout>
  )
}
