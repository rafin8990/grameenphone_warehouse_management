const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function testDashboardTables() {
  try {
    console.log('🔍 Testing dashboard table queries...\n');

    const tables = [
      'locations',
      'rfid_tags', 
      'vendors',
      'items',
      'requisitions',
      'purchase_orders',
      'stocks'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ ${table}: Table does not exist or error - ${error.message}`);
      }
    }

    console.log('\n🔍 Testing specific queries...\n');

    // Test locations
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM locations');
      console.log(`✅ Locations count: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Locations query failed: ${error.message}`);
    }

    // Test RFID tags
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM rfid_tags WHERE status = $1', ['available']);
      console.log(`✅ Available RFID count: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ RFID query failed: ${error.message}`);
    }

    // Test vendors
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM vendors');
      console.log(`✅ Vendors count: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Vendors query failed: ${error.message}`);
    }

    // Test items
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM items');
      console.log(`✅ Items count: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Items query failed: ${error.message}`);
    }

    // Test stocks
    try {
      const result = await pool.query('SELECT COUNT(*) as count FROM stocks');
      console.log(`✅ Stocks count: ${result.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Stocks query failed: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testDashboardTables();
