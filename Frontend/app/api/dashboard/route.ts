import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log('Frontend dashboard API called');
    // Fetch real data from backend API
    const backendUrl = 'http://localhost:5000';
    console.log('Fetching from:', `${backendUrl}/api/v1/dashboard/data`);
    
    const response = await fetch(`${backendUrl}/api/v1/dashboard/data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response status:', response.status);

    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Backend response data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('Returning dashboard data to frontend');
      return NextResponse.json(result.data);
    } else {
      throw new Error('Backend API returned unsuccessful response');
    }
  } catch (error) {
    console.error('Error fetching dashboard data from backend:', error);
    
    // Fallback to mock data if backend is unavailable
    const fallbackData = {
      metrics: [
        {
          name: "categories",
          value: 0,
          icon: "/dashboard/assets.svg",
          label: "Total Categories"
        },
        {
          name: "locations",
          value: 0,
          icon: "/dashboard/floors.svg",
          label: "Total Locations"
        },
        {
          name: "rfid",
          value: 0,
          icon: "/dashboard/readers.svg",
          label: "Available RFID"
        },
        {
          name: "vendors",
          value: 0,
          icon: "/dashboard/vendors.svg",
          label: "Total Vendors"
        },
        {
          name: "items",
          value: 0,
          icon: "/dashboard/assets.svg",
          label: "Total Items"
        },
        {
          name: "requisitions",
          value: 0,
          icon: "/dashboard/readers.svg",
          label: "Available Requisitions"
        }
      ],
      topAssetCategories: {
        labels: [],
        data: []
      },
      assetPerformance: {
        value: 0,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [0, 0, 0, 0, 0, 0]
        }
      },
      assetQuantity: {
        value: 0,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [0, 0, 0, 0, 0, 0]
        }
      },
      serviceScheduleStatus: {
        labels: [],
        data: []
      },
      checkInOutActivity: {
        growth: 0,
        period: "Annually",
        chart: {
          labels: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
      }
    };

    return NextResponse.json(fallbackData);
  }
} 