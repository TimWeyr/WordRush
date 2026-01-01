# Text Parser Update & Item Editing Feature

**Date**: December 23, 2024  
**Status**: ✅ Completed

## Overview

This update enhances the Text Parser with the ability to **edit existing items** and adds **item-level difficulty** support.

## New Features

### 1. Item-Level Difficulty (`level` field for c./d. entries)

Each correct/distractor entry can now have an individual difficulty level (1-10), independent from the round-level.

**Database Changes:**
- Added `level` column to `items` table (INTEGER, default: 1)
- Migration: `docs/migration_add_item_level.sql`

**Type Changes:**
- `CorrectEntry.level?: number` (optional, 1-10)
- `DistractorEntry.level?: number` (optional, 1-10)
- Updated `ItemRow`, `CorrectEntry`, `DistractorEntry` interfaces

**UI Changes:**
- Level dropdown (1-10) next to context field in `DetailView` for each correct/distractor
- Displayed as "Lvl 1" through "Lvl 10"

### 2. Edit Existing Items in Text Parser

Export existing items to text parser, edit them, and save changes back.

**New Tags:**
- `cid.` = Chapter ID (for cross-chapter updates)
- `rid.` = Round ID (identifies item to update)

**Access Points:**
- **TableView**: Click 📝 button on any item
- **DetailView**: Click "📝 Edit in Text Parser" button

**Update Logic:**
- **Base**: Only `context` can be changed (word is immutable)
- **Correct/Distractor**: Matches by `word` → updates `context`, `redirect`, `level`
- **New entries**: Items with new `word` values are added
- **Preserved**: Visual/spawn configs, existing entries (not deleted)
- **Source**: If `s.` line missing, keeps existing value
- **Tags**: `t.` line overwrites all tags

### 3. Enhanced Text Parser Format

**New 4th Parameter for c./d.:**
```
c. word | context | order | level
d. word | redirect | context | level
```

**Example - Creating New Item:**
```
b. Depression | Affektive Störung
c. Freudlosigkeit | Depression zeigt sich durch Freudlosigkeit. | 1 | 2
c. Antriebslosigkeit | Depression zeigt sich durch Antriebslosigkeit. | 2 | 3
d. Wahn | Schizophrenie | Wahn gehört zur Schizophrenie. | 2
s. ICD-10 F3 | Depressive Episode
t. depression | mood | affective
l. 1
```

**Example - Updating Existing Item:**
```
cid. F32_Depression
rid. F32_001
b. Depression | Updated context
c. Freudlosigkeit | NEW context | 1 | 3
c. Hoffnungslosigkeit | New entry | 3 | 2
d. Wahn | Schizophrenie | Updated | 3
s. ICD-10 F3.2
t. depression | major_depressive_disorder
l. 2
```

## Files Modified

### Type Definitions
- `src/types/content.types.ts` - Added `level?` to `CorrectEntry`, `DistractorEntry`
- `src/types/database.types.ts` - Added `level` to `ItemRow`

### Text Parser
- `src/components/Editor/TextParserModal.tsx`
  - Extended `ParsedItemData` with `cid`, `rid`, item-level
  - Added parsing for `cid.`, `rid.` tags
  - Added 4th parameter (level) for `c.` and `d.` lines
  - Created `itemToText()` function for reverse transformation
  - Updated format hints and summary

### UI Components
- `src/components/Editor/DetailView.tsx`
  - Added level dropdown for each correct/distractor
  - Added "📝 Edit in Text Parser" button
  - Integrated TextParserModal with update handling

- `src/components/Editor/TableView.tsx`
  - Added 📝 button to item actions
  - Completely rewrote `handleSaveParsedItem` with UPDATE logic
  - Handles both create and update operations

### Database Layer
- `src/infra/utils/SupabaseLoader.ts`
  - Added `level` parameter to `createItem()` and `updateItem()`
  - Saves item-level when creating correct/distractor entries

- `src/infra/utils/DBToItemTransformer.ts`
  - Maps `item.level` from database to `CorrectEntry.level` / `DistractorEntry.level`

### Documentation
- `public/content/CONTENT_GUIDE.md` - Updated with new features, examples, and usage
- `public/content/content_guide.txt` - Updated format specification
- `docs/migration_add_item_level.sql` - Database migration script

## Technical Details

### Item Matching Logic (Updates)

When `rid.` is provided, the system updates the existing item:

1. **Finds existing item** by round ID
2. **Matches correct/distractor entries** by `word` field:
   - If `word` exists → updates `context`, `redirect`, `level`
   - If `word` is new → creates new entry
   - If `word` not mentioned → preserves existing entry (no deletion)
3. **Preserves** all visual/spawn configurations
4. **Updates** editable fields only: context, redirect, level, source, detail, tags

### Cross-Chapter Updates

With `cid.` tag, items can be moved/updated across chapters:

```
cid. F40.00
rid. F32_001
b. Anxiety Disorder
...
```

This allows restructuring content without manual copying.

### Level System

**Two-Level Difficulty System:**
- **Round Level (`l.`)**: Overall difficulty of the entire round (1-10)
- **Item Level (c./d. 4th param)**: Individual entry difficulty (1-10)

This allows fine-grained difficulty control within a single round.

## Testing

To test the new features:

1. **Create item via text parser** (without `rid.`)
2. **Export to text parser** (click 📝 button)
3. **Edit fields**, add new entries, change levels
4. **Save and verify** changes are applied correctly
5. **Check database** to ensure `level` field is populated
6. **Test DetailView** level dropdowns

## Migration Required

Run the following SQL migration to add `level` column:

```bash
psql -U your_user -d your_database -f docs/migration_add_item_level.sql
```

Or execute manually:
```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_items_level ON items(level);
```

## Known Limitations

- Base `word` cannot be changed (only `context`)
- Correct/Distractor entries are NOT deleted if omitted (by design)
- Visual/spawn configs cannot be edited via text parser (use DetailView)
- Cross-chapter updates require explicit `cid.` tag

## Future Enhancements

- [ ] Support for deleting c./d. entries via special syntax (e.g., `c. -word`)
- [ ] Bulk update mode (update multiple items in one text)
- [ ] Diff preview before saving changes
- [ ] Undo/redo for text parser edits
- [ ] Export entire chapter to text format

## Summary

This update significantly enhances content management workflows:
- ✅ **Item-level difficulty** for granular control
- ✅ **Quick editing** via text parser (faster than DetailView for text changes)
- ✅ **Bulk updates** possible (multiple items in one text)
- ✅ **Preserved configs** ensure visual consistency
- ✅ **Cross-chapter support** for content restructuring

All todos completed successfully! 🎉






