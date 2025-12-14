# Universe-Daten aus Supabase laden - TODO

**Status**: ✅ **PHASE 1-3 ABGESCHLOSSEN** - Bereit für Testing!  
**Priorität**: Hoch  
**Ziel**: Spiel läuft mit Content-Daten aus Supabase statt JSON-Dateien  
**Progress bleibt**: LocalStorage (später Cloud-Sync)  
**Implementiert**: 2. Dezember 2024

---

## 🎉 IMPLEMENTATION FERTIG!

**Siehe**:
- 📋 **Quick Start**: `SUPABASE_QUICKSTART.md` (5-Minuten Setup)
- 📚 **Setup Guide**: `docs/SUPABASE_CONTENT_SETUP.md` (Ausführlich)
- 📊 **Implementation Summary**: `docs/SUPABASE_IMPLEMENTATION_SUMMARY.md` (Details)

**Neue Dateien**:
- ✅ `src/types/database.types.ts` (146 Zeilen)
- ✅ `src/infra/utils/SupabaseLoader.ts` (225 Zeilen)
- ✅ `src/infra/utils/DBToItemTransformer.ts` (318 Zeilen)
- ✅ `src/infra/utils/JSONLoader.ts` (erweitert, +200 Zeilen)

**Features**:
- ✅ Feature-Flag: `VITE_USE_SUPABASE_CONTENT` (true/false)
- ✅ Dual-Mode: JSON + Supabase
- ✅ Automatischer Fallback bei Fehler
- ✅ Umfangreiches Console-Logging (🌌🎭📚🎮🎯✅❌⚠️)
- ✅ Performance-Optimierung: `getChapterLevelStats()`
- ✅ Chapters.meta JSONB Support

---

## 📋 Original TODO (für Referenz)

---

## 📋 Übersicht

**Ziel**: 
- ✅ Content-Daten (universes, themes, chapters, rounds, items) aus Supabase laden
- ✅ JSONLoader erweitern um Supabase-Queries
- ✅ Transformation: DB-Daten (flach) → TypeScript Item[] (verschachtelt)
- ⏸️ Offline-Fallback (später)

**Daten-Struktur**:
- **DB (flach)**: `rounds` + `items` (object_type: 'base', 'correct', 'distractor')
- **TypeScript (verschachtelt)**: `Item { id, base, correct[], distractors[] }`
- **Transformation nötig**: DB-Daten gruppieren nach `round_id` → Item-Objekte

**Referenzen**:
- `docs/table_fields.json` - Zeigt für jedes Feld: json_source, code_references, usage
- `docs/example.data.json` - Zeigt DB-Datenstruktur (flach)
- `src/types/content.types.ts` - TypeScript Interfaces

---

## ✅ Bereits vorhanden

1. **Supabase Client** ✅
   - `src/infra/supabase/client.ts` - Singleton Client
   - `@supabase/supabase-js` installiert

2. **Daten in Supabase** ✅
   - Daten sind bereits in DB (siehe `docs/example.data.json`)
   - Tabellen: `universes`, `themes`, `chapters`, `rounds`, `items`

3. **Schema-Dokumentation** ✅
   - `docs/table_fields.json` - Vollständig dokumentiert mit Code-Referenzen

---

## 📦 Schritte (Reihenfolge)

### Phase 1: Daten-Mapping verstehen (Tag 1)

- [ ] **DB-Struktur analysieren**
  - [ ] `docs/example.data.json` analysieren (flache Struktur)
  - [ ] Verstehen: Wie werden `rounds` + `items` zu `Item[]` transformiert?
  - [ ] Mapping: `round_id` gruppiert items (base, correct, distractor)

- [ ] **TypeScript-Types prüfen**
  - [ ] `src/types/content.types.ts` - Item Interface verstehen
  - [ ] Unterschied: DB (flach) vs. TypeScript (verschachtelt)
  - [ ] Transformation-Logik planen

- [ ] **Code-Referenzen sammeln**
  - [ ] `docs/table_fields.json` durchgehen
  - [ ] Für jedes Feld: Wo wird es im Code verwendet?
  - [ ] Mapping-Tabelle erstellen: DB-Feld → TypeScript-Feld

### Phase 2: Supabase-Queries erstellen (Tag 1-2)

