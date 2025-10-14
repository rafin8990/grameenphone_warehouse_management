import pool from '../utils/dbClient';

export const name = '1760220000000_add_device_id_to_locations';

export const run = async () => {
  // Add device_id column to locations table
  await pool.query(`
    ALTER TABLE locations 
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) UNIQUE;
    
    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS idx_locations_device_id 
    ON locations (device_id);
  `);
};
