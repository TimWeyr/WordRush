-- Migration: Add 'level' column to items table
-- Date: 2024-12-23
-- Description: Adds level field to individual items (correct/distractor entries)
--              to support per-item difficulty levels (1-10)

-- Step 1: Add level column to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Step 2: Add comment
COMMENT ON COLUMN items.level IS 'Difficulty level for this specific item (1-10). Independent from round.level.';

-- Step 3: Create index for performance (optional, if filtering by level becomes common)
CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'items' AND column_name = 'level';










