const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'warehouse_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkDatabaseData() {
  try {
    console.log('Checking database data...\n');

    // Check categories
    const categoriesResult = await pool.query('SELECT COUNT(*) as count FROM categories');
    console.log('Total Categories:', categoriesResult.rows[0].count);

    const categoriesWithStatus = await pool.query("SELECT COUNT(*) as count FROM categories WHERE status = 'active'");
    console.log('Active Categories:', categoriesWithStatus.rows[0].count);

    // Check locations
    const locationsResult = await pool.query('SELECT COUNT(*) as count FROM locations');
    console.log('Total Locations:', locationsResult.rows[0].count);

    // Check vendors
    const vendorsResult = await pool.query('SELECT COUNT(*) as count FROM vendors');
    console.log('Total Vendors:', vendorsResult.rows[0].count);

    const vendorsWithStatus = await pool.query("SELECT COUNT(*) as count FROM vendors WHERE status = 'active'");
    console.log('Active Vendors:', vendorsWithStatus.rows[0].count);

    // Check items
    const itemsResult = await pool.query('SELECT COUNT(*) as count FROM items');
    console.log('Total Items:', itemsResult.rows[0].count);

    // Check RFID tags
    const rfidResult = await pool.query("SELECT COUNT(*) as count FROM rfid_tags WHERE status = 'available'");
    console.log('Available RFID Tags:', rfidResult.rows[0].count);

    // Check requisitions
    const requisitionsResult = await pool.query("SELECT COUNT(*) as count FROM requisitions WHERE status = 'open'");
    console.log('Open Requisitions:', requisitionsResult.rows[0].count);

    // Show sample data
    console.log('\n--- Sample Data ---');
    
    const sampleCategories = await pool.query('SELECT id, name, status FROM categories LIMIT 3');
    console.log('Sample Categories:', sampleCategories.rows);

    const sampleLocations = await pool.query('SELECT id, name, status FROM locations LIMIT 3');
    console.log('Sample Locations:', sampleLocations.rows);

    const sampleVendors = await pool.query('SELECT id, name, status FROM vendors LIMIT 3');
    console.log('Sample Vendors:', sampleVendors.rows);

    const sampleItems = await pool.query('SELECT id, item_code, item_description FROM items LIMIT 3');
    console.log('Sample Items:', sampleItems.rows);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseData();
