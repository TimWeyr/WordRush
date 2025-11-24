# WordRush - Mobile/Touch Optimierungen

**Letzte Aktualisierung**: [Datum]  
**Status**: In Planung

---

## 🎮 Touch-Steuerung Verbesserungen

### 1. Schiff-Steuerung: Relative Position statt absoluter Position

**Problem**: Beim Touch springt das Schiff direkt zur Fingerposition, wodurch das Schiff vom Finger verdeckt wird und die Steuerung unpräzise wird.

**Lösung**: Die Distanz zwischen Finger und Schiff beim ersten Touch soll erhalten bleiben. Das Schiff folgt dem Finger mit konstanter Offset-Distanz.

**1a. Relative Offset-Methode**
- Beim `touchstart`: Distanz zwischen Finger und Schiff berechnen
- Diese Distanz als Offset speichern
- Bei `touchmove`: Zielposition = Fingerposition + Offset
- Vorteil: Schiff bleibt immer sichtbar, natürliche Steuerung
- Nachteil: Initiale Position muss gut gewählt werden

**Hinweis**: Maus-Steuerung bleibt unverändert (absolutes Follow).

**Code-Stellen**:
- `src/components/Game.tsx`: `handleTouchStart`, `handleTouchMove`
- `src/logic/ShooterEngine.ts`: `update()` - Mouse/Touch Position Handling
- `src/entities/Ship.ts`: `setTarget()` - Eventuell Offset-Parameter hinzufügen

---

### 2. Hover-Texte auf Galaxy Map für Touch-Geräte

**Problem**: Auf mobilen Geräten gibt es kein Hover-Event. Tooltips werden nur beim Klick angezeigt, was bereits funktioniert, aber nicht ideal ist.

**Aktueller Stand**: Beim Klick auf Planet/Mond wird Tooltip daneben geöffnet ✅ (funktioniert bereits gut)

**2a. Long-Press für Tooltip**
- Long-Press (500ms) auf Planet/Mond zeigt Tooltip
- Tap öffnet wie bisher
- Vorteil: Tooltip ohne Navigation zu öffnen
- Nachteil: Längere Wartezeit, könnte mit Drag kollidieren

**2b. Info-Button pro Element**
- Kleines "i" Icon neben jedem Planet/Mond
- Tap auf Icon zeigt Tooltip
- Tap auf Planet/Mond öffnet wie bisher
- Vorteil: Explizit, keine Verwirrung
- Nachteil: UI wird überladen, Platzproblem bei vielen Elementen

**2c. Tooltip beim ersten Tap (Toggle)**
- Erster Tap zeigt Tooltip (wie aktuell)
- Zweiter Tap auf dasselbe Element schließt Tooltip
- Tap auf anderes Element schließt vorherigen und öffnet neuen
- Vorteil: Einfach, keine zusätzlichen UI-Elemente
- Nachteil: Tooltip bleibt offen, könnte stören

**2d. Linksbündiger Planet-Name (NEU - Empfohlen)**
- Planet-Name wird linksbündig am bildschirmrand auf der Galaxy Map angezeigt
- Position: Links neben  dem Planeten, schrift läuft hinter dem planeten her.
- Immer sichtbar, kein Hover/Tap nötig
- Vorteil: 
  - Sofort erkennbar, keine Interaktion nötig
  - Keine Verwirrung mit Navigation
  - nur auf touch bei PC bleibt der hover
  - Keine zusätzlichen UI-Elemente nötig

- **Textfarbe**: `universe.colorPrimary` (siehe `agents.md` Color System)
  - Begründung: Konsistente Farbe für alle Planeten im Universe
  - `colorPrimary` wird bereits für Planet rendering und UI-Elemente verwendet
  - Sollte gute Lesbarkeit bieten
- **Text-Styling**:
  - Font-Size: Responsive (z.B. 14-16px auf Mobile)
  - Font-Weight: Medium/Bold für bessere Lesbarkeit
  - Position: Links vom Planeten, auf der selben höhe wie der mittelpuntk des planeten. die mitte der schrifthöhe soll auch der mittelpunkt des planeten sein.
