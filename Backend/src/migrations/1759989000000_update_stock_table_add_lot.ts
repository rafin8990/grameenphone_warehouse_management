import pool from '../utils/dbClient';

export const name = '1759989000000_update_stock_table_add_lot';

export const run = async () => {
  // Add lot_number column to stocks table
  await pool.query(`
    ALTER TABLE stocks 
    ADD COLUMN IF NOT EXISTS lot_no VARCHAR(255);
  `);

  // Add unique constraint for po_number, item_number, lot_no combination
  await pool.query(`
    ALTER TABLE stocks 
    ADD CONSTRAINT unique_stock_combination UNIQUE (po_number, item_number, lot_no);
  `);

  // Create index for better performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_stocks_po_item_lot ON stocks(po_number, item_number, lot_no);
  `);
};
