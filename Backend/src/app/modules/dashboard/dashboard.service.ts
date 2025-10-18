import httpStatus from 'http-status';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';
import { StockService } from '../stock/stock.service';

interface DashboardStats {
  totalLocations: number;
  totalAvailableRfid: number;
  totalVendors: number;
  totalItems: number;
  totalAvailableRequisitions: number;
  totalPurchaseOrders: number;
  pendingPurchaseOrders: number;
  totalStockItems: number;
  totalStockQuantity: number;
}

interface DashboardData {
  metrics: Array<{
    name: string;
    value: number;
    icon: string;
    label: string;
  }>;
  assetPerformance: {
    value: number;
    status: string;
    statusIcon: string;
    chart: {
      labels: string[];
      data: number[];
    };
  };
  assetQuantity: {
    value: number;
    status: string;
    statusIcon: string;
    chart: {
      labels: string[];
      data: number[];
    };
  };
  serviceScheduleStatus: {
    labels: string[];
    data: number[];
  };
  checkInOutActivity: {
    growth: number;
    period: string;
    chart: {
      labels: string[];
      data: number[];
    };
  };
}

const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Helper function to safely get count from table
    const getTableCount = async (query: string, params: any[] = []): Promise<number> => {
      try {
        const result = await pool.query(query, params);
        return parseInt(result.rows[0].count, 10);
      } catch (error) {
        return 0;
      }
    };

    // Get total locations
    const totalLocations = await getTableCount('SELECT COUNT(*) as count FROM locations');

    // Get total available RFID tags (if table exists)
    const totalAvailableRfid = await getTableCount('SELECT COUNT(*) as count FROM rfid_tags WHERE status = $1', ['available']);

    // Get total vendors (if table exists)
    const totalVendors = await getTableCount('SELECT COUNT(*) as count FROM vendors');

    // Get total items
    const totalItems = await getTableCount('SELECT COUNT(*) as count FROM items');

    // Get total available requisitions (if table exists)
    const totalAvailableRequisitions = await getTableCount('SELECT COUNT(*) as count FROM requisitions WHERE status = $1', ['open']);

    // Get total purchase orders
    const totalPurchaseOrders = await getTableCount('SELECT COUNT(*) as count FROM purchase_orders');

    // Get pending purchase orders
    const pendingPurchaseOrders = await getTableCount('SELECT COUNT(*) as count FROM purchase_orders WHERE status = $1', ['pending']);

    // Get live stock data
    let totalStockItems = 0;
    let totalStockQuantity = 0;
    try {
      const stockStats = await StockService.getStockStats();
      totalStockItems = stockStats.total_items || 0;
      totalStockQuantity = stockStats.total_quantity || 0;
    } catch (stockError) {
      // Failed to get stock stats
    }

    return {
      totalLocations,
      totalAvailableRfid,
      totalVendors,
      totalItems,
      totalAvailableRequisitions,
      totalPurchaseOrders,
      pendingPurchaseOrders,
      totalStockItems,
      totalStockQuantity,
    };
  } catch (error) {
    // Return default values instead of throwing error
    return {
      totalLocations: 0,
      totalAvailableRfid: 0,
      totalVendors: 0,
      totalItems: 0,
      totalAvailableRequisitions: 0,
      totalPurchaseOrders: 0,
      pendingPurchaseOrders: 0,
      totalStockItems: 0,
      totalStockQuantity: 0,
    };
  }
}


const getMonthlyActivity = async (): Promise<{ labels: string[]; data: number[] }> => {
  try {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'MON') as month,
        COUNT(*) as count
      FROM requisitions
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'MON'), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(MONTH FROM created_at);
    `;
    
    const result = await pool.query(query);
    
    const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const monthData: { [key: string]: number } = {};
    
    result.rows.forEach(row => {
      monthData[row.month] = parseInt(row.count, 10);
    });
    
    const labels = monthOrder;
    const data = monthOrder.map(month => monthData[month] || 0);
    
    return { labels, data };
  } catch (error) {
    const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return { labels: monthOrder, data: new Array(12).fill(0) };
  }
};

const getDashboardData = async (): Promise<DashboardData> => {
  try {
    const stats = await getDashboardStats();
    const monthlyActivity = await getMonthlyActivity();

    // Calculate growth percentage (mock calculation for now)
    const growth = 1.3;

    return {
      metrics: [
        {
          name: "locations",
          value: stats.totalLocations,
          icon: "/dashboard/floors.svg",
          label: "Total Locations"
        },
        {
          name: "rfid",
          value: stats.totalAvailableRfid,
          icon: "/dashboard/readers.svg",
          label: "Available RFID"
        },
        {
          name: "vendors",
          value: stats.totalVendors,
          icon: "/dashboard/vendors.svg",
          label: "Total Vendors"
        },
        {
          name: "items",
          value: stats.totalItems,
          icon: "/dashboard/assets.svg",
          label: "Total Items"
        },
        {
          name: "stock_items",
          value: stats.totalStockItems,
          icon: "/dashboard/assets.svg",
          label: "Live Stock Items"
        },
        {
          name: "stock_quantity",
          value: stats.totalStockQuantity,
          icon: "/dashboard/readers.svg",
          label: "Total Stock Quantity"
        },
        {
          name: "requisitions",
          value: stats.totalAvailableRequisitions,
          icon: "/dashboard/readers.svg",
          label: "Available Requisitions"
        },
        {
          name: "purchase_orders",
          value: stats.totalPurchaseOrders,
          icon: "/dashboard/vendors.svg",
          label: "Total Purchase Orders"
        },
        {
          name: "pending_purchase_orders",
          value: stats.pendingPurchaseOrders,
          icon: "/dashboard/readers.svg",
          label: "Pending Purchase Orders"
        }
      ],
      assetPerformance: {
        value: stats.totalStockItems,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [Math.floor(stats.totalStockItems * 0.3), Math.floor(stats.totalStockItems * 0.5), Math.floor(stats.totalStockItems * 0.4), Math.floor(stats.totalStockItems * 0.6), Math.floor(stats.totalStockItems * 0.8), Math.floor(stats.totalStockItems * 0.7)]
        }
      },
      assetQuantity: {
        value: stats.totalStockQuantity,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [Math.floor(stats.totalStockQuantity * 0.2), Math.floor(stats.totalStockQuantity * 0.3), Math.floor(stats.totalStockQuantity * 0.25), Math.floor(stats.totalStockQuantity * 0.4), Math.floor(stats.totalStockQuantity * 0.3), Math.floor(stats.totalStockQuantity * 0.5)]
        }
      },
      serviceScheduleStatus: {
        labels: [],
        data: []
      },
      checkInOutActivity: {
        growth: growth,
        period: "Annually",
        chart: monthlyActivity
      }
    };
  } catch (error) {
    throw new Error('Failed to fetch dashboard data');
  }
};

export const DashboardService = {
  getDashboardStats,
  getDashboardData,
  getMonthlyActivity,
};
