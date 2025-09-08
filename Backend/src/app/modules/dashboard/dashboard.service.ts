import httpStatus from 'http-status';
import pool from '../../../utils/dbClient';
import { IGenericResponse } from '../../../interfaces/common';

interface DashboardStats {
  totalCategories: number;
  totalLocations: number;
  totalAvailableRfid: number;
  totalVendors: number;
  totalItems: number;
  totalAvailableRequisitions: number;
  totalPurchaseOrders: number;
  pendingPurchaseOrders: number;
}

interface DashboardData {
  metrics: Array<{
    name: string;
    value: number;
    icon: string;
    label: string;
  }>;
  topAssetCategories: {
    labels: string[];
    data: number[];
  };
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
    // Get total categories (check both with and without status filter)
    let categoriesQuery = 'SELECT COUNT(*) as count FROM categories';
    let categoriesResult = await pool.query(categoriesQuery);
    let totalCategories = parseInt(categoriesResult.rows[0].count, 10);
    
    // If no categories found, try with status filter
    if (totalCategories === 0) {
      categoriesQuery = 'SELECT COUNT(*) as count FROM categories WHERE status = $1';
      categoriesResult = await pool.query(categoriesQuery, ['active']);
      totalCategories = parseInt(categoriesResult.rows[0].count, 10);
    }

    // Get total locations
    const locationsQuery = 'SELECT COUNT(*) as count FROM locations';
    const locationsResult = await pool.query(locationsQuery);
    const totalLocations = parseInt(locationsResult.rows[0].count, 10);

    // Get total available RFID tags
    const rfidQuery = 'SELECT COUNT(*) as count FROM rfid_tags WHERE status = $1';
    const rfidResult = await pool.query(rfidQuery, ['available']);
    const totalAvailableRfid = parseInt(rfidResult.rows[0].count, 10);

    // Get total vendors (check both with and without status filter)
    let vendorsQuery = 'SELECT COUNT(*) as count FROM vendors';
    let vendorsResult = await pool.query(vendorsQuery);
    let totalVendors = parseInt(vendorsResult.rows[0].count, 10);
    
    // If no vendors found, try with status filter
    if (totalVendors === 0) {
      vendorsQuery = 'SELECT COUNT(*) as count FROM vendors WHERE status = $1';
      vendorsResult = await pool.query(vendorsQuery, ['active']);
      totalVendors = parseInt(vendorsResult.rows[0].count, 10);
    }

    // Get total items
    const itemsQuery = 'SELECT COUNT(*) as count FROM items';
    const itemsResult = await pool.query(itemsQuery);
    const totalItems = parseInt(itemsResult.rows[0].count, 10);

    // Get total available requisitions (status = 'open')
    const requisitionsQuery = 'SELECT COUNT(*) as count FROM requisitions WHERE status = $1';
    const requisitionsResult = await pool.query(requisitionsQuery, ['open']);
    const totalAvailableRequisitions = parseInt(requisitionsResult.rows[0].count, 10);

    // Get total purchase orders
    const purchaseOrdersQuery = 'SELECT COUNT(*) as count FROM purchase_orders';
    const purchaseOrdersResult = await pool.query(purchaseOrdersQuery);
    const totalPurchaseOrders = parseInt(purchaseOrdersResult.rows[0].count, 10);

    // Get pending purchase orders
    const pendingPurchaseOrdersQuery = 'SELECT COUNT(*) as count FROM purchase_orders WHERE status = $1';
    const pendingPurchaseOrdersResult = await pool.query(pendingPurchaseOrdersQuery, ['pending']);
    const pendingPurchaseOrders = parseInt(pendingPurchaseOrdersResult.rows[0].count, 10);

    console.log('Dashboard Stats:', {
      totalCategories,
      totalLocations,
      totalAvailableRfid,
      totalVendors,
      totalItems,
      totalAvailableRequisitions,
      totalPurchaseOrders,
      pendingPurchaseOrders,
    });

    return {
      totalCategories,
      totalLocations,
      totalAvailableRfid,
      totalVendors,
      totalItems,
      totalAvailableRequisitions,
      totalPurchaseOrders,
      pendingPurchaseOrders,
    };
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    throw new Error('Failed to fetch dashboard statistics');
  }
};

const getTopCategories = async (): Promise<{ labels: string[]; data: number[] }> => {
  try {
    // First try with status filter
    let query = `
      SELECT 
        c.name,
        COUNT(i.id) as item_count
      FROM categories c
      LEFT JOIN items i ON c.id = i.category_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.name
      ORDER BY item_count DESC
      LIMIT 5;
    `;
    
    let result = await pool.query(query);
    
    // If no results, try without status filter
    if (result.rows.length === 0) {
      query = `
        SELECT 
          c.name,
          COUNT(i.id) as item_count
        FROM categories c
        LEFT JOIN items i ON c.id = i.category_id
        GROUP BY c.id, c.name
        ORDER BY item_count DESC
        LIMIT 5;
      `;
      result = await pool.query(query);
    }
    
    const labels = result.rows.map(row => row.name);
    const data = result.rows.map(row => parseInt(row.item_count, 10));
    
    return { labels, data };
  } catch (error) {
    console.error('Error fetching top categories:', error);
    return { labels: [], data: [] };
  }
};

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
    const topCategories = await getTopCategories();
    const monthlyActivity = await getMonthlyActivity();

    // Calculate growth percentage (mock calculation for now)
    const growth = 1.3;

    return {
      metrics: [
        {
          name: "categories",
          value: stats.totalCategories,
          icon: "/dashboard/assets.svg",
          label: "Total Categories"
        },
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
      topAssetCategories: topCategories,
      assetPerformance: {
        value: stats.totalItems,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [Math.floor(stats.totalItems * 0.3), Math.floor(stats.totalItems * 0.5), Math.floor(stats.totalItems * 0.4), Math.floor(stats.totalItems * 0.6), Math.floor(stats.totalItems * 0.8), Math.floor(stats.totalItems * 0.7)]
        }
      },
      assetQuantity: {
        value: stats.totalAvailableRfid,
        status: "Good",
        statusIcon: "/dashboard/good.svg",
        chart: {
          labels: ["Apr", "May", "June", "July", "Aug", "Sept"],
          data: [Math.floor(stats.totalAvailableRfid * 0.2), Math.floor(stats.totalAvailableRfid * 0.3), Math.floor(stats.totalAvailableRfid * 0.25), Math.floor(stats.totalAvailableRfid * 0.4), Math.floor(stats.totalAvailableRfid * 0.3), Math.floor(stats.totalAvailableRfid * 0.5)]
        }
      },
      serviceScheduleStatus: {
        labels: topCategories.labels.slice(0, 5),
        data: topCategories.data.slice(0, 5).map(value => value * 0.1) // Convert to smaller values for chart
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
  getTopCategories,
  getMonthlyActivity,
};
