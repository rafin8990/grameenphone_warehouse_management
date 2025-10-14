const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setupTestData() {
  console.log('🔧 Setting up test data for status toggle...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create test locations
    console.log('1️⃣ Creating test locations...');
    const locationQueries = [
      `INSERT INTO locations (location_code, location_name, device_id, created_at, updated_at)
       VALUES ('LOC001', 'Test Location 1', 'DEVICE001', NOW(), NOW())
       ON CONFLICT (location_code) DO NOTHING;`,
      `INSERT INTO locations (location_code, location_name, device_id, created_at, updated_at)
       VALUES ('LOC002', 'Test Location 2', 'DEVICE002', NOW(), NOW())
       ON CONFLICT (location_code) DO NOTHING;`
    ];

    for (const query of locationQueries) {
      await client.query(query);
    }
    console.log('✅ Test locations created');

    // 2. Create test hex codes
    console.log('2️⃣ Creating test hex codes...');
    const hexQueries = [
      `INSERT INTO po_hex_codes (hex_code, po_number, lot_no, item_number, quantity, uom, created_at, updated_at)
       VALUES ('TEST123', 'PO001', 'LOT001', 'ITEM001', 1, 'pcs', NOW(), NOW())
       ON CONFLICT (hex_code) DO NOTHING;`,
      `INSERT INTO po_hex_codes (hex_code, po_number, lot_no, item_number, quantity, uom, created_at, updated_at)
       VALUES ('QUICK123', 'PO002', 'LOT002', 'ITEM002', 1, 'pcs', NOW(), NOW())
       ON CONFLICT (hex_code) DO NOTHING;`
    ];

    for (const query of hexQueries) {
      await client.query(query);
    }
    console.log('✅ Test hex codes created');

    // 3. Create test items
    console.log('3️⃣ Creating test items...');
    const itemQueries = [
      `INSERT INTO items (item_number, item_description, item_type, primary_uom, uom_code, item_status, created_at, updated_at)
       VALUES ('ITEM001', 'Test Item 1', 'Electronics', 'pcs', 'PCS', 'active', NOW(), NOW())
       ON CONFLICT (item_number) DO NOTHING;`,
      `INSERT INTO items (item_number, item_description, item_type, primary_uom, uom_code, item_status, created_at, updated_at)
       VALUES ('ITEM002', 'Test Item 2', 'Electronics', 'pcs', 'PCS', 'active', NOW(), NOW())
       ON CONFLICT (item_number) DO NOTHING;`
    ];

    for (const query of itemQueries) {
      await client.query(query);
    }
    console.log('✅ Test items created');

    // 4. Create test purchase orders
    console.log('4️⃣ Creating test purchase orders...');
    const poQueries = [
      `INSERT INTO purchase_orders (po_number, po_description, supplier_name, po_type, status, created_at, updated_at)
       VALUES ('PO001', 'Test Purchase Order 1', 'Test Supplier 1', 'Standard', 'received', NOW(), NOW())
       ON CONFLICT (po_number) DO NOTHING;`,
      `INSERT INTO purchase_orders (po_number, po_description, supplier_name, po_type, status, created_at, updated_at)
       VALUES ('PO002', 'Test Purchase Order 2', 'Test Supplier 2', 'Standard', 'received', NOW(), NOW())
       ON CONFLICT (po_number) DO NOTHING;`
    ];

    for (const query of poQueries) {
      await client.query(query);
    }
    console.log('✅ Test purchase orders created');

    await client.query('COMMIT');
    console.log('\n🎉 Test data setup completed successfully!');
    console.log('\nTest data created:');
    console.log('  - Locations: LOC001 (DEVICE001), LOC002 (DEVICE002)');
    console.log('  - Hex codes: TEST123 (PO001), QUICK123 (PO002)');
    console.log('  - Items: ITEM001, ITEM002');
    console.log('  - Purchase orders: PO001, PO002');
    console.log('\nYou can now test the status toggle functionality!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up test data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupTestData();
