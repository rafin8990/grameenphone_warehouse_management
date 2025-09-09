import pool from '../utils/dbClient';

export const name = '1756987817200_create_stock_lots_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_lots (
      id              BIGSERIAL PRIMARY KEY,
      item_id         BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      location_id     BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      source_type     VARCHAR(20) NOT NULL 
                      CHECK (source_type IN ('GRN','ADJUSTMENT_IN','TRANSFER_IN','OPENING')),
      source_line_id  BIGINT,
      lot_number      VARCHAR(80),
      expiry_date     DATE,
      received_qty    NUMERIC(18,6) NOT NULL CHECK (received_qty >= 0),
      remaining_qty   NUMERIC(18,6) NOT NULL CHECK (remaining_qty >= 0),
      unit_cost       NUMERIC(18,6) NOT NULL DEFAULT 0,
      received_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- FIFO & remaining stock
    CREATE INDEX idx_stock_lots_fifo ON stock_lots (item_id, location_id, received_at);
    CREATE INDEX idx_stock_lots_remaining ON stock_lots (item_id, location_id) WHERE remaining_qty > 0;
    CREATE INDEX idx_stock_lots_item_loc ON stock_lots (item_id, location_id);
  `);
};