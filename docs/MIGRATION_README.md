# Migration: JSON → Supabase - SQL Anleitung

## Übersicht

Diese SQL-Dateien fügen die fehlenden Felder aus der JSON-Struktur zur Supabase-Datenbank hinzu.

## Dateien

### 1. `migration_complete.sql` ⭐ **HAUPTDATEI**
**Vollständige Migration mit allen PostgreSQL Statements**

- Fügt alle fehlenden Spalten hinzu
- Erstellt Indexes für Performance
- Validiert automatisch ob alle Spalten erstellt wurden
- Verwendet `BEGIN/COMMIT` für Transaktionssicherheit

**Ausführung:**
```sql
-- In Supabase SQL Editor einfügen und ausführen
```

### 2. `migration_validation.sql`
**Prüft ob Migration korrekt verlaufen ist**

- Prüft fehlende Visual-Felder
- Prüft Datenintegrität
- Zeigt Zusammenfassung des Migration-Status

**Ausführung:** Kann jederzeit ausgeführt werden (read-only)

### 3. `migration_populate_data.sql` ⭐ **NEU**
**Befüllt neue Felder mit zufälligen aber validen Testdaten**

- Setzt `free_tier` basierend auf Level (niedrigere Levels eher free)
- Setzt `intro_text` für ~30% der Rounds
- Setzt `meta_related` mit verwandten Round-IDs
- Setzt `tier`, `size`, `appearance`, `glow` für base items
- Setzt `pattern` für correct items (linear_inward, zigzag, wave, seek_center)
- Setzt `shake` für distractor items
- Validiert alle befüllten Daten mit Statistiken

**Ausführung:** Nach Spalten-Erstellung, um Testdaten zu generieren

### 4. `migration_data_update.sql`
**Aktualisiert vorhandene Daten (optional)**

- Migriert freeTier aus JSON (falls vorhanden)
- Migriert pattern aus behavior (falls vorhanden)
- Validiert Datenqualität nach Update

**Ausführung:** Nur nach Spalten-Erstellung, falls Daten migriert werden müssen

### 4. `migration_rollback.sql`
**Entfernt alle hinzugefügten Spalten (nur im Notfall)**

⚠️ **WARNUNG:** Diese Operation kann nicht rückgängig gemacht werden!

## Schritt-für-Schritt Anleitung

### Schritt 1: Backup erstellen
```sql
-- In Supabase Dashboard: Settings → Database → Backups
-- Oder manuell:
pg_dump your_database > backup_before_migration.sql
```

### Schritt 2: Migration ausführen
```sql
-- Öffne migration_complete.sql in Supabase SQL Editor
-- Führe die Datei aus
```

**Erwartete Ausgabe:**
```
NOTICE: All columns created successfully!
```

### Schritt 3: Validierung
```sql
-- Öffne migration_validation.sql
-- Führe alle Queries aus
-- Prüfe die Ergebnisse
```

**Erwartete Ergebnisse:**
- Alle Spalten sollten vorhanden sein
- Keine fehlenden Daten (außer bei neuen, optionalen Feldern)

### Schritt 4: Daten befüllen (empfohlen)
```sql
-- Öffne migration_populate_data.sql
-- Führe die Datei aus
-- Prüfe die Validierungs-Statistiken am Ende
```

**Oder:** Falls du Daten aus JSON migrieren möchtest:
```sql
-- Öffne migration_data_update.sql
-- Kommentiere die UPDATE-Statements aus
-- Passe die Queries an deine Daten an
-- Führe aus
```

### Schritt 5: Testen
- Teste die Anwendung mit den neuen Feldern
- Prüfe ob alle Features funktionieren

## Hinzugefügte Spalten

### ROUNDS Tabelle
| Spalte | Typ | Default | Beschreibung | Beispiel-Werte |
|--------|-----|---------|--------------|----------------|
| `free_tier` | BOOLEAN | `false` | Ob Item für Gäste verfügbar ist | `true`, `false` |
| `intro_text` | TEXT | `NULL` | Optionaler Intro-Text | `"Bereit? Los geht's! 🚀"` |
| `meta_related` | TEXT[] | `NULL` | Array von verwandten Round-IDs | `["F10_001", "F10_002"]` |

### ITEMS Tabelle
| Spalte | Typ | Default | Beschreibung | Beispiel-Werte |
|--------|-----|---------|--------------|----------------|
| `tier` | INTEGER | `NULL` | Visual tier level (base items) | `1`, `2`, `3` |
| `size` | DOUBLE PRECISION | `NULL` | Visual size multiplier (base items) | `0.8` - `1.5` |
| `appearance` | TEXT | `NULL` | Visual appearance style (base items) | `"bold"`, `"italic"`, `"normal"` |
| `glow` | BOOLEAN | `false` | Glow-Effekt (base items) | `true`, `false` |
| `shake` | BOOLEAN | `false` | Shake-Animation (distractor items) | `true`, `false` |
| `pattern` | TEXT | `NULL` | Movement pattern (correct items) | `"linear_inward"`, `"zigzag"`, `"wave"`, `"seek_center"` |

## Indexes

Folgende Indexes werden automatisch erstellt:
- `idx_items_object_type` - Für Filterung nach object_type
- `idx_items_round_uuid` - Für JOINs mit rounds
- `idx_rounds_free_tier` - Für Filterung nach free_tier
- `idx_rounds_chapter_uuid` - Für JOINs mit chapters
- `idx_items_pattern` - Partial index für pattern (nur NOT NULL)
- `idx_items_glow` - Partial index für glow (nur true)
- `idx_items_shake` - Partial index für shake (nur true)

## Troubleshooting

### Fehler: "column already exists"
- Die Spalte existiert bereits → Migration wurde bereits ausgeführt
- Prüfe mit `migration_validation.sql` ob alles korrekt ist

### Fehler: "permission denied"
- Prüfe ob du die nötigen Rechte hast (ALTER TABLE)
- Kontaktiere den Datenbank-Administrator

### Fehler: "relation does not exist"
- Prüfe ob die Tabellen `rounds` und `items` existieren
- Prüfe ob du im richtigen Schema bist (`public`)

### Rollback nötig
```sql
-- Führe migration_rollback.sql aus
-- ⚠️ ACHTUNG: Alle Daten in diesen Spalten gehen verloren!
```

## Nächste Schritte

Nach erfolgreicher Migration:

1. **Frontend anpassen:**
   - TypeScript Types aktualisieren (`src/types/content.types.ts`)
   - JSONLoader anpassen (`src/infra/utils/JSONLoader.ts`)
   - Editor anpassen (falls vorhanden)

2. **Daten migrieren:**
   - Falls JSON-Daten noch migriert werden müssen
   - Verwende `migration_data_update.sql` als Vorlage

3. **Tests:**
   - Teste alle Features
   - Prüfe ob alle Daten korrekt geladen werden

## Support

Bei Problemen:
1. Prüfe die Fehlermeldungen in Supabase
2. Führe `migration_validation.sql` aus
3. Prüfe die Logs in Supabase Dashboard

