# WordRush - TODO Liste

**Letzte Aktualisierung**: 20. November 2025  
**Status**: In Arbeit

---

## 🔴 Kritische Bugs

### 1. Planet-Klick lädt nicht alle Items aller Monde
**Problem**: Beim Klicken auf einen Planeten (Theme) werden nicht alle Items aller Monde (Chapters) geladen.

**Status**: 🔴 Offen  
**Priorität**: Hoch  
**Datei**: `src/components/GalaxyMap.tsx` (selectUniverse Funktion)

**Zu prüfen**:
- [ ] `selectUniverse` lädt alle Chapters eines Themes
- [ ] Items werden für alle Chapters geladen (Zeile 212-220)
- [ ] `itemLayoutsRef` wird korrekt mit allen Items gefüllt
- [ ] Test mit Theme mit mehreren Chapters

**Hinweis**: Siehe `src/components/GalaxyMap.tsx:156-246` - `selectUniverse` sollte alle Chapters durchlaufen.

---

## 🛠️ Features - Entwicklung

### 2. JSON Bearbeiter für Content-Management
**Beschreibung**: Admin-Interface zum Erstellen und Bearbeiten von Universen, Themes, Chapters und Items direkt im Spiel.

**Status**: 📋 Geplant  
**Priorität**: Hoch  
**Geschätzte Zeit**: 2-3 Tage

**Anforderungen**:
- [ ] **Universe Editor**: Neues Universum erstellen, bestehende bearbeiten
- [ ] **Theme Editor**: Neues Theme erstellen, bestehende bearbeiten
- [ ] **Chapter Editor**: Neues Chapter erstellen, bestehende bearbeiten
- [ ] **Item Editor**: Neues Item erstellen, bestehende bearbeiten
- [ ] JSON-Validierung vor dem Speichern
- [ ] Vorschau der Änderungen
- [ ] Undo/Redo Funktionalität

**Zugriff**:
- [ ] Button in Settings-Menü
- [ ] Direkter Link aus GalaxyMap (z.B. Rechtsklick auf Planet/Mond)
- [ ] URL-Parameter: `/editor?type=universe&id=psychiatrie`

**Sicherheit**:
- [ ] **Nur auf localhost**: `if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')`
- [ ] Optional: Passwort-Schutz für Production
- [ ] Environment Variable: `VITE_ENABLE_EDITOR=true` (nur in dev)
- [ ] Oder: Separate Admin-Route mit Authentication

**UI-Komponenten**:
- [ ] `src/components/editor/UniverseEditor.tsx`
- [ ] `src/components/editor/ThemeEditor.tsx`
- [ ] `src/components/editor/ChapterEditor.tsx`
- [ ] `src/components/editor/ItemEditor.tsx`
- [ ] `src/components/editor/EditorLayout.tsx`

**Technische Details**:
- JSON-Dateien direkt im `public/content/` Ordner bearbeiten
- Oder: Backend-API für Content-Management (später)
- File-System API (nur Chrome) oder Backend-Endpoint nötig

---

## 🚀 Deployment & Testing

### 3. Spiel auf Vercel laden und testen
**Beschreibung**: Production-Build auf Vercel deployen und testen.

**Status**: 📋 Geplant  
**Priorität**: Mittel  
**Geschätzte Zeit**: 2-4 Stunden

**Schritte**:
- [ ] Vercel Account erstellen (falls nicht vorhanden)
- [ ] Projekt mit GitHub verbinden
- [ ] `vercel.json` konfigurieren (falls nötig)
- [ ] Build-Befehle prüfen: `npm run build`
- [ ] Environment Variables setzen (falls nötig)
- [ ] Deploy und URL testen
- [ ] Content-Dateien prüfen (werden sie korrekt geladen?)
- [ ] Performance testen
- [ ] Mobile Ansicht testen

**Zu prüfen**:
- [ ] Alle JSON-Dateien werden korrekt geladen
- [ ] LocalStorage funktioniert
- [ ] Routing funktioniert
- [ ] Assets werden geladen (`/assets/ships/`, etc.)
- [ ] Keine CORS-Fehler

**Hinweis**: Vercel unterstützt statische Sites. Content-Dateien sollten im `public/` Ordner sein.

---

