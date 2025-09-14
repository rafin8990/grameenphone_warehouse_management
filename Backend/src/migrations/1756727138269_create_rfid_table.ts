import pool from '../utils/dbClient';

export const name = '1756727138260_create_rfid_table';

export const run = async () => {
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
  await pool.query(`
    ALTER TABLE rfid_tags
    ADD COLUMN parent_tag_id BIGINT REFERENCES rfid_tags(id) ON DELETE SET NULL,
    ADD COLUMN current_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL;
  `);
};
