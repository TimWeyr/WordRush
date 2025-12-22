-- Simplified Migration: Fix Round IDs to use full chapter ID format
-- This is a safer version that updates one chapter at a time
--
-- Usage: Run this for each chapter that needs fixing
-- Replace 'YOUR_CHAPTER_ID' with the actual chapter ID

BEGIN;

-- Set the chapter ID you want to fix
\set chapter_id 'YOUR_CHAPTER_ID'

-- Step 1: Create mapping for this chapter
-- Extract the number from old ID and use it in new format
CREATE TEMP TABLE round_id_mapping AS
SELECT 
  r.uuid AS round_uuid,
  r.id AS old_round_id,
  CASE 
    -- Extract number from end of old ID (works with "F40_001", "F40_002", etc.)
    WHEN r.id ~ '\d+$' THEN 
      CONCAT(c.id, '_', LPAD((regexp_match(r.id, '\d+$'))[1], 3, '0'))
    ELSE 
      -- Fallback: use row number if pattern doesn't match
      CONCAT(c.id, '_', LPAD(ROW_NUMBER() OVER (ORDER BY r.created_at)::text, 3, '0'))
  END AS new_round_id
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
WHERE c.id = :'chapter_id'
ORDER BY r.created_at;

-- Step 2: Show what will be changed
SELECT 
  old_round_id,
  new_round_id,
  round_uuid
FROM round_id_mapping
ORDER BY new_round_id;

-- Step 3: Update items.round_id
UPDATE public.items i
SET round_id = m.new_round_id
FROM round_id_mapping m
WHERE i.round_uuid = m.round_uuid
  AND i.round_id != m.new_round_id;

-- Step 4: Update rounds.id
UPDATE public.rounds r
SET id = m.new_round_id
FROM round_id_mapping m
WHERE r.uuid = m.round_uuid
  AND r.id != m.new_round_id;

-- Step 5: Verify
SELECT 
  r.id AS round_id,
  c.id AS chapter_id,
  COUNT(i.uuid) AS item_count
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
WHERE c.id = :'chapter_id'
GROUP BY r.id, c.id
ORDER BY r.id;

-- COMMIT; or ROLLBACK;