- [ ] **Helper-Funktionen für Supabase-Queries**
  - [ ] Datei: `src/infra/utils/SupabaseLoader.ts` (neu)
  - [ ] Methoden:
    - `loadUniversesFromDB()` - Query: `SELECT * FROM universes WHERE available = true`
    - `loadThemeFromDB(universeId, themeId)` - Query: `SELECT * FROM themes WHERE id = ? AND universe_uuid = ?`
    - `loadChaptersFromDB(themeId)` - Query: `SELECT * FROM chapters WHERE themes_uuid = ?`
    - `loadRoundsFromDB(chapterId, level?)` - Query: `SELECT * FROM rounds WHERE chapter_id = ? [AND level = ?]`
    - `loadItemsFromDB(roundId)` - Query: `SELECT * FROM items WHERE round_id = ? ORDER BY object_type, sort_order`
    - `getChapterLevelStats(chapterIds[])` **🎯 PERFORMANCE** - Query: `SELECT chapter_id, level FROM rounds WHERE chapter_id IN (...) AND published = true` (Aggregation für Level-Ringe)

- [ ] **Query-Optimierung**
  - [ ] JOINs verwenden wo sinnvoll
  - [ ] Indexes prüfen (siehe `docs/table_fields.json`)
  - [ ] Filter: `published = true`, `freeTier` für Gäste

### Phase 3: Transformation: DB → Item[] (Tag 2)

- [ ] **Transform-Funktion erstellen**
  - [ ] Datei: `src/infra/utils/DBToItemTransformer.ts` (neu)
  - [ ] Funktion: `transformRoundsToItems(rounds: Round[], items: ItemRow[]): Item[]`
  - [ ] Logik:
    1. Gruppiere `items` nach `round_id`
    2. Für jeden `round`:
       - Finde `base` item (object_type = 'base')
       - Finde alle `correct` items (object_type = 'correct')
       - Finde alle `distractor` items (object_type = 'distractor')
    3. Baue `Item`-Objekt:
       ```typescript
       {
         id: round.id,
         theme: round.theme_id,
         chapter: round.chapter_id,
         level: round.level,
         published: round.published,
         freeTier: round.free_tier,
         waveDuration: round.wave_duration,
         introText: round.intro_text,
         base: transformBaseItem(baseItem),
         correct: correctItems.map(transformCorrectItem),
         distractors: distractorItems.map(transformDistractorItem),
         meta: {
           source: round.meta_source,
           tags: round.meta_tags,
           related: round.meta_related,
           difficultyScaling: round.meta_difficulty_scaling
         }
       }
       ```

- [ ] **Visual-Config Transformation**
  - [ ] `transformVisualConfig(itemRow)` - Baut `VisualConfig` aus DB-Feldern
  - [ ] Felder: `color`, `variant`, `pulsate`, `shake`, `glow`, `font_size`, `tier`, `size`, `appearance`

- [ ] **Base/Correct/Distractor Transformation**
  - [ ] `transformBaseItem(itemRow)` - Baut `BaseEntry`
  - [ ] `transformCorrectItem(itemRow)` - Baut `CorrectEntry`
  - [ ] `transformDistractorItem(itemRow)` - Baut `DistractorEntry`

### Phase 4: JSONLoader erweitern (Tag 2-3)

- [ ] **JSONLoader erweitern**
  - [ ] Datei: `src/infra/utils/JSONLoader.ts` erweitern
  - [ ] Feature-Flag: `VITE_USE_SUPABASE_CONTENT=true/false`
  - [ ] Neue Methoden:
    - `loadUniversesFromSupabase()` - Lädt aus DB
    - `loadThemeFromSupabase()` - Lädt aus DB
    - `loadChapterFromSupabase()` - Lädt rounds + items, transformiert zu Item[]

- [ ] **loadUniverses() erweitern**
  ```typescript
  async loadUniverses(): Promise<Universe[]> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      return await this.loadUniversesFromSupabase();
    }
    // Fallback zu JSON (aktueller Code)
    return await this.loadUniversesFromJSON();
  }
  ```

- [ ] **loadTheme() erweitern**
  ```typescript
  async loadTheme(universeId: string, themeId: string): Promise<Theme | null> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      return await this.loadThemeFromSupabase(universeId, themeId);
    }
    // Fallback zu JSON
    return await this.loadThemeFromJSON(universeId, themeId);
  }
  ```

- [ ] **loadChapter() erweitern** **🎯 WICHTIGSTE ÄNDERUNG**
  ```typescript
  async loadChapter(universeId: string, themeId: string, chapterId: string, filterPublished: boolean = false): Promise<Item[]> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      // 1. Lade rounds für chapter
      const rounds = await supabaseLoader.loadRoundsFromDB(chapterId);
      
      // 2. Lade items für alle rounds
      const roundIds = rounds.map(r => r.id);
      const items = await supabaseLoader.loadItemsForRounds(roundIds);
      
      // 3. Transformiere zu Item[]
      const transformedItems = transformRoundsToItems(rounds, items);
      
      // 4. Filter published
      if (filterPublished) {
        return transformedItems.filter(item => item.published !== false);
      }
      
      return transformedItems;
    }
    // Fallback zu JSON
    return await this.loadChapterFromJSON(universeId, themeId, chapterId, filterPublished);
  }
  ```

