# Supabase Migration - TODO

**Status**: 🚧 In Vorbereitung  
**Priorität**: Mittel  
**Geschätzte Zeit**: 3-5 Tage  
**Letzte Aktualisierung**: Dezember 2024

---

## 📊 Aktueller Stand (Dezember 2024)

### ✅ Bereits vorhanden:

1. **Supabase Client Setup** ✅
   - `src/infra/supabase/client.ts` - Singleton Supabase Client
   - `@supabase/supabase-js` installiert (v2.86.0)

2. **Authentication System** ✅
   - `src/infra/auth/AuthContext.tsx` - Vollständige Auth-Implementierung
   - Login, SignUp, ResetPassword, Email-Verification
   - Protected Routes für Editor

3. **Provider Pattern** ✅
   - `src/infra/providers/ProgressProvider.interface.ts` - Interface definiert
   - `src/infra/providers/LocalProgressProvider.ts` - LocalStorage-Implementierung

4. **Datenbank-Schema Dokumentation** ✅
   - `docs/table_fields.json` - Vollständig dokumentiert mit Code-Referenzen
   - `docs/example.data.json` - Beispiel-Daten aus der DB (zeigt Struktur)

5. **JSONLoader** ✅
   - `src/infra/utils/JSONLoader.ts` - Content-Loader vorhanden (noch nicht für Supabase erweitert)

### ❌ Fehlt noch:

1. **SupabaseProgressProvider** ❌
   - Datei: `src/infra/providers/SupabaseProgressProvider.ts`
   - **Was**: Alternative zu `LocalProgressProvider` - speichert User-Progress in Supabase statt LocalStorage
   - **Warum**: Ermöglicht Cloud-Sync zwischen Geräten, Multi-User-Support
   - **Implementierung**: 
     - Implementiert `ProgressProvider` Interface (gleiche Methoden wie `LocalProgressProvider`)
     - Speichert in Supabase-Tabellen: `user_progress`, `user_settings`
     - Lädt Progress basierend auf `user_id` (aus AuthContext)
     - Fallback zu LocalStorage bei Fehler/Offline

2. **Provider-Swap in App.tsx** ❌
   - Feature-Flag: `VITE_USE_SUPABASE` (env variable)
   - Provider-Auswahl basierend auf Flag
   - Fallback zu LocalStorage bei Fehler

3. **IndexedDB Cache** ❌
   - `src/infra/cache/IndexedDBCache.ts` - Cache-Layer
   - Library: `idb` installieren
   - Cache für Metadaten (universes, themes, chapters)
   - Cache für Progress (user_progress, user_settings)

4. **Sync Queue** ❌
   - `src/infra/sync/SyncQueue.ts` - Offline-Änderungen
   - Automatischer Sync bei Online-Status
   - Conflict Resolution

5. **JSONLoader Supabase-Erweiterung** ❌
   - `JSONLoader.loadUniverses()` - Erst DB-Metadaten, dann JSON (Fallback)
   - `JSONLoader.loadTheme()` - Metadaten aus DB, Items aus JSON
   - `JSONLoader.loadChapter()` - Metadaten aus DB, Items aus JSON

6. **Supabase Schema & Migration** ❌
   - Supabase CLI Setup (`supabase init`, `supabase start`)
   - Migration-Dateien für Tabellen-Erstellung
   - RLS Policies SQL
   - Seed-Script (JSON → DB): `scripts/seed_metadata.py`

7. **Environment Variables** ❌
   - `.env.example` erstellen
   - `.env.local` Template

8. **Dependencies** ❌
   - `idb` installieren (für IndexedDB)
   - `workbox-window` installieren (optional, für Service Worker)

9. **Migration-Script (LocalStorage → Supabase)** ❌
   - `scripts/migrate_localstorage_to_supabase.ts` - Daten-Migration
   - User-Mapping (Anonymous Users)

10. **Service Worker** ❌ (optional, später)
    - `public/sw.js` - Content-Caching

---

## 📋 Übersicht

**Ziele**:
- Cloud-Sync für User-Progress zwischen Geräten
- User-Management & Authentication
- Permissions-System (lesen, spielen, editieren, löschen)
- Performance-Optimierung durch Metadaten-Caching
- Offline-Funktionalität mit automatischem Sync

