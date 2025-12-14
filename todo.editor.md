# WordRush Content Editor - Entwurf

**Status**: 🚧 In Planung  
**Ziel**: Visueller Editor für Universen, Themes (Planeten), Chapters (Monde) und Items  
**Sicherheit**: Nur im Localhost verfügbar (localhost-only check)

---

## Übersicht

Der Content Editor ermöglicht es, alle Inhalte von WordRush visuell zu bearbeiten:
- **Universen** erstellen und bearbeiten
- **Themes (Planeten)** hinzufügen und konfigurieren
- **Chapters (Monde)** verwalten
- **Items** einzeln bearbeiten oder per Bulk-Import hinzufügen

---

## Funktionale Anforderungen

### 1. Hierarchische Navigation

**Struktur:**
```
Universe Selector (Dropdown/Tabs)
  └─ Theme Selector (Dropdown/Tabs)
      └─ Chapter Selector (Dropdown/Tabs)
          └─ Item List (Scrollable List)
              └─ Item Editor (Detailansicht)
```

**UI-Komponenten:**
- Breadcrumb-Navigation: `Universe > Theme > Chapter > Item`
- Zurück-Button für jede Hierarchie-Ebene
- Schnellzugriff auf häufig bearbeitete Bereiche

### 2. Universe Editor

**Bearbeitbare Felder:**
- `id` (string) - Unique identifier
- `name` (string) - Display name
- `description` (string) - Beschreibung
- `colorPrimary` (color picker) - Hauptfarbe
- `colorAccent` (color picker) - Akzentfarbe
- `backgroundGradient` (color array) - Gradient-Farben (min. 2)
- `icon` (emoji picker / text input) - Icon/Emoji
- `music.theme` (text input) - Musik-Dateiname
- `music.volume` (slider 0-1) - Lautstärke
- `particleEffect` (dropdown) - Partikel-Effekt
- `shipSkin` (dropdown) - Ship-Skin
- `laserColor` (color picker) - Laser-Farbe
- `themes` (multi-select) - Zugehörige Theme-IDs
- `meta.author` (text input) (nimm den Names des angemeldeten Users aus settings)
- `meta.version` (text input) automatisch mit now() befüllt
- `meta.created` (date picker) automatisch mit now() befüllt

**Aktionen:**
- "Neues Universum" Button → Erstellt neues Universe mit Default-Werten
- "Speichern" Button → Passwort-Abfrage → Speichert `universe.<id>.json`
- "Löschen" Button → Bestätigung → Löscht Universe (nur wenn keine Themes vorhanden)

### 3. Theme Editor

**Bearbeitbare Felder:**
- `id` (string)
- `name` (string)
- `description` (string)
- `colorPrimary` (color picker)
- `colorAccent` (color picker)
- `backgroundGradient` (color array)
- `maxLevels` (number input)
- `icon` (emoji picker)
- `relatedPackages` (multi-select) - Verwandte Theme-IDs
- `available` (checkbox)
- `language` (dropdown)
- `particleEffect` (dropdown)
- `shipSkin` (dropdown) avialbe ships form pubilc / assets / ships
- `laserColor` (color picker)
- `meta.author`, `meta.version`, `meta.created`

**Chapter-Verwaltung:**
- Liste aller Chapters mit:
  - Chapter-ID (editable)
  - Name (optional, für Display)
  - "Bearbeiten" Button → Öffnet Chapter-Editor
  - "Löschen" Button → Bestätigung
- "Neuer Chapter" Button → Erstellt neuen Chapter-Eintrag

**Chapter-Konfiguration (Inline-Editor):**
- `backgroundImage` (file picker / text input)
- `backgroundGradient` (color array)
- `spawnRate` (number slider 0.5-5.0)
- `waveDuration` (number input, optional)
- `music` (text input)
- `particleEffect` (dropdown)

**Aktionen:**
- "Speichern" → Speichert `themes.<theme_id>.json`
- "Neues Theme" → Erstellt neues Theme im aktuellen Universe

### 4. Chapter Editor

**Ansicht:**
- Item-Liste (scrollbar)
  - Item-ID
  - Base-Wort (Vorschau)
  - Level
  - Anzahl Correct/Distractor
  - "Bearbeiten" Button
  - "Löschen" Button
- "Neues Item" Button → Erstellt leeres Item-Template
- "Bulk Import" Button → Öffnet Bulk-Import-Modal

**Aktionen:**
- "Speichern" → Speichert `<chapter_id>.json`

### 5. Item Editor

**Tabs/Sektionen:**

#### Tab 1: Grundinformationen
- `id` (text input) - Zeichenzähler: max 20 Zeichen
- `theme` (readonly) - Automatisch gesetzt
- `chapter` (readonly) - Automatisch gesetzt
- `level` (number input 1-6) - Dropdown
- `waveDuration` (number input, optional)

