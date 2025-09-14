import pool from '../utils/dbClient';

export const name = '1757847582403_create_stocks_tables';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS stock_lots (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  lot_no VARCHAR(80),
  serial_no VARCHAR(80),
  expiry_date DATE,
  UNIQUE (item_id, lot_no, serial_no)
);
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS stock_lot_rfids (
  id BIGSERIAL PRIMARY KEY,
  lot_id BIGINT NOT NULL REFERENCES stock_lots(id) ON DELETE CASCADE,
  rfid_id BIGINT NOT NULL REFERENCES rfid_tags(id) ON DELETE CASCADE,
  UNIQUE(lot_id, rfid_id)
);
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS stock_balances (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES items(id),
  location_id BIGINT NOT NULL REFERENCES locations(id),
  lot_id BIGINT REFERENCES stock_lots(id) ON DELETE SET NULL,
  qty NUMERIC(18,6) NOT NULL DEFAULT 0,
  UNIQUE(item_id, location_id, lot_id)
);
  `);
};