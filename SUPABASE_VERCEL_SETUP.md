# Supabase Auth Setup für Vercel Production

## Problem
Supabase Auth funktioniert lokal (`localhost:3000`), aber nicht auf Vercel (`https://wordrush-gamma.vercel.app`).

## Lösung: Redirect URLs in Supabase konfigurieren

### Schritt 1: Supabase Dashboard öffnen
1. Gehe zu [Supabase Dashboard](https://app.supabase.com)
2. Wähle dein Projekt aus
3. Gehe zu **Authentication** → **URL Configuration**

### Schritt 2: Site URL anpassen
**Site URL** sollte auf deine Production-URL zeigen:
```
https://wordrush-gamma.vercel.app
```

### Schritt 3: Redirect URLs hinzufügen
Füge **beide** URLs hinzu (lokal + production):

**Für lokale Entwicklung:**
```
http://localhost:3000/*
http://localhost:5173/*  (falls Vite dev server auf anderem Port läuft)
```

**Für Vercel Production:**
```
https://wordrush-gamma.vercel.app/*
https://wordrush-gamma.vercel.app/login
https://wordrush-gamma.vercel.app/reset-password
```

**Wildcard für alle Vercel Preview-Deployments (optional):**
```
https://*.vercel.app/*
```

### Schritt 4: Vercel Environment Variables prüfen
Stelle sicher, dass in Vercel die Environment Variables gesetzt sind:

1. Gehe zu Vercel Dashboard → Dein Projekt → **Settings** → **Environment Variables**
2. Füge hinzu (falls nicht vorhanden):
   - `VITE_SUPABASE_URL` = Deine Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = Dein Supabase Anon Key

### Schritt 5: Vercel Deployment neu starten
Nach den Änderungen:
1. Gehe zu Vercel Dashboard → Dein Projekt → **Deployments**
2. Klicke auf das **drei Punkte Menü** → **Redeploy**
3. Oder pushe einen neuen Commit

## Testen

### Lokal testen:
```bash
npm run dev
# Öffne http://localhost:3000/login
```

### Production testen:
1. Gehe zu `https://wordrush-gamma.vercel.app/login`
2. Versuche dich zu registrieren/einzuloggen
3. Prüfe, ob die Email-Verification-Links funktionieren

## Troubleshooting

### Problem: "Invalid redirect URL"
- **Lösung**: Stelle sicher, dass die exakte URL in Supabase Redirect URLs steht
- Wildcards (`*`) funktionieren nur am Ende: `https://wordrush-gamma.vercel.app/*`

### Problem: Email-Verification funktioniert nicht
- **Lösung**: Prüfe, ob `https://wordrush-gamma.vercel.app/*` in Redirect URLs steht
- Die Email-Links verwenden `emailRedirectTo` aus `AuthContext.tsx` (Zeile 75)

### Problem: Auth funktioniert lokal, aber nicht auf Vercel
- **Lösung**: Prüfe Vercel Environment Variables
- Prüfe Browser Console auf Fehler
- Prüfe Supabase Dashboard → Logs für Auth-Fehler

## Code-Änderungen (nicht nötig!)
Der Code verwendet bereits `window.location.origin`, was automatisch die richtige URL verwendet:
- Lokal: `http://localhost:3000`
- Production: `https://wordrush-gamma.vercel.app`

**Keine Code-Änderungen nötig!** Nur Supabase Dashboard-Konfiguration.

