import pool from '../utils/dbClient';

export const name = '1757847648496_create_stocks_movement_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  trx_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  item_id BIGINT NOT NULL REFERENCES items(id),
  from_location_id BIGINT REFERENCES locations(id),
  to_location_id BIGINT REFERENCES locations(id),
  lot_id BIGINT REFERENCES stock_lots(id),
  qty NUMERIC(18,6) NOT NULL,
  unit_cost NUMERIC(18,6),
  reason VARCHAR(40)
);
  `);
};