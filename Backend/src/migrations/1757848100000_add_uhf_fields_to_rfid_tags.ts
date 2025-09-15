import pool from '../utils/dbClient';

export const name = '1757848100000_add_uhf_fields_to_rfid_tags';

export const run = async () => {
  // Add UHF-specific fields to match Java code structure
  await pool.query(`
    ALTER TABLE rfid_tags 
    ADD COLUMN IF NOT EXISTS rssi VARCHAR(20),
    ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS device_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);
  `);

  // Create index on device_id for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_rfid_tags_device_id ON rfid_tags(device_id);
  `);

  // Create index on session_id for batch operations
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_rfid_tags_session_id ON rfid_tags(session_id);
  `);
};
