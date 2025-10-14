const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function removeAllConstraints() {
  console.log('🔧 Manual constraint removal script for location_tracker table...');
  
  try {
    // Connect to database
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get all constraints
      const constraints = await client.query(`
        SELECT 
          tc.constraint_name,
          tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'location_tracker' 
          AND tc.table_schema = 'public'
          AND tc.constraint_type IN ('UNIQUE', 'CHECK', 'FOREIGN KEY')
        ORDER BY tc.constraint_type, tc.constraint_name;
      `);
      
      console.log('📋 Found constraints:', constraints.rows);
      
      // Drop all constraints
      for (const constraint of constraints.rows) {
        try {
          console.log(`🗑️ Dropping ${constraint.constraint_type} constraint: ${constraint.constraint_name}`);
          await client.query(`
            ALTER TABLE location_tracker
            DROP CONSTRAINT IF EXISTS ${constraint.constraint_name};
          `);
          console.log(`✅ Dropped: ${constraint.constraint_name}`);
        } catch (error) {
          console.log(`⚠️ Could not drop ${constraint.constraint_name}:`, error.message);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ All constraints removed successfully!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
removeAllConstraints();