- [ ] **loadAllThemeItems() erweitern**
  - [ ] Lädt alle chapters eines themes aus Supabase
  - [ ] Kombiniert alle items

### Phase 5: Universe/Theme Transformation (Tag 3)

- [ ] **Universe Transformation**
  - [ ] DB → `Universe` Interface
  - [ ] Felder: `id`, `name`, `colorPrimary`, `colorAccent`, `backgroundGradient`, etc.
  - [ ] `themes` Array: Lade alle themes für universe

- [ ] **Theme Transformation**
  - [ ] DB → `Theme` Interface
  - [ ] `chapters`: Lade alle chapters für theme → `Record<string, ChapterConfig>`
  - [ ] ChapterConfig aus DB: `title`, `backgroundGradient`, `spawnRate`, etc.

### Phase 6: Testing & Validierung (Tag 3-4)

- [ ] **Unit Tests**
  - [ ] Transform-Funktionen testen
  - [ ] DB-Daten → Item[] Transformation validieren
  - [ ] Edge Cases: fehlende base/correct/distractor items

- [ ] **Integration Tests**
  - [ ] `Game.tsx` lädt Items aus Supabase
  - [ ] `GalaxyMap.tsx` lädt Universes/Themes aus Supabase
  - [ ] `EditorLayout.tsx` lädt Content aus Supabase

- [ ] **Validierung**
  - [ ] Vergleich: JSON-Daten vs. Supabase-Daten
  - [ ] Alle Felder korrekt gemappt?
  - [ ] Performance: Ladezeiten messen

- [ ] **Performance-Optimierung: Level-Ringe** **🎯 WICHTIG**
  - [ ] **Problem**: Aktuell werden alle Items geladen, um Level-Ringe zu berechnen
    - `calculateLevelRings()` in `src/logic/GalaxyLayout.ts` (Zeile 625-681)
    - `calculateMoonPositionsAdaptive()` in `src/logic/GalaxyLayout.ts` (Zeile 231-523)
    - Extrahiert Levels aus Items: `const levels = new Set(items.map(item => item.level))`
    - Berechnet `levelCount`, `maxLevel` für jeden Chapter/Moon
  - [ ] **Lösung**: Supabase Aggregat-Query statt alle Items laden
    ```sql
    -- Effiziente Query für Level-Statistiken pro Chapter
    SELECT 
      chapter_id,
      MAX(level) as max_level,
      COUNT(DISTINCT level) as level_count,
      ARRAY_AGG(DISTINCT level ORDER BY level) as levels
    FROM rounds
    WHERE chapter_id IN (?, ?, ...)  -- Alle Chapters eines Themes
      AND published = true
    GROUP BY chapter_id;
    ```
  - [ ] **Vorteile**:
    - ✅ **Performance**: Nur 1 Query statt 100+ Items laden
    - ✅ **Bandwidth**: Nur Aggregat-Daten statt komplette Items
    - ✅ **Memory**: Keine Item-Objekte im Speicher für Layout-Berechnung
    - ✅ **Schneller**: DB-Aggregation ist optimiert
  - [ ] **Implementierung**:
    - Neue Methode: `SupabaseLoader.getChapterLevelStats(chapterIds: string[])`
    - Gibt zurück: `Map<chapterId, { maxLevel, levelCount, levels[] }>`
    - Verwendung in `GalaxyMap.calculateLayouts()`:
      ```typescript
      // Statt: Alle Items laden
      // const chapterItems = itemsToLayout.filter(...);
      
      // Neu: Level-Stats aus DB
      const levelStats = await supabaseLoader.getChapterLevelStats(chapterIds);
      const levelCount = levelStats.get(chapterId)?.levelCount || 0;
      const maxLevel = levelStats.get(chapterId)?.maxLevel || 1;
      ```
  - [ ] **Code-Stellen**:
    - `src/logic/GalaxyLayout.ts:254` - `calculateMoonPositionsAdaptive()` - `levelCount` Berechnung
    - `src/logic/GalaxyLayout.ts:534` - `calculateMoonRingExtent()` - `maxLevel` Berechnung
    - `src/logic/GalaxyLayout.ts:635` - `calculateLevelRings()` - `levels` Set-Berechnung
    - `src/components/GalaxyMap.tsx:499` - `calculateLevelRings()` Aufruf

### Phase 7: Environment & Deployment (Tag 4)

- [ ] **Environment Variables**
  - [ ] `.env.local`: `VITE_USE_SUPABASE_CONTENT=true`
  - [ ] `.env.example`: Template erstellen