### 4. Touch-Controls testen
**Beschreibung**: Touch-Controls auf echten Geräten testen und optimieren.

**Status**: 📋 Geplant  
**Priorität**: Mittel  
**Geschätzte Zeit**: 1-2 Stunden

**Zu testen**:
- [ ] **1 Finger = Move**: Ship folgt Finger
- [ ] **2 Finger = Shoot**: Laser feuert zum zweiten Finger
- [ ] Responsive Design auf verschiedenen Bildschirmgrößen
- [ ] Performance auf mobilen Geräten
- [ ] Touch-Events funktionieren korrekt
- [ ] Keine versehentlichen Clicks beim Scrollen

**Geräte**:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] iPad (Safari)
- [ ] Android Tablet

**Bekannte Probleme**:
- Desktop Touch-Simulation kann buggy sein → Echte Geräte testen!

**Code zu prüfen**: `src/components/Game.tsx` (Touch-Event-Handler)

---

## 📱 App Store Deployment

### 5. Als App deployen im App Store
**Beschreibung**: WordRush als native App für iOS und Android veröffentlichen.

**Status**: 📋 Geplant  
**Priorität**: Niedrig (nach Web-Version stabil)  
**Geschätzte Zeit**: 1-2 Wochen

**Optionen**:
- [ ] **Capacitor** (empfohlen): Web-App → Native App
- [ ] **PWA** (Progressive Web App): Einfacher, aber weniger native Features
- [ ] **React Native**: Komplett neu schreiben (nicht empfohlen)

**Capacitor Setup**:
- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] `npm install @capacitor/ios @capacitor/android`
- [ ] `npx cap init`
- [ ] `npx cap add ios` / `npx cap add android`
- [ ] Native Plugins konfigurieren (falls nötig)
- [ ] Icons und Splash Screens erstellen
- [ ] Build: `npm run build` → `npx cap sync`
- [ ] Xcode/Android Studio öffnen und testen

**App Store Requirements**:
- [ ] **iOS**: Apple Developer Account ($99/Jahr)
- [ ] **Android**: Google Play Developer Account ($25 einmalig)
- [ ] App Icons (verschiedene Größen)
- [ ] Screenshots für App Store
- [ ] App-Beschreibung
- [ ] Privacy Policy (erforderlich!)
- [ ] Terms of Service

**Vorbereitung**:
- [ ] App-Name festlegen
- [ ] Bundle ID / Package Name festlegen
- [ ] Version Number festlegen
- [ ] App Store Connect Account einrichten

**Hinweis**: Siehe `agents.md` für Details zu Capacitor.

---

## 💾 Backend & Datenbank

### 6. Supabase anbinden
**Beschreibung**: Supabase für Cloud-Sync, User-Management und Analytics einrichten.

**Status**: 📋 Geplant  
**Priorität**: Mittel  
**Geschätzte Zeit**: 3-5 Tage

**Vorschläge für Supabase-Daten**:

#### A. User Progress & Learning State
- [ ] **Tabelle**: `user_progress`
  - `user_id` (UUID, Foreign Key zu `users`)
  - `item_id` (String)
  - `universe_id` (String)
  - `theme_id` (String)
  - `chapter_id` (String)
  - `learning_state` (JSONB): `{ mastered: boolean, attempts: number, lastPlayed: timestamp, ... }`
  - `score` (Integer)
  - `created_at`, `updated_at`

**Vorteil**: Cloud-Sync zwischen Geräten, Fortschritt geht nicht verloren

#### B. User Accounts & Authentication
- [ ] **Tabelle**: `users` (Standard Supabase Auth)
  - Email/Password Login
  - OAuth (Google, Apple)
  - Anonymous Users (für Gäste)

**Vorteil**: Multi-Device Support, User können auf verschiedenen Geräten spielen

#### C. Leaderboards & Statistics
- [ ] **Tabelle**: `leaderboards`
  - `user_id` (UUID)
  - `universe_id` (String)
  - `theme_id` (String)
  - `total_score` (Integer)
  - `items_mastered` (Integer)
  - `rank` (Integer, berechnet)
  - `updated_at`

**Vorteil**: Gamification, Motivation durch Rankings

