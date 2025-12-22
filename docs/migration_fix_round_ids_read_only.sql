-- READ-ONLY: Analyze existing Round IDs and show what needs to be fixed
-- This query shows all rounds with their current IDs and what the new IDs would be

SELECT 
  r.uuid AS round_uuid,
  r.id AS current_round_id,
  c.id AS chapter_id,
  c.title AS chapter_title,
  CASE 
    -- Extract number from end of old ID and use it in new format
    WHEN r.id ~ '\d+$' THEN 
      CONCAT(c.id, '_', LPAD((regexp_match(r.id, '\d+$'))[1], 3, '0'))
    ELSE 
      -- Fallback: use row number if pattern doesn't match
      CONCAT(c.id, '_', LPAD(ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY r.created_at)::text, 3, '0'))
  END AS suggested_new_round_id,
  COUNT(i.uuid) AS item_count,
  r.created_at AS round_created,
  MIN(i.created_at) AS first_item_created,
  MAX(i.created_at) AS last_item_created
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY r.uuid, r.id, c.id, c.title, r.created_at
ORDER BY c.id, r.created_at;

-- Find rounds with duplicate IDs across chapters (the problem):
SELECT 
  r.id AS duplicate_round_id,
  COUNT(DISTINCT r.chapter_uuid) AS affected_chapters,
  STRING_AGG(DISTINCT c.title, ' | ') AS chapter_names,
  STRING_AGG(DISTINCT r.uuid::text, ' | ') AS round_uuids,
  SUM((SELECT COUNT(*) FROM public.items WHERE round_uuid = r.uuid)) AS total_items
FROM public.rounds r
JOIN public.chapters c ON r.chapter_uuid = c.uuid
GROUP BY r.id
HAVING COUNT(DISTINCT r.chapter_uuid) > 1
ORDER BY r.id;