- [ ] **Error Handling**
  - [ ] Supabase-Fehler abfangen
  - [ ] Logging für Debugging
  - [ ] User-Feedback bei Fehlern

---

## 🔧 Technische Details

### Daten-Transformation: DB → Item[]

**Problem**: DB hat flache Struktur, TypeScript braucht verschachtelte Struktur

**DB-Struktur** (aus `example.data.json`):
```json
{
  "round_id": "F10_012",
  "object_type": "base",
  "word": "Tremor",
  "type": "Entzugssymptom",
  "color": "#d97757",
  "pulsate": true
}
```

**TypeScript-Struktur** (aus `content.types.ts`):
```typescript
{
  id: "F10_012",
  base: {
    word: "Tremor",
    type: "Entzugssymptom",
    visual: {
      color: "#d97757",
      pulsate: true
    }
  },
  correct: [...],
  distractors: [...]
}
```

**Lösung**: 
1. Lade alle `rounds` für chapter
2. Lade alle `items` für diese rounds
3. Gruppiere items nach `round_id` und `object_type`
4. Transformiere zu Item-Objekten

### Mapping-Tabelle: DB-Feld → TypeScript-Feld

**Universes**:
- `id` → `id`
- `name` → `name`
- `color_primary` → `colorPrimary`
- `color_accent` → `colorAccent`
- `background_gradient` → `backgroundGradient`
- `laser_color` → `laserColor`
- `icon` → `icon`
- `available` → `available`
- `language` → `language`
- `music` → `music` (JSONB oder TEXT)
- `particle_effect` → `particleEffect`
- `ship_skin` → `shipSkin`
- `meta` → `meta` (JSONB)

**Themes**:
- `id` → `id`
- `name` → `name`
- `color_primary` → `colorPrimary`
- `color_accent` → `colorAccent`
- `background_gradient` → `backgroundGradient`
- `laser_color` → `laserColor`
- `icon` → `icon`
- `available` → `available`
- `language` → `language`
- `chapters` → Lade aus `chapters` Tabelle → `Record<string, ChapterConfig>`

**Chapters**:
- `id` → Key in `Theme.chapters`
- `title` → `ChapterConfig.title`
- `background_gradient` → `ChapterConfig.backgroundGradient`
- `spawn_rate` → `ChapterConfig.spawnRate`
- `music` → `ChapterConfig.music`
- `particle_effect` → `ChapterConfig.particleEffect`

**Rounds → Items**:
- `rounds.id` → `Item.id`
- `rounds.chapter_id` → `Item.chapter`
- `rounds.level` → `Item.level`
- `rounds.published` → `Item.published`
- `rounds.free_tier` → `Item.freeTier`
- `rounds.wave_duration` → `Item.waveDuration`
- `rounds.intro_text` → `Item.introText`
- `rounds.meta_source` → `Item.meta.source`
- `rounds.meta_tags` → `Item.meta.tags`
- `rounds.meta_related` → `Item.meta.related`
- `rounds.meta_difficulty_scaling` → `Item.meta.difficultyScaling`

**Items → Base/Correct/Distractor**:
- `items.word` → `base.word` / `correct[].entry.word` / `distractors[].entry.word`
- `items.type` → `base.type` / `correct[].entry.type` / `distractors[].entry.type`
- `items.image` → `base.image` / `correct[].entry.image` / `distractors[].entry.image`
- `items.color` → `base.visual.color` / `correct[].visual.color` / `distractors[].visual.color`
- `items.variant` → `visual.variant`
- `items.pulsate` → `visual.pulsate`
- `items.shake` → `visual.shake`
- `items.glow` → `visual.glow`
- `items.font_size` → `visual.fontSize`
- `items.tier` → `visual.tier` (nur base)
- `items.size` → `visual.size` (nur base)
- `items.appearance` → `visual.appearance` (nur base)
- `items.spawn_position` → `correct[].spawnPosition` / `distractors[].spawnPosition`
- `items.spawn_spread` → `correct[].spawnSpread` / `distractors[].spawnSpread`
- `items.speed` → `correct[].speed` / `distractors[].speed`
- `items.points` → `correct[].points` / `distractors[].points`
- `items.pattern` → `correct[].pattern`
- `items.behavior` → `distractors[].behavior`
- `items.damage` → `distractors[].damage`
- `items.redirect` → `distractors[].redirect`
- `items.context` → `correct[].context` / `distractors[].context`
- `items.collectionorder` → `correct[].collectionOrder`
- `items.hp` → `correct[].hp` / `distractors[].hp`
- `items.sound` → `correct[].sound` / `distractors[].sound`

---

## 📁 Dateien die erstellt/geändert werden

### Neu zu erstellen:
- [ ] `src/infra/utils/SupabaseLoader.ts` - Supabase-Queries
- [ ] `src/infra/utils/DBToItemTransformer.ts` - Transformation DB → Item[]

