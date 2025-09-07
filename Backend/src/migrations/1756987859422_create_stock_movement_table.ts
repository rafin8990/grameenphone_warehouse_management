import pool from '../utils/dbClient';

export const name = '1756987859422_create_stock_movement_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE stock_movements (
      id              BIGSERIAL PRIMARY KEY,
      movement_type   VARCHAR(20) NOT NULL
                      CHECK (movement_type IN ('IN','OUT','ADJUST_IN','ADJUST_OUT','TRANSFER_OUT','TRANSFER_IN')),
      item_id         BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      location_id     BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
      lot_id          BIGINT REFERENCES stock_lots(id) ON DELETE SET NULL,
      quantity        NUMERIC(18,6) NOT NULL CHECK (quantity <> 0), -- IN=+ve, OUT=-ve
      unit_cost       NUMERIC(18,6) NOT NULL DEFAULT 0,
      reference_type  VARCHAR(30),
      reference_id    BIGINT,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Reporting friendly
    CREATE INDEX idx_movements_item_loc_time ON stock_movements (item_id, location_id, created_at);
    CREATE INDEX idx_movements_lot ON stock_movements (lot_id);
    CREATE INDEX idx_movements_ref ON stock_movements (reference_type, reference_id);
  `);
};