#### Tab 2: Base Entry
- `base.word` (text input) - **Zeichenzähler: max 30 Zeichen aber nur info** ⚠️
- `base.type` (text input) - Zeichenzähler: max 20 Zeichen
- `base.image` (text input, optional)
- `base.visual` (expandable section):
  - `tier` (number input)
  - `size` (number slider 0.5-2.0)
  - `appearance` (dropdown: "normal", "bold", "italic")
  - `color` (color picker)
  - `glow` (checkbox)
  - `pulsate` (checkbox)
  - `variant` (dropdown: "hexagon", "star", "bubble", "spike", "square", "diamond")
  - `fontSize` (number slider 0.8-1.5)

#### Tab 3: Correct Entries
- Liste aller Correct-Entries
- Für jeden Entry:
  - `entry.word` (text input) - **Zeichenzähler: max 30 Zeichen aber nur info** ⚠️
  - `entry.type` (text input)
  - `entry.image` (text input, optional)
  - `spawnPosition` (number slider 0.0-1.0)
  - `spawnSpread` (number slider 0.0-0.2)
  - `spawnDelay` (number input, optional)
  - `speed` (number slider 0.5-2.0)
  - `points` (number input)
  - `pattern` (dropdown: "linear_inward", "zigzag", "wave", "seek_center")
  - `hp` (number input, optional)
  - `collectionOrder` (number input, optional)
  - `context` (textarea) - Zeichenzähler: max 200 Zeichen
  - `visual` (expandable section, wie Base)
  - `sound` (text input, optional)
  - "Löschen" Button
- "Neuer Correct Entry" Button

#### Tab 4: Distractor Entries
- Liste aller Distractor-Entries
- Für jeden Entry:
  - `entry.word` (text input) - **Zeichenzähler: max 30 Zeichen aber nur info** ⚠️
  - `entry.type` (text input)
  - `entry.image` (text input, optional)
  - `spawnPosition` (number slider 0.0-1.0)
  - `spawnSpread` (number slider 0.0-0.2)
  - `spawnDelay` (number input, optional)
  - `speed` (number slider 0.5-2.0)
  - `points` (number input)
  - `hp` (number input, optional)
  - `damage` (number input)
  - `behavior` (dropdown, optional)
  - `redirect` (text input)
  - `context` (textarea) - Zeichenzähler: max 200 Zeichen
  - `visual` (expandable section)
  - `sound` (text input, optional)
  - "Löschen" Button
- "Neuer Distractor Entry" Button

#### Tab 5: Meta & Difficulty
- `meta.source` (text input, optional)
- `meta.tags` (tag input - komma-separiert)
- `meta.related` (multi-select - andere Item-IDs)
- `meta.difficultyScaling`:
  - `speedMultiplierPerReplay` (number slider 0.0-0.5)
  - `colorContrastFade` (checkbox)
  - `angleVariance` (number slider 0-30, optional)

**Aktionen:**
- "Speichern" → Speichert Item zurück in Chapter-JSON
- "Abbrechen" → Verwirft Änderungen
- "Duplizieren" → Erstellt Kopie mit neuer ID





 

### 7. Validierung & Zeichenzähler

**Zeichenzähler-Anzeige:**
- Rechts oben/rechts unten in jedem Textfeld
- Format: `123/200` (aktuell/maximum)
- Farben:
  - **Grün**: < 80% des Limits
  - **Gelb**: 80-95% des Limits
  - **Rot**: > 95% des Limits ⚠️
  - **Rot + Warnung**: > 100% (Speichern blockiert)

**Validierungsregeln:**

| Feld | Max Zeichen | Warnung ab | Blockiert ab |
|------|-------------|------------|--------------|
| `id` | 20 | 18 | 30 |
| `base.word` | 30 | 27 | 40 |
| `correct[].entry.word` | 30 | 27 | 40 |
| `distractor[].entry.word` | 30 | 27 | 40 |
| `context` | 200 | 180 | 250 |
| `base.type` | 20 | 18 | 30 |
| `entry.type` | 20 | 18 | 30 |

**Validierung beim Speichern:**
- Alle Pflichtfelder ausgefüllt?
- Zeichenlimits eingehalten?
- Item-IDs eindeutig?
- Level zwischen 1-10?
- Mindestens 1 Correct Entry?
- Mindestens 3 Distractor Entries?
- JSON-Syntax gültig?

**Fehleranzeige:**
- Rote Umrandung bei fehlerhaften Feldern
- Tooltip mit Fehlermeldung
- Liste aller Fehler oben im Editor
- "Speichern" Button disabled bei Fehlern

