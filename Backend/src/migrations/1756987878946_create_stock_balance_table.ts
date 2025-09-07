import pool from '../utils/dbClient';

export const name = '1756987878946_create_stock_balance_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
        CREATE TABLE stock_balances (
          id            BIGSERIAL PRIMARY KEY,
          item_id       BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
          location_id   BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
          on_hand_qty   NUMERIC(18,6) NOT NULL DEFAULT 0,
          UNIQUE(item_id, location_id)
        );

        CREATE INDEX idx_stock_balances_item ON stock_balances (item_id);
        CREATE INDEX idx_stock_balances_loc ON stock_balances (location_id);
  `);
};