#### D. Content Analytics
- [ ] **Tabelle**: `content_analytics`
  - `item_id` (String)
  - `times_played` (Integer)
  - `average_score` (Float)
  - `mastery_rate` (Float)
  - `difficulty_rating` (Float, berechnet)

**Vorteil**: Daten für Content-Optimierung, schwierige Items identifizieren

#### E. User Settings & Preferences
- [ ] **Tabelle**: `user_settings`
  - `user_id` (UUID)
  - `ui_settings` (JSONB): `{ itemOrder, difficulty, ... }`
  - `game_settings` (JSONB): `{ soundEnabled, musicVolume, ... }`

**Vorteil**: Einstellungen synchronisieren

#### F. Purchases & Subscriptions (für später)
- [ ] **Tabelle**: `purchases`
  - `user_id` (UUID)
  - `universe_id` (String) oder `theme_id` (String)
  - `purchase_date` (Timestamp)
  - `price` (Decimal)
  - `transaction_id` (String)

**Vorteil**: In-App Purchases verwalten

**Implementierung**:
- [ ] Supabase Project erstellen
- [ ] `npm install @supabase/supabase-js`
- [ ] `SupabaseProgressProvider` implementieren (siehe `src/infra/providers/`)
- [ ] Migration von LocalStorage zu Supabase
- [ ] Offline-Fallback (LocalStorage als Cache)
- [ ] Error Handling & Retry Logic

**Code-Struktur**:
```
src/infra/providers/
├── ProgressProvider.interface.ts (bereits vorhanden)
├── LocalProgressProvider.ts (bereits vorhanden)
└── SupabaseProgressProvider.ts (neu)
```

---

## 📚 Content-Erstellung

### 7. Content Filme weiter arbeiten
**Beschreibung**: Weitere Film-Content erstellen und bestehende erweitern.

**Status**: 📋 In Arbeit  
**Priorität**: Niedrig  
**Geschätzte Zeit**: Kontinuierlich

**Bestehende Themes**:
- [ ] `filme/blockbuster/` - Weitere Blockbuster hinzufügen
- [ ] `filme/klassiker/` - Weitere Klassiker hinzufügen
- [ ] `filme/mcu/` - Weitere MCU-Phasen hinzufügen

**Neue Themes** (Vorschläge):
- [ ] `filme/horror/` - Horror-Filme
- [ ] `filme/comedy/` - Komödien
- [ ] `filme/scifi/` - Science-Fiction
- [ ] `filme/animation/` - Animationsfilme

**Struktur**: Siehe `content/themes/filme/` für Beispiele.

---

### 8. Content Psychiatrie weiter erstellen
**Beschreibung**: Weitere psychiatrische Themen und ICD-10 Codes hinzufügen.

**Status**: 📋 In Arbeit  
**Priorität**: Mittel  
**Geschätzte Zeit**: Kontinuierlich

**Bestehende Struktur**: `content/themes/psychiatrie/`

**Zu erweitern**:
- [ ] Weitere ICD-10 Codes hinzufügen
- [ ] Weitere Symptome und Diagnosen
- [ ] Differentialdiagnosen als Distractors
- [ ] Therapieansätze als Correct Answers

**Hinweis**: Medizinische Genauigkeit wichtig! Fachliche Prüfung empfohlen.

---

## 💰 Monetarisierung

### 9. Anbindung an Zahlsystem
**Beschreibung**: Zahlungssystem für In-App Purchases integrieren.

**Status**: 📋 Geplant  
**Priorität**: Niedrig (nach MVP stabil)  
**Geschätzte Zeit**: 1-2 Wochen

**Optionen**:

#### A. Stripe (Empfohlen für Web)
- [ ] **Vorteile**: 
  - Super einfach zu integrieren
  - Gute Dokumentation
  - Unterstützt Subscriptions & One-Time Payments
  - Webhooks für Server-Events
- [ ] **Nachteile**: 
  - 2.9% + 30¢ pro Transaktion
  - Nicht für native Apps (nur Web)

**Setup**:
```bash
npm install @stripe/stripe-js
```

#### B. Apple In-App Purchase (iOS)
- [ ] **Vorteile**: 
  - Native iOS Integration
  - Nutzer vertrauen Apple
