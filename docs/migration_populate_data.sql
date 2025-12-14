-- ============================================
-- MIGRATION: Daten befüllen
-- Befüllt die neu erstellten Felder mit zufälligen aber validen Daten
-- ============================================
-- 
-- WICHTIG: Führe diese Datei NACH migration_complete.sql aus
-- Die Spalten müssen bereits existieren!
--
-- Diese Datei generiert realistische Testdaten basierend auf:
-- - Level-basierte Verteilung (tier, free_tier)
-- - Valid movement patterns (linear_inward, zigzag, wave, seek_center)
-- - Sinnvolle Visual-Werte (size: 0.8-1.5, appearance: bold/italic/normal)
--
-- ============================================

BEGIN;

-- ============================================
-- 1. ROUNDS TABELLE: free_tier befüllen
-- ============================================
-- Setze free_tier basierend auf level (niedrigere Levels eher free)
-- Oder zufällig für ~20% der Rounds
UPDATE rounds
SET free_tier = (
    CASE 
        WHEN level <= 2 THEN (RANDOM() < 0.3)  -- 30% Chance bei Level 1-2
        WHEN level <= 4 THEN (RANDOM() < 0.15)  -- 15% Chance bei Level 3-4
        ELSE (RANDOM() < 0.05)                  -- 5% Chance bei Level 5+
    END
)
WHERE free_tier IS NULL OR free_tier = false;

-- ============================================
-- 2. ROUNDS TABELLE: intro_text befüllen
-- ============================================
-- Setze intro_text für ~30% der Rounds mit sinnvollen Texten
UPDATE rounds
SET intro_text = (
    CASE (FLOOR(RANDOM() * 10)::INT % 3)
        WHEN 0 THEN 'Bereit? Los geht''s! 🚀'
        WHEN 1 THEN 'Zeig was du kannst! 💪'
        WHEN 2 THEN 'Viel Erfolg! 🎯'
        ELSE NULL
    END
)
WHERE intro_text IS NULL 
    AND (RANDOM() < 0.3);  -- Nur 30% bekommen intro_text

-- ============================================
-- 3. ROUNDS TABELLE: meta_related befüllen
-- ============================================
-- Setze meta_related für ~25% der Rounds mit verwandten Round-IDs
-- (verwandte Rounds aus demselben Chapter und ähnlichem Level)
UPDATE rounds r1
SET meta_related = (
    SELECT ARRAY_AGG(r2.id ORDER BY RANDOM() LIMIT 2)
    FROM rounds r2
    WHERE r2.chapter_id = r1.chapter_id
        AND r2.id != r1.id
        AND ABS(r2.level - r1.level) <= 1  -- Ähnliches Level
        AND RANDOM() < 0.25  -- 25% Chance
    LIMIT 2
)
WHERE meta_related IS NULL 
    AND (RANDOM() < 0.25);  -- Nur 25% bekommen related items

-- ============================================
-- 4. ITEMS TABELLE: Visual-Felder für BASE items
-- ============================================

-- tier: Setze tier basierend auf level (1-3)
-- Level 1-2 → tier 1, Level 3-4 → tier 2, Level 5+ → tier 3
UPDATE items
SET tier = (
    SELECT 
        CASE 
            WHEN r.level <= 2 THEN 1
            WHEN r.level <= 4 THEN 2
            ELSE 3
        END
    FROM rounds r
    WHERE r.uuid = items.round_uuid
    LIMIT 1
)
WHERE object_type = 'base' 
    AND tier IS NULL;

-- size: Setze size basierend auf Wortlänge (längere Wörter = kleinere size)
-- Kurze Wörter (1-5 Zeichen): 1.2-1.5
-- Mittlere Wörter (6-10 Zeichen): 1.0-1.2
-- Lange Wörter (11-15 Zeichen): 0.8-1.0
-- Sehr lange Wörter (16+ Zeichen): 0.6-0.8
UPDATE items
SET size = (
    CASE 
        WHEN LENGTH(COALESCE(word, '')) <= 5 THEN 
            1.2 + (RANDOM() * 0.3)  -- 1.2 bis 1.5 für kurze Wörter
        WHEN LENGTH(COALESCE(word, '')) <= 10 THEN 
            1.0 + (RANDOM() * 0.2)  -- 1.0 bis 1.2 für mittlere Wörter
        WHEN LENGTH(COALESCE(word, '')) <= 15 THEN 
            0.8 + (RANDOM() * 0.2)  -- 0.8 bis 1.0 für lange Wörter
        ELSE 
            0.6 + (RANDOM() * 0.2)  -- 0.6 bis 0.8 für sehr lange Wörter
    END
)
WHERE object_type = 'base' 
    AND size IS NULL
    AND word IS NOT NULL;

-- appearance: Setze appearance (bold, italic, normal)
-- Verteilung: 50% bold, 30% normal, 20% italic
UPDATE items
SET appearance = (
    CASE 
        WHEN RANDOM() < 0.5 THEN 'bold'    -- 50% bold (häufigste)
        WHEN RANDOM() < 0.8 THEN 'normal'  -- 30% normal
        ELSE 'italic'                      -- 20% italic
    END
)
WHERE object_type = 'base' 
    AND appearance IS NULL;

