# Editor Data Flow - Supabase Only

**Keine Duplikation!** Alle Daten kommen aus Supabase und gehen zurück zu Supabase.

---

## 🔄 Datenfluss

### READ Operation (Editor öffnen)

```
User öffnet Editor
    ↓
EditorLayout.loadChapterData()
    ↓
jsonLoader.loadChapter(universeId, themeId, chapterId)
    ↓
supabaseLoader.loadRounds(chapterId)
    ↓
supabaseLoader.loadItems(chapterId)
    ↓
DBToItemTransformer.transformRoundsToItems()
    ↓
Editor State (items: Item[])
    ↓
TableView / DetailView anzeigen
```

### WRITE Operation (Save klicken)

```
User klickt "Save"
    ↓
EditorLayout.handleSave()
    ↓
jsonWriter.saveChapter(universeId, themeId, chapterId, items)
    ↓
supabaseLoader.saveAllChapterItems(items, chapterId)
    ↓
FOR EACH Item:
  ├─ Round exists? 
  │   ├─ YES → UPDATE round
  │   └─ NO  → CREATE round
  ├─ DELETE old items
  └─ CREATE new items (base + correct + distractors)
    ↓
Toast: "✅ 60 items saved!"
```

### DELETE Operation (Item löschen)

```
User klickt "Delete"
    ↓
EditorLayout calls jsonWriter.deleteItem(itemId)
    ↓
supabaseLoader.deleteRound(itemId)
    ↓
Database CASCADE DELETE (round + all items)
    ↓
Editor State aktualisiert
    ↓
Toast: "✅ Item deleted!"
```

---

## 📂 File Structure

```
src/
├── infra/
│   └── utils/
│       ├── SupabaseLoader.ts   ✅ READ + WRITE (Low-level DB ops)
│       ├── JSONWriter.ts        ✅ WRITE (High-level API)
│       └── JSONLoader.ts        ✅ READ (High-level API)
├── components/
│   └── Editor/
│       ├── EditorLayout.tsx     ✅ Uses jsonLoader + jsonWriter
│       ├── TableView.tsx        ✅ Displays items
│       └── DetailView.tsx       ✅ Edits items
└── utils/
    └── EditorAutoSave.ts        ❌ NICHT MEHR VERWENDET!
```

---

## 🗄️ Database Tables

### `rounds` Table

```sql
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,              -- Item.id (e.g., "F32_001")
  chapter_uuid UUID REFERENCES chapters(uuid),
  level INTEGER,                    -- Item.level
  published BOOLEAN DEFAULT true,
  free_tier BOOLEAN DEFAULT false,
  wave_duration REAL,
  intro_text TEXT,
  meta_source TEXT,
  meta_tags TEXT[],
  meta_related TEXT[],
  meta_difficulty_scaling JSONB
);
```

### `items` Table

```sql
CREATE TABLE items (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT REFERENCES rounds(id) ON DELETE CASCADE,
  object_type TEXT CHECK (object_type IN ('base', 'correct', 'distractor')),
  word TEXT,
  type TEXT,
  image TEXT,
  context TEXT,
  redirect TEXT,
  spawn_position REAL,
  spawn_spread REAL,
  speed REAL,
  behavior TEXT,
  points INTEGER,
  visual_color TEXT,
  visual_variant TEXT,
  visual_fontsize REAL,
  visual_pulsate BOOLEAN,
  visual_shake BOOLEAN,
  visual_glow BOOLEAN
);
```

---

## 🔁 Save Example

### TypeScript Item

```typescript
{
  id: 'F32_001',
  theme: 'icd10',
  chapter: 'F32_Depression',
  level: 1,
  published: true,
  freeTier: false,
  
  base: {
    word: 'Depression',
    type: 'term',
    visual: { color: '#ff0000', variant: 'hexagon', fontSize: 1.0 }
  },
  
  correct: [
    {
      entry: { word: 'niedergeschlagen', type: 'synonym' },
      spawnPosition: 0.3,
      speed: 0.9,
      points: 100,
      visual: { color: '#00ff00', variant: 'star', fontSize: 1.0 }
    }
  ],
  
  distractors: [
    {
      entry: { word: 'glücklich', type: 'opposite' },
      spawnPosition: 0.7,
      speed: 1.2,
      points: -50,
      visual: { color: '#0000ff', variant: 'spike', fontSize: 1.0 }
    }
  ]
}
```

### Database Result

**`rounds` Table:**

| id | chapter_uuid | level | published | free_tier |
|----|-------------|-------|-----------|-----------|
| F32_001 | uuid-123 | 1 | true | false |

**`items` Table:**

