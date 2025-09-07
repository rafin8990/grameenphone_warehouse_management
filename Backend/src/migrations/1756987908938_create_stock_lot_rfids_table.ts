import pool from '../utils/dbClient';

export const name = '1756987908938_create_stock_lot_rfids_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE stock_lot_rfids (
        id        BIGSERIAL PRIMARY KEY,
        lot_id    BIGINT NOT NULL REFERENCES stock_lots(id) ON DELETE CASCADE,
        rfid_id   BIGINT NOT NULL REFERENCES rfid_tags(id) ON DELETE RESTRICT,
        UNIQUE(lot_id, rfid_id)
      );

      CREATE INDEX idx_stock_lot_rfids_lot ON stock_lot_rfids (lot_id);
      CREATE INDEX idx_stock_lot_rfids_rfid ON stock_lot_rfids (rfid_id);
  `);
};
