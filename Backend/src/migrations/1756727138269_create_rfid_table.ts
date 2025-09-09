import pool from '../utils/dbClient';

export const name = '1756727138269_create_rfid_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE IF NOT EXISTS rfid_tags (
      id            BIGSERIAL PRIMARY KEY,
      tag_uid       VARCHAR(64) UNIQUE NOT NULL,
      status        VARCHAR(16) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','reserved','assigned','consumed','lost','damaged')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};
