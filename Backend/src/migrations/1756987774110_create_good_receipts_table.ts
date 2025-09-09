import pool from '../utils/dbClient';

export const name = '1756987774110_create_good_receipts_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goods_receipts (
        id            BIGSERIAL PRIMARY KEY,
        receipt_no    VARCHAR(60) NOT NULL UNIQUE,
        po_id         BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
        location_id   BIGINT NOT NULL REFERENCES locations(id),
        receipt_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status        VARCHAR(20) NOT NULL DEFAULT 'posted' 
                      CHECK (status IN ('draft','posted','void')),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_goods_receipts_po ON goods_receipts (po_id);
      CREATE INDEX idx_goods_receipts_loc ON goods_receipts (location_id);
  `);
};