- [ ] **Nachteile**: 
  - Nur für iOS
  - Apple nimmt 30% (15% nach Jahr 1)
  - Komplexere Integration

#### C. Google Play Billing (Android)
- [ ] **Vorteile**: 
  - Native Android Integration
- [ ] **Nachteile**: 
  - Nur für Android
  - Google nimmt 30% (15% nach Jahr 1)
  - Komplexere Integration

#### D. Paddle (Alternative zu Stripe)
- [ ] **Vorteile**: 
  - Geringere Gebühren (5% + 50¢)
  - Bessere Internationalisierung
- [ ] **Nachteile**: 
  - Weniger bekannt als Stripe

**Empfehlung**: 
- **Web**: Stripe (super einfach, gut dokumentiert)
- **Native Apps**: Apple/Google In-App Purchase (erforderlich für App Stores)

**Implementierung**:
- [ ] Backend-Endpoint für Payment Processing
- [ ] Frontend Checkout-Flow
- [ ] Purchase Verification
- [ ] Content-Unlock nach Payment
- [ ] Receipt Validation

---

### 10. Preismodell: Wie viel für Planet/Universum?
**Beschreibung**: Preismodell für Content festlegen.

**Status**: 📋 Diskussion  
**Priorität**: Niedrig (vor Launch)

**Vorschläge**:

#### Option A: Freemium-Modell
- **Kostenlos**: 
  - 1-2 Universen (z.B. Psychiatrie, Englisch Basics)
  - 1-2 Themes pro Universum
  - Limitierte Chapters (z.B. Level 1-2)
- **Premium** (€4.99/Monat oder €39.99/Jahr):
  - Alle Universen
  - Alle Themes
  - Alle Levels
  - Cloud-Sync
  - Leaderboards

#### Option B: Pay-per-Content
- **Universum**: €2.99 (alle Themes inklusive)
- **Theme**: €0.99 (alle Chapters inklusive)
- **Kostenlos**: 1 Universum (z.B. Psychiatrie Basics)

#### Option C: One-Time Purchase
- **Vollversion**: €9.99 einmalig
  - Alle Universen
  - Alle Themes
  - Lifetime Updates

#### Option D: Hybrid
- **Basis**: Kostenlos (1-2 Universen)
- **Erweiterungen**: €1.99 pro Universum
- **Premium Pass**: €4.99/Monat (alle Universen + neue Content automatisch)

**Empfehlung**: 
- **Freemium** (Option A) für maximale Reichweite
- **Pay-per-Content** (Option B) für Nutzer, die nur bestimmte Themen wollen

**Marktforschung**:
- [ ] Konkurrenz-Analyse (Duolingo, Babbel, etc.)
- [ ] User-Feedback sammeln
- [ ] A/B Testing mit verschiedenen Preismodellen

---

## 🎯 App Store Readiness

### 11. Wie reif ist das Spiel für den App Store?
**Beschreibung**: Assessment der App Store Readiness.

**Status**: 📋 Review  
**Priorität**: Hoch (vor Launch)

**Checkliste**:

#### Technische Anforderungen
- [ ] **Performance**: 60 FPS stabil
- [ ] **Bugs**: Keine kritischen Bugs
- [ ] **Crash-Free**: < 1% Crash-Rate
- [ ] **Load Time**: < 3 Sekunden
- [ ] **Memory**: Keine Memory Leaks
- [ ] **Battery**: Effizienter Energieverbrauch

#### Content & Features
- [ ] **Content**: Mindestens 3-5 Universen mit je 3-5 Themes
- [ ] **Tutorial**: Onboarding für neue Nutzer
- [ ] **Settings**: Alle Einstellungen funktionieren
- [ ] **Offline**: Funktioniert ohne Internet (für Content)
- [ ] **Cloud-Sync**: Optional, aber empfohlen

#### UI/UX
- [ ] **Design**: Polished, keine Platzhalter
- [ ] **Responsive**: Funktioniert auf allen Bildschirmgrößen
- [ ] **Accessibility**: Screen Reader Support (optional)
- [ ] **Localization**: Mindestens DE + EN

#### Legal & Compliance
- [ ] **Privacy Policy**: Erforderlich für App Stores!
- [ ] **Terms of Service**: Empfohlen
- [ ] **Data Protection**: GDPR-konform (falls EU)
- [ ] **Age Rating**: Festlegen (wahrscheinlich 12+)

