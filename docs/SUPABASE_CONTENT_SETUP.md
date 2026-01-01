# Supabase Content Loading - Setup Guide

## 📋 Übersicht

WordRush kann Content-Daten aus zwei Quellen laden:
1. **JSON-Dateien** (Standard) - Statische Dateien im `/content/themes/` Ordner
2. **Supabase Datenbank** (Neu) - Dynamisch aus Supabase geladen

## 🚀 Quick Start

### 1. Environment Variables setzen

Erstelle eine `.env.local` Datei im Projekt-Root:

```env
# Supabase Credentials (von Supabase Dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Content-Quelle: Supabase aktivieren
VITE_USE_SUPABASE_CONTENT=true
```

### 2. App starten

```bash
npm run dev
```

### 3. Console-Logs prüfen

Öffne Browser DevTools → Console. Du solltest sehen:

```
🔄 [JSONLoader] Using Supabase for content loading
🌌 [SupabaseLoader] Loading universes from database...
✅ [SupabaseLoader] Loaded 3 universes
🔄 [Transformer] Transforming universe: englisch (2 themes)
...
```

## 📊 Console-Logs verstehen

### Erfolgreiche Supabase-Ladung:

```
🔄 [JSONLoader] Using Supabase for content loading
🌌 [SupabaseLoader] Loading universes from database...
✅ [SupabaseLoader] Loaded 3 universes
   
🎭 [SupabaseLoader] Loading theme: business_english (universe: englisch)
🌍 [SupabaseLoader] Loading universe: englisch
✅ [SupabaseLoader] Loaded universe: Englisch (UUID: c05fbe5f-...)
✅ [SupabaseLoader] Loaded theme: Business English (UUID: 25e7db0e-...)

📚 [SupabaseLoader] Loading chapters for theme: business_english
✅ [SupabaseLoader] Loaded 6 chapters for theme business_english
   Chapter IDs: Business_Communication, Meetings_Presentations, ...

🎮 [SupabaseLoader] Loading rounds for chapter: Business_Communication
✅ [SupabaseLoader] Loaded 60 rounds for chapter Business_Communication
   Levels found: [1, 2, 3, 4, 5, 6]
   Round IDs: BC_001, BC_002, BC_003, BC_004, BC_005, ...

🎯 [SupabaseLoader] Loading items for 60 rounds...
   First few round IDs: BC_001, BC_002, BC_003, ...
✅ [SupabaseLoader] Loaded 840 items total
   Base: 60, Correct: 360, Distractor: 420

🔄 [Transformer] Transforming 60 rounds with 840 items to Item[]
✅ [Transformer] Successfully transformed 60 items
```

### Fallback zu JSON (bei Fehler):

```
❌ [SupabaseLoader] Failed to load universes: Error: ...
❌ [JSONLoader] Failed to load universes from Supabase, falling back to JSON: Error: ...
📁 [JSONLoader] Using JSON files for content loading
📄 Loaded 60 items from Business_Communication.json
```

## 🔧 Feature-Flag: `VITE_USE_SUPABASE_CONTENT`

### `false` (Standard):
- Lädt Content aus JSON-Dateien
- Keine Supabase-Verbindung nötig
- Funktioniert offline
- Console: `📁 [JSONLoader] Using JSON files for content loading`

### `true`:
- Lädt Content aus Supabase
- Benötigt gültige Supabase-Credentials
- Automatischer Fallback zu JSON bei Fehler
- Console: `🔄 [JSONLoader] Using Supabase for content loading`

## 🎯 Daten-Flow

```
JSONLoader.loadChapter()
    ↓
    [Feature-Flag Check]
    ↓
    ├─ JSON: loadChapterFromJSON()
    │   └─ Lädt .json Dateien aus /content/themes/
    │
    └─ Supabase: loadChapterFromSupabase()
        ↓
        SupabaseLoader.loadRounds(chapterId)
        SupabaseLoader.loadItemsForRounds(roundIds)
        ↓
        DBToItemTransformer.transformRoundsToItems()
        ↓
        Item[] (TypeScript-Objekte)
```

## 📦 Was wurde implementiert

### Neue Dateien:

1. **`src/types/database.types.ts`**
   - DB-Row Interfaces: `UniverseRow`, `ThemeRow`, `ChapterRow`, `RoundRow`, `ItemRow`
   - Repräsentiert rohe Datenbank-Struktur (mit `NULL` statt `undefined`)

2. **`src/infra/utils/SupabaseLoader.ts`**
   - Methoden: `loadUniverses()`, `loadTheme()`, `loadChapters()`, `loadRounds()`, `loadItemsForRounds()`
   - Performance-Optimierung: `getChapterLevelStats()` (für GalaxyMap Level-Ringe)
   - Umfangreiches Console-Logging

3. **`src/infra/utils/DBToItemTransformer.ts`**
   - Transformiert DB-Rows → TypeScript-Objekte
   - `transformRoundsToItems()` - Haupttransformation
   - `transformUniverseRow()`, `transformThemeRow()`, `transformChapterRow()`
   - Validation + Warnings bei fehlenden Daten

