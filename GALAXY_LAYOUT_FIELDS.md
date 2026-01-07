# GalaxyLayout.ts - Tatsächlich verwendete Felder

Diese Datei listet auf, welche Felder aus Universe, Theme, Chapter und Item tatsächlich in `src/logic/GalaxyLayout.ts` verwendet werden.

## Universe
**Wird NICHT verwendet** ❌
- `GalaxyLayout.ts` verwendet keine Universe-Daten direkt
- Nur Theme- und Chapter-Daten werden verwendet

---

## Theme
**Verwendete Felder:**

### ✅ `id` (string)
- **Verwendung:** Wird als `PlanetLayout.id` verwendet
- **Zeilen:** 125, 176
- **Funktionen:** 
  - `calculatePlanetPositions()`
  - `calculatePlanetPositionsHorizontalMaeander()`

### 📦 Gesamtes Theme-Objekt
- Wird als `PlanetLayout.theme` gespeichert (für spätere Verwendung außerhalb von GalaxyLayout.ts)
- **Aber:** Keine weiteren Theme-Felder werden innerhalb von GalaxyLayout.ts verwendet

**NICHT verwendet:**
- `name`, `description`, `colorPrimary`, `colorAccent`, `backgroundGradient`
- `maxLevels`, `icon`, `relatedPackages`, `available`, `language`
- `chapters`, `meta`, `particleEffect`, `shipSkin`, `laserColor`

---

## Chapter
**Verwendete Felder:**

### ✅ `chapterId` (string)
- **Verwendung:** Wird aus `Object.keys(chapters)` extrahiert
- **Zeilen:** 199, 239, 252, 492
- **Funktionen:**
  - `calculateMoonPositions()`
  - `calculateMoonPositionsAdaptive()`

### 📦 Gesamtes ChapterConfig-Objekt
- Wird als `MoonLayout.chapter` gespeichert (für spätere Verwendung außerhalb von GalaxyLayout.ts)
- **Aber:** Keine spezifischen ChapterConfig-Felder werden innerhalb von GalaxyLayout.ts verwendet

**NICHT verwendet:**
- `title`, `backgroundImage`, `backgroundGradient`
- `spawnRate`, `waveDuration`, `music`, `particleEffect`

---

## Item
**Verwendete Felder:**

### ✅ `id` (string)
- **Verwendung:** Wird als `ItemLayout.id` und `ItemLayout.itemId` verwendet
- **Zeilen:** 725, 726
- **Funktionen:**
  - `calculateItemPositions()`

### ✅ `level` (number)
- **Verwendung:** 
  - Berechnung der Level-Anzahl pro Chapter
  - Berechnung der Ring-Radien (Level-Rings)
  - Gruppierung von Items nach Level
- **Zeilen:** 254, 534, 635, 699, 700, 702, 727
- **Funktionen:**
  - `calculateMoonPositionsAdaptive()` - verwendet `item.level` für Level-Count
  - `calculateMoonRingExtent()` - verwendet `item.level` für Ring-Berechnung
  - `calculateLevelRings()` - verwendet `item.level` für Ring-Layout
  - `calculateItemPositions()` - verwendet `item.level` für Gruppierung

**NICHT verwendet:**
- `theme`, `chapter`, `published`, `freeTier`, `waveDuration`, `introText`
- `base`, `correct`, `distractors`, `meta`
- Alle anderen Item-Felder werden nicht verwendet

---

## Zusammenfassung

### Minimal benötigte Datenstruktur für GalaxyLayout.ts:

```typescript
// Theme (minimal)
interface ThemeMinimal {
  id: string;
}

// Chapter (minimal)
interface ChapterMinimal {
  // Nur chapterId als Key wird verwendet
  // Keine Felder aus ChapterConfig werden benötigt
}

// Item (minimal)
interface ItemMinimal {
  id: string;
  level: number;
}
```

### Aktuelle Verwendung:
- **Theme:** Nur `id` wird verwendet
- **Chapter:** Nur `chapterId` (als Key) wird verwendet
- **Item:** Nur `id` und `level` werden verwendet
- **Universe:** Wird nicht verwendet

### Hinweis:
Die vollständigen Objekte (Theme, ChapterConfig) werden in den Layout-Strukturen gespeichert, aber nur für die spätere Verwendung außerhalb von `GalaxyLayout.ts` (z.B. in `GalaxyRenderer.ts` oder `GalaxyMap.tsx`).





















