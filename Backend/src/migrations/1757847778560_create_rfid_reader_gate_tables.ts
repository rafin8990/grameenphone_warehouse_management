import pool from '../utils/dbClient';

export const name = '1757847778560_create_rfid_reader_gate_tables';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS rfid_gate_readers (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(60) UNIQUE NOT NULL,      -- e.g., MAIN_GATE, FLR2_ROOMA_IN
  name VARCHAR(120),
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL, -- যেখানে ঢোকার পরের লোকেশন
  direction VARCHAR(8) DEFAULT 'IN' CHECK (direction IN ('IN','OUT')),
  floor_no VARCHAR(20),
  room_code VARCHAR(40),
  is_active BOOLEAN DEFAULT TRUE
);
  `);
  await pool.query(`
  CREATE TABLE IF NOT EXISTS rfid_gate_events (
  id BIGSERIAL PRIMARY KEY,
  event_time TIMESTAMPTZ DEFAULT NOW(),
  reader_id BIGINT NOT NULL REFERENCES rfid_gate_readers(id),
  tag_id BIGINT NOT NULL REFERENCES rfid_tags(id),
  direction VARCHAR(8) NOT NULL CHECK (direction IN ('IN','OUT')),
  signal_strength NUMERIC(10,3),
  meta JSONB DEFAULT '{}'::jsonb
);
  `);
};
