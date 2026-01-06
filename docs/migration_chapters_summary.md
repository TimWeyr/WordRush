# Migration: Chapters - Fehlende Felder

## Übersicht

Nach Analyse des Codes wurden **3 fehlende Felder** in der `chapters` Tabelle identifiziert, die für die vollständige Migration von JSON zu Supabase benötigt werden.

## Fehlende Felder

### 1. `spawn_rate` (DOUBLE PRECISION) ⚠️ **REQUIRED**

**JSON-Quelle:** `ChapterConfig.spawnRate` (required)

**Beschreibung:** Objects per second für dieses Chapter. Typischer Bereich: 1.0-3.0

**Code-Referenzen:**
- `src/types/content.types.ts:58` - Type Definition
- `src/components/Editor/MetadataEditor.tsx:339-340` - Editor UI
- `src/components/Editor/AddNewDialog.tsx:73` - Default-Wert (1.0)

**Migration:** Siehe `migration_chapters_missing_fields.sql`

---

### 2. `music` (TEXT) - Optional

**JSON-Quelle:** `ChapterConfig.music` (optional)

**Beschreibung:** Musik-Dateiname für chapter-spezifische Hintergrundmusik. Fallback auf Theme/Universe Music wenn nicht gesetzt.

**Code-Referenzen:**
- `src/types/content.types.ts:60` - Type Definition
- `public/content/CONTENT_GUIDE.md:136,163` - Dokumentation

**Migration:** Siehe `migration_chapters_missing_fields.sql`

---

### 3. `particle_effect` (TEXT) - Optional

**JSON-Quelle:** `ChapterConfig.particleEffect` (optional)

**Beschreibung:** Partikel-Effekt-Name für chapter-spezifische visuelle Effekte (z.B. "custom_particles", "energy_sparks"). Fallback auf Theme/Universe Particle Effect.

**Code-Referenzen:**
- `src/types/content.types.ts:61` - Type Definition
- `public/content/CONTENT_GUIDE.md:137,164,207` - Dokumentation

**Migration:** Siehe `migration_chapters_missing_fields.sql`

---

## Bereits vorhandene Felder ✅

| Feld | JSON-Quelle | Status | Code-Referenzen |
|------|-------------|--------|-----------------|
| `background_gradient` | `ChapterConfig.backgroundGradient` | ✅ | Game.tsx:667-677, MetadataEditor.tsx:359-360 |
| `title` | `ChapterConfig.title` | ✅ | content.types.ts:55 |
| `backgroundimage` | `ChapterConfig.backgroundImage` | ✅ | content.types.ts:56 |
| `meta` | Extended metadata | ✅ | - |

## Hinweis zu `wave_duration`

**WICHTIG:** `waveDuration` ist in `ChapterConfig` definiert, wird aber in der **`rounds` Tabelle** gespeichert (nicht in `chapters`), da es pro Round/Item unterschiedlich sein kann.

- JSON: `Item.waveDuration` (optional)
- DB: `rounds.wave_duration` (NUMERIC)
- Code: `src/types/content.types.ts:59,71`

## Nächste Schritte

1. ✅ **SQL ausführen:** `migration_chapters_missing_fields.sql`
2. ⏳ **Daten migrieren:** JSON → Supabase (spawnRate → spawn_rate, etc.)
3. ⏳ **JSONLoader anpassen:** Von Supabase laden statt JSON
4. ⏳ **Editor anpassen:** Neue Felder im Editor verfügbar machen
5. ⏳ **Tests:** Funktionalität prüfen

## SQL-Datei

Siehe: `docs/migration_chapters_missing_fields.sql`




















