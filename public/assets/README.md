# WordRush Assets

## Ordnerstruktur

```
assets/
├── ships/          # Schiff-Grafiken (SVG empfohlen)
├── lasers/         # Laser-Effekte
└── particles/      # Partikeleffekte
```

## Schiff-Grafiken (`ships/`)

### Format
- **Empfohlen**: SVG (skalierbar, klein, scharf)
- **Alternative**: PNG (60x60px - 120x120px)

### Verfügbare Schiffe
- `default.svg` - Standard-Schiff (blau, rund)
- `english_ship.svg` - Englisch-Theme (Buch-inspiriert)
- `medical_ship.svg` - Medizin-Theme (Kreuz-inspiriert)

### Verwendung in Themes

Im `themes.json` deines Themas:

```json
{
  "id": "my_theme",
  "name": "Mein Theme",
  "shipSkin": "/assets/ships/my_custom_ship.svg",
  "laserColor": "#ff00ff",
  ...
}
```

### Design-Tipps für Schiffe
- Zentrum sollte bei `(30, 30)` sein (für 60x60 ViewBox)
- Radius ca. 25-30 units
- Deutlich sichtbares Zentrum/Cockpit
- Nicht zu detailliert (muss bei kleiner Größe erkennbar sein)
- Kontrast zum Hintergrund beachten

## Laser-Farben

Definiere im Theme JSON:
```json
"laserColor": "#4af2e2"  // Hex-Farbcode
```

## Fallback

Wenn kein `shipSkin` definiert ist, wird automatisch ein einfacher Kreis gerendert.

