import pool from '../utils/dbClient';

export const name = '1759990000000_add_po_status';

export const run = async () => {
  // Add status column to purchase_orders table
  await pool.query(`
    ALTER TABLE purchase_orders 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'received', 'cancelled', 'partial'));
  `);

  // Add received_at column to track when PO was fully received
  await pool.query(`
    ALTER TABLE purchase_orders 
    ADD COLUMN IF NOT EXISTS received_at TIMESTAMP;
  `);

  // Create index for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
  `);
};
