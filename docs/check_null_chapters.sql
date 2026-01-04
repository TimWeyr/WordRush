-- Check for rounds with NULL chapter_id
-- This query helps identify data integrity issues

-- 1. Count rounds with NULL chapter_id
SELECT 
  COUNT(*) as null_chapter_count
FROM rounds
WHERE chapter_id IS NULL;

-- 2. List rounds with NULL chapter_id (with details)
SELECT 
  id,
  uuid,
  chapter_id,
  level,
  published,
  created_at
FROM rounds
WHERE chapter_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- 3. Count rounds by chapter_id (including NULL)
SELECT 
  chapter_id,
  COUNT(*) as count
FROM rounds
GROUP BY chapter_id
ORDER BY count DESC;

-- 4. Find items associated with rounds that have NULL chapter_id
SELECT 
  r.id as round_id,
  r.uuid as round_uuid,
  r.chapter_id,
  i.uuid as item_uuid,
  i.word,
  i.object_type
FROM rounds r
LEFT JOIN items i ON i.round_uuid = r.uuid
WHERE r.chapter_id IS NULL
LIMIT 100;

-- OPTIONAL: Fix NULL chapter_id if you know what they should be
-- UPDATE rounds 
-- SET chapter_id = 'correct_chapter_id'
-- WHERE chapter_id IS NULL AND id LIKE 'pattern%';

