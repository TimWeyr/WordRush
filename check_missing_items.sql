-- 🔍 CHECK MISSING ITEMS SCRIPT
-- Dieses Script hilft dabei, Chapters zu finden, bei denen Items fehlen oder verloren gegangen sind

-- ============================================================================
-- 1. CHAPTERS MIT WENIGER ALS 3 ITEMS (verdächtig!)
-- ============================================================================
SELECT 
  c.name AS chapter_name,
  c.uuid AS chapter_uuid,
  t.name AS theme_name,
  u.name AS universe_name,
  COUNT(DISTINCT r.uuid) AS round_count,
  COUNT(i.uuid) AS item_count,
  ROUND(COUNT(i.uuid)::NUMERIC / NULLIF(COUNT(DISTINCT r.uuid), 0), 2) AS avg_items_per_round
FROM public.chapters c
JOIN public.themes t ON t.uuid = c.theme_uuid
JOIN public.universes u ON u.uuid = t.universe_uuid
LEFT JOIN public.rounds r ON r.chapter_uuid = c.uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY c.uuid, c.name, t.name, u.name
HAVING COUNT(i.uuid) < 3  -- Weniger als 3 Items gesamt
ORDER BY item_count ASC, chapter_name;

-- ============================================================================
-- 2. ROUNDS OHNE ITEMS (KRITISCH!)
-- ============================================================================
SELECT 
  r.id AS round_id,
  r.uuid AS round_uuid,
  c.name AS chapter_name,
  t.name AS theme_name,
  u.name AS universe_name,
  r.level,
  COUNT(i.uuid) AS item_count
FROM public.rounds r
JOIN public.chapters c ON c.uuid = r.chapter_uuid
JOIN public.themes t ON t.uuid = c.theme_uuid
JOIN public.universes u ON u.uuid = t.universe_uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY r.uuid, r.id, c.name, t.name, u.name, r.level
HAVING COUNT(i.uuid) = 0  -- Keine Items!
ORDER BY u.name, t.name, c.name, r.level;

-- ============================================================================
-- 3. ROUNDS MIT NUR BASE ITEM (keine Correct/Distractor)
-- ============================================================================
SELECT 
  r.id AS round_id,
  c.name AS chapter_name,
  t.name AS theme_name,
  u.name AS universe_name,
  COUNT(i.uuid) AS total_items,
  COUNT(CASE WHEN i.object_type = 'base' THEN 1 END) AS base_count,
  COUNT(CASE WHEN i.object_type = 'correct' THEN 1 END) AS correct_count,
  COUNT(CASE WHEN i.object_type = 'distractor' THEN 1 END) AS distractor_count
FROM public.rounds r
JOIN public.chapters c ON c.uuid = r.chapter_uuid
JOIN public.themes t ON t.uuid = c.theme_uuid
JOIN public.universes u ON u.uuid = t.universe_uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY r.uuid, r.id, c.name, t.name, u.name
HAVING 
  COUNT(i.uuid) > 0 AND (
    COUNT(CASE WHEN i.object_type = 'correct' THEN 1 END) = 0 OR
    COUNT(CASE WHEN i.object_type = 'distractor' THEN 1 END) = 0
  )
ORDER BY u.name, t.name, c.name, r.id;

-- ============================================================================
-- 4. CHAPTERS MIT INKONSISTENTEN ITEM-COUNTS
-- ============================================================================
-- Findet Chapters, wo verschiedene Rounds sehr unterschiedliche Item-Counts haben
WITH round_stats AS (
  SELECT 
    c.uuid AS chapter_uuid,
    c.name AS chapter_name,
    t.name AS theme_name,
    u.name AS universe_name,
    r.uuid AS round_uuid,
    r.id AS round_id,
    COUNT(i.uuid) AS item_count
  FROM public.rounds r
  JOIN public.chapters c ON c.uuid = r.chapter_uuid
  JOIN public.themes t ON t.uuid = c.theme_uuid
  JOIN public.universes u ON u.uuid = t.universe_uuid
  LEFT JOIN public.items i ON i.round_uuid = r.uuid
  GROUP BY c.uuid, c.name, t.name, u.name, r.uuid, r.id
),
chapter_stats AS (
  SELECT
    chapter_uuid,
    chapter_name,
    theme_name,
    universe_name,
    MIN(item_count) AS min_items,
    MAX(item_count) AS max_items,
    ROUND(AVG(item_count), 2) AS avg_items,
    STDDEV(item_count) AS stddev_items
  FROM round_stats
  GROUP BY chapter_uuid, chapter_name, theme_name, universe_name
)
SELECT 
  universe_name,
  theme_name,
  chapter_name,
  min_items,
  max_items,
  avg_items,
  ROUND(stddev_items, 2) AS stddev_items