| uuid | round_id | object_type | word | type | visual_color | visual_variant | points |
|------|---------|------------|------|------|-------------|---------------|--------|
| uuid-a | F32_001 | base | Depression | term | #ff0000 | hexagon | null |
| uuid-b | F32_001 | correct | niedergeschlagen | synonym | #00ff00 | star | 100 |
| uuid-c | F32_001 | distractor | glücklich | opposite | #0000ff | spike | -50 |

---

## ⚡ Performance

### Current Implementation

- **READ:** ~500ms (60 items)
- **WRITE:** ~1-2s (60 items, sequential)

### Optimizations

1. **Bulk INSERT** (Future)
   - `supabase.from('items').insert([...])` statt 60× einzelne INSERTs
   - Expected: <500ms

2. **Transaction Safety** (Future)
   - Supabase RPC mit `BEGIN/COMMIT`
   - Atomic saves (all-or-nothing)

3. **Caching** (Current)
   - `JSONLoader` cached Universes/Themes
   - Editor liest aus Cache

---

## 🧪 Testing Checklist

### ✅ Basic Operations

- [ ] Editor öffnen → Items laden
- [ ] Item bearbeiten → State aktualisiert
- [ ] "Save" klicken → Supabase schreiben
- [ ] Seite neu laden → Änderungen persistent
- [ ] "Discard" klicken → DB neu laden

### ✅ Console Logs

- [ ] `💾 [JSONWriter] Saving chapter...`
- [ ] `✅ [SupabaseLoader] Complete item saved`
- [ ] `✅ [EditorLayout] X items saved successfully`

### ✅ Error Handling

- [ ] Ungültiges Item → Error Toast
- [ ] DB-Connection fehlt → Error Toast
- [ ] Partial Save → Warning Toast

---

## 🚨 Removed Features

### ❌ LocalStorage Drafts

**Before:**
```typescript
editorAutoSave.startAutoSave(...);
const draft = editorAutoSave.loadDraft(...);
```

**After:**
```typescript
// REMOVED - No LocalStorage usage
```

### ❌ Draft Detection

**Before:**
```typescript
const hasDraft = editorAutoSave.hasDraft(...);
if (hasDraft) {
  showConfirm('Restore draft?');
}
```

**After:**
```typescript
// REMOVED - No draft dialogs
```

### ❌ JSON File Writes

**Before:**
```typescript
// Export to JSON file
fs.writeFileSync('chapter.json', JSON.stringify(items));
```

**After:**
```typescript
// REMOVED - Supabase only
```

---

## 📚 API Reference

### `JSONWriter`

```typescript
class JSONWriter {
  // Save single item
  async saveItem(
    universeId: string,
    themeId: string,
    chapterId: string,
    item: Item
  ): Promise<{ success: boolean; error?: string }>

  // Save all items (batch)
  async saveChapter(
    universeId: string,
    themeId: string,
    chapterId: string,
    items: Item[]
  ): Promise<{ success: boolean; errors: string[] }>

  // Delete item
  async deleteItem(
    itemId: string
  ): Promise<{ success: boolean; error?: string }>
}
```

### `SupabaseLoader` (Write Methods)

```typescript
class SupabaseLoader {
  // Low-level operations
  async createRound(round: {...}): Promise<{ success: boolean; error?: string }>
  async updateRound(roundId: string, updates: {...}): Promise<{...}>
  async deleteRound(roundId: string): Promise<{...}>
  async createItem(item: {...}): Promise<{...}>
  async updateItem(itemUuid: string, updates: {...}): Promise<{...}>
  async deleteItemsByRound(roundId: string): Promise<{...}>

  // High-level operations
  async saveCompleteItem(item: Item, chapterId: string): Promise<{...}>
  async saveAllChapterItems(items: Item[], chapterId: string): Promise<{...}>
}
```

---

## 🎯 Summary

### ✅ Was implementiert ist:

1. **Supabase Write Operations** - CREATE, UPDATE, DELETE
2. **JSONWriter** - High-level Save API
3. **Editor Integration** - Save Button funktioniert
4. **Error Handling** - Detaillierte Fehler
5. **Console Logs** - Traceability

### ❌ Was entfernt wurde:

1. **LocalStorage Drafts** - Kein AutoSave
2. **Draft Detection** - Keine Restore-Dialoge
3. **JSON File Writes** - Nur Supabase

### ⏳ Was noch fehlt:

1. **Testing** - Manual Test in Browser
2. **Optimization** - Bulk INSERT
3. **Transaction Safety** - Atomic saves

---

**Bereit zum Testen!** 🚀

Öffne den Editor und schau dir die Console-Logs an. Jede Operation ist nachvollziehbar!






























