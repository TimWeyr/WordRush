# WordRush URL Parameter Beispiele

**Base URL:** `https://wordrush-gamma.vercel.app/`

## 15 Beispiel-URLs mit Erklärungen

### 1. **Einfacher Universe-Link**
```
https://wordrush-gamma.vercel.app/?universe=psychiatrie
```
**Erklärung:** Öffnet direkt das Psychiatrie-Universum. Perfekt zum Teilen für medizinische Lerninhalte.

---

### 2. **Direkter Zoom auf ein Thema**
```
https://wordrush-gamma.vercel.app/?universe=psychiatrie&theme=f10_f19
```
**Erklärung:** Wählt Psychiatrie aus und zoomt automatisch auf das F10-F19 Thema (Alkohol & Substanzen). Ideal für fokussiertes Lernen.

---

### 3. **Shooter-Modus für Challenge**
```
https://wordrush-gamma.vercel.app/?universe=englisch&mode=shooter
```
**Erklärung:** Startet im Englisch-Universum mit aktiviertem Shooter-Modus (volle Punkte, keine Farbcodierung). Für fortgeschrittene Spieler.

---

### 4. **Zen-Modus zum Entspannen**
```
https://wordrush-gamma.vercel.app/?universe=geschichte&preset=zen
```
**Erklärung:** Geschichte-Universum im Zen-Modus (keine Bewegung, entspanntes Lernen). Perfekt für Vokabeln ohne Zeitdruck.

---

### 5. **Hardcore Challenge**
```
https://wordrush-gamma.vercel.app/?universe=psychiatrie&theme=f10_f19&mode=shooter&preset=hard
```
**Erklärung:** Maximale Herausforderung: F10 Alkohol im Shooter-Modus mit Hard-Preset (schnell, viele Gegner). Für Profis!

---

### 6. **Lernmodus für Anfänger**
```
https://wordrush-gamma.vercel.app/?universe=englisch&mode=lernmodus&preset=easy
```
**Erklärung:** Englisch-Vokabeln im Lernmodus (grün/rot Farbcodierung) mit Easy-Preset. Ideal für Einsteiger.

---

### 7. **Geschichte Weimarer Republik**
```
https://wordrush-gamma.vercel.app/?universe=geschichte&theme=weimarer_republik&mode=lernmodus
```
**Erklärung:** Direktlink zur Weimarer Republik im Lernmodus. Perfekt für Geschichtsunterricht.

---

### 8. **Kiosk-Modus (nur ein Universum)**
```
https://wordrush-gamma.vercel.app/?universes=mathe&universe=mathe
```
**Erklärung:** Zeigt NUR das Mathe-Universum an (andere werden ausgeblendet). Ideal für öffentliche Displays oder Tablets.

---

### 9. **Mehrere Universen filtern**
```
https://wordrush-gamma.vercel.app/?universes=psychiatrie,englisch,geschichte&universe=psychiatrie
```
**Erklärung:** Zeigt nur diese 3 Universen an und wählt Psychiatrie aus. Perfekt für fokussierte Lernumgebungen.

---

### 10. **Medium-Difficulty Training**
```
https://wordrush-gamma.vercel.app/?universe=spanisch&mode=shooter&preset=medium
```
**Erklärung:** Spanisch-Vokabeln im Shooter-Modus mit mittlerer Schwierigkeit. Gute Balance zwischen Challenge und Machbarkeit.

---

### 11. **Easy-Mode für Kinder**
```
https://wordrush-gamma.vercel.app/?universes=tiere,pokemon&universe=tiere&preset=easy
```
**Erklärung:** Nur Tier- und Pokemon-Universen, Easy-Mode aktiviert. Perfekt für jüngere Spieler.

---

### 12. **Business English Challenge**
```
https://wordrush-gamma.vercel.app/?universe=englisch&theme=business_english&mode=shooter&preset=hard
```
**Erklärung:** Business-Englisch im Shooter-Modus mit Hard-Preset. Für Berufstätige, die ihre Skills testen wollen.

---

### 13. **Custom Preset (Standard)**
```
https://wordrush-gamma.vercel.app/?universe=alltag&preset=custom
```
**Erklärung:** Alltag-Universum mit Custom-Preset (Standard-Einstellungen). Nutzt die individuellen Einstellungen des Nutzers.

---

### 14. **Technisches Englisch im Lernmodus**
```
https://wordrush-gamma.vercel.app/?universe=englisch&theme=technical_english&mode=lernmodus&preset=easy
```
**Erklärung:** Technisches Englisch für Anfänger: Lernmodus (Farbcodierung) + Easy-Preset. Ideal zum Einstieg in Fachvokabular.

---

### 15. **Vollständige Konfiguration**
```
https://wordrush-gamma.vercel.app/?universes=psychiatrie,englisch&universe=psychiatrie&theme=icd10&mode=shooter&preset=medium
```
**Erklärung:** Komplette Konfiguration: Nur 2 Universen sichtbar, Psychiatrie ausgewählt, ICD-10 Thema fokussiert, Shooter-Modus, Medium-Schwierigkeit. Perfekt für medizinische Ausbildung.

---

## Parameter-Übersicht

| Parameter | Werte | Beschreibung |
|-----------|-------|--------------|
| `universes` / `universeIds` | Komma-getrennt (z.B. `psychiatrie,englisch`) | Filtert welche Universen geladen werden |
| `universe` | Universe-ID (z.B. `psychiatrie`) | Wählt Universum beim Start aus |
| `theme` | Theme-ID (z.B. `f10_f19`) | Zoomt auf spezifisches Thema/Planeten |
| `mode` | `lernmodus` oder `shooter` | Setzt Spielmodus |
| `preset` | `zen`, `easy`, `medium`, `hard`, `custom` | Setzt Schwierigkeits-Preset |

## Verwendungszwecke

- **Teilbare Links:** Spezifische Inhalte mit Freunden/Kollegen teilen
- **Kiosk-Modus:** Öffentliche Displays mit eingeschränkter Auswahl
- **Unterricht:** Direkte Links zu bestimmten Themen für Schüler
- **Challenges:** Schwierige Konfigurationen zum Teilen
- **Customization:** Individuelle Lernumgebungen erstellen

