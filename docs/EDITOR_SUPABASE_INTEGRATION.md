# Editor Supabase Integration

**Status:** ✅ Completed  
**Date:** December 2024  
**Feature Flag:** `VITE_USE_SUPABASE_CONTENT=true` (required)

---

## Overview

The WordRush Editor now **exclusively** reads and writes to Supabase. All LocalStorage drafts and JSON file operations have been removed.

### Key Changes

1. **Write Operations Added**: Editor can now save, update, and delete items in Supabase
2. **AutoSave Removed**: No more LocalStorage drafts - all changes are saved explicitly
3. **Single Source of Truth**: Supabase is the only data source (no JSON fallback in Editor)

---

## Architecture

### Files Modified

#### 1. `src/infra/utils/SupabaseLoader.ts`

**Added Write Operations:**
- `createRound()` - Create new round in database
- `updateRound()` - Update existing round
- `deleteRound()` - Delete round (cascade deletes items)
- `createItem()` - Create base/correct/distractor item
- `updateItem()` - Update existing item
- `deleteItemsByRound()` - Delete all items for a round

**High-Level Operations:**
- `saveCompleteItem(item, chapterId)` - Save complete Item (round + all items)
- `saveAllChapterItems(items, chapterId)` - Batch save all items for chapter

#### 2. `src/infra/utils/JSONWriter.ts` (NEW)

**Purpose:** High-level wrapper for Editor write operations

**Methods:**
- `saveItem(universeId, themeId, chapterId, item)` - Save single item
- `saveChapter(universeId, themeId, chapterId, items)` - Save all items (batch)
- `deleteItem(itemId)` - Delete item

**Features:**
- Feature flag validation (`VITE_USE_SUPABASE_CONTENT=true` required)
- Console logging for traceability
- Error handling with detailed messages

#### 3. `src/components/Editor/EditorLayout.tsx`

**Changes:**
- `handleSave()` - Now uses `jsonWriter.saveChapter()` instead of LocalStorage
- `handleDiscard()` - Reloads from Supabase instead of clearing draft
- **Removed:** AutoSave setup (lines 55-68)
- **Removed:** Draft detection (lines 85-109)
- **Removed:** `editorAutoSave` import and usage

---

## Usage

### Saving Items

```typescript
import { jsonWriter } from '@/infra/utils/JSONWriter';

// Save single item
const result = await jsonWriter.saveItem(
  'psychiatrie',
  'icd10',
  'F32_Depression',
  item
);

if (result.success) {
  console.log('✅ Item saved');
} else {
  console.error('❌ Save failed:', result.error);
}

// Save all items (batch)
const result = await jsonWriter.saveChapter(
  'psychiatrie',
  'icd10',
  'F32_Depression',
  items
);

if (result.success) {
  console.log(`✅ ${items.length} items saved`);
} else {
  console.warn('⚠️ Partial save:', result.errors);
}
```

### Deleting Items

```typescript
const result = await jsonWriter.deleteItem('F32_001');

if (result.success) {
  console.log('✅ Item deleted');
}
```

---

## Database Operations

### Save Flow

When saving an item, the following happens:

1. **Check if round exists** (`SELECT rounds WHERE id = ?`)
2. **If exists:**
   - Update round metadata (`UPDATE rounds`)
   - Delete old items (`DELETE items WHERE round_id = ?`)
   - Re-create all items (`INSERT items`)
3. **If not exists:**
   - Create round (`INSERT rounds`)
   - Create all items (`INSERT items`)

### Transaction Safety

**Note:** Supabase operations are NOT wrapped in transactions in the current implementation. If an operation fails mid-save, partial data may be written.

**Future Enhancement:** Use Supabase RPC functions with `BEGIN/COMMIT` for atomic saves.

---

## Data Structure Mapping

### TypeScript `Item` → Database Tables

```typescript
Item {
  id: string                    → rounds.id
  theme: string                 → rounds.chapter_uuid.theme_uuid.id
  chapter: string               → rounds.chapter_uuid.id
  level: number                 → rounds.level
  published: boolean            → rounds.published
  freeTier: boolean             → rounds.free_tier
  
  base: BaseEntry               → items (object_type = 'base')
  correct: CorrectEntry[]       → items (object_type = 'correct')
  distractors: DistractorEntry[] → items (object_type = 'distractor')
  
  meta: {
    source: string              → rounds.meta_source
    tags: string[]              → rounds.meta_tags
    related: string[]           → rounds.meta_related
    difficultyScaling: {...}    → rounds.meta_difficulty_scaling
  }
}
```

### Visual Config Mapping

```typescript
visual: {
  color: string                 → items.visual_color
  variant: string               → items.visual_variant
  fontSize: number              → items.visual_fontsize
  pulsate: boolean              → items.visual_pulsate
  shake: boolean                → items.visual_shake
  glow: boolean                 → items.visual_glow
}
```

---

## Console Logging

### Save Operations

