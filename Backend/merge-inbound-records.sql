-- Check current inbound records for GP-2025-001
SELECT 
  id,
  po_number,
  items,
  created_at,
  updated_at
FROM inbound
WHERE po_number = 'GP-2025-001'
ORDER BY created_at ASC;

-- Merge all items from duplicate records into the latest one
WITH latest_record AS (
  SELECT id, items
  FROM inbound
  WHERE po_number = 'GP-2025-001'
  ORDER BY created_at DESC
  LIMIT 1
),
all_items AS (
  SELECT jsonb_array_elements(items) as item
  FROM inbound
  WHERE po_number = 'GP-2025-001'
),
merged_items AS (
  SELECT jsonb_agg(DISTINCT item) as merged_items
  FROM all_items
)
UPDATE inbound
SET items = mi.merged_items::jsonb
FROM latest_record lr, merged_items mi
WHERE inbound.id = lr.id;

-- Delete duplicate records (keep only the latest one)
WITH latest_record AS (
  SELECT id
  FROM inbound
  WHERE po_number = 'GP-2025-001'
  ORDER BY created_at DESC
  LIMIT 1
)
DELETE FROM inbound
WHERE po_number = 'GP-2025-001'
AND id NOT IN (SELECT id FROM latest_record);

-- Show the final result
SELECT 
  id,
  po_number,
  items,
  created_at,
  updated_at
FROM inbound
WHERE po_number = 'GP-2025-001'
ORDER BY created_at DESC;
