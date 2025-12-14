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
siehe @todo.editor.md
---

## 🚀 Deployment & Testing

### 3. JSON Ladezeitoptimierung
**Beschreibung**: Optimierung des Ladens von JSON-Content-Dateien für bessere Performance und schnellere Ladezeiten.

**Status**: 📋 Geplant  
**Priorität**: Mittel  
**Geschätzte Zeit**: 1-2 Tage

**Aktuelle Situation**:
- ✅ Caching implementiert (Map-basiert, in-memory)
- ⚠️ Sequentielles Laden (nicht parallel)
- ⚠️ Kein persistentes Caching (Cache geht bei Reload verloren)
- ⚠️ Große Chapter-Dateien werden komplett geladen

**Optimierungsmöglichkeiten**:

#### A. Parallel Loading
- [ ] **Promise.all()** für mehrere Requests gleichzeitig
  - Beim Laden eines Universums: Alle Themes parallel laden
  - Beim Laden eines Themes: Alle Chapters parallel laden
  - **Erwartete Verbesserung**: 50-70% schnellere Ladezeit bei mehreren Dateien

**Code-Stelle**: `src/infra/utils/JSONLoader.ts` und `src/components/GalaxyMap.tsx`

#### B. Preloading & Lazy Loading
- [ ] **Preloading**: Universen beim App-Start im Hintergrund laden
- [ ] **Lazy Loading**: Chapters erst laden wenn Spieler sie auswählt
- [ ] **Progressive Loading**: Erst Universe → dann Themes → dann Chapters
- [ ] **Prefetch**: Nächste wahrscheinliche Chapters vorladen

**Vorteil**: Schnellere initiale Ladezeit, bessere UX

#### C. Persistentes Caching (IndexedDB)
- [ ] **IndexedDB Integration**: Cache über Browser-Reloads hinweg
- [ ] **Cache-Versionierung**: Bei Content-Updates Cache invalidieren
- [ ] **Cache-Size Management**: Alte/ungenutzte Daten entfernen
- [ ] **Offline-Support**: Content auch ohne Internet verfügbar

**Code-Stelle**: Neue Klasse `IndexedDBCache.ts` oder Erweiterung von `JSONLoader.ts`

#### D. Kompression & Chunking
- [ ] **Gzip/Brotli**: Server-seitige Kompression aktivieren (Vercel macht das automatisch)
- [ ] **JSON Minification**: Whitespace entfernen (Build-Time)
- [ ] **Chunking**: Große Chapter-Dateien aufteilen (z.B. nach Level)
  - Statt `chapter.json` → `chapter_level1.json`, `chapter_level2.json`, etc.
- [ ] **Tree Shaking**: Nur benötigte Content-Dateien im Bundle

**Vorteil**: Kleinere Dateigrößen = schnellere Downloads

#### E. Service Worker für Offline-Caching
- [ ] **Service Worker**: Content-Dateien im Cache speichern
- [ ] **Cache-First Strategy**: Erst Cache prüfen, dann Netzwerk
- [ ] **Background Updates**: Cache im Hintergrund aktualisieren
- [ ] **Version Management**: Bei neuen Versionen Cache aktualisieren

**Vorteil**: Offline-Funktionalität, schnellere Ladezeiten bei wiederholten Besuchen

#### F. Request-Batching & Debouncing
- [ ] **Batching**: Mehrere Requests in einem Batch zusammenfassen
- [ ] **Debouncing**: Bei schnellen Navigationen Requests zusammenfassen
- [ ] **Request Queue**: Requests priorisieren (wichtige zuerst)

**Vorteil**: Weniger Netzwerk-Overhead

**Implementierung**:

**Phase 1: Parallel Loading (Schnellste Verbesserung)**
```typescript
// Statt:
for (const themeId of universe.themes) {
  const theme = await jsonLoader.loadTheme(universeId, themeId);
}

// Besser:
const themes = await Promise.all(
  universe.themes.map(themeId => jsonLoader.loadTheme(universeId, themeId))
);
```

**Phase 2: IndexedDB Caching**
- [ ] `npm install idb` (IndexedDB Wrapper)
- [ ] Cache-Strategie implementieren
- [ ] Cache-Invalidierung bei Updates

**Phase 3: Service Worker**
- [ ] Service Worker registrieren
- [ ] Cache-Strategie konfigurieren
- [ ] Update-Mechanismus implementieren

