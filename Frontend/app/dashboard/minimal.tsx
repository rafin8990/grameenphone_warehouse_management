"use client"

import { useState, useEffect } from "react"

export default function MinimalDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard")
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (!data) return <div>No data</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Minimal Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {data.metrics?.map((metric: any) => (
          <div key={metric.name} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">{metric.label}</h3>
            <p className="text-2xl font-bold text-gray-900">{metric.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Check In/Out Activity</h2>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">Chart placeholder</p>
        </div>
      </div>
    </div>
  )
}
