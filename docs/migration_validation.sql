-- ============================================
-- MIGRATION VALIDATION QUERIES
-- Prüft ob alle JSON-Felder korrekt migriert wurden
-- ============================================

-- 1. PRÜFUNG: Fehlende Visual-Felder in items Tabelle
-- ============================================
-- Prüft ob base-Items Visual-Felder haben (tier, size, appearance, glow)
SELECT 
    'MISSING_VISUAL_FIELDS' as check_type,
    COUNT(*) as affected_items,
    object_type,
    COUNT(CASE WHEN color IS NULL THEN 1 END) as missing_color,
    COUNT(CASE WHEN pulsate IS NULL THEN 1 END) as missing_pulsate
FROM items
WHERE object_type = 'base'
GROUP BY object_type;

-- Prüft ob correct-Items pattern haben (wird aktuell nicht gespeichert)
SELECT 
    'MISSING_PATTERN' as check_type,
    COUNT(*) as correct_items_without_pattern,
    COUNT(CASE WHEN behavior IS NOT NULL THEN 1 END) as has_behavior_instead
FROM items
WHERE object_type = 'correct';

-- Prüft ob distractors shake haben
SELECT 
    'MISSING_SHAKE' as check_type,
    COUNT(*) as distractor_items,
    COUNT(CASE WHEN object_type = 'distractor' THEN 1 END) as total_distractors
FROM items
WHERE object_type = 'distractor';

-- 2. PRÜFUNG: Fehlende Felder in rounds Tabelle
-- ============================================
-- Prüft ob freeTier fehlt
SELECT 
    'MISSING_FREETIER' as check_type,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN published = true THEN 1 END) as published_rounds
FROM rounds;

-- Prüft ob intro_text fehlt
SELECT 
    'MISSING_INTRO_TEXT' as check_type,
    COUNT(*) as total_rounds
FROM rounds;

-- Prüft ob meta.related migriert wurde (aktuell nicht vorhanden)
SELECT 
    'MISSING_META_RELATED' as check_type,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN meta_difficulty_scaling IS NOT NULL THEN 1 END) as has_difficulty_scaling
FROM rounds;

-- 3. PRÜFUNG: Datenintegrität
-- ============================================
-- Prüft ob alle rounds Items haben
SELECT 
    'ROUNDS_WITHOUT_ITEMS' as check_type,
    r.id,
    r.chapter_id,
    r.level,
    COUNT(i.uuid) as item_count
FROM rounds r
LEFT JOIN items i ON r.uuid = i.round_uuid
GROUP BY r.id, r.chapter_id, r.level
HAVING COUNT(i.uuid) = 0;

-- Prüft ob alle rounds einen base-Item haben
SELECT 
    'ROUNDS_WITHOUT_BASE' as check_type,
    r.id,
    r.chapter_id,
    COUNT(CASE WHEN i.object_type = 'base' THEN 1 END) as base_count
FROM rounds r
LEFT JOIN items i ON r.uuid = i.round_uuid
GROUP BY r.id, r.chapter_id
HAVING COUNT(CASE WHEN i.object_type = 'base' THEN 1 END) = 0;

-- Prüft ob alle rounds correct-Items haben
SELECT 
    'ROUNDS_WITHOUT_CORRECT' as check_type,
    r.id,
    r.chapter_id,
    COUNT(CASE WHEN i.object_type = 'correct' THEN 1 END) as correct_count
FROM rounds r
LEFT JOIN items i ON r.uuid = i.round_uuid
GROUP BY r.id, r.chapter_id
HAVING COUNT(CASE WHEN i.object_type = 'correct' THEN 1 END) = 0;

-- Prüft ob alle rounds distractor-Items haben
SELECT 
    'ROUNDS_WITHOUT_DISTRACTORS' as check_type,
    r.id,
    r.chapter_id,
    COUNT(CASE WHEN i.object_type = 'distractor' THEN 1 END) as distractor_count
FROM rounds r
LEFT JOIN items i ON r.uuid = i.round_uuid
GROUP BY r.id, r.chapter_id
HAVING COUNT(CASE WHEN i.object_type = 'distractor' THEN 1 END) = 0;

-- 4. PRÜFUNG: Visual-Config Vollständigkeit
-- ============================================
-- Prüft base-Items auf fehlende Visual-Felder
SELECT 
    'BASE_MISSING_VISUAL_FIELDS' as check_type,
    i.uuid,
    i.round_id,
    i.word,
    CASE WHEN i.color IS NULL THEN 'color' END as missing_field
FROM items i
WHERE i.object_type = 'base'
    AND (i.color IS NULL OR i.pulsate IS NULL);

-- Prüft correct-Items auf fehlende pattern
SELECT 
    'CORRECT_MISSING_PATTERN' as check_type,
    i.uuid,
    i.round_id,
    i.word,
    i.behavior as current_behavior
FROM items i
WHERE i.object_type = 'correct'
    AND i.behavior IS NULL;

-- Prüft distractor-Items auf fehlende shake
SELECT 
    'DISTRACTOR_MISSING_SHAKE' as check_type,
    i.uuid,
    i.round_id,
    i.word
FROM items i
WHERE i.object_type = 'distractor';

-- 5. ZUSAMMENFASSUNG: Migration Status
-- ============================================
SELECT 
    'MIGRATION_SUMMARY' as summary_type,
    (SELECT COUNT(*) FROM rounds) as total_rounds,
    (SELECT COUNT(*) FROM items WHERE object_type = 'base') as total_base_items,
    (SELECT COUNT(*) FROM items WHERE object_type = 'correct') as total_correct_items,
    (SELECT COUNT(*) FROM items WHERE object_type = 'distractor') as total_distractor_items,
    (SELECT COUNT(*) FROM rounds WHERE meta_source IS NOT NULL) as rounds_with_source,
    (SELECT COUNT(*) FROM rounds WHERE meta_tags IS NOT NULL) as rounds_with_tags,
    (SELECT COUNT(*) FROM rounds WHERE meta_difficulty_scaling IS NOT NULL) as rounds_with_difficulty_scaling;