**Architektur**:
- Hybrid-Ansatz: Content bleibt statisch (JSON), nur Progress/Settings in Supabase
- Provider-Pattern: `LocalProgressProvider` ↔ `SupabaseProgressProvider` (Interface bleibt gleich)
- Offline-First: LocalStorage/IndexedDB als Cache, Supabase für Sync

---

## 🔧 Entscheidungen

### 1. Storage Buckets

**Möglichkeit 1: Private Buckets**
- ✅ Sicherer (Auth erforderlich)
- ❌ Langsamer (Auth-Check bei jedem Request)
- ❌ Kein CDN-Caching möglich
- ❌ Höherer Overhead

**Möglichkeit 2: Public Buckets** ✅ **EMPFOHLEN**
- ✅ Schneller (kein Auth-Check)
- ✅ CDN-freundlich
- ✅ Bessere Performance
- ✅ Einfacher zu implementieren
- ⚠️ Nur für öffentliche Assets (Content-Images, Ships, Lasers, Particles)

**Entscheidung**: **Public Buckets** für alle Content-Assets
- Bucket: `content-assets` (public)
- Struktur: `{universe}/{theme}/{chapter}/{filename}`
- Private nur für: User-Uploads, persönliche Avatare (später)

---

### 2. Authentication

**Ja, Supabase Auth verwenden** ✅

**Methoden**:
- Email/Password (Standard)
- OAuth: Google, Apple (später)
- Anonymous Users (für Gäste, später migrierbar zu echten Accounts)

**Implementierung**: `@supabase/supabase-js` mit `supabase.auth`

---

### 3. Content-Strategie

**Möglichkeit 1: Alles in DB**
- ✅ Zentrale Datenquelle (alles an einem Ort)
- ✅ Einfache Queries (SQL statt JSON-Parsing)
- ✅ Versionierung & Audit-Trail (wer hat was wann geändert)
- ✅ Granulare Permissions (RLS auf Item-Ebene möglich)
- ✅ Real-time Updates (Supabase Realtime für Live-Änderungen)
- ✅ Einfache Filterung & Suche (SQL WHERE, JOIN, etc.)
- ✅ Konsistenz (Foreign Keys, Constraints, Validierung)
- ✅ Backup & Restore (DB-Backup enthält alles)




---

### 4. Offline-Strategie

**Multi-Layer Caching**:
1. **Service Worker**: Cache für statische Content-Assets (JSON-Items, Images, Ships, Lasers, Particles)
2. **IndexedDB**: Lokaler Cache für DB-Metadaten (universes, themes, chapters) + User-Progress
3. **Queue-System**: Offline-Änderungen (Progress, Settings) → Sync bei Online
4. **Background Sync**: Automatischer Sync im Hintergrund (Supabase → IndexedDB)

**Libraries**:
- `workbox` (Service Worker)
- `idb` (IndexedDB wrapper)
- `@supabase/realtime` (Live-Sync, optional)

#### Caching-Strategie: Supabase → LocalStorage/IndexedDB

**Ja, Supabase-Daten können komplett in LocalStorage/IndexedDB gecacht werden!**

**Format**: JSON (strukturiert wie DB-Daten)

**Was wird gecacht**:
- **Metadaten**: `universes`, `themes`, `chapters` (beim Laden eines Universums)
- **User-Progress**: `user_progress`, `user_settings` (beim Login/Sync)
- **Permissions**: `user_permissions` (beim Login)

**Wann wird gecacht**:
- Beim Laden eines Universums: Alle Metadaten (universes, themes, chapters) → IndexedDB
- Beim Login: User-Progress + Settings → IndexedDB
- Beim Spielstart: Lade aus IndexedDB, falls offline

**Struktur im Cache** (IndexedDB/LocalStorage):

