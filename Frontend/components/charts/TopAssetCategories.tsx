"use client"

import { Card, CardContent } from "@/components/ui/card"

interface TopAssetCategoriesProps {
  labels: string[]
  data: number[]
}

export function TopAssetCategories({ labels, data }: TopAssetCategoriesProps) {
  const total = data.reduce((sum, value) => sum + value, 0)
  
  return (
    <div className="w-full h-full">
      <div className="space-y-3">
        {labels.map((label, index) => {
          const percentage = total > 0 ? (data[index] / total) * 100 : 0
          return (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate flex-1 mr-2">{label}</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">
                  {data[index]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">Total: {total}</p>
      </div>
    </div>
  )
}
