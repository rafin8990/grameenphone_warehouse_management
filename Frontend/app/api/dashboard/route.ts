import { NextResponse } from "next/server"

export async function GET() {
  // Mock data for dashboard
  const dashboardData = {
    metrics: [
      {
        name: "assets",
        value: 3200,
        icon: "/dashboard/assets.svg",
        label: "Total Assets"
      },
      {
        name: "floors",
        value: 10,
        icon: "/dashboard/floors.svg",
        label: "Total Floors"
      },
      {
        name: "readers",
        value: 600,
        icon: "/dashboard/readers.svg",
        label: "Total Readers"
      },
      {
        name: "vendors",
        value: 800,
        icon: "/dashboard/vendors.svg",
        label: "Total Vendors"
      }
    ],
    topAssetCategories: {
      labels: ["Electronics", "Furniture", "Office Supplies", "Other"],
      data: [39, 26, 25, 10]
    },
    assetPerformance: {
      value: 3200,
      status: "Good",
      statusIcon: "/dashboard/good.svg",
      chart: {
        labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
        data: [1200, 1800, 1400, 2000, 3200, 1500]
      }
    },
    assetQuantity: {
      value: 100,
      status: "Good",
      statusIcon: "/dashboard/good.svg",
      chart: {
        labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
        data: [20, 35, 25, 45, 30, 55]
      }
    },
    serviceScheduleStatus: {
      labels: ["Macbook Air", "Macbook Pro", "Asus Printer", "Dell Printer", "HP Printer"],
      data: [2.9635, 5.192, 2.622, 1.622, 1.622]
    },
    checkInOutActivity: {
      growth: 1.3,
      period: "Annually",
      chart: {
        labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
        data: [1200, 1800, 1400, 2000, 3200, 1500, 3500, 4000, 3000, 2500, 3200, 4100]
      }
    }
  }

  return NextResponse.json(dashboardData)
} 