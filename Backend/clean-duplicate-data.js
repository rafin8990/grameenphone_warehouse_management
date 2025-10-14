const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gp_warehouse',
  password: 'password',
  port: 5432,
});

async function cleanDuplicateData() {
  const client = await pool.connect();
  try {
    console.log('🧹 Cleaning duplicate data...');
    
    // Check current data
    const allRecords = await client.query(`
      SELECT id, epc, location_code, po_number, item_number, status, created_at
      FROM location_tracker
      ORDER BY epc, location_code, po_number, item_number, created_at DESC;
    `);
    
    console.log('📊 Current records:');
    console.table(allRecords.rows);
    
    // Keep only the latest record for each EPC, location, PO, item combination
    const keepRecords = await client.query(`
      DELETE FROM location_tracker 
      WHERE id NOT IN (
        SELECT DISTINCT ON (epc, location_code, po_number, item_number) id
        FROM location_tracker
        ORDER BY epc, location_code, po_number, item_number, created_at DESC
      );
    `);
    
    console.log(`✅ Deleted ${keepRecords.rowCount} duplicate records`);
    
    // Check remaining data
    const remainingRecords = await client.query(`
      SELECT id, epc, location_code, po_number, item_number, status, created_at
      FROM location_tracker
      ORDER BY epc, location_code, po_number, item_number, created_at DESC;
    `);
    
    console.log('📊 Remaining records:');
    console.table(remainingRecords.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDuplicateData();