FROM chapter_stats
WHERE 
  max_items - min_items > 5  -- Große Differenz zwischen min und max
  OR stddev_items > 3  -- Hohe Standardabweichung
ORDER BY stddev_items DESC NULLS LAST;

-- ============================================================================
-- 5. LETZTE ÄNDERUNGEN AN ITEMS (wann wurden Items gelöscht?)
-- ============================================================================
-- Zeigt die letzten 50 gelöschten Rounds (falls deleted_at gesetzt ist)
-- HINWEIS: Nur wenn deine DB ein deleted_at oder updated_at Feld hat!
SELECT 
  r.id AS round_id,
  c.name AS chapter_name,
  t.name AS theme_name,
  u.name AS universe_name,
  COUNT(i.uuid) AS item_count,
  MAX(r.updated_at) AS last_updated  -- Falls vorhanden
FROM public.rounds r
JOIN public.chapters c ON c.uuid = r.chapter_uuid
JOIN public.themes t ON t.uuid = c.theme_uuid
JOIN public.universes u ON u.uuid = t.universe_uuid
LEFT JOIN public.items i ON i.round_uuid = r.uuid
GROUP BY r.uuid, r.id, c.name, t.name, u.name
ORDER BY last_updated DESC NULLS LAST
LIMIT 50;

-- ============================================================================
-- 6. SPEZIFISCHE CHAPTER PRÜFEN (Beispiel)
-- ============================================================================
-- Ersetze die UUID mit deiner Chapter-UUID aus der Fehlermeldung
SELECT 
  r.id AS round_id,
  r.uuid AS round_uuid,
  r.level,
  COUNT(i.uuid) AS item_count,
  STRING_AGG(i.object_type, ', ' ORDER BY i.object_type) AS object_types,
  STRING_AGG(i.word, ', ') AS words
FROM public.rounds r
LEFT JOIN public.items i ON i.round_uuid = r.uuid
WHERE r.chapter_uuid = '96d111b1-27fe-4716-9e0a-75b0bdf8fb03'  -- DEINE CHAPTER UUID
GROUP BY r.uuid, r.id, r.level
ORDER BY r.level, r.id;

-- ============================================================================
-- 7. GESAMTSTATISTIK
-- ============================================================================
SELECT 
  'Total Universes' AS metric,
  COUNT(*) AS count
FROM public.universes
UNION ALL
SELECT 
  'Total Themes',
  COUNT(*)
FROM public.themes
UNION ALL
SELECT 
  'Total Chapters',
  COUNT(*)
FROM public.chapters
UNION ALL
SELECT 
  'Total Rounds',
  COUNT(*)
FROM public.rounds
UNION ALL
SELECT 
  'Total Items',
  COUNT(*)
FROM public.items
UNION ALL
SELECT 
  'Rounds without Items',
  COUNT(DISTINCT r.uuid)
FROM public.rounds r
LEFT JOIN public.items i ON i.round_uuid = r.uuid
WHERE i.uuid IS NULL
UNION ALL
SELECT 
  'Items without Round (orphaned)',
  COUNT(*)
FROM public.items i
LEFT JOIN public.rounds r ON r.uuid = i.round_uuid
WHERE r.uuid IS NULL;

-- ============================================================================
-- 8. ITEMS PRO ROUND-STATISTIK
-- ============================================================================
SELECT 
  item_count,
  COUNT(*) AS round_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM (
  SELECT 
    r.uuid,
    COUNT(i.uuid) AS item_count
  FROM public.rounds r
  LEFT JOIN public.items i ON i.round_uuid = r.uuid
  GROUP BY r.uuid
) AS round_stats
GROUP BY item_count
ORDER BY item_count;

-- ============================================================================
-- INTERPRETATION DER ERGEBNISSE
-- ============================================================================

/*
🔴 KRITISCH: Rounds ohne Items
   → Diese Rounds sollten Items haben, aber haben keine
   → Möglicherweise durch Bug verloren gegangen

🟠 WARNUNG: Chapters mit < 3 Items gesamt
   → Sehr unwahrscheinlich, dass das gewollt ist
   → Prüfe, ob Items fehlen

🟡 VERDÄCHTIG: Inkonsistente Item-Counts
   → Wenn ein Chapter 5-15 Items pro Round hat, aber ein Round nur 2, ist das verdächtig
   → Möglicherweise Partial Save Failure

🟢 OK: Alle Rounds haben 4+ Items
   → Typisch: 1 Base + 1-3 Correct + 2-5 Distractor = 4-9 Items
   → Das sieht normal aus
*/