### Zu erweitern:
- [ ] `src/infra/utils/JSONLoader.ts` - Supabase-Integration
- [ ] `.env.local` - Feature-Flag hinzufügen
- [ ] `.env.example` - Template

### Referenz-Dateien:
- ✅ `docs/table_fields.json` - Feld-Mapping & Code-Referenzen
- ✅ `docs/example.data.json` - DB-Datenstruktur
- ✅ `src/types/content.types.ts` - TypeScript Interfaces

---

## 🎯 Wichtige Code-Stellen

### Wo wird JSONLoader verwendet:

1. **Game.tsx** (Zeile 10, 132, 135)
   - `jsonLoader.loadChapter()` - Lädt Items für Spiel
   - `jsonLoader.loadAllThemeItems()` - Chaotic Mode

2. **GalaxyMap.tsx** (Zeile 32, 263, 368, 411, 418)
   - `jsonLoader.loadUniverses()` - Lädt alle Universes
   - `jsonLoader.loadUniverse()` - Lädt einzelnes Universe
   - `jsonLoader.loadTheme()` - Lädt Theme
   - `jsonLoader.loadChapter()` - Lädt Items für Progress-Berechnung

3. **EditorLayout.tsx** (Zeile 11, 73, 87, 92, 118, 125, 151, 155, 183, 192)
   - `jsonLoader.loadUniverses()` - Universe-Liste
   - `jsonLoader.loadUniverse()` - Universe-Details
   - `jsonLoader.loadTheme()` - Theme-Details
   - `jsonLoader.loadChapter()` - Chapter-Items für Editor

4. **PDFExporter.ts** (Zeile 7, 70, 79, 84, 101, 107, 125, 129, 561)
   - `jsonLoader.loadUniverse()` - PDF-Export
   - `jsonLoader.loadTheme()` - PDF-Export
   - `jsonLoader.loadChapter()` - PDF-Export

5. **UniverseSelector.tsx** (Zeile 4, 42, 59, 87, 97)
   - `jsonLoader.loadUniverses()` - Universe-Auswahl
   - `jsonLoader.loadTheme()` - Theme-Auswahl

**Alle diese Stellen müssen funktionieren mit Supabase-Daten!**

---

## 🔍 Feld-Mapping Details (aus table_fields.json)

### Universes-Tabelle → Universe Interface

| DB-Feld | TypeScript-Feld | Code-Referenz |
|---------|----------------|---------------|
| `id` | `id` | `src/infra/utils/JSONLoader.ts:71,78` |
| `name` | `name` | `src/types/content.types.ts:5` |
| `color_primary` | `colorPrimary` | `src/components/GalaxyRenderer.ts:56,75` |
| `color_accent` | `colorAccent` | `src/components/GalaxyMap.tsx:308` |
| `background_gradient` | `backgroundGradient` | `src/components/GalaxyMap.tsx:789,790` |
| `laser_color` | `laserColor` | `src/entities/Laser.ts:14,55` |
| `icon` | `icon` | `src/components/UniverseSelector.tsx:90` |
| `available` | `available` | `src/infra/utils/JSONLoader.ts:59` |
| `language` | `language` | `src/types/content.types.ts:12` |
| `music` | `music` | `src/types/content.types.ts:13` |
| `particle_effect` | `particleEffect` | `src/types/content.types.ts:17` |
| `ship_skin` | `shipSkin` | `src/entities/Ship.ts:50` |
| `meta` | `meta` | `src/types/content.types.ts:23` |

### Themes-Tabelle → Theme Interface

| DB-Feld | TypeScript-Feld | Code-Referenz |
|---------|----------------|---------------|
| `id` | `id` | `src/infra/utils/JSONLoader.ts:97,409` |
| `name` | `name` | `src/components/GalaxyRenderer.ts:200` |
| `color_primary` | `colorPrimary` | `src/components/GalaxyRenderer.ts:56,75,354` |
| `color_accent` | `colorAccent` | `src/components/GalaxyMap.tsx:308` |
| `background_gradient` | `backgroundGradient` | `src/types/content.types.ts:36` |
| `laser_color` | `laserColor` | `src/components/Game.tsx:307` |
| `icon` | `icon` | `src/components/GalaxyRenderer.ts:150` |
| `chapters` | `chapters` | Lade aus `chapters` Tabelle → `Record<string, ChapterConfig>` |

### Chapters-Tabelle → ChapterConfig

