const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'warehouse_management',
  password: 'password',
  port: 5432,
});

async function populateStockBalance() {
  try {
    console.log('Populating stock balance data...');

    // First, get some items and locations
    const itemsResult = await pool.query('SELECT id FROM items LIMIT 5');
    const locationsResult = await pool.query('SELECT id FROM locations LIMIT 3');

    if (itemsResult.rows.length === 0) {
      console.log('No items found. Please create some items first.');
      return;
    }

    if (locationsResult.rows.length === 0) {
      console.log('No locations found. Please create some locations first.');
      return;
    }

    const items = itemsResult.rows;
    const locations = locationsResult.rows;

    // Clear existing stock balance data
    await pool.query('DELETE FROM stock_balances');

    // Insert sample stock balance data
    for (const item of items) {
      for (const location of locations) {
        const quantity = Math.floor(Math.random() * 100) + 10; // Random quantity between 10-110
        
        await pool.query(
          'INSERT INTO stock_balances (item_id, location_id, on_hand_qty) VALUES ($1, $2, $3)',
          [item.id, location.id, quantity]
        );
      }
    }

    console.log(`Stock balance data populated successfully!`);
    console.log(`Created stock balances for ${items.length} items across ${locations.length} locations.`);

    // Show some sample data
    const sampleResult = await pool.query(`
      SELECT 
        sb.*,
        i.item_code,
        l.sub_inventory_code,
        l.locator_code
      FROM stock_balances sb
      JOIN items i ON sb.item_id = i.id
      JOIN locations l ON sb.location_id = l.id
      LIMIT 10
    `);

    console.log('\nSample stock balance data:');
    console.table(sampleResult.rows);

  } catch (error) {
    console.error('Error populating stock balance:', error);
  } finally {
    await pool.end();
  }
}

populateStockBalance();