### 8. Speichern & Sicherheit

**Speichern-Button:**
- In jedem Editor (Universe, Theme, Chapter)
- Beim Klick: Passwort-Modal öffnen
- Passwort-Feld (type="password")
- "Abbrechen" und "Speichern" Buttons

**Passwort-Validierung:**
- Hardcoded Passwort (z.B. in `.env.local` oder Config)
- Fehler: "Falsches Passwort" Meldung


**Datei-Schreibvorgang:**
- Lösung: es wird das erst nur auf localhost basis geben, da sollte schreiben gehen.
später ziehen wir den editor auf supabase um, da ist es dann auch für jeden nutzer möglich

### 9. UI/UX Design

**Layout:**
- **Sidebar links**: Navigation (Universe > Theme > Chapter)
- **Hauptbereich**: Editor-Formulare
- **Toolbar oben**: Speichern, Abbrechen, Hilfe
- **Status-Bar unten**: "Gespeichert um...", Validierungsfehler

**Styling:**
- Modern, clean Design
- Konsistent mit WordRush-Design-System
- Responsive (Desktop-first, Mobile optional)
- Dark Mode Support

**Komponenten:**
- Form Inputs mit Zeichenzählern
- Color Picker (native oder Library)
- Emoji Picker (optional)
- Dropdown/Select für Enums
- Number Slider für Wertebereiche
- Expandable Sections für verschachtelte Objekte
- Tab-Navigation für Item-Editor

**Interaktionen:**
- Auto-Save als Draft (LocalStorage)?
- "Ungespeicherte Änderungen" Warnung beim Verlassen
- Undo/Redo Funktionalität?
- Keyboard Shortcuts (Ctrl+S zum Speichern)

---

## Technische Umsetzung

### Tech Stack

**Frontend:**
- React (bestehend)
- TypeScript (bestehend)
- Form-Library: React Hook Form oder Formik
- UI-Komponenten: Custom oder Material-UI / Chakra UI
- Color Picker: `react-color` oder native
- JSON Editor: `react-json-view` (optional für Debug)

**Backend/File-Writes:**
- Option 1: Vite Plugin für Dev-Mode
- Option 2: Express.js Backend für Production
- Option 3: Download-Funktion (kein Backend nötig)

### Dateistruktur

```
src/
├── components/
│   ├── editor/
│   │   ├── EditorLayout.tsx
│   │   ├── UniverseEditor.tsx
│   │   ├── ThemeEditor.tsx
│   │   ├── ChapterEditor.tsx
│   │   ├── ItemEditor.tsx
│   │   ├── BulkImportModal.tsx
│   │   ├── PasswordModal.tsx
│   │   ├── CharacterCounter.tsx
│   │   └── ValidationErrors.tsx
│   └── ...
├── infra/
│   ├── editor/
│   │   ├── EditorAPI.ts (File-Writes)
│   │   ├── BulkParser.ts (Bulk-Import Parser)
│   │   ├── Validator.ts (Validierungs-Logik)
│   │   └── EditorConfig.ts (Passwort, Limits)
│   └── ...
└── routes/
    └── Editor.tsx (Hauptroute: /editor)
```

### API-Endpunkte (wenn Backend)

```
POST /api/editor/save-universe
POST /api/editor/save-theme
POST /api/editor/save-chapter
POST /api/editor/validate-password
```

### Validierungs-Skript

**`src/infra/editor/Validator.ts`:**
```typescript
export interface ValidationRule {
  field: string;
  maxLength?: number;
  required?: boolean;
  pattern?: RegExp;
  min?: number;
  max?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

export function validateItem(item: Item): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  
  // ID Validierung
  if (!item.id || item.id.length > 20) {
    errors.push({ field: 'id', message: 'ID muss zwischen 1-20 Zeichen sein' });
  }
  
  // Base Word Validierung
  if (item.base.word && item.base.word.length > 30) {
    errors.push({ field: 'base.word', message: 'Base Word darf max. 30 Zeichen haben' });
  }
  
  // Correct Entries Validierung
  item.correct.forEach((entry, index) => {
    if (entry.entry.word && entry.entry.word.length > 30) {
      errors.push({ 
        field: `correct[${index}].entry.word`, 
        message: 'Correct Word darf max. 30 Zeichen haben' 
      });
    }
  });
  
  // Distractor Entries Validierung
  item.distractors.forEach((entry, index) => {
    if (entry.entry.word && entry.entry.word.length > 30) {
      errors.push({ 
        field: `distractors[${index}].entry.word`, 
        message: 'Distractor Word darf max. 30 Zeichen haben' 
      });
    }
  });
  
  // Level Validierung
  if (item.level < 1 || item.level > 6) {
    errors.push({ field: 'level', message: 'Level muss zwischen 1-6 sein' });
  }
  
  // Mindestens 1 Correct Entry
  if (item.correct.length === 0) {
    errors.push({ field: 'correct', message: 'Mindestens 1 Correct Entry erforderlich' });
  }
  
  // Mindestens 3 Distractor Entries
  if (item.distractors.length < 3) {
    errors.push({ field: 'distractors', message: 'Mindestens 3 Distractor Entries erforderlich' });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Bulk Parser

**`src/infra/editor/BulkParser.ts`:**
```typescript
export interface BulkImportLine {
  itemId: string;
  level: number;
  baseWord: string;
  baseType: string;
  correctWords: string[];
  distractors: string[];
  context: string;
}

