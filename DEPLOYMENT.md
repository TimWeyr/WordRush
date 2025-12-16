# WordRush Deployment Guide

Dieses Dokument beschreibt die automatisierten Deployment-Prozesse für WordRush.

## 🚀 Automatisches Deployment

WordRush nutzt **GitHub Actions** für automatisches Build und Deployment zu Vercel.

### Workflows

#### 1. `deploy.yml` - Haupt-Deployment
- **Trigger**: Push auf `main` oder `master` Branch
- **Aktionen**:
  1. ✅ Code auschecken
  2. ✅ Dependencies installieren
  3. ✅ Linter ausführen
  4. ✅ TypeScript Type-Check
  5. ✅ Build erstellen
  6. ✅ Build-Artefakte hochladen
  7. ✅ Automatisches Deployment zu Vercel (nur bei Push auf main/master)

#### 2. `ci.yml` - Continuous Integration
- **Trigger**: Push auf andere Branches oder Pull Requests
- **Aktionen**:
  1. ✅ Code auschecken
  2. ✅ Dependencies installieren
  3. ✅ Linter ausführen
  4. ✅ TypeScript Type-Check
  5. ✅ Build erstellen (ohne Deployment)

### GitHub Secrets einrichten

Für das automatische Deployment müssen folgende Secrets in GitHub konfiguriert werden:

1. **Repository Settings** → **Secrets and variables** → **Actions**

2. **Erforderliche Secrets:**

   ```
   VERCEL_TOKEN
   ```
   - Vercel Authentication Token
   - Erstellen unter: https://vercel.com/account/tokens
   - Berechtigung: Full Access

   ```
   VITE_SUPABASE_URL
   ```
   - Supabase Project URL (optional, für Build)
   - Format: `https://xxxxx.supabase.co`

   ```
   VITE_SUPABASE_ANON_KEY
   ```
   - Supabase Anonymous Key (optional, für Build)
   - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Manuelles Deployment

#### Option 1: Deployment-Skript (Empfohlen)

**Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1 "Deine Commit-Nachricht"
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh "Deine Commit-Nachricht"
```

Das Skript:
- ✅ Staged alle Änderungen
- ✅ Erstellt einen Commit (mit Nachricht)
- ✅ Pusht zum aktuellen Branch
- ✅ GitHub Actions startet automatisch das Deployment

#### Option 2: Manueller Git-Workflow

```bash
# 1. Änderungen stagen
git add -A

# 2. Commit erstellen
git commit -m "Deine Commit-Nachricht"

# 3. Push (triggert automatisches Deployment)
git push origin main
```

#### Option 3: Vercel CLI (Lokales Deployment)

```bash
# Vercel CLI installieren
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Deployment-Status prüfen

1. **GitHub Actions:**
   - Gehe zu: `https://github.com/[dein-username]/wordRush2/actions`
   - Sieh dir den Status des letzten Workflows an

2. **Vercel Dashboard:**
   - Gehe zu: https://vercel.com/dashboard
   - Sieh dir die Deployment-Historie an

### Troubleshooting

#### ❌ Build schlägt fehl

**Problem:** TypeScript-Fehler oder Linter-Fehler

**Lösung:**
```bash
# Lokal prüfen
npm run lint
npx tsc --noEmit
npm run build
```

#### ❌ Vercel Deployment schlägt fehl

**Problem:** `VERCEL_TOKEN` fehlt oder ist ungültig

**Lösung:**
1. Neuen Token erstellen: https://vercel.com/account/tokens
2. In GitHub Secrets aktualisieren: `Settings` → `Secrets` → `Actions` → `VERCEL_TOKEN`

#### ❌ Environment Variables fehlen

**Problem:** Build funktioniert, aber App zeigt Fehler

**Lösung:**
1. In Vercel Dashboard: `Settings` → `Environment Variables`
2. Folgende Variablen hinzufügen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Deployment-Branches

- **`main` / `master`**: Automatisches Production-Deployment
- **Andere Branches**: Nur CI (Build-Test, kein Deployment)
- **Pull Requests**: Nur CI (Build-Test, kein Deployment)

### Workflow-Diagramm

```
┌─────────────────┐
│  Git Push       │
│  (main/master)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  deploy.yml     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Build  │ │  Test    │
│        │ │  (Lint)  │
└────┬───┘ └────┬─────┘
     │          │
     └────┬─────┘
          │
          ▼
    ┌──────────┐
    │  Vercel  │
    │ Deploy   │
    └──────────┘
```

### Best Practices

1. **Immer lokal testen vor Push:**
   ```bash
   npm run lint
   npm run build
   npm run preview
   ```

2. **Sinnvolle Commit-Messages:**
   ```
   feat: Neue Feature-Beschreibung
   fix: Bug-Fix-Beschreibung
   docs: Dokumentation-Update
   refactor: Code-Refactoring
   ```

3. **Feature-Branches nutzen:**
   - Erstelle Feature-Branches für größere Änderungen
   - Teste mit CI (automatisch bei PR)
   - Merge zu `main` für Production-Deployment

4. **Secrets sicher aufbewahren:**
   - ❌ Niemals Secrets in Code committen
   - ✅ Immer GitHub Secrets verwenden
   - ✅ Lokale `.env.local` in `.gitignore`

### Nächste Schritte

- [ ] GitHub Secrets konfigurieren
- [ ] Ersten Push auf `main` machen
- [ ] Deployment-Status prüfen
- [ ] Vercel-URL testen

---

**Letzte Aktualisierung:** Dezember 2024

