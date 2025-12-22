-- Migration: Fix Round IDs to use full chapter ID format
-- This fixes the issue where rounds with same ID exist in different chapters
-- 
-- OLD FORMAT: "F40_001" (only first 3 chars of chapter ID)
-- NEW FORMAT: "F40.00_001" (full chapter ID)
--
-- IMPORTANT: Run this in a transaction and verify before committing!

BEGIN;

-- Step 1: Show what will be changed (dry run)
-- Uncomment this to see what will be updated:
/*
SELECT 
  r.uuid AS round_uuid,
  r.id AS old_round_id,
  c.id AS chapter_id,
  CONCAT(c.id, '_', LPAD(ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY r.created_at), 3, '0')) AS new_round_id,
  COUNT(i.uuid) AS item_count
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY r.uuid, r.id, c.id, r.created_at
ORDER BY c.id, r.created_at;
*/

-- Step 2: Create temporary mapping table
-- Extract the number from old ID (e.g., "F40_001" -> 1) and use it in new format
CREATE TEMP TABLE round_id_mapping AS
SELECT 
  r.uuid AS round_uuid,
  r.id AS old_round_id,
  c.id AS chapter_id,
  CASE 
    -- Extract number from end of old ID (works with "F40_001", "F40_002", etc.)
    WHEN r.id ~ '\d+$' THEN 
      CONCAT(c.id, '_', LPAD((regexp_match(r.id, '\d+$'))[1], 3, '0'))
    ELSE 
      -- Fallback: use row number if pattern doesn't match
      CONCAT(c.id, '_', LPAD(ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY r.created_at)::text, 3, '0'))
  END AS new_round_id
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
ORDER BY c.id, r.created_at;

-- Step 3: Verify mapping (check for conflicts)
-- This should return 0 rows if no conflicts:
SELECT new_round_id, COUNT(*) 
FROM round_id_mapping 
GROUP BY new_round_id 
HAVING COUNT(*) > 1;

-- Step 4: Update items.round_id first (foreign key constraint)
UPDATE public.items i
SET round_id = m.new_round_id
FROM round_id_mapping m
WHERE i.round_uuid = m.round_uuid
  AND i.round_id != m.new_round_id;

-- Step 5: Update rounds.id
UPDATE public.rounds r
SET id = m.new_round_id
FROM round_id_mapping m
WHERE r.uuid = m.round_uuid
  AND r.id != m.new_round_id;

-- Step 6: Verify results
SELECT 
  'Rounds updated' AS status,
  COUNT(*) AS count
FROM public.rounds r
JOIN round_id_mapping m ON r.uuid = m.round_uuid
WHERE r.id = m.new_round_id
UNION ALL
SELECT 
  'Items updated' AS status,
  COUNT(*) AS count
FROM public.items i
JOIN round_id_mapping m ON i.round_uuid = m.round_uuid
WHERE i.round_id = m.new_round_id;

-- Step 7: Check for any remaining issues
-- This should return 0 rows:
SELECT 
  r.id AS round_id,
  COUNT(DISTINCT r.chapter_uuid) AS chapter_count
FROM public.rounds r
GROUP BY r.id
HAVING COUNT(DISTINCT r.chapter_uuid) > 1;

-- If everything looks good, commit:
-- COMMIT;

-- If something went wrong, rollback:
-- ROLLBACK;

-- Cleanup (after commit/rollback):
-- DROP TABLE IF EXISTS round_id_mapping;