**Messung & Monitoring**:
- [ ] **Performance API**: Ladezeiten messen
- [ ] **Console Logging**: Ladezeiten loggen
- [ ] **Metrics**: Durchschnittliche Ladezeit pro Dateityp
- [ ] **Before/After Vergleich**: Verbesserung dokumentieren

**Ziel-Metriken**:
- **Initial Load**: < 1 Sekunde (nur Universen)
- **Theme Load**: < 500ms (alle Themes eines Universums)
- **Chapter Load**: < 300ms (einzelnes Chapter)
- **Cache Hit Rate**: > 80% bei wiederholten Besuchen

**Dateien zu ändern**:
- `src/infra/utils/JSONLoader.ts` - Parallel Loading, IndexedDB
- `src/components/GalaxyMap.tsx` - Preloading, Lazy Loading
- `vite.config.ts` - Service Worker Setup (falls nötig)
- `public/sw.js` - Service Worker (neu)

**Hinweis**: Parallel Loading bringt die größte Verbesserung mit wenig Aufwand!

---






### 4. Spiel auf Vercel laden und testen

DONE!









### 5. Touch-Controls testen
**Beschreibung**: Touch-Controls auf echten Geräten testen und optimieren.

DONE

## 📱 App Store Deployment

### 6. Als App deployen im App Store
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

### 7. Supabase anbinden
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

### 8. Content Filme weiter arbeiten
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











### 9. Content Psychiatrie weiter erstellen
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

### 10. Anbindung an Zahlsystem
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










### 11. Preismodell: Wie viel für Planet/Universum?
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


### 12. Wie reif ist das Spiel für den App Store?
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

### 13. Damage Points als visueller Hinweis beim Schießen

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

---

### 14. Pause-Bildschirm erweitern

**Beschreibung**: Der aktuelle Pause-Bildschirm zeigt nur Score, Runde und Health an. Erweitern um nützliche Features für Content-Erstellung und Gameplay.

**Status**: 📋 Geplant  
**Priorität**: Mittel  
**Geschätzte Zeit**: 2-3 Tage

**Verfügbare Daten im Pause-Bildschirm**:
- ✅ `universe.id` (z.B. "englisch")
- ✅ `theme.id` (z.B. "business_english")
- ✅ `chapterId` (z.B. "Business_Communication")
- ✅ `currentItemIndex` (aktuelle Runde)
- ✅ `items[currentItemIndex]` mit `item.id` (z.B. "BC_001")
- ✅ `items` Array (alle Items des Chapters)
- ✅ `mode` (lernmodus/shooter)

**Geplante Features**:

#### A. Editor-Navigation (Sofort umsetzbar)
- [ ] **Button "Zum Editor"** im Pause-Menü
  - Link zu Detail-Ansicht: `/editor/${universe.id}/${theme.id}/${chapterId}/${items[currentItemIndex].id}`
  - Link zu Tabellen-Ansicht: `/editor/${universe.id}/${theme.id}/${chapterId}`
  - Öffnet Editor in neuem Tab/Fenster
  - **Komplexität**: Niedrig (nur Link-Button)
  - **Hinweis**: Keine UUID nötig, `item.id` reicht

#### B. Items-Liste anzeigen
- [ ] **Scrollbare Liste aller Items** im Pause-Menü
  - Zeigt: `item.id`, `item.base.word`, `item.introText`
  - Klick auf Item → Springt zu diesem Item (nach Resume)
  - Optional: Accordion/Collapsible für Details (Base, Correct, Distractors, Context)
  - **Komplexität**: Niedrig-Mittel
  - **Vorteil**: Lernhilfe während Pause, Übersicht über Chapter

#### C. Settings ändern (Mit Einschränkungen)
- [ ] **Settings-Button** im Pause-Menü
  - Öffnet Settings-Modal oder Link zu Settings-Seite
  - **Problem**: Settings werden beim Game-Init geladen
  - **Lösung Option 1**: Warnung "Spiel wird neu gestartet" → Engine neu initialisieren
  - **Lösung Option 2**: Live-Update für bestimmte Settings (z.B. `animationIntensity`)
  - **Komplexität**: Mittel-Hoch (Engine-Reinitialisierung nötig)
  - **Empfehlung**: Nur bestimmte Settings live ändern, Rest mit Warnung

#### D. Quick Actions
- [ ] **"Zurück zum Galaxy Map"** Button (neben Exit)
- [ ] **"Nächste Runde"** Button (überspringt aktuelle Runde)
- [ ] **"Runde wiederholen"** Button (lädt aktuelle Runde neu)
- **Komplexität**: Niedrig

