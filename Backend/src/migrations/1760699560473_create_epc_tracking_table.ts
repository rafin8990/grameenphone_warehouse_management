import pool from '../utils/dbClient';

export const name = '1760699560473_create_epc_tracking_table';

export const run = async () => {
  // Create EPC tracking table to prevent duplicate quantity counting
  await pool.query(`
    CREATE TABLE IF NOT EXISTS epc_tracking (
      id SERIAL PRIMARY KEY,
      epc VARCHAR(255) NOT NULL,
      item_number VARCHAR(255) NOT NULL,
      po_number VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(epc, item_number, po_number)
    );
  `);

  // Create index for faster lookups
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_epc_tracking_lookup 
    ON epc_tracking(epc, item_number, po_number);
  `);
};