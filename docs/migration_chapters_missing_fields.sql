-- ============================================
-- MIGRATION: Fehlende Chapter-Felder hinzufügen
-- Fügt spawn_rate, music, particle_effect zur chapters Tabelle hinzu
-- ============================================
-- 
-- Diese Felder sind in ChapterConfig definiert, aber noch nicht in der DB:
-- - spawnRate (required) → spawn_rate
-- - music (optional) → music
-- - particleEffect (optional) → particle_effect
--
-- ============================================

BEGIN;

-- ============================================
-- 1. spawn_rate hinzufügen
-- ============================================
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS spawn_rate DOUBLE PRECISION;

COMMENT ON COLUMN chapters.spawn_rate IS 'Objects per second for this chapter (from ChapterConfig.spawnRate). Required in JSON, typical range: 1.0-3.0. Maps to gameplay spawn rate.';

-- ============================================
-- 2. music hinzufügen
-- ============================================
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS music TEXT;

COMMENT ON COLUMN chapters.music IS 'Optional music filename for chapter-specific background music (from ChapterConfig.music). Falls back to theme/universe music if not set.';

-- ============================================
-- 3. particle_effect hinzufügen
-- ============================================
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS particle_effect TEXT;

COMMENT ON COLUMN chapters.particle_effect IS 'Optional particle effect name for chapter-specific visual effects (from ChapterConfig.particleEffect). Falls back to theme/universe particle effect.';

-- ============================================
-- 4. VALIDIERUNG: Prüfe ob alle Spalten erstellt wurden
-- ============================================
SELECT 
    'CHAPTERS_MISSING_FIELDS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'chapters'
    AND column_name IN ('spawn_rate', 'music', 'particle_effect')
ORDER BY column_name;

COMMIT;

-- ============================================
-- MIGRATION ABGESCHLOSSEN
-- ============================================
-- 
-- Nächste Schritte:
-- 1. Migriere Daten aus JSON (spawnRate → spawn_rate, etc.)
-- 2. Aktualisiere JSONLoader.ts um von Supabase zu laden
-- 3. Teste die Anwendung
--
-- ============================================



