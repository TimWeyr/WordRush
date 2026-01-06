# 🚀 Supabase Content Loading - Quick Start

**Status**: ✅ Implementation fertig - Bereit für Testing!

---

## ⚡ 5-Minuten Setup

### 1. Environment Variables
Erstelle `.env.local` im Projekt-Root:

```env
VITE_SUPABASE_URL=https://dein-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=dein-anon-key-hier
VITE_USE_SUPABASE_CONTENT=true
```

💡 **Credentials holen**: [Supabase Dashboard](https://supabase.com/dashboard) → Dein Projekt → Settings → API

### 2. App starten
```bash
npm run dev
```

### 3. Console prüfen
Browser DevTools → Console öffnen

**✅ Erfolg sieht so aus**:
```
🔄 [JSONLoader] Using Supabase for content loading
🌌 [SupabaseLoader] Loading universes from database...
✅ [SupabaseLoader] Loaded 3 universes
```

**❌ Fehler sieht so aus**:
```
❌ [SupabaseLoader] Failed to load universes: Error: ...
📁 [JSONLoader] Using JSON files for content loading
```
→ Fallback zu JSON funktioniert!

---

## 🎯 Was testen?

### Test 1: GalaxyMap
1. App öffnen
2. Universe auswählen
3. Console: `✅ Loaded X universes`?
4. Theme auswählen
5. Console: `✅ Loaded X chapters`?

### Test 2: Game
1. Chapter auswählen
2. Spiel starten
3. Console: `✅ Loaded X items`?
4. Spielen - funktioniert alles?

### Test 3: Fallback
1. `.env.local`: Ungültige Credentials setzen
2. App neu starten
3. Console: Fallback zu JSON?

---

## 🔧 Troubleshooting

### Problem: "Failed to load universes"
**Lösung**: Prüfe Credentials in `.env.local`

### Problem: Nur JSON-Logs, kein Supabase
**Lösung**: 
- `VITE_USE_SUPABASE_CONTENT=true` gesetzt?
- App neu gestartet? (nach .env Änderung)

### Problem: "No rounds found"
**Lösung**: Prüfe ob Daten in Supabase vorhanden:
```sql
SELECT * FROM rounds WHERE chapter_id = 'YOUR_CHAPTER';
```

---

## 📚 Mehr Infos

- **Setup-Guide**: `docs/SUPABASE_CONTENT_SETUP.md`
- **Implementation Details**: `docs/SUPABASE_IMPLEMENTATION_SUMMARY.md`
- **Original TODO**: `todo.universe-daten-aus-supabase-laden.md`

---

## ✅ Nächste Schritte

Nach erfolgreichem Test:
- [ ] Performance: Level-Ringe Optimierung in `GalaxyMap.tsx`
- [ ] Alle Code-Stellen testen (Editor, PDFExporter)
- [ ] Dokumentation aktualisieren (`agents.md`)

---

**Ready? Los geht's!** 🚀




