#### E. Statistiken anzeigen
- [ ] **Best Score** dieser Runde
- [ ] **Versuche** dieser Runde
- [ ] **Durchschnittliche Reaktionszeit** (falls getrackt)
- [ ] **Streak-Status** (aktuelle Streak)
- **Komplexität**: Mittel (Tracking muss implementiert werden)

#### F. Lernhilfen
- [ ] **"Zeige Lösung"** Button (zeigt alle Correct-Entries der aktuellen Runde)
- [ ] **"Zeige Context"** Button (zeigt Context aller Items)
- [ ] **"Hinweis"** Button (zeigt Meta-Tags/Related Items)
- **Komplexität**: Niedrig

**Implementierungsreihenfolge**:
1. **Phase 1** (Schnell): Editor-Links + Quick Actions
2. **Phase 2** (Mittel): Items-Liste + Lernhilfen
3. **Phase 3** (Später): Settings ändern + Statistiken

**Dateien zu ändern**:
- `src/components/Game.tsx` - Pause-Overlay erweitern (Zeile 1079-1118)
- `src/components/Game.css` - Styling für neue Buttons

**Hinweis**: Editor-Links sind am einfachsten umzusetzen und sehr nützlich für Content-Erstellung!

---

### 15. Test-Level Feature

**Beschreibung**: Spezielles Test-Level für Tutorial/Onboarding mit klaren Anweisungen und speziellen Objekt-Verhalten.

**Status**: 📋 Geplant  
**Priorität**: Niedrig  
**Geschätzte Zeit**: 1-2 Tage

**Konzept**:
- **Base**: "Verteidige diese Basis"
- **Correct**: "sammel mich" + "Punkte ♥"
- **Distractor**: "schieß mich ab" + "KEINE Kollision!"

**Implementierungsoptionen**:

#### Option A: Spezielles Test-Chapter (Empfohlen)
- [ ] Neues Chapter im Starter-Universe (z.B. "Test_Tutorial")
- [ ] Items mit speziellen Texten und Emojis
- [ ] Distractor mit "KEINE Kollision!" hat `collisionRadius: 0` oder spezielles Flag
- [ ] **Vorteil**: Einfach zu implementieren, klar getrennt von normalem Content

#### Option B: Test-Mode Flag
- [ ] Item hat `meta.testMode: true`
- [ ] Spezielle Rendering-Logik für Test-Items
- [ ] Distractor mit "KEINE Kollision!" wird ohne Collision-Box gerendert
- [ ] **Vorteil**: Flexibler, kann in jedem Chapter verwendet werden

#### Option C: Spezielles Behavior
- [ ] Distractor mit `behavior: "no_collision"`
- [ ] Engine ignoriert Collision für dieses Objekt
- [ ] Visuell deutlich markiert (z.B. durchsichtig/gepunktet)
- [ ] **Vorteil**: Nutzt bestehende Behavior-Struktur

**Technische Details**:
- [ ] Emoji-Support in Texten (bereits möglich laut Code)
- [ ] `collisionRadius: 0` für "KEINE Kollision!" Distractor
- [ ] Oder: `behavior: "no_collision"` + Engine-Logik
- [ ] Visuelle Markierung (z.B. gepunktete Umrandung)

**Verwendung**:
- Tutorial für neue Spieler
- Onboarding-Flow
- Erklärung der Gameplay-Mechaniken

**Dateien zu ändern**:
- `src/entities/DistractorObject.ts` - Collision-Logik für `no_collision` Behavior
- `src/core/CollisionSystem.ts` - Ignoriere Objekte mit `collisionRadius: 0`
- Content: Neues Test-Chapter erstellen

**Empfehlung**: Option A (Test-Chapter) ist am einfachsten und klarsten!

---

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
2. ⚡ JSON Ladezeitoptimierung (Parallel Loading)
3. 🚀 Vercel Deployment
4. 📱 Touch-Testing

### Mittelfristig (Dieser Monat)
5. 🛠️ JSON Editor (nur localhost)
6. 💾 Supabase Integration
7. 📚 Content erweitern
8. 💾 IndexedDB Caching (Phase 2)
9. ⏸️ Pause-Bildschirm erweitern (Phase 1: Editor-Links)

### Langfristig (Nächste Monate)
9. 💰 Payment Integration
10. 📱 App Store Deployment
11. 🎯 App Store Readiness
12. 🔧 Service Worker für Offline-Caching (Phase 3)

---

**Letzte Aktualisierung**: 8. Dezember 2025

