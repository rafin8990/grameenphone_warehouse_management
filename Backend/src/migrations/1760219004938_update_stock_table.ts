import pool from '../utils/dbClient';

export const name = '1760219004938_update_stock_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
ALTER TABLE stocks
ADD COLUMN IF NOT EXISTS epc VARCHAR(255);


ALTER TABLE stocks
DROP CONSTRAINT IF EXISTS unique_stock_combination,
ADD CONSTRAINT unique_stock_combination UNIQUE (po_number, lot_no, item_number, epc);

CREATE INDEX IF NOT EXISTS idx_stocks_po_item_lot_epc
ON stocks (po_number, lot_no, item_number, epc);
  `);
};