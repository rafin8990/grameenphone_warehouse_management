import pool from '../utils/dbClient';

export const name = '1757847697666_create_container_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS containers (
  id BIGSERIAL PRIMARY KEY,
  rfid_id BIGINT UNIQUE NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  label VARCHAR(120),
  status VARCHAR(20) DEFAULT 'inbound' 
    CHECK (status IN ('inbound','in_store','dispatched','returned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
  `);
  await pool.query(`
 CREATE TABLE IF NOT EXISTS container_items (
  id BIGSERIAL PRIMARY KEY,
  container_id BIGINT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES items(id),
  lot_id BIGINT REFERENCES stock_lots(id),
  qty NUMERIC(18,6) NOT NULL DEFAULT 0,
  UNIQUE(container_id, item_id, lot_id)
);
  `);
};