```typescript
// IndexedDB Store: "supabase_cache"
{
  universes: {
    "psychiatrie": {
      id: "psychiatrie",
      name: "Psychiatrie",
      colorPrimary: "#4a90e2",
      // ... alle Felder
      cached_at: "2024-11-20T10:00:00Z",
      version: 1
    }
  },
  themes: {
    "psychiatrie:icd10": {
      id: "icd10",
      universe_id: "psychiatrie",
      name: "ICD-10",
      // ... alle Felder
      cached_at: "2024-11-20T10:00:00Z"
    }
  },
  chapters: {
    "psychiatrie:icd10:F32_Depression": {
      id: "F32_Depression",
      theme_id: "icd10",
      // ... alle Felder
      cached_at: "2024-11-20T10:00:00Z"
    }
  },
  user_progress: {
    "user_123:BC_001": {
      user_id: "user_123",
      item_id: "BC_001",
      // ... alle Felder
      cached_at: "2024-11-20T10:00:00Z"
    }
  }
}
```

**Implementierung**:

```typescript
// Beim Laden eines Universums
async loadUniverse(universeId: string) {
  // 1. Prüfe Cache (IndexedDB)
  const cached = await indexedDB.get('supabase_cache', `universe:${universeId}`);
  if (cached && !isExpired(cached.cached_at)) {
    return cached.data; // Offline: Verwende Cache
  }
  
  // 2. Lade von Supabase
  const { data, error } = await supabase
    .from('universes')
    .select('*')
    .eq('id', universeId)
    .single();
  
  if (data) {
    // 3. Cache in IndexedDB
    await indexedDB.put('supabase_cache', {
      key: `universe:${universeId}`,
      data: data,
      cached_at: new Date().toISOString(),
      version: 1
    });
  }
  
  return data;
}
```

**Cache-Invalidierung**:
- **Versionierung**: Cache-Version in DB → bei Änderung Cache invalidieren
- **TTL**: Time-To-Live (z.B. 24 Stunden) → Cache erneuern
- **Manual Refresh**: User kann manuell aktualisieren
- **Real-time Updates**: Supabase Realtime → Cache automatisch aktualisieren

**Vorteile**:
- ✅ Offline-Spiel möglich (alle Metadaten lokal)
- ✅ Schnellere Ladezeiten (keine DB-Queries bei Cache-Hit)
- ✅ Weniger Bandwidth (nur bei Cache-Miss)
- ✅ Bessere UX (sofortige Antwort)

**Nachteile**:
- ⚠️ Storage-Limit: LocalStorage ~5-10MB, IndexedDB ~50% des freien Speichers
- ⚠️ Cache-Management: Alte Daten müssen gelöscht werden
- ⚠️ Sync-Konflikte: Offline-Änderungen müssen mit Server synchronisiert werden

---

## 🗄️ Datenbank-Schema

### Tabellen

