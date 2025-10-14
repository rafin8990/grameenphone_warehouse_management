import pool from '../utils/dbClient';

export const name = '1760219170205_update_location_trackers_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  ALTER TABLE location_tracker
-- Add EPC column to track scanned RFID/device codes
ADD COLUMN IF NOT EXISTS epc VARCHAR(255),

-- Add unique constraint to prevent duplicate “in” entries
-- for same EPC, location, PO, and item within short intervals
ADD CONSTRAINT unique_epc_location_combination 
    UNIQUE (epc, location_code, po_number, item_number, status);

  `);
};