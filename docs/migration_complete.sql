-- ============================================
-- COMPLETE MIGRATION: Fehlende Felder hinzufügen
-- PostgreSQL SQL Statements für Supabase
-- ============================================
-- 
-- AUSFÜHRUNG:
-- 1. Backup der Datenbank erstellen
-- 2. Diese Datei in Supabase SQL Editor ausführen
-- 3. Validierung mit migration_validation.sql durchführen
--
-- ============================================

BEGIN;

-- ============================================
-- 1. ROUNDS TABELLE: Fehlende Felder hinzufügen
-- ============================================

-- free_tier: Ob Item für Gäste verfügbar ist
ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS free_tier BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN rounds.free_tier IS 'Whether item is available for free (guest users without login) - default: false (Opt-in for security)';

-- intro_text: Optionaler Intro-Text
ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS intro_text TEXT;

COMMENT ON COLUMN rounds.intro_text IS 'Optional intro text displayed before round starts (from Item.introText)';

-- meta_related: Array von verwandten Round-IDs
ALTER TABLE rounds 
ADD COLUMN IF NOT EXISTS meta_related TEXT[];

COMMENT ON COLUMN rounds.meta_related IS 'Array of related round/item IDs (from Item.meta.related)';

-- ============================================
-- 2. ITEMS TABELLE: Visual-Felder hinzufügen
-- ============================================

-- tier: Visual tier level für base items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS tier INTEGER;

COMMENT ON COLUMN items.tier IS 'Visual tier level for base items (from base.visual.tier)';

-- size: Visual size multiplier für base items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS size DOUBLE PRECISION;

COMMENT ON COLUMN items.size IS 'Visual size multiplier for base items (from base.visual.size)';

-- appearance: Visual appearance style für base items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS appearance TEXT;

COMMENT ON COLUMN items.appearance IS 'Visual appearance style for base items (e.g., "bold", from base.visual.appearance)';

-- glow: Glow-Effekt für base items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS glow BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN items.glow IS 'Whether base item has glow effect (from base.visual.glow)';

-- shake: Shake-Animation für distractor items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS shake BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN items.shake IS 'Whether item has shake animation (from visual.shake, mainly for distractors)';

-- pattern: Movement pattern für correct items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS pattern TEXT;

COMMENT ON COLUMN items.pattern IS 'Movement pattern for correct items (e.g., "linear_inward", from correct.pattern). Note: behavior is for distractors, pattern is for correct items.';

-- ============================================
-- 3. INDEXES für Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_object_type ON items(object_type);
CREATE INDEX IF NOT EXISTS idx_items_round_uuid ON items(round_uuid);
CREATE INDEX IF NOT EXISTS idx_rounds_free_tier ON rounds(free_tier);
CREATE INDEX IF NOT EXISTS idx_rounds_chapter_uuid ON rounds(chapter_uuid);
CREATE INDEX IF NOT EXISTS idx_items_pattern ON items(pattern) WHERE pattern IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_glow ON items(glow) WHERE glow = true;
CREATE INDEX IF NOT EXISTS idx_items_shake ON items(shake) WHERE shake = true;

-- ============================================
-- 4. VALIDIERUNG: Prüfe ob alle Spalten erstellt wurden
-- ============================================

DO $$
DECLARE
    missing_columns TEXT[];
    col TEXT;
BEGIN
    -- Prüfe rounds Spalten
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT 'free_tier'::TEXT AS column_name
        UNION SELECT 'intro_text'::TEXT
        UNION SELECT 'meta_related'::TEXT
    ) expected
    WHERE NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'rounds' 
            AND column_name = expected.column_name
    );
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in rounds table: %', array_to_string(missing_columns, ', ');
    END IF;
    
    -- Prüfe items Spalten
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT 'tier'::TEXT AS column_name
        UNION SELECT 'size'::TEXT
        UNION SELECT 'appearance'::TEXT
        UNION SELECT 'glow'::TEXT
        UNION SELECT 'shake'::TEXT
        UNION SELECT 'pattern'::TEXT
    ) expected
    WHERE NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'items' 
            AND column_name = expected.column_name
    );
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Missing columns in items table: %', array_to_string(missing_columns, ', ');
    END IF;
    
    RAISE NOTICE 'All columns created successfully!';
END $$;

-- ============================================
-- 5. ZUSAMMENFASSUNG: Zeige erstellte Spalten
-- ============================================

SELECT 
    'ROUNDS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'rounds'
    AND column_name IN ('free_tier', 'intro_text', 'meta_related')
ORDER BY column_name;

SELECT 
    'ITEMS TABLE' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'items'
    AND column_name IN ('tier', 'size', 'appearance', 'glow', 'shake', 'pattern')
ORDER BY column_name;

COMMIT;

-- ============================================
-- MIGRATION ABGESCHLOSSEN
-- ============================================
-- 
-- Nächste Schritte:
-- 1. Führe migration_validation.sql aus um Daten zu prüfen
-- 2. Führe migration_data_update.sql aus um Daten zu migrieren (falls nötig)
-- 3. Teste die Anwendung mit den neuen Feldern
--
-- ============================================