export interface ParseResult {
  success: boolean;
  items: BulkImportLine[];
  errors: Array<{
    line: number;
    message: string;
  }>;
}

export function parseBulkImport(text: string): ParseResult {
  const lines = text.split('\n').filter(line => line.trim());
  const items: BulkImportLine[] = [];
  const errors: ParseResult['errors'] = [];
  
  lines.forEach((line, index) => {
    const parts = line.split('|');
    
    if (parts.length < 10) {
      errors.push({ line: index + 1, message: 'Nicht genug Felder (erwartet: 10)' });
      return;
    }
    
    const [itemId, levelStr, baseWord, baseType, ...rest] = parts;
    const correctWords = rest.slice(0, 2);
    const distractors = rest.slice(2, 6);
    const context = rest[6] || '';
    
    // Validierung
    if (itemId.length > 20) {
      errors.push({ line: index + 1, message: `Item-ID zu lang: ${itemId}` });
    }
    
    if (baseWord.length > 30) {
      errors.push({ line: index + 1, message: `Base Word zu lang: ${baseWord}` });
    }
    
    correctWords.forEach((word, i) => {
      if (word.length > 30) {
        errors.push({ line: index + 1, message: `Correct Word ${i+1} zu lang: ${word}` });
      }
    });
    
    distractors.forEach((word, i) => {
      if (word.length > 30) {
        errors.push({ line: index + 1, message: `Distractor ${i+1} zu lang: ${word}` });
      }
    });
    
    const level = parseInt(levelStr);
    if (isNaN(level) || level < 1 || level > 6) {
      errors.push({ line: index + 1, message: `Ungültiges Level: ${levelStr}` });
    }
    
    items.push({
      itemId,
      level,
      baseWord,
      baseType,
      correctWords,
      distractors,
      context
    });
  });
  
  return {
    success: errors.length === 0,
    items,
    errors
  };
}
```

---

## Implementierungs-Phasen

### Phase 1: Grundstruktur
- [ ] Editor-Route erstellen (`/editor`)
- [ ] Localhost-Check implementieren
- [ ] Navigation (Universe > Theme > Chapter)
- [ ] Basis-Layout mit Sidebar

### Phase 2: Universe Editor
- [ ] Universe-Editor Komponente
- [ ] Form-Felder für Universe
- [ ] Speichern mit Passwort-Modal
- [ ] File-Write Funktionalität (Download oder Backend)

### Phase 3: Theme Editor
- [ ] Theme-Editor Komponente
- [ ] Chapter-Verwaltung (Liste + Inline-Editor)
- [ ] Speichern-Funktionalität

### Phase 4: Chapter & Item Editor
- [ ] Chapter-Editor mit Item-Liste
- [ ] Item-Editor mit Tabs
- [ ] Zeichenzähler-Komponente
- [ ] Validierung beim Speichern

### Phase 5: Bulk Import
- [ ] Bulk-Import Modal
- [ ] Parser-Implementierung
- [ ] Validierung & Fehleranzeige
- [ ] Import-Funktionalität

### Phase 6: Polish
- [ ] UI/UX Verbesserungen
- [ ] Keyboard Shortcuts
- [ ] Undo/Redo (optional)
- [ ] Dokumentation

---

## Offene Fragen

1. **File-Writes**: Backend oder Download-Funktion?
2. **Passwort**: Hardcoded oder Config-Datei?
3. **Auto-Save**: LocalStorage für Drafts?
4. **Bulk-Format**: Pipe-separiert oder JSON/CSV?
5. **Mobile Support**: Soll Editor mobil nutzbar sein?

---

## Notizen

- Editor sollte nur im Development-Mode verfügbar sein?
- Oder: Separate Route mit Passwort-Schutz auch in Production?
- Backup-Funktion vor dem Speichern?
- History/Versionierung der Änderungen?

---

**Erstellt**: 2025-01-XX  
**Zuletzt aktualisiert**: 2025-01-XX