| DB-Feld | TypeScript-Feld | Code-Referenz |
|---------|----------------|---------------|
| `id` | Key in `Theme.chapters` | `src/types/content.types.ts:42` |
| `title` | `title` | `src/types/content.types.ts:55` |
| `background_gradient` | `backgroundGradient` | `src/components/Game.tsx:667,670,673,677` |
| `spawn_rate` | `spawnRate` | `src/types/content.types.ts:58` |
| `music` | `music` | `src/types/content.types.ts:60` |
| `particle_effect` | `particleEffect` | `src/types/content.types.ts:61` |

### Rounds + Items → Item Interface

**Rounds-Tabelle**:
- `id` → `Item.id`
- `chapter_id` → `Item.chapter`
- `level` → `Item.level`
- `published` → `Item.published`
- `free_tier` → `Item.freeTier`
- `wave_duration` → `Item.waveDuration`
- `intro_text` → `Item.introText`
- `meta_source` → `Item.meta.source`
- `meta_tags` → `Item.meta.tags`
- `meta_related` → `Item.meta.related`
- `meta_difficulty_scaling` → `Item.meta.difficultyScaling`

**Items-Tabelle** (object_type = 'base'):
- `word` → `Item.base.word`
- `type` → `Item.base.type`
- `image` → `Item.base.image`
- `color` → `Item.base.visual.color`
- `variant` → `Item.base.visual.variant`
- `pulsate` → `Item.base.visual.pulsate`
- `glow` → `Item.base.visual.glow`
- `tier` → `Item.base.visual.tier`
- `size` → `Item.base.visual.size`
- `appearance` → `Item.base.visual.appearance`
- `font_size` → `Item.base.visual.fontSize`

**Items-Tabelle** (object_type = 'correct'):
- `word` → `Item.correct[].entry.word`
- `type` → `Item.correct[].entry.type`
- `image` → `Item.correct[].entry.image`
- `spawn_position` → `Item.correct[].spawnPosition`
- `spawn_spread` → `Item.correct[].spawnSpread`
- `spawn_delay` → `Item.correct[].spawnDelay`
- `speed` → `Item.correct[].speed`
- `points` → `Item.correct[].points`
- `pattern` → `Item.correct[].pattern`
- `hp` → `Item.correct[].hp`
- `collectionorder` → `Item.correct[].collectionOrder`
- `context` → `Item.correct[].context`
- `color` → `Item.correct[].visual.color`
- `variant` → `Item.correct[].visual.variant`
- `pulsate` → `Item.correct[].visual.pulsate`
- `font_size` → `Item.correct[].visual.fontSize`
- `sound` → `Item.correct[].sound`

**Items-Tabelle** (object_type = 'distractor'):
- `word` → `Item.distractors[].entry.word`
- `type` → `Item.distractors[].entry.type`
- `image` → `Item.distractors[].entry.image`
- `spawn_position` → `Item.distractors[].spawnPosition`
- `spawn_spread` → `Item.distractors[].spawnSpread`
- `spawn_delay` → `Item.distractors[].spawnDelay`
- `speed` → `Item.distractors[].speed`
- `points` → `Item.distractors[].points`
- `behavior` → `Item.distractors[].behavior`
- `damage` → `Item.distractors[].damage`
- `redirect` → `Item.distractors[].redirect`
- `context` → `Item.distractors[].context`
- `hp` → `Item.distractors[].hp`
- `color` → `Item.distractors[].visual.color`
- `variant` → `Item.distractors[].visual.variant`
- `pulsate` → `Item.distractors[].visual.pulsate`
- `shake` → `Item.distractors[].visual.shake`
- `font_size` → `Item.distractors[].visual.fontSize`
- `sound` → `Item.distractors[].sound`

---

## 🚨 Wichtige Hinweise

### 1. Feld-Namen Mapping
- **DB**: snake_case (`color_primary`, `background_gradient`)
- **TypeScript**: camelCase (`colorPrimary`, `backgroundGradient`)
- **Transformation nötig**: DB → TypeScript

### 2. JSONB-Felder
- `background_gradient`: Array von Strings → `string[]`
- `meta_difficulty_scaling`: JSONB → `{ speedMultiplierPerReplay, colorContrastFade, angleVariance }`
- `meta_tags`: TEXT[] → `string[]`
- `meta_related`: TEXT[] → `string[]`

### 3. NULL-Handling
- Viele Felder sind `NULLABLE` in DB
- TypeScript erwartet `undefined` für optionale Felder
- Transformation: `NULL` → `undefined`

### 4. Gruppierung
- Items müssen nach `round_id` gruppiert werden
- Innerhalb eines rounds: nach `object_type` trennen (base, correct, distractor)
- `sort_order` beachten für Reihenfolge

### 5. Filter
- `published = true` (default: true)
- `freeTier = true` für Gäste (wenn `!user`)
- `level` Filter (wenn `levelFilter` gesetzt)

---

