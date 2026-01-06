-- ============================================
-- ROLLBACK: Entfernt hinzugefügte Spalten
-- Nur ausführen falls Migration rückgängig gemacht werden muss
-- ============================================
-- 
-- WARNUNG: Diese Operation kann nicht rückgängig gemacht werden!
-- Erstelle vorher ein Backup!
--
-- ============================================

BEGIN;

-- ============================================
-- 1. ROUNDS TABELLE: Spalten entfernen
-- ============================================

ALTER TABLE rounds 
DROP COLUMN IF EXISTS free_tier;

ALTER TABLE rounds 
DROP COLUMN IF EXISTS intro_text;

ALTER TABLE rounds 
DROP COLUMN IF EXISTS meta_related;

-- ============================================
-- 2. ITEMS TABELLE: Spalten entfernen
-- ============================================

ALTER TABLE items 
DROP COLUMN IF EXISTS tier;

ALTER TABLE items 
DROP COLUMN IF EXISTS size;

ALTER TABLE items 
DROP COLUMN IF EXISTS appearance;

ALTER TABLE items 
DROP COLUMN IF EXISTS glow;

ALTER TABLE items 
DROP COLUMN IF EXISTS shake;

ALTER TABLE items 
DROP COLUMN IF EXISTS pattern;

-- ============================================
-- 3. INDEXES entfernen
-- ============================================

DROP INDEX IF EXISTS idx_items_object_type;
DROP INDEX IF EXISTS idx_items_round_uuid;
DROP INDEX IF EXISTS idx_rounds_free_tier;
DROP INDEX IF EXISTS idx_rounds_chapter_uuid;
DROP INDEX IF EXISTS idx_items_pattern;
DROP INDEX IF EXISTS idx_items_glow;
DROP INDEX IF EXISTS idx_items_shake;

COMMIT;

-- ============================================
-- ROLLBACK ABGESCHLOSSEN
-- ============================================




