```
💾 [JSONWriter] Saving chapter F32_Depression (60 items) to Supabase...
⏱️ Chapter save time: 1.234s
💾 [SupabaseLoader] Saving complete item: F32_001
⏱️ Save F32_001: 0.123s
✅ [SupabaseLoader] Complete item saved: F32_001
...
✅ [JSONWriter] Chapter F32_Depression saved successfully
✅ [EditorLayout] 60 items saved successfully!
```

### Error Handling

```
❌ [SupabaseLoader] Failed to create round: duplicate key value
❌ [JSONWriter] Chapter F32_Depression saved with errors:
   - F32_001: duplicate key value
   - F32_002: validation error
⚠️ Saved 58/60 items. 2 failed.
```

---

## Feature Flag

### Required Environment Variable

```bash
# .env.local
VITE_USE_SUPABASE_CONTENT=true
```

**Without this flag:**
- `jsonWriter` methods will return `{ success: false, error: 'Supabase content is not enabled' }`
- Editor will not be able to save changes

---

## Removed Features

### 1. AutoSave to LocalStorage

**Before:**
- Editor auto-saved to LocalStorage every 30 seconds
- Draft flag stored in `localStorage['draft_${universeId}_${themeId}_${chapterId}']`

**After:**
- Removed - all saves are explicit (user clicks "Save")
- No LocalStorage usage

### 2. Draft Detection

**Before:**
- On load, Editor checked for LocalStorage drafts
- Showed dialog: "An unsaved draft was found. Restore?"

**After:**
- Removed - all data is loaded fresh from Supabase

### 3. `EditorAutoSave` Utility

**Status:** Still exists but **not used** in `EditorLayout`

**Future:** Consider deleting `src/utils/EditorAutoSave.ts` entirely

---

## Testing

### Manual Test Steps

1. **Load Editor:**
   ```
   http://localhost:5173/editor/psychiatrie/icd10/F32_Depression
   ```

2. **Edit an item:**
   - Change word, color, or points
   - Click "Save"
   - Check console for `✅ 60 items saved successfully`

3. **Verify in Database:**
   ```sql
   SELECT * FROM rounds WHERE id = 'F32_001';
   SELECT * FROM items WHERE round_id = 'F32_001';
   ```

4. **Reload Page:**
   - Changes should persist
   - No draft dialog should appear

5. **Discard Changes:**
   - Edit an item
   - Click "Discard"
   - Item should revert to database state

---

## Performance

### Batch Save (60 items)

**Current Implementation:** Sequential saves (~1-2s)
- 1 round save + 60 item creates
- Each item is a separate `INSERT`

**Future Optimization:** Bulk INSERT
- Use Supabase `.insert([...])` for batch insert
- Expected: < 500ms for 60 items

### Example Optimization

```typescript
// Current (60 separate INSERTs)
for (const correct of item.correct) {
  await this.createItem({ ... });
}

// Optimized (1 batch INSERT)
const itemsToInsert = item.correct.map(correct => ({ ... }));
await supabase.from('items').insert(itemsToInsert);
```

---

## Known Issues

### 1. No Transaction Safety

**Issue:** If save fails mid-operation, partial data may be written

**Impact:** Corrupt item states (e.g., round exists but items missing)

**Solution:** Use Supabase RPC with transactions

### 2. Sequential Saves

**Issue:** 60 items = 60 separate database calls

**Impact:** Slow save times (~1-2s)

**Solution:** Use bulk INSERT (see Performance section)

### 3. No Conflict Resolution

**Issue:** If 2 editors save simultaneously, last write wins

**Impact:** Data loss

**Solution:** Add version/timestamp checks or optimistic locking

---

## Future Enhancements

### 1. Real-Time Collaboration

- Use Supabase Realtime to sync changes between editors
- Show "User X is editing" indicators

### 2. Change History

- Store edit history in `item_history` table
- Allow reverting to previous versions

### 3. Validation

- Server-side validation (Supabase RPC)
- Prevent invalid data from being saved

### 4. Offline Support

- Cache data in IndexedDB
- Sync changes when online

---

## Troubleshooting

### "Supabase content is not enabled"

**Cause:** `VITE_USE_SUPABASE_CONTENT` not set to `'true'`

**Solution:**
```bash
# .env.local
VITE_USE_SUPABASE_CONTENT=true
```

Restart dev server: `npm run dev`

### "Failed to save: duplicate key value"

**Cause:** Item ID already exists in database

**Solution:** Check if item was already created, or use unique IDs

### "Chapter UUID not found"

**Cause:** Chapter ID does not exist in `chapters` table

**Solution:** Ensure chapter exists in database before saving items

---

## Summary

The Editor now has **full Supabase integration** with no LocalStorage fallback. This ensures:

✅ **Single Source of Truth** - No data duplication  
✅ **Real Database Writes** - Changes persist in Supabase  
✅ **Traceability** - Console logs for all operations  
✅ **Error Handling** - Detailed error messages  

**Next Steps:**
1. Test Editor save/load operations
2. Optimize batch saves (bulk INSERT)
3. Add transaction safety
4. Consider removing `EditorAutoSave.ts`

---

**Last Updated:** December 2024  
**Maintained by:** WordRush Development Team