## 📝 Implementierungs-Beispiel

### SupabaseLoader.ts (Ausschnitt)

```typescript
import { supabase } from '@/infra/supabase/client';

export class SupabaseLoader {
  async loadUniverses(): Promise<UniverseRow[]> {
    const { data, error } = await supabase
      .from('universes')
      .select('*')
      .eq('available', true);
    
    if (error) throw error;
    return data || [];
  }

  async loadTheme(universeId: string, themeId: string): Promise<ThemeRow | null> {
    // 1. Lade universe um UUID zu bekommen
    const { data: universe } = await supabase
      .from('universes')
      .select('uuid')
      .eq('id', universeId)
      .single();
    
    if (!universe) return null;
    
    // 2. Lade theme
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('id', themeId)
      .eq('universe_uuid', universe.uuid)
      .single();
    
    if (error) return null;
    return data;
  }

  async loadChapters(themeId: string): Promise<ChapterRow[]> {
    // 1. Lade theme UUID
    const { data: theme } = await supabase
      .from('themes')
      .select('uuid')
      .eq('id', themeId)
      .single();
    
    if (!theme) return [];
    
    // 2. Lade chapters
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('themes_uuid', theme.uuid);
    
    if (error) return [];
    return data || [];
  }

  async loadRounds(chapterId: string, level?: number): Promise<RoundRow[]> {
    let query = supabase
      .from('rounds')
      .select('*')
      .eq('chapter_id', chapterId);
    
    if (level !== undefined) {
      query = query.eq('level', level);
    }
    
    const { data, error } = await query;
    
    if (error) return [];
    return data || [];
  }

  async loadItems(roundIds: string[]): Promise<ItemRow[]> {
    if (roundIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('round_id', roundIds)
      .order('round_id')
      .order('object_type')
      .order('sort_order', { ascending: true });
    
    if (error) return [];
    return data || [];
  }

  /**
   * Get level statistics for chapters (optimized for GalaxyMap layout calculation)
   * Instead of loading all items, use SQL aggregation
   */
  async getChapterLevelStats(chapterIds: string[]): Promise<Map<string, { maxLevel: number; levelCount: number; levels: number[] }>> {
    if (chapterIds.length === 0) return new Map();
    
    const { data, error } = await supabase
      .from('rounds')
      .select('chapter_id, level')
      .in('chapter_id', chapterIds)
      .eq('published', true);
    
    if (error) return new Map();
    
    // Group by chapter_id and calculate stats
    const statsMap = new Map<string, { maxLevel: number; levelCount: number; levels: number[] }>();
    
    const chapterLevels = new Map<string, Set<number>>();
    for (const row of data || []) {
      if (!chapterLevels.has(row.chapter_id)) {
        chapterLevels.set(row.chapter_id, new Set());
      }
      chapterLevels.get(row.chapter_id)!.add(row.level);
    }
    
    for (const [chapterId, levels] of chapterLevels) {
      const levelsArray = Array.from(levels).sort((a, b) => a - b);
      statsMap.set(chapterId, {
        maxLevel: Math.max(...levelsArray),
        levelCount: levelsArray.length,
        levels: levelsArray
      });
    }
    
    return statsMap;
  }
}
```

### DBToItemTransformer.ts (Ausschnitt)