-- glow: Setze glow für ~60% der base items
-- Nur wenn noch nicht gesetzt (NULL oder false)
UPDATE items
SET glow = (RANDOM() < 0.6)
WHERE object_type = 'base' 
    AND (glow IS NULL OR glow = false);

-- ============================================
-- 5. ITEMS TABELLE: Visual-Felder für CORRECT items
-- ============================================

-- pattern: Setze pattern für correct items (valid movement patterns)
-- Verteilung: 50% linear_inward (Standard), 20% zigzag, 20% wave, 10% seek_center
UPDATE items
SET pattern = (
    CASE 
        WHEN RANDOM() < 0.5 THEN 'linear_inward'  -- 50% Standard
        WHEN RANDOM() < 0.7 THEN 'zigzag'         -- 20%
        WHEN RANDOM() < 0.9 THEN 'wave'           -- 20%
        ELSE 'seek_center'                         -- 10%
    END
)
WHERE object_type = 'correct' 
    AND pattern IS NULL;

-- ============================================
-- 6. ITEMS TABELLE: Visual-Felder für DISTRACTOR items
-- ============================================

-- shake: Setze shake für ~40% der distractor items
-- Nur wenn noch nicht gesetzt (NULL oder false)
UPDATE items
SET shake = (RANDOM() < 0.4)
WHERE object_type = 'distractor' 
    AND (shake IS NULL OR shake = false);

-- ============================================
-- 7. VALIDIERUNG: Prüfe befüllte Daten
-- ============================================

-- Prüfe rounds
SELECT 
    'ROUNDS_DATA_CHECK' as check_type,
    COUNT(*) as total_rounds,
    COUNT(CASE WHEN free_tier = true THEN 1 END) as free_tier_true,
    COUNT(CASE WHEN free_tier = false THEN 1 END) as free_tier_false,
    COUNT(CASE WHEN intro_text IS NOT NULL THEN 1 END) as has_intro_text,
    COUNT(CASE WHEN meta_related IS NOT NULL THEN 1 END) as has_meta_related
FROM rounds;

-- Prüfe base items
SELECT 
    'BASE_ITEMS_DATA_CHECK' as check_type,
    COUNT(*) as total_base_items,
    COUNT(CASE WHEN tier IS NOT NULL THEN 1 END) as has_tier,
    COUNT(CASE WHEN size IS NOT NULL THEN 1 END) as has_size,
    COUNT(CASE WHEN appearance IS NOT NULL THEN 1 END) as has_appearance,
    COUNT(CASE WHEN glow = true THEN 1 END) as has_glow,
    MIN(tier) as min_tier,
    MAX(tier) as max_tier,
    MIN(size) as min_size,
    MAX(size) as max_size,
    AVG(size) as avg_size,
    -- Zeige size-Verteilung nach Wortlänge
    COUNT(CASE WHEN LENGTH(COALESCE(word, '')) <= 5 AND size IS NOT NULL THEN 1 END) as short_words,
    COUNT(CASE WHEN LENGTH(COALESCE(word, '')) BETWEEN 6 AND 10 AND size IS NOT NULL THEN 1 END) as medium_words,
    COUNT(CASE WHEN LENGTH(COALESCE(word, '')) BETWEEN 11 AND 15 AND size IS NOT NULL THEN 1 END) as long_words,
    COUNT(CASE WHEN LENGTH(COALESCE(word, '')) > 15 AND size IS NOT NULL THEN 1 END) as very_long_words
FROM items
WHERE object_type = 'base';

-- Prüfe correct items
SELECT 
    'CORRECT_ITEMS_DATA_CHECK' as check_type,
    COUNT(*) as total_correct_items,
    COUNT(CASE WHEN pattern IS NOT NULL THEN 1 END) as has_pattern,
    COUNT(DISTINCT pattern) as unique_patterns,
    STRING_AGG(DISTINCT pattern, ', ') as all_patterns
FROM items
WHERE object_type = 'correct';

-- Prüfe distractor items
SELECT 
    'DISTRACTOR_ITEMS_DATA_CHECK' as check_type,
    COUNT(*) as total_distractor_items,
    COUNT(CASE WHEN shake = true THEN 1 END) as has_shake,
    COUNT(CASE WHEN shake = false THEN 1 END) as no_shake
FROM items
WHERE object_type = 'distractor';

-- ============================================
-- 8. STATISTIKEN: Zeige Verteilung
-- ============================================

-- Verteilung von tier
SELECT 
    'TIER_DISTRIBUTION' as stat_type,
    tier,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM items
WHERE object_type = 'base' AND tier IS NOT NULL
GROUP BY tier
ORDER BY tier;

-- Verteilung von pattern
SELECT 
    'PATTERN_DISTRIBUTION' as stat_type,
    pattern,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM items
WHERE object_type = 'correct' AND pattern IS NOT NULL
GROUP BY pattern
ORDER BY pattern;

-- Verteilung von appearance
SELECT 
    'APPEARANCE_DISTRIBUTION' as stat_type,
    appearance,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM items
WHERE object_type = 'base' AND appearance IS NOT NULL
GROUP BY appearance
ORDER BY appearance;

COMMIT;

-- ============================================
-- DATEN BEFÜLLUNG ABGESCHLOSSEN
-- ============================================
-- 
-- Alle neuen Felder wurden mit validen, zufälligen Daten befüllt.
-- Prüfe die Validierungs-Statistiken oben.
--
-- ============================================

