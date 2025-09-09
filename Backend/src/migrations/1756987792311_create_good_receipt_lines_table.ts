import pool from '../utils/dbClient';

export const name = '1756987792311_create_good_receipt_lines_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goods_receipt_lines (
      id             BIGSERIAL PRIMARY KEY,
      receipt_id     BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
      po_item_id     BIGINT REFERENCES po_items(id) ON DELETE SET NULL,
      item_id        BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      received_qty   NUMERIC(18,6) NOT NULL CHECK (received_qty > 0),
      unit           VARCHAR(16),
      unit_cost      NUMERIC(18,6) NOT NULL DEFAULT 0,
      lot_number     VARCHAR(80),
      expiry_date    DATE,
      mfg_date       DATE,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_gr_lines_receipt ON goods_receipt_lines (receipt_id);
    CREATE INDEX idx_gr_lines_item ON goods_receipt_lines (item_id);
  `);
};