#### 1. `universes` (Metadaten)
```sql
id (TEXT, PRIMARY KEY)
name (TEXT)
colorPrimary (TEXT)
colorAccent (TEXT)
backgroundGradient (JSONB)
laserColor (TEXT)
available (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### 2. `themes` (Metadaten)
```sql
id (TEXT, PRIMARY KEY)
universe_id (TEXT, FOREIGN KEY → universes.id)
name (TEXT)
colorPrimary (TEXT)
colorAccent (TEXT)
backgroundGradient (JSONB)
laserColor (TEXT)
chapter_count (INTEGER)
item_count (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### 3. `chapters` (Metadaten)
```sql
id (TEXT, PRIMARY KEY)
theme_id (TEXT, FOREIGN KEY → themes.id)
universe_id (TEXT, FOREIGN KEY → universes.id)
name (TEXT)
item_count (INTEGER)
level_count (INTEGER)
backgroundGradient (JSONB)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**Hinweis**: Die Tabellen 1-3 sind für den **Hybrid-Ansatz** (Möglichkeit 2). Für **Möglichkeit 1: Alles in DB** würden zusätzlich folgende Tabellen benötigt:
das ist die tabelle für die items:
#### 3a. `rounds` (nur für Möglichkeit 1: Alles in DB)
```sql
id (TEXT, PRIMARY KEY)
theme_id (TEXT, FOREIGN KEY → themes.id)
chapter_id (TEXT, FOREIGN KEY → chapters.id)
universe_id (TEXT, FOREIGN KEY → universes.id)
level (INTEGER)
published (BOOLEAN, DEFAULT true)
wave_duration (INTEGER, NULLABLE)
intro_text (TEXT, NULLABLE)
base (JSONB): {
  word: TEXT,
  type: TEXT,
  image: TEXT,
  visual: JSONB
}
meta_source (TEXT, NULLABLE)
meta_tags (TEXT[], NULLABLE)
meta_difficulty_scaling (JSONB): {
  speedMultiplierPerReplay: FLOAT,
  colorContrastFade: BOOLEAN,
  angleVariance: FLOAT
}
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

INDEX(theme_id, chapter_id)
INDEX(universe_id, theme_id, chapter_id)
INDEX(level)
INDEX(published)
```
hier kommt base, correct, distractor rein:
#### 3b. `items` (nur für Möglichkeit 1: Alles in DB)
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
item_id (TEXT, FOREIGN KEY → items.id)
type (ENUM: 'correct', 'distractor','base','bonus')  -- Erweiterbar z.B. 'base', 'bonus', etc.
entry_word (TEXT, NULLABLE)
entry_type (TEXT)
entry_image (TEXT, NULLABLE)
spawn_position (FLOAT)
spawn_spread (FLOAT)
spawn_delay (FLOAT, NULLABLE)
speed (FLOAT)
points (INTEGER)
pattern (TEXT)
behavior (TEXT, NULLABLE)
hp (INTEGER, NULLABLE)
damage (INTEGER, NULLABLE)  -- Nur für distractors
collection_order (INTEGER, NULLABLE)  -- Nur für correct
redirect (TEXT, NULLABLE)  -- Nur für distractors
context (TEXT)
visual (JSONB): {
  tier, size, appearance, color, glow, pulsate, shake,
  variant, fontSize, font, collisionRadius
}
sound (TEXT, NULLABLE)
sort_order (INTEGER)  -- Reihenfolge innerhalb des Items
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

INDEX(item_id, type)
INDEX(item_id, sort_order)
```

#### 3c. `item_related` (Verknüpfungstabelle, nur für Möglichkeit 1: Alles in DB)
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
item_id (TEXT, FOREIGN KEY → items.id)
related_item_id (TEXT, FOREIGN KEY → items.id)
created_at (TIMESTAMP)

UNIQUE(item_id, related_item_id)
INDEX(item_id)
INDEX(related_item_id)
```
 

#### 4. `user_progress`
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
user_id (UUID, FOREIGN KEY → auth.users.id)
item_id (TEXT)
universe_id (TEXT)
theme_id (TEXT)
chapter_id (TEXT)
learning_state (JSONB): {
  mastered: BOOLEAN,
  attempts: INTEGER,
  lastPlayed: TIMESTAMP,
  ...
}
score (INTEGER)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

UNIQUE(user_id, item_id)
INDEX(user_id, universe_id, theme_id, chapter_id)
```

#### 5. `user_settings`
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
user_id (UUID, FOREIGN KEY → auth.users.id, UNIQUE)
ui_settings (JSONB): {
  orientation: TEXT,
  colorScheme: TEXT,
  stützräderGlobal: BOOLEAN,
  mixModeGlobal: BOOLEAN,
  itemOrder: TEXT,
  gameplaySettings: JSONB
}
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

#### 6. `user_permissions`
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
user_id (UUID, FOREIGN KEY → auth.users.id)
universe_id (TEXT, NULLABLE)  -- NULL = alle Universes
theme_id (TEXT, NULLABLE)     -- NULL = alle Themes
chapter_id (TEXT, NULLABLE)   -- NULL = alle Chapters
permissions (TEXT[]): ['read', 'write', 'delete', 'publish']
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

UNIQUE(user_id, universe_id, theme_id, chapter_id)
INDEX(user_id)
```

#### 7. `leaderboards` (später)
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
user_id (UUID, FOREIGN KEY → auth.users.id)
universe_id (TEXT)
theme_id (TEXT, NULLABLE)
total_score (INTEGER)
items_mastered (INTEGER)
rank (INTEGER, berechnet via View/Function)
updated_at (TIMESTAMP)

UNIQUE(user_id, universe_id, theme_id)
INDEX(universe_id, theme_id, total_score DESC)
```

#### 8. `content_analytics` (später)
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
item_id (TEXT)
times_played (INTEGER, DEFAULT 0)
average_score (FLOAT)
mastery_rate (FLOAT)
difficulty_rating (FLOAT, berechnet)
updated_at (TIMESTAMP)

UNIQUE(item_id)
INDEX(difficulty_rating)
```

#### 9. `purchases` (später)
```sql
id (UUID, PRIMARY KEY, DEFAULT uuid_generate_v4())
user_id (UUID, FOREIGN KEY → auth.users.id)
universe_id (TEXT, NULLABLE)
theme_id (TEXT, NULLABLE)
purchase_date (TIMESTAMP)
price (DECIMAL)
transaction_id (TEXT)
created_at (TIMESTAMP)

INDEX(user_id)
```

### Row Level Security (RLS)

**Policies**:
- `user_progress`: User kann nur eigene Einträge lesen/schreiben
- `user_settings`: User kann nur eigene Settings lesen/schreiben
- `user_permissions`: Nur Admins können lesen/schreiben
- `universes`, `themes`, `chapters`: Public read, Admin write
- `leaderboards`: Public read, User kann nur eigene Einträge schreiben

---

## 📦 Migration-Plan

### Phase 1: Setup (Tag 1)

- [x] **Supabase Client Setup** ✅
  - [x] `src/infra/supabase/client.ts` erstellt
  - [x] `@supabase/supabase-js` installiert

- [x] **Authentication System** ✅
  - [x] `src/infra/auth/AuthContext.tsx` implementiert
  - [x] Login, SignUp, ResetPassword funktioniert

- [ ] **Supabase Project erstellen**
  - [ ] Projekt auf supabase.com erstellen
  - [ ] Local Development: `supabase init`
  - [ ] `supabase start` (localhost:54321)

- [ ] **Dependencies installieren**
  ```bash
  npm install idb  # für IndexedDB
  npm install workbox-window  # optional, für Service Worker
  ```
  **Hinweis**: `@supabase/supabase-js` ist bereits installiert ✅

- [ ] **Environment Variables**
  - [ ] `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - [ ] `.env.example` erstellen (ohne Keys)
  - [ ] Feature-Flag: `VITE_USE_SUPABASE=true/false`

### Phase 2: Schema (Tag 1-2)

- [x] **Schema-Dokumentation** ✅
  - [x] `docs/table_fields.json` - Vollständig dokumentiert
  - [x] `docs/migration_complete.sql` - SQL für rounds/items Felder
  - [x] `docs/migration_populate_data.sql` - Daten-Befüllung
  - [x] `docs/migration_chapters_missing_fields.sql` - Chapters-Felder

- [ ] **Supabase CLI Setup**
  ```bash
  # Install Supabase CLI (falls nicht vorhanden)
  npm install -g supabase
  
  # Projekt initialisieren
  supabase init
  
  # Local Development starten
  supabase start
  ```

- [ ] **Migration erstellen**
  ```bash
  supabase migration new create_initial_schema
  ```

- [ ] **Tabellen erstellen** (siehe Schema oben)
  - [ ] `universes`, `themes`, `chapters` (Metadaten)
  - [ ] `rounds`, `items` (Content, falls "Alles in DB" gewählt)
  - [ ] `user_progress`, `user_settings`
  - [ ] `user_permissions`
  - [ ] Indexes & Foreign Keys
  - [ ] **Wichtig**: Verwende `docs/migration_complete.sql` als Referenz

- [ ] **RLS Policies erstellen** **🎯 WICHTIG**
  - [ ] Policies für Content-Tabellen: `universes`, `themes`, `chapters`, `rounds`, `items`
  - [ ] **Public read** für alle Content-Tabellen (jeder kann lesen)
  - [ ] **Admin write** (nur verifizierte User können schreiben)
  - [ ] Datei: `supabase/migrations/XXX_rls_policies.sql`
  - ⏸️ `user_progress`, `user_settings` Policies (später)

- [ ] **Seed-Script erstellen** (JSON → DB) **🎯 WICHTIG**
  - [ ] Datei: `scripts/seed_metadata.py` oder `scripts/seed_metadata.ts`
  - [ ] Lädt alle `universe.*.json` → `universes` Tabelle
  - [ ] Lädt alle `themes.*.json` → `themes` Tabelle
  - [ ] Lädt alle Chapters → `chapters` Tabelle
  - [ ] Lädt alle Items (rounds + items) → `rounds` + `items` Tabellen
  - [ ] Validierung: Prüft ob alle Content-Daten korrekt migriert wurden

### Phase 3: Provider-Implementierung (Tag 2-3)

- [ ] **SupabaseProgressProvider erstellen**
  - [ ] Datei: `src/infra/providers/SupabaseProgressProvider.ts`
  - [ ] Implementiert `ProgressProvider` Interface
  - [ ] Methoden: `getProgress()`, `saveProgress()`, `getLearningState()`, etc.
  - [ ] Error Handling & Retry Logic

- [x] **Supabase Client Setup** ✅
  - [x] `src/infra/supabase/client.ts`: Singleton Supabase Client vorhanden
  - [x] Auth-Helpers vorhanden (`src/infra/auth/AuthContext.tsx`)

- [ ] **Provider-Swap in App**
  - [ ] `App.tsx`: Provider-Auswahl (LocalStorage vs Supabase)
  - [ ] Feature-Flag: `USE_SUPABASE` (env variable)
  - [ ] Fallback: Bei Fehler → LocalStorage

### Phase 4: Offline-Support (Tag 3-4)

- [ ] **IndexedDB Cache**
  - [ ] `src/infra/cache/IndexedDBCache.ts`: Cache-Layer
  - [ ] Cache für Metadaten (universes, themes, chapters)
  - [ ] Cache für Progress (user_progress, user_settings)
  - [ ] Cache-Versionierung & Invalidation

- [ ] **Queue-System**
  - [ ] `src/infra/sync/SyncQueue.ts`: Offline-Änderungen speichern
  - [ ] Automatischer Sync bei Online-Status
  - [ ] Conflict Resolution (Last-Write-Wins oder Merge)

- [ ] **Service Worker** (optional, später)
  - [ ] `public/sw.js`: Service Worker für Content-Caching
  - [ ] Cache-First Strategy für JSON/Images
  - [ ] Background Updates

### Phase 5: Performance-Optimierung (Tag 4)

- [ ] **JSONLoader erweitern**
  - [ ] `JSONLoader.loadUniverses()`: Erst DB-Metadaten, dann JSON (falls nötig)
  - [ ] `JSONLoader.loadTheme()`: Metadaten aus DB, Items aus JSON
  - [ ] Parallel Loading: `Promise.all()` für mehrere Requests

- [ ] **GalaxyMap optimieren**
  - [ ] Lädt nur Metadaten aus DB (schnell)
  - [ ] Items werden lazy-loaded beim Spielstart
  - [ ] Cache-Hits aus IndexedDB

- [ ] **Level-Ringe Berechnung optimieren** **🎯 WICHTIG**
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

### Phase 6: Migration bestehender Daten (Tag 5)

- [ ] **Migration-Script**
  - [ ] Liest LocalStorage-Daten
  - [ ] Konvertiert zu Supabase-Format
  - [ ] Upload zu Supabase (mit User-Mapping)
  - [ ] Validierung: Prüft ob alle Daten migriert wurden

- [ ] **User-Migration**
  - [ ] Anonymous Users erstellen (für bestehende LocalStorage-Daten)
  - [ ] Oder: User-Registrierung anbieten

---

## 🔄 Implementierungsschritte (Reihenfolge)

### Schritt 1: Supabase Setup
```bash
# 1. Projekt erstellen
supabase init
supabase start

# 2. Dependencies
npm install @supabase/supabase-js idb workbox-window

# 3. Environment Variables
echo "VITE_SUPABASE_URL=http://localhost:54321" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=<key>" >> .env.local
```

### Schritt 2: Schema erstellen
```bash
# Migration erstellen
supabase migration new create_initial_schema

# SQL schreiben (siehe Schema oben)
# Tabellen, Indexes, RLS Policies

# Test
supabase db reset
```

### Schritt 3: Seed-Script
```python
# seed_metadata.py
# Lädt alle universe.*.json → universes Tabelle
# Lädt alle themes.*.json → themes Tabelle
# Lädt alle chapters → chapters Tabelle
```

### Schritt 4: SupabaseProgressProvider
```typescript
// src/infra/providers/SupabaseProgressProvider.ts
// Implementiert ProgressProvider Interface
// Verwendet Supabase Client
```

### Schritt 5: Provider-Swap
```typescript
// src/App.tsx
const provider = USE_SUPABASE 
  ? new SupabaseProgressProvider() 
  : new LocalProgressProvider();
```

### Schritt 6: Offline-Support
```typescript
// IndexedDB Cache
// Sync Queue
// Service Worker (optional)
```

### Schritt 7: Performance-Optimierung
```typescript
// JSONLoader erweitern
// GalaxyMap optimieren
// Parallel Loading
```

### Schritt 8: Migration bestehender Daten
```typescript
// Migration-Script
// LocalStorage → Supabase
```

---

## 🚨 Risiken & Mitigation

### 1. Kosten
**Risiko**: Free Tier schnell überschritten (500MB Storage, 2GB Bandwidth)  
**Mitigation**: 
- Content bleibt statisch (nur Metadaten in DB)
- Monitoring: Storage/Bandwidth überwachen
- Upgrade-Plan: Pro Plan ($25/Monat) wenn nötig

### 2. Performance
**Risiko**: Latenz bei jedem Request  
**Mitigation**:
- IndexedDB Cache (lokale Daten)
- Service Worker (Content-Caching)
- Metadaten in DB, Items in JSON (kleinere DB)

### 3. Offline-Funktionalität
**Risiko**: App funktioniert nicht ohne Internet  
**Mitigation**:
- LocalStorage als Fallback
- IndexedDB Cache
- Queue-System für Offline-Änderungen
- Service Worker für Content

### 4. Migration
**Risiko**: Datenverlust bei fehlerhafter Migration  
**Mitigation**:
- Backup vor Migration
- Validierung: Prüft ob alle Daten migriert wurden
- Rollback-Möglichkeit
- Test mit Test-Daten zuerst

### 5. Vendor Lock-in
**Risiko**: Abhängigkeit von Supabase  
**Mitigation**:
- PostgreSQL (Standard SQL, portabel)
- Provider-Pattern (einfacher Wechsel)
- Export-Funktion: Regelmäßige Backups
- LocalStorage bleibt parallel (Fallback)

### 6. Security
**Risiko**: RLS falsch konfiguriert → Daten-Leak  
**Mitigation**:
- RLS Policies gründlich testen
- API Keys nicht im Frontend exposen (nur ANON_KEY)
- Storage-Buckets mit korrekten Permissions
- Security Audit vor Production

---

## ✅ Checkliste

### Vor Start
- [ ] Supabase Account erstellt
- [ ] Local Development Setup (`supabase init`, `supabase start`)
- [x] Dependencies installiert (`@supabase/supabase-js` ✅)
- [ ] Dependencies installieren (`idb`, `workbox-window`)
- [ ] Environment Variables konfiguriert (`.env.local`, `.env.example`)

### Schema
- [x] Schema dokumentiert (`docs/table_fields.json` ✅)
- [x] Migration SQL erstellt (`docs/migration_complete.sql` ✅)
- [ ] Tabellen in Supabase erstellt
- [ ] Indexes & Foreign Keys
- [ ] RLS Policies konfiguriert
- [ ] Seed-Script erstellt & getestet

### Code
- [x] Provider Interface vorhanden (`ProgressProvider.interface.ts` ✅)
- [x] LocalProgressProvider vorhanden (`LocalProgressProvider.ts` ✅)
- [ ] `SupabaseProgressProvider` implementiert
- [ ] Provider-Swap in App.tsx funktioniert
- [ ] Error Handling & Retry Logic
- [ ] Offline-Support (IndexedDB, Queue)

### Performance
- [x] JSONLoader vorhanden (`src/infra/utils/JSONLoader.ts` ✅)
- [ ] JSONLoader erweitert (Metadaten aus DB, Fallback zu JSON)
- [ ] GalaxyMap optimiert (nur Metadaten laden)
- [ ] Parallel Loading implementiert
- [ ] IndexedDB Cache funktioniert

### Migration
- [ ] Migration-Script erstellt
- [ ] Test mit Test-Daten erfolgreich
- [ ] Backup erstellt
- [ ] Produktions-Migration geplant

### Testing
- [ ] LocalStorage → Supabase Migration getestet
- [ ] Offline-Modus getestet
- [ ] Sync zwischen Geräten getestet
- [ ] Performance gemessen (vorher/nachher)

---

## 📊 Erfolgs-Metriken

**Performance**:
- Initial Load: < 1 Sekunde (nur Metadaten)
- Theme Load: < 500ms (alle Themes eines Universums)
- Chapter Load: < 300ms (einzelnes Chapter)
- Cache Hit Rate: > 80% bei wiederholten Besuchen

**Reliability**:
- Offline-Modus: 100% funktionsfähig
- Sync-Queue: < 5 Sekunden Verzögerung bei Online
- Error Rate: < 1% bei Supabase-Requests

**User Experience**:
- Multi-Device Sync: < 10 Sekunden Verzögerung
- Migration: 100% Daten-Erhaltung
- Keine spürbare Performance-Verschlechterung

---

## 🔗 Referenzen

- **Supabase Docs**: https://supabase.com/docs
- **Local Development**: https://supabase.com/docs/guides/cli/local-development
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Storage**: https://supabase.com/docs/guides/storage
- **Realtime**: https://supabase.com/docs/guides/realtime

---

---

## 📁 Wichtige Dateien für Migration

### Bereits vorhanden:
- ✅ `src/infra/supabase/client.ts` - Supabase Client
- ✅ `src/infra/auth/AuthContext.tsx` - Authentication
- ✅ `src/infra/providers/LocalProgressProvider.ts` - LocalStorage Provider
- ✅ `src/infra/providers/ProgressProvider.interface.ts` - Provider Interface
- ✅ `src/infra/utils/JSONLoader.ts` - Content Loader
- ✅ `docs/table_fields.json` - Schema-Dokumentation
- ✅ `docs/migration_complete.sql` - SQL Migration
- ✅ `docs/migration_populate_data.sql` - Daten-Befüllung

### Zu erstellen:
- ❌ `src/infra/providers/SupabaseProgressProvider.ts` - Supabase Provider
- ❌ `src/infra/cache/IndexedDBCache.ts` - IndexedDB Cache
- ❌ `src/infra/sync/SyncQueue.ts` - Sync Queue
- ❌ `scripts/seed_metadata.py` - Seed-Script (JSON → DB)
- ❌ `scripts/migrate_localstorage_to_supabase.ts` - LocalStorage → Supabase
- ❌ `supabase/migrations/XXX_create_initial_schema.sql` - Tabellen-Erstellung
- ❌ `supabase/migrations/XXX_rls_policies.sql` - RLS Policies
- ❌ `.env.example` - Environment Variables Template

### Zu erweitern:
- 🔄 `src/App.tsx` - Provider-Swap hinzufügen
- 🔄 `src/infra/utils/JSONLoader.ts` - Supabase-Integration

---

## 🎯 Nächste Schritte (Priorität)

1. **Supabase CLI Setup** (Tag 1)
   - `supabase init` & `supabase start`
   - Tabellen erstellen (basierend auf `docs/migration_complete.sql`)

2. **SupabaseProgressProvider** (Tag 2)
   - Implementierung des Provider Interfaces
   - Error Handling & Retry Logic

3. **Provider-Swap in App.tsx** (Tag 2)
   - Feature-Flag `VITE_USE_SUPABASE`
   - Fallback zu LocalStorage

4. **IndexedDB Cache** (Tag 3)
   - `idb` installieren
   - Cache-Layer implementieren

5. **JSONLoader erweitern** (Tag 3-4)
   - Metadaten aus Supabase laden
   - Fallback zu JSON

6. **Seed-Script** (Tag 4)
   - JSON → DB Migration
   - Validierung

7. **RLS Policies** (Tag 4-5)
   - Security Policies erstellen
   - Testen

8. **Migration LocalStorage → Supabase** (Tag 5)
   - Migration-Script
   - User-Mapping

