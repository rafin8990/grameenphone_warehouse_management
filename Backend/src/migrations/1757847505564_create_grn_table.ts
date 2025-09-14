import pool from '../utils/dbClient';

export const name = '1757847505564_create_grn_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS goods_receipts (
  id BIGSERIAL PRIMARY KEY,
  receipt_no VARCHAR(60) UNIQUE NOT NULL,
  po_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
  receipt_date TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'posted' 
  CHECK (status IN ('draft','posted','void')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS goods_receipt_lines (
  id BIGSERIAL PRIMARY KEY,
  receipt_id BIGINT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id BIGINT REFERENCES po_items(id) ON DELETE SET NULL,
  item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  received_qty NUMERIC(18,6) NOT NULL CHECK (received_qty > 0),
  uom VARCHAR(16) NOT NULL,
  unit_cost NUMERIC(18,6),
  rfid_id BIGINT REFERENCES rfid_tags(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
};