- **Implementierung**:
  - Rendering in `GalaxyRenderer.ts` zusammen mit Planet-Rendering
  - Text-Position basierend auf Planet-Position berechnen
  - Eventuell Text-Rotation bei schrägen Positionen
  - Z-Index: Text über Hintergrund, aber unter interaktiven Elementen
 

**Code-Stellen** (für Ansatz 2d):
- `src/components/GalaxyRenderer.ts`: 
  - `renderPlanet()` oder neue Methode `renderPlanetName()` - Text-Rendering hinzufügen
  - Text-Position berechnen: `planetX - textWidth - padding`
  - Farbe: `universe.colorPrimary` aus Universe-Konfiguration
  - Text-Shadow für besseren Kontrast
- `src/components/GalaxyMap.tsx`: 
  - Eventuell Universe-Daten an GalaxyRenderer übergeben (falls noch nicht vorhanden)
  - Responsive Font-Size basierend auf Viewport-Größe

---

### 3. Base nicht sichtbar wegen Browser-Adressleiste

**Problem**: Auf mobilen Geräten verschwindet die Browser-Adressleiste nicht beim Scrollen (weil kein Scrollen möglich), wodurch die Base am unteren Rand verdeckt wird.

**3a. Viewport Height Anpassung**
- `100vh` auf mobilen Geräten berücksichtigt nicht die Browser-UI
- Verwende `window.innerHeight` statt `100vh` für Canvas-Höhe
- Base-Position dynamisch anpassen: `screenHeight - 50 - safeAreaBottom`
- Vorteil: Funktioniert sofort, keine Layout-Änderungen
- Nachteil: Muss bei Resize neu berechnen

**3b. Safe Area Insets nutzen**
- CSS `env(safe-area-inset-bottom)` für iOS
- Base-Position: `screenHeight - 50 - safeAreaBottom`
- Vorteil: Native Browser-Unterstützung, funktioniert auch bei Notch
- Nachteil: Nicht alle Browser unterstützen es gleich


**Code-Stellen**:
- `src/components/Game.tsx`: Canvas-Größe Berechnung
- `src/logic/ShooterEngine.ts`: `basePosition` - Dynamisch berechnen
- `src/entities/BaseEntity.ts`: Position anpassen

---

### 4. Shooter Button für Touch-Geräte

**Problem**: Aktuell wird mit zweitem Finger geschossen, was unpraktisch ist. Ein dedizierter Fire-Button wäre besser.

**4a. Fester Fire-Button (rechts unten)**
- Großer runder Button rechts unten (z.B. 80px Durchmesser)
- Tap = Einzelschuss
- Halten = Dauerfeuer (wenn aktiviert)
- Vorteil: Klar erkennbar, Standard-Pattern (wie viele Shooter)
- Nachteil: Kann Finger beim Steuern stören, verdeckt möglicherweise Spielfeld



**Vergleich mit anderen Spielen**:
- **PUBG Mobile**: Fester Button rechts unten, anpassbar
- **Call of Duty Mobile**: Mehrere Buttons (Schießen, Zielen, Reload), alle anpassbar
- **Apex Legends Mobile**: Fester Button + optionales Dauerfeuer
- **Brawl Stars**: Tap-to-Shoot (automatisch in Richtung Bewegung)

**Empfehlung**: 4c (Floating Button, anpassbar) - Beste UX, Standard in modernen Mobile Shootern.

**Code-Stellen**:
- `src/components/Game.tsx`: Neuer Fire-Button Component
- Touch-Event Handling: `handleTouchStart` - Unterscheidung zwischen Steuerung und Schießen
- `src/logic/ShooterEngine.ts`: `shoot()` - Eventuell Richtung vom Touch-Point

---  

---

### 7. Touch-Events vs Browser-Gesten

**Erwartete Probleme**:
- Pinch-to-Zoom auf Galaxy Map kollidiert mit Browser-Zoom
- Swipe-Gesten werden vom Browser abgefangen
- Doppel-Tap-Zoom aktiviert sich versehentlich

**Lösungsansätze**:
- `touch-action: none` CSS für Canvas
- `preventDefault()` bei Touch-Events (bereits implementiert ✅)
- Meta-Tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`

---
   