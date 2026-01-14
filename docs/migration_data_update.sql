-- ============================================
-- MIGRATION: Daten-Updates
-- Aktualisiert vorhandene Daten mit fehlenden Werten
-- ============================================

-- WICHTIG: Diese Queries sollten nur ausgeführt werden, 
-- nachdem die Spalten erstellt wurden (migration_add_missing_fields.sql)

-- 1. UPDATE: freeTier aus JSON migrieren (falls in meta gespeichert)
-- ============================================
-- Falls freeTier in meta_difficulty_scaling oder anderen JSON-Feldern gespeichert wurde:
-- UPDATE rounds 
-- SET free_tier = (meta_difficulty_scaling->>'freeTier')::boolean
-- WHERE meta_difficulty_scaling IS NOT NULL 
--     AND meta_difficulty_scaling->>'freeTier' IS NOT NULL;

-- 2. UPDATE: pattern für correct items aus behavior migrieren (falls vorhanden)
-- ============================================
-- Falls pattern-Werte in behavior gespeichert wurden:
-- UPDATE items 
-- SET pattern = behavior
-- WHERE object_type = 'correct' 
--     AND behavior IS NOT NULL 
--     AND pattern IS NULL;

-- 3. VALIDIERUNG: Prüfe Datenqualität nach Update
-- ============================================
-- Prüft ob base-Items Visual-Felder haben
SELECT 
    'BASE_VISUAL_CHECK' as check_type,
    COUNT(*) as total_base_items,
    COUNT(CASE WHEN color IS NOT NULL THEN 1 END) as has_color,
    COUNT(CASE WHEN pulsate IS NOT NULL THEN 1 END) as has_pulsate,
    COUNT(CASE WHEN glow IS NOT NULL THEN 1 END) as has_glow,
    COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) as has_tier,
    COUNT(CASE WHEN size IS NOT NULL THEN 1 END) as has_size,
    COUNT(CASE WHEN appearance IS NOT NULL THEN 1 END) as has_appearance
FROM items
WHERE object_type = 'base';

-- Prüft ob correct-Items pattern haben
SELECT 
    'CORRECT_PATTERN_CHECK' as check_type,
    COUNT(*) as total_correct_items,
    COUNT(CASE WHEN pattern IS NOT NULL THEN 1 END) as has_pattern,
    COUNT(CASE WHEN behavior IS NOT NULL THEN 1 END) as has_behavior
FROM items
WHERE object_type = 'correct';

-- Prüft ob distractor-Items shake haben
SELECT 
    'DISTRACTOR_SHAKE_CHECK' as check_type,
    COUNT(*) as total_distractor_items,
    COUNT(CASE WHEN shake IS NOT NULL THEN 1 END) as has_shake
FROM items
WHERE object_type = 'distractor';

-- Prüft freeTier Status
SELECT 
    'FREETIER_CHECK' as check_type,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN free_tier = true THEN 1 END) as free_tier_true,
    COUNT(CASE WHEN free_tier = false THEN 1 END) as free_tier_false,
    COUNT(CASE WHEN free_tier IS NULL THEN 1 END) as free_tier_null
FROM rounds;

-- 4. BEISPIEL: Manuelle Updates für spezifische Rounds
-- ============================================
-- Beispiel: Setze freeTier für bestimmte Rounds
-- UPDATE rounds 
-- SET free_tier = true
-- WHERE id IN ('F00_001', 'F00_002');  -- Beispiel IDs

-- Beispiel: Setze pattern für correct items
-- UPDATE items 
-- SET pattern = 'linear_inward'
-- WHERE object_type = 'correct' 
--     AND round_id = 'BR_IT_001'
--     AND pattern IS NULL;

























