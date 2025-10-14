const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testSimpleLiveData() {
  try {
    console.log('🔍 Testing simple live data...\n');

    // Test basic queries that should work
    const locationsResult = await pool.query('SELECT COUNT(*) as count FROM locations');
    const itemsResult = await pool.query('SELECT COUNT(*) as count FROM items');
    const purchaseOrdersResult = await pool.query('SELECT COUNT(*) as count FROM purchase_orders');
    const stocksResult = await pool.query('SELECT COUNT(*) as count FROM stocks');

    const dashboardStats = {
      totalLocations: parseInt(locationsResult.rows[0].count, 10),
      totalAvailableRfid: 0, // Table doesn't exist
      totalVendors: 0, // Table doesn't exist
      totalItems: parseInt(itemsResult.rows[0].count, 10),
      totalAvailableRequisitions: 0, // Table doesn't exist
      totalPurchaseOrders: parseInt(purchaseOrdersResult.rows[0].count, 10),
      pendingPurchaseOrders: 0, // Will calculate below
      totalStockItems: parseInt(stocksResult.rows[0].count, 10),
      totalStockQuantity: 0, // Will calculate below
    };

    // Get pending purchase orders
    try {
      const pendingResult = await pool.query('SELECT COUNT(*) as count FROM purchase_orders WHERE status = $1', ['pending']);
      dashboardStats.pendingPurchaseOrders = parseInt(pendingResult.rows[0].count, 10);
    } catch (error) {
      console.log('⚠️ Pending purchase orders query failed:', error.message);
    }

    // Get stock quantity
    try {
      const quantityResult = await pool.query('SELECT SUM(quantity) as total_quantity FROM stocks');
      dashboardStats.totalStockQuantity = parseInt(quantityResult.rows[0].total_quantity || 0, 10);
    } catch (error) {
      console.log('⚠️ Stock quantity query failed:', error.message);
    }

    console.log('📊 Dashboard Stats:', dashboardStats);

    const result = {
      success: true,
      message: 'Unified live data retrieved successfully',
      data: {
        dashboard: dashboardStats,
        stock: {
          stats: {
            total_items: dashboardStats.totalStockItems,
            total_quantity: dashboardStats.totalStockQuantity,
            unique_items: 0,
            unique_pos: 0,
            recent_updates: 0,
          },
          summary: [],
          last_updated: new Date().toISOString()
        },
        last_updated: new Date().toISOString(),
      }
    };

    console.log('\n✅ Success! Live data result:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testSimpleLiveData();