### Erweiterte Dateien:

1. **`src/infra/utils/JSONLoader.ts`**
   - Neue Methoden: `loadUniversesFromSupabase()`, `loadThemeFromSupabase()`, `loadChapterFromSupabase()`
   - Private Methoden: `*FromJSON()` (legacy)
   - Public Methoden: Feature-Flag-Switch
   - Automatischer Fallback bei Fehler

## 🧪 Testing

### Manueller Test:

1. **JSON-Modus testen** (Standard):
   ```env
   VITE_USE_SUPABASE_CONTENT=false
   ```
   → App sollte normal funktionieren

2. **Supabase-Modus testen**:
   ```env
   VITE_USE_SUPABASE_CONTENT=true
   ```
   → Prüfe Console-Logs
   → Teste: Universe auswählen → Theme → Chapter → Spiel starten

3. **Fallback testen**:
   - Ungültige Supabase-Credentials setzen
   → App sollte zu JSON zurückfallen

### Code-Stellen die Content laden:

- `src/components/GalaxyMap.tsx` - Universes/Themes/Chapters anzeigen
- `src/components/Game.tsx` - Items für Spiel laden
- `src/components/Editor/EditorLayout.tsx` - Content bearbeiten
- `src/utils/PDFExporter.ts` - PDF-Export

## 📊 Performance-Optimierung: Level-Ringe

### Problem:
GalaxyMap muss Level-Ringe um Planeten (Chapters) anzeigen. Dafür braucht es:
- `maxLevel` - Höchstes Level
- `levelCount` - Anzahl verschiedener Levels
- `levels` - Array aller Levels

**Alt:** Alle Items laden, dann Levels extrahieren → Langsam! 

**Neu:** Aggregat-Query direkt aus DB:

```typescript
const stats = await supabaseLoader.getChapterLevelStats(chapterIds);
// → Map<chapterId, { maxLevel, levelCount, levels[] }>
```

**Vorteil:**
- ✅ Nur 1 Query statt 100+ Items
- ✅ Minimaler Netzwerk-Traffic
- ✅ Keine Item-Objekte im Speicher

### Integration (TODO):

In `src/logic/GalaxyLayout.ts` oder `src/components/GalaxyMap.tsx`:

```typescript
// Statt: Alle Items laden
// const items = await jsonLoader.loadChapter(...);
// const levels = new Set(items.map(i => i.level));

// Neu: Level-Stats aus Supabase
if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
  const stats = await supabaseLoader.getChapterLevelStats(chapterIds);
  const levelCount = stats.get(chapterId)?.levelCount || 0;
  const maxLevel = stats.get(chapterId)?.maxLevel || 1;
}
```

## 🔍 Troubleshooting

### "Failed to load universes: FetchError"
- ✅ Prüfe: Sind `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` korrekt?
- ✅ Prüfe: Ist Supabase-Projekt online?
- ✅ Fallback: App sollte automatisch zu JSON zurückfallen

### "No rounds found for chapter"
- ✅ Prüfe: Existiert der Chapter in der DB?
- ✅ Prüfe: Sind Rounds für diesen Chapter vorhanden?
- ✅ SQL-Check: `SELECT * FROM rounds WHERE chapter_id = 'YOUR_CHAPTER_ID';`

### "Missing base item! Skipping..."
- ⚠️ Warnung: Round hat kein base item (object_type = 'base')
- ✅ Prüfe: `SELECT * FROM items WHERE round_id = 'YOUR_ROUND_ID' AND object_type = 'base';`
- ✅ Fix: Base item in DB hinzufügen

### Console zeigt nur JSON-Logs
- ✅ Prüfe: Ist `VITE_USE_SUPABASE_CONTENT=true` in `.env.local` gesetzt?
- ✅ Prüfe: App neu gestartet? (nach .env Änderung)
- ✅ Prüfe: Browser-Cache geleert?

## 🎨 Chapters.meta JSONB

Chapters können Config in `meta` JSONB-Feld speichern:

```json
{
  "music": "2025_trends_theme.mp3",
  "spawnRate": 1.6,
  "waveDuration": 3,
  "particleEffect": "slang_particles"
}
```

**Transformer extrahiert diese Werte**:

```typescript
// Priority: meta JSONB > direct field > default
const spawnRate = meta.spawnRate ?? row.spawn_rate ?? 1.5;
const music = meta.music ?? row.music ?? undefined;
```

## 📝 Nächste Schritte

- [ ] GalaxyMap: `getChapterLevelStats()` integrieren (Performance)
- [ ] Umfangreiche Tests in allen Code-Stellen
- [ ] Cache-Strategie optimieren
- [ ] Real-time Subscriptions (Supabase) für Live-Updates (später)
- [ ] Offline-Support mit LocalStorage (später)

## 🤝 Support

Bei Problemen:
1. Prüfe Console-Logs (Browser DevTools)
2. Prüfe Supabase Dashboard → Logs
3. Teste Fallback zu JSON

---

**Status**: ✅ Phase 1-3 abgeschlossen - Bereit für Testing!