#### App Store Assets
- [ ] **Icons**: Alle Größen (1024x1024 für iOS)
- [ ] **Screenshots**: Mindestens 3-5 pro Plattform
- [ ] **App Preview Video**: Optional, aber empfohlen
- [ ] **Description**: DE + EN
- [ ] **Keywords**: App Store Optimization

#### Monetarisierung (falls Premium)
- [ ] **Payment**: Getestet und funktioniert
- [ ] **Receipt Validation**: Implementiert
- [ ] **Restore Purchases**: Funktioniert

**Aktueller Status**:
- ✅ Core Gameplay funktioniert
- ✅ Content-System funktioniert
- ✅ LocalStorage funktioniert
- ⚠️ Cloud-Sync fehlt (Supabase)
- ⚠️ Payment fehlt
- ⚠️ Privacy Policy fehlt
- ⚠️ Tutorial/Onboarding fehlt
- ⚠️ Polishing nötig

**Empfehlung**: 
- **Web-Version zuerst**: Ja, reicht für Start!
- **App Store später**: Nach Web-Version stabil und getestet
- **PWA als Zwischenschritt**: Progressive Web App kann als "App" installiert werden




## 💡 Feature-Ideen

### 12. Damage Points als visueller Hinweis beim Schießen

**Idee**: Wenn ein Objekt `damage > 1` hat, wird beim ersten Treffer kurz sichtbar, ob es ein Distractor ist.

**Mechanik**:
- Objekt mit `damage > 1` wird getroffen
- Kurzer visueller Hinweis (0.3-0.5s): Rote Umrandung oder "⚠️ Distractor" Text
- Danach normal weiter
- Nur beim ersten Treffer (wenn `currentHp < hp`)

**Vorteile**:
- Hilft Spielern zu lernen: "Hoher Damage = Distractor"
- Visuelles Feedback ohne Gameplay zu stören
- Nutzt bereits vorhandene `damage` Property

**Risiken**:
- Könnte zu einfach machen (Spieler lernen Pattern)
- Muss optional sein (Settings: "Damage-Hinweise anzeigen")

**Implementierung**:
- `DistractorObject.takeDamage()`: Wenn `damage > 1` und erster Treffer → Flash-Effekt
- Visual: Rote Umrandung oder Icon über Objekt
- Optional: Nur im Lernmodus aktiv

**Status**: 📋 Idee - Noch nicht implementiert





**Timeline**:
1. ✅ MVP fertig (aktuell)
2. 🔄 Web-Version auf Vercel (nächster Schritt)
3. 📋 Content erweitern
4. 📋 Supabase Integration
5. 📋 Payment Integration
6. 📋 App Store Deployment

---

## 📝 Notizen

### Web-Version vs. App Store
**Frage**: Reicht es wenn man es als Webseite hat?

**Antwort**: 
- ✅ **Ja, für Start**: Web-Version ist völlig ausreichend für MVP
- ✅ **PWA**: Kann als "App" installiert werden (Add to Home Screen)
- ⚠️ **App Store Vorteile**: 
  - Bessere Discoverability
  - Native Features (Push Notifications, etc.)
  - Nutzer vertrauen App Stores mehr
- ⚠️ **App Store Nachteile**: 
  - Komplexere Deployment
  - App Store Review Process
  - Gebühren (30% für Apple/Google)

**Empfehlung**: 
1. **Web-Version zuerst** auf Vercel deployen
2. **PWA** machen (Progressive Web App)
3. **Später** native Apps für App Stores

---

## 🎯 Prioritäten

### Kurzfristig (Diese Woche)
1. 🔴 Bug: Planet-Klick lädt nicht alle Items
2. 🚀 Vercel Deployment
3. 📱 Touch-Testing

### Mittelfristig (Dieser Monat)
4. 🛠️ JSON Editor (nur localhost)
5. 💾 Supabase Integration
6. 📚 Content erweitern

### Langfristig (Nächste Monate)
7. 💰 Payment Integration
8. 📱 App Store Deployment
9. 🎯 App Store Readiness

---

**Letzte Aktualisierung**: 20. November 2025

