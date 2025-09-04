"use client"

import { AreaChart } from "@/components/charts/AreaChart"
import { AssetPerformanceCard } from "@/components/charts/AssetPerformanceCard"
import { AssetQuantityCard } from "@/components/charts/AssetQuantityCard"
import { ServiceScheduleStatusCard } from "@/components/charts/ServiceScheduleStatusCard"
import { TopAssetCategories } from "@/components/charts/TopAssetCategories"

export default function TestPage() {
  const testData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    data: [10, 20, 15, 25]
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Component Test Page</h1>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">AreaChart Test</h2>
        <div className="h-64 border">
          <AreaChart labels={testData.labels} data={testData.data} activeTab="Monthly" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">AssetPerformanceCard Test</h2>
        <AssetPerformanceCard 
          value={100} 
          status="Good" 
          statusIcon="/dashboard/good.svg" 
          chart={testData} 
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">AssetQuantityCard Test</h2>
        <AssetQuantityCard 
          value={50} 
          status="Good" 
          statusIcon="/dashboard/good.svg" 
          chart={testData} 
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">ServiceScheduleStatusCard Test</h2>
        <ServiceScheduleStatusCard 
          labels={["Item 1", "Item 2", "Item 3"]} 
          data={[10, 20, 30]} 
        />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">TopAssetCategories Test</h2>
        <div className="h-64 border">
          <TopAssetCategories 
            labels={["Category 1", "Category 2", "Category 3"]} 
            data={[30, 40, 30]} 
          />
        </div>
      </div>
    </div>
  )
}
