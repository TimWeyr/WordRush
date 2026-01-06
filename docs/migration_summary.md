# Migration Abgleich: JSON → Supabase

## Übersicht

Dieses Dokument dokumentiert den Abgleich zwischen der JSON-Struktur und der Supabase-Datenbank nach der Migration.

## Gefundene Lücken

### 1. ROUNDS Tabelle - Fehlende Felder

| Feld | Typ | JSON-Quelle | Status | SQL-Datei |
|------|-----|-------------|--------|-----------|
| `free_tier` | boolean | `Item.freeTier` | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `intro_text` | text | `Item.introText` | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `meta_related` | text[] | `Item.meta.related` | ❌ Fehlt | `migration_add_missing_fields.sql` |

### 2. ITEMS Tabelle - Fehlende Visual-Felder

| Feld | Typ | JSON-Quelle | Verwendung | Status | SQL-Datei |
|------|-----|-------------|------------|--------|-----------|
| `tier` | integer | `base.visual.tier` | Base items | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `size` | double precision | `base.visual.size` | Base items | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `appearance` | text | `base.visual.appearance` | Base items | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `glow` | boolean | `base.visual.glow` | Base items | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `shake` | boolean | `visual.shake` | Distractors | ❌ Fehlt | `migration_add_missing_fields.sql` |
| `pattern` | text | `correct.pattern` | Correct items | ❌ Fehlt | `migration_add_missing_fields.sql` |

## Bereits vorhandene Felder

### ROUNDS Tabelle ✅
- `id`, `chapter_id`, `level`, `published`, `wave_duration`
- `meta_source`, `meta_tags`, `meta_difficulty_scaling`
- `chapter_uuid`, `uuid`
- `created_at`, `updated_at`

### ITEMS Tabelle ✅
- `round_id`, `object_type`, `collectionorder`
- `word`, `type`, `image`, `context`
- `behavior`, `damage`, `redirect`
- `spawn_position`, `spawn_spread`, `spawn_delay`
- `speed`, `points`, `hp`, `sound`
- `color`, `variant`, `pulsate`, `font_size`
- `round_uuid`, `uuid`
- `created_at`, `updated_at`

## SQL-Dateien

### 1. `migration_validation.sql`
**Zweck:** Prüft ob alle JSON-Felder korrekt migriert wurden

**Enthält:**
- Prüfung fehlender Visual-Felder
- Prüfung fehlender Rounds-Felder
- Datenintegritätsprüfungen
- Zusammenfassung Migration-Status

**Ausführung:** Kann jederzeit ausgeführt werden (read-only)

### 2. `migration_add_missing_fields.sql`
**Zweck:** Fügt alle fehlenden Felder zur Datenbank hinzu

**Enthält:**
- ALTER TABLE Statements für `rounds` (free_tier, intro_text, meta_related)
- ALTER TABLE Statements für `items` (tier, size, appearance, glow, shake, pattern)
- Index-Erstellung für Performance
- Validierungs-Query am Ende

**Ausführung:** Einmalig, nach Validierung

### 3. `migration_data_update.sql`
**Zweck:** Aktualisiert vorhandene Daten mit fehlenden Werten

**Enthält:**
- UPDATE Statements für freeTier (falls in JSON gespeichert)
- UPDATE Statements für pattern (falls in behavior gespeichert)
- Validierungs-Queries nach Update
- Beispiel-Updates für manuelle Korrekturen

**Ausführung:** Nach Spalten-Erstellung, optional

## Mapping JSON → DB

### Item (Round) Mapping

```json
{
  "id": "BR_IT_001",
  "freeTier": false,        → rounds.free_tier
  "introText": "...",       → rounds.intro_text
  "waveDuration": 3,         → rounds.wave_duration
  "meta": {
    "source": "...",        → rounds.meta_source
    "tags": [...],          → rounds.meta_tags
    "related": [...],       → rounds.meta_related
    "difficultyScaling": {} → rounds.meta_difficulty_scaling
  }
}
```

### Base Entry Mapping

```json
{
  "base": {
    "word": "...",          → items.word (object_type='base')
    "type": "...",          → items.type
    "visual": {
      "tier": 2,           → items.tier ❌ FEHLT
      "size": 1,            → items.size ❌ FEHLT
      "appearance": "bold", → items.appearance ❌ FEHLT
      "color": "#...",      → items.color ✅
      "glow": true,         → items.glow ❌ FEHLT
      "pulsate": true       → items.pulsate ✅
    }
  }
}
```

### Correct Entry Mapping

```json
{
  "correct": [{
    "entry": {
      "word": "...",        → items.word (object_type='correct')
      "type": "..."         → items.type
    },
    "pattern": "linear_inward", → items.pattern ❌ FEHLT
    "spawnPosition": 0.4,   → items.spawn_position ✅
    "visual": {
      "color": "#...",      → items.color ✅
      "variant": "star",    → items.variant ✅
      "pulsate": false,     → items.pulsate ✅
      "fontSize": 1.1      → items.font_size ✅
    }
  }]
}
```

### Distractor Entry Mapping

```json
{
  "distractors": [{
    "entry": {
      "word": "...",        → items.word (object_type='distractor')
      "type": "..."         → items.type
    },
    "behavior": "linear_inward", → items.behavior ✅
    "damage": 1,            → items.damage ✅
    "visual": {
      "color": "#...",      → items.color ✅
      "variant": "square",  → items.variant ✅
      "pulsate": true,      → items.pulsate ✅
      "shake": false,       → items.shake ❌ FEHLT
      "fontSize": 1.0       → items.font_size ✅
    }
  }]
}
```

## Nächste Schritte

1. ✅ **Validierung ausführen:** `migration_validation.sql` ausführen
2. ⏳ **Spalten hinzufügen:** `migration_add_missing_fields.sql` ausführen
3. ⏳ **Daten aktualisieren:** `migration_data_update.sql` ausführen (optional)
4. ⏳ **Frontend anpassen:** TypeScript-Types und Loader anpassen
5. ⏳ **Tests:** Migration testen mit echten Daten

## Wichtige Hinweise

- **pattern vs. behavior:** 
  - `pattern` ist für **correct** items (z.B. "linear_inward")
  - `behavior` ist für **distractor** items (z.B. "seek_center")
  - Beide können gleichzeitig existieren, sind aber semantisch unterschiedlich

- **Visual-Felder:**
  - Base items: `tier`, `size`, `appearance`, `glow`, `color`, `pulsate`
  - Correct/Distractor items: `color`, `variant`, `pulsate`, `shake`, `fontSize`
  - Nicht alle Felder sind für alle object_types relevant

- **freeTier:**
  - Default: `false` (Opt-in für Sicherheit)
  - Nur explizit auf `true` setzen für freie Inhalte

## Aktualisierte table_fields.json

Die Datei `docs/table_fields.json` wurde aktualisiert und enthält jetzt alle fehlenden Felder.




