```typescript
import type { Item, BaseEntry, CorrectEntry, DistractorEntry, VisualConfig } from '@/types/content.types';

interface RoundRow {
  id: string;
  chapter_id: string;
  level: number;
  published: boolean;
  free_tier: boolean;
  wave_duration?: number;
  intro_text?: string;
  meta_source?: string;
  meta_tags?: string[];
  meta_related?: string[];
  meta_difficulty_scaling?: any;
}

interface ItemRow {
  round_id: string;
  object_type: 'base' | 'correct' | 'distractor';
  word?: string;
  type: string;
  image?: string;
  color?: string;
  variant?: string;
  pulsate?: boolean;
  shake?: boolean;
  glow?: boolean;
  tier?: number;
  size?: number;
  appearance?: string;
  font_size?: number;
  spawn_position?: number;
  spawn_spread?: number;
  spawn_delay?: number;
  speed?: number;
  points?: number;
  pattern?: string;
  behavior?: string;
  damage?: number;
  redirect?: string;
  context?: string;
  hp?: number;
  collectionorder?: number;
  sound?: string;
  sort_order?: number;
}

export function transformRoundsToItems(rounds: RoundRow[], items: ItemRow[]): Item[] {
  // Gruppiere items nach round_id
  const itemsByRound = new Map<string, ItemRow[]>();
  for (const item of items) {
    if (!itemsByRound.has(item.round_id)) {
      itemsByRound.set(item.round_id, []);
    }
    itemsByRound.get(item.round_id)!.push(item);
  }
  
  // Transformiere jeden round zu Item
  return rounds.map(round => {
    const roundItems = itemsByRound.get(round.id) || [];
    
    // Trenne nach object_type
    const baseItem = roundItems.find(i => i.object_type === 'base');
    const correctItems = roundItems.filter(i => i.object_type === 'correct');
    const distractorItems = roundItems.filter(i => i.object_type === 'distractor');
    
    // Transformiere
    const item: Item = {
      id: round.id,
      theme: '', // Wird später gesetzt
      chapter: round.chapter_id,
      level: round.level,
      published: round.published ?? true,
      freeTier: round.free_tier ?? false,
      waveDuration: round.wave_duration,
      introText: round.intro_text,
      base: baseItem ? transformBaseItem(baseItem) : createDefaultBase(),
      correct: correctItems.map(transformCorrectItem),
      distractors: distractorItems.map(transformDistractorItem),
      meta: {
        source: round.meta_source,
        tags: round.meta_tags,
        related: round.meta_related,
        difficultyScaling: round.meta_difficulty_scaling || {
          speedMultiplierPerReplay: 1.1,
          colorContrastFade: false
        }
      }
    };
    
    return item;
  });
}

function transformBaseItem(item: ItemRow): BaseEntry {
  return {
    word: item.word,
    type: item.type,
    image: item.image,
    visual: transformVisualConfig(item, 'base')
  };
}

function transformCorrectItem(item: ItemRow): CorrectEntry {
  return {
    entry: {
      word: item.word,
      type: item.type,
      image: item.image
    },
    spawnPosition: item.spawn_position ?? 0.5,
    spawnSpread: item.spawn_spread ?? 0.05,
    spawnDelay: item.spawn_delay,
    speed: item.speed ?? 0.9,
    points: item.points ?? 200,
    pattern: item.pattern ?? 'linear_inward',
    hp: item.hp ?? 1,
    collectionOrder: item.collectionorder,
    context: item.context || '',
    visual: transformVisualConfig(item, 'correct'),
    sound: item.sound
  };
}

function transformDistractorItem(item: ItemRow): DistractorEntry {
  return {
    entry: {
      word: item.word,
      type: item.type,
      image: item.image
    },
    spawnPosition: item.spawn_position ?? 0.5,
    spawnSpread: item.spawn_spread ?? 0.05,
    spawnDelay: item.spawn_delay,
    speed: item.speed ?? 1.1,
    points: item.points ?? 100,
    behavior: item.behavior,
    damage: item.damage ?? 1,
    redirect: item.redirect || '',
    context: item.context || '',
    hp: item.hp ?? 1,
    visual: transformVisualConfig(item, 'distractor'),
    sound: item.sound
  };
}

function transformVisualConfig(item: ItemRow, type: 'base' | 'correct' | 'distractor'): VisualConfig {
  const visual: VisualConfig = {
    color: item.color,
    variant: item.variant,
    pulsate: item.pulsate ?? false,
    shake: item.shake ?? false,
    glow: item.glow ?? false,
    fontSize: item.font_size
  };
  
  // Nur für base items
  if (type === 'base') {
    visual.tier = item.tier;
    visual.size = item.size;
    visual.appearance = item.appearance;
  }
  
  return visual;
}
```

---

## ✅ Checkliste

### Vorbereitung
- [ ] `docs/table_fields.json` durchgelesen
- [ ] `docs/example.data.json` analysiert
- [ ] `src/types/content.types.ts` verstanden
- [ ] Mapping-Tabelle erstellt

### Implementation
- [ ] `SupabaseLoader.ts` erstellt
- [ ] `DBToItemTransformer.ts` erstellt
- [ ] `JSONLoader.ts` erweitert
- [ ] Environment Variables gesetzt

### Testing
- [ ] `loadUniverses()` funktioniert
- [ ] `loadTheme()` funktioniert
- [ ] `loadChapter()` funktioniert
- [ ] Game.tsx lädt Items aus Supabase
- [ ] GalaxyMap.tsx lädt Universes/Themes aus Supabase
- [ ] EditorLayout.tsx funktioniert

### Validierung
- [ ] Alle Felder korrekt gemappt
- [ ] Performance akzeptabel
- [ ] Keine Fehler in Console

---

## 🔗 Referenzen

- **Supabase Docs**: https://supabase.com/docs
- **TypeScript Types**: `src/types/content.types.ts`
- **Feld-Mapping**: `docs/table_fields.json`
- **DB-Struktur**: `docs/example.data.json`
- **Aktueller Loader**: `src/infra/utils/JSONLoader.ts`

---

**Nächste Schritte**: Phase 1 starten - Daten-Mapping verstehen

