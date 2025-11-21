# WordRush Telemetrie - Implementationsplan

**Version**: 1.0  
**Erstellt**: November 2024  
**Ziel**: Erfassung aller spielrelevanten Events für kognitive/ADHS-ähnliche Verhaltensanalyse

---

## 📋 Inhaltsverzeichnis

1. [Überblick & Ziele](#überblick--ziele)
2. [Datenschutz & DSGVO](#datenschutz--dsgvo)
3. [Datenarchitektur](#datenarchitektur)
4. [Implementationsplan](#implementationsplan)
5. [Supabase Schema](#supabase-schema)
6. [TypeScript Integration](#typescript-integration)
7. [Analytics & Auswertung](#analytics--auswertung)
8. [Testing & Validation](#testing--validation)

---

## 🎯 Überblick & Ziele

### Warum Telemetrie?

WordRush soll **kognitive Leistungsprofile** erfassen, die für **pädagogische und therapeutische Zwecke** relevant sind:

- **Aufmerksamkeit** (Inattention, Stimulus Miss)
- **Impulsivität** (Motor Impulsivity, False Actions)
- **Verarbeitungsgeschwindigkeit** (Reaktionszeiten, Variabilität)
- **Arbeitsgedächtnis** (Sequenzierung, Order Tracking)
- **Emotionale Regulation** (Zeitdruck, Fehlercluster)

### Was wird getrackt?

#### **Navigation & Auswahl**
- Universe-Auswahl
- Theme-Auswahl (Planet)
- Chapter-Auswahl (Mond)
- Level-Auswahl

#### **Gameplay Events**
- Jedes Objekt (Correct/Distractor) mit allen Outcomes
- Schiffsbewegungen (Tracking, Idle Time, Jitter)
- Reaktionszeiten (mit Variabilität)
- Fehlertypen (Impulsivität vs. Unaufmerksamkeit)
- Reihenfolgefehler (Collection Order)

#### **Nicht-Aktionen** (!)
- **Ignored**: Objekt wurde weder geschossen noch eingesammelt
- **Passed Base**: Correct (ist okay)/Distractor (Fehler) hat Base berührt
- **Timed Out**: Objekt flog aus Screen ohne Reaktion

→ **Diese sind genauso wichtig wie Aktionen!**

---

## 🔒 Datenschutz & DSGVO

### Prinzipien

✅ **Nur Verhaltensdaten** – keine personenbezogenen Daten erforderlich
✅ **Pseudonymisierung** – User-IDs sind UUID ohne Namen/E-Mail  
✅ **Opt-In** – User kann Telemetrie aktivieren für seine UserID
✅ **Transparenz** – Klare Info, was erfasst wird  
✅ **Löschrecht** – User kann eigene Daten löschen  

### User Consent Flow

```
1. Erste Spielsitzung → Telemetrie-Dialog
2. User wählt: "Ja, helft der Forschung" / "Nein, danke"
3. Entscheidung wird in userProfil gespeichert
4. Settings: Jederzeit änderbar
```

### Anonymisierung

- **Keine IP-Adressen** (außer Supabase RLS-intern)
- **Keine Namen, E-Mails, Geburtsdaten**
- **User-ID = UUID** (generiert beim ersten Start)
- **Device-Info = nur Browser-Type** (optional)

---

## 🗄️ Datenarchitektur

### Option A: Round-Level Telemetrie (Kompakt)

**Pro**: Weniger Daten, schnelle Aggregation  
**Contra**: Verlust an Granularität, schlechter für ML

### Option B: Event-Level Telemetrie (Granular) ✅ **EMPFOHLEN**

**Pro**: Beste Analytics, ML-ready, Zeitreihen möglich  
**Contra**: Mehr Inserts, höheres Volumen

→ **Wir nutzen Option B** (Event-Level) mit aggregierten Round-Metrics.

---

## 🏗️ Implementationsplan

### Phase 1: Grundstruktur (Woche 1-2)

#### ✅ 1.1 TypeScript Types erstellen

**Datei**: `src/types/telemetry.types.ts`

Definiere alle Telemetrie-Strukturen:
- `TelemetryEvent`
- `NavigationEvent`
- `GameplayEvent`
- `ObjectEvent`
- `MovementSnapshot`
- `RoundMetrics`
- `SessionSummary`

#### ✅ 1.2 Supabase Schema aufsetzen

**Datei**: `supabase/migrations/001_telemetry_schema.sql`

Tabellen:
- `telemetry_sessions`
- `telemetry_navigation`
- `telemetry_rounds`
- `telemetry_events`
- `telemetry_objects`
- `telemetry_movement`

#### ✅ 1.3 Telemetry Provider erstellen

**Datei**: `src/infra/providers/TelemetryProvider.ts`

Interface für:
- `captureNavigation()`
- `startRound()`
- `captureEvent()`
- `captureObject()`
- `captureMovement()`
- `endRound()`
- `endSession()`

#### ✅ 1.4 Supabase Telemetry Adapter

**Datei**: `src/infra/adapters/SupabaseTelemetryAdapter.ts`

Implementierung des TelemetryProvider für Supabase.

---

### Phase 2: Navigation Tracking (Woche 2)

#### ✅ 2.1 Universe Selection Tracking

**Datei**: `src/components/UniverseSelector.tsx`

```typescript
// Bei Universe-Auswahl
telemetryProvider.captureNavigation({
  type: 'universe_selected',
  universe_id: universeId,
  timestamp: performance.now()
});
```

#### ✅ 2.2 Theme Selection Tracking

**Datei**: `src/components/ThemeSelector.tsx`

```typescript
// Bei Theme-Auswahl (Planet)
telemetryProvider.captureNavigation({
  type: 'theme_selected',
  universe_id: universeId,
  theme_id: themeId,
  timestamp: performance.now()
});
```

#### ✅ 2.3 Chapter Selection Tracking

**Datei**: `src/components/ChapterSelector.tsx`

```typescript
// Bei Chapter-Auswahl (Mond)
telemetryProvider.captureNavigation({
  type: 'chapter_selected',
  universe_id: universeId,
  theme_id: themeId,
  chapter_id: chapterId,
  timestamp: performance.now()
});
```

#### ✅ 2.4 Level Selection Tracking

**Datei**: `src/components/LevelSelector.tsx`

```typescript
// Bei Level-Auswahl
telemetryProvider.captureNavigation({
  type: 'level_selected',
  universe_id: universeId,
  theme_id: themeId,
  chapter_id: chapterId,
  level: levelNumber,
  timestamp: performance.now()
});
```

---

### Phase 3: Gameplay Event Tracking (Woche 3-4)

#### ✅ 3.1 Round Start Tracking

**Datei**: `src/logic/ShooterEngine.ts`

```typescript
// Bei Round-Start
const roundId = telemetryProvider.startRound({
  base_item_id: item.id,
  universe_id: universeId,
  theme_id: themeId,
  chapter_id: chapterId,
  level: level,
  game_mode: gameMode,
  start_time: performance.now()
});
```

#### ✅ 3.2 Object Spawn Tracking

**Datei**: `src/logic/ShooterEngine.ts`

Für **jedes** Objekt (Correct/Distractor):

```typescript
// Bei Object-Spawn
const objectTracking = {
  object_id: generateUUID(),
  round_id: roundId,
  type: 'correct' | 'distractor',
  word: word,
  spawn_time: performance.now(),
  spawn_position: { x, y },
  speed: speed,
  behavior: behavior,
  outcome: null // wird später gesetzt
};
```

#### ✅ 3.3 Action Event Tracking

**Datei**: `src/logic/ShooterEngine.ts`

Bei jeder Aktion:

```typescript
// Collect Event
telemetryProvider.captureEvent({
  round_id: roundId,
  event_type: 'collect',
  object_id: objectTracking.object_id,
  object_type: 'correct' | 'distractor',
  word: word,
  timestamp: performance.now(),
  reaction_time: timestamp - spawn_time,
  distance_to_ship: calculateDistance(ship, object),
  ship_position: { x: ship.x, y: ship.y },
  ship_velocity: { vx: ship.vx, vy: ship.vy }
});

// Shot Event
telemetryProvider.captureEvent({
  round_id: roundId,
  event_type: 'shot',
  object_id: objectTracking.object_id,
  object_type: 'correct' | 'distractor',
  word: word,
  timestamp: performance.now(),
  reaction_time: timestamp - spawn_time,
  distance_to_ship: calculateDistance(ship, object),
  ship_position: { x: ship.x, y: ship.y }
});
```

#### ✅ 3.4 Non-Action Tracking (!)

**Datei**: `src/logic/ShooterEngine.ts`

**Wichtigster Teil** für ADHS-Analyse:

```typescript
// Object Update Loop
for (const obj of activeObjects) {
  // Check: Objekt fliegt aus Screen
  if (obj.y > screenHeight || obj.x < 0 || obj.x > screenWidth) {
    telemetryProvider.captureObject({
      ...obj,
      outcome: 'timed_out',
      end_time: performance.now()
    });
  }
  
  // Check: Correct berührt Base
  if (obj.type === 'correct' && obj.collidedWithBase) {
    telemetryProvider.captureObject({
      ...obj,
      outcome: 'passed_base',
      end_time: performance.now()
    });
  }
  
  // Check: Objekt wurde komplett ignoriert
  if (obj.lifetime > 3000 && !obj.wasTargeted) {
    telemetryProvider.captureObject({
      ...obj,
      outcome: 'ignored',
      end_time: performance.now()
    });
  }
}
```

#### ✅ 3.5 Fehlertypen differenzieren

**Datei**: `src/logic/ShooterEngine.ts`

```typescript
// Impulsivität
if (event_type === 'collect' && object_type === 'distractor') {
  error_category = 'impulsivity';
  error_description = 'distractor_collected';
}

if (event_type === 'shot' && object_type === 'correct') {
  error_category = 'impulsivity';
  error_description = 'correct_shot';
}

// Unaufmerksamkeit
if (outcome === 'passed_base' && object_type === 'correct') {
  error_category = 'inattention';
  error_description = 'correct_missed';
}

if (outcome === 'ignored') {
  error_category = 'inattention';
  error_description = 'stimulus_miss';
}
```

---

### Phase 4: Movement Tracking (Woche 4)

#### ✅ 4.1 Ship Movement Sampling

**Datei**: `src/entities/Ship.ts`

Sample Bewegung alle 100ms:

```typescript
private lastMovementSample = 0;
private movementSamples: MovementSnapshot[] = [];

update(deltaTime: number): void {
  super.update(deltaTime);
  
  const now = performance.now();
  if (now - this.lastMovementSample > 100) {
    this.movementSamples.push({
      timestamp: now,
      position: { x: this.x, y: this.y },
      velocity: { vx: this.vx, vy: this.vy },
      speed: Math.sqrt(this.vx ** 2 + this.vy ** 2),
      is_moving: this.vx !== 0 || this.vy !== 0
    });
    this.lastMovementSample = now;
  }
}
```

#### ✅ 4.2 Movement Metrics Berechnung

**Datei**: `src/logic/MovementAnalyzer.ts`

```typescript
class MovementAnalyzer {
  calculateMetrics(samples: MovementSnapshot[]): MovementMetrics {
    return {
      total_time: samples[samples.length - 1].timestamp - samples[0].timestamp,
      time_in_motion: samples.filter(s => s.is_moving).length * 100,
      idle_time: samples.filter(s => !s.is_moving).length * 100,
      average_speed: mean(samples.map(s => s.speed)),
      path_jitter: this.calculateJitter(samples),
      idle_ratio: idle_time / total_time
    };
  }
  
  private calculateJitter(samples: MovementSnapshot[]): number {
    // Berechne Abweichung von geradem Pfad
    let jitter = 0;
    for (let i = 2; i < samples.length; i++) {
      const angle1 = Math.atan2(
        samples[i-1].position.y - samples[i-2].position.y,
        samples[i-1].position.x - samples[i-2].position.x
      );
      const angle2 = Math.atan2(
        samples[i].position.y - samples[i-1].position.y,
        samples[i].position.x - samples[i-1].position.x
      );
      jitter += Math.abs(angle2 - angle1);
    }
    return jitter / samples.length;
  }
}
```

---

### Phase 5: Round Metrics & Aggregation (Woche 5)

#### ✅ 5.1 Round End Tracking

**Datei**: `src/logic/ShooterEngine.ts`

```typescript
endRound(): void {
  const roundMetrics = this.calculateRoundMetrics();
  
  telemetryProvider.endRound(roundId, {
    end_time: performance.now(),
    duration: performance.now() - roundStartTime,
    
    // Reaktionszeiten
    mean_reaction_time: mean(reactionTimes),
    reaction_variance: variance(reactionTimes),
    reaction_cv: cv(reactionTimes), // Coefficient of Variation
    
    // Fehler
    total_errors: errorCount,
    impulsivity_errors: impulsivityErrors.length,
    inattention_errors: inattentionErrors.length,
    
    // Collection Order
    order_expected: expectedOrder,
    order_given: givenOrder,
    order_failures: orderFailureCount,
    order_accuracy: orderAccuracy,
    
    // Bewegung
    movement_score: movementMetrics.average_speed,
    idle_ratio: movementMetrics.idle_ratio,
    path_jitter: movementMetrics.path_jitter,
    
    // Zeitdruck
    time_pressure_actions: actionsBelowDeadline.length,
    average_time_to_deadline: mean(timesToDeadline),
    
    // Konsistenz
    error_bursts: detectErrorBursts(errors),
    warm_up_time: calculateWarmUpTime(reactionTimes),
    fatigue_index: calculateFatigueIndex(reactionTimes)
  });
}
```

#### ✅ 5.2 Konsistenz-Indikatoren

**Datei**: `src/logic/MetricsCalculator.ts`

```typescript
class MetricsCalculator {
  // Coefficient of Variation (CV = SD/Mean)
  calculateCV(values: number[]): number {
    const mean = this.mean(values);
    const sd = this.standardDeviation(values);
    return sd / mean;
  }
  
  // Error Bursts (Fehlercluster)
  detectErrorBursts(errors: ErrorEvent[]): number {
    let bursts = 0;
    let consecutiveErrors = 0;
    
    for (let i = 1; i < errors.length; i++) {
      if (errors[i].timestamp - errors[i-1].timestamp < 2000) {
        consecutiveErrors++;
        if (consecutiveErrors >= 2) bursts++;
      } else {
        consecutiveErrors = 0;
      }
    }
    return bursts;
  }
  
  // Warm-up Time (Zeit bis konstante Performance)
  calculateWarmUpTime(reactionTimes: Array<{time: number, value: number}>): number {
    // Finde ersten Punkt, wo Rolling Average stabil ist
    const windowSize = 5;
    for (let i = windowSize; i < reactionTimes.length - windowSize; i++) {
      const before = reactionTimes.slice(i - windowSize, i);
      const after = reactionTimes.slice(i, i + windowSize);
      const cvBefore = this.calculateCV(before.map(r => r.value));
      const cvAfter = this.calculateCV(after.map(r => r.value));
      
      if (cvAfter < 0.2 && cvAfter < cvBefore) {
        return reactionTimes[i].time;
      }
    }
    return 0;
  }
  
  // Fatigue Curve (Verschlechterung gegen Ende)
  calculateFatigueIndex(reactionTimes: number[]): number {
    const firstQuarter = reactionTimes.slice(0, Math.floor(reactionTimes.length / 4));
    const lastQuarter = reactionTimes.slice(-Math.floor(reactionTimes.length / 4));
    
    const meanFirst = this.mean(firstQuarter);
    const meanLast = this.mean(lastQuarter);
    
    return (meanLast - meanFirst) / meanFirst; // Positive = langsamer geworden
  }
}
```

---

### Phase 6: Session Summary (Woche 5)

#### ✅ 6.1 Session End Tracking

**Datei**: `src/logic/ShooterEngine.ts` oder `src/App.tsx`

```typescript
endSession(): void {
  telemetryProvider.endSession({
    session_id: sessionId,
    end_time: performance.now(),
    total_duration: performance.now() - sessionStartTime,
    
    // Aggregierte Metriken
    total_rounds: roundCount,
    total_items_played: itemsPlayed.length,
    
    // Performance
    overall_accuracy: totalCorrect / (totalCorrect + totalErrors),
    overall_mean_rt: mean(allReactionTimes),
    overall_rt_cv: cv(allReactionTimes),
    
    // Navigation
    universes_visited: uniqueUniverses.length,
    themes_visited: uniqueThemes.length,
    chapters_visited: uniqueChapters.length,
    levels_visited: uniqueLevels,
    
    // Abbruch
    completed_naturally: !wasAborted,
    abort_reason: abortReason
  });
}
```

---

### Phase 7: Supabase Integration (Woche 6)

#### ✅ 7.1 Batch Insert Optimierung

**Datei**: `src/infra/adapters/SupabaseTelemetryAdapter.ts`

```typescript
class SupabaseTelemetryAdapter implements TelemetryProvider {
  private eventQueue: TelemetryEvent[] = [];
  private batchSize = 50;
  private flushInterval = 5000; // 5s
  
  captureEvent(event: TelemetryEvent): void {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length >= this.batchSize) {
      this.flush();
    }
  }
  
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const batch = this.eventQueue.splice(0, this.batchSize);
    
    try {
      await this.supabase
        .from('telemetry_events')
        .insert(batch);
    } catch (error) {
      console.error('Telemetry flush failed', error);
      // Fallback: LocalStorage
      this.saveTolocalStorage(batch);
    }
  }
  
  startFlushTimer(): void {
    setInterval(() => this.flush(), this.flushInterval);
  }
}
```

#### ✅ 7.2 Offline Support

**Datei**: `src/infra/adapters/SupabaseTelemetryAdapter.ts`

```typescript
private saveTolocalStorage(events: TelemetryEvent[]): void {
  const stored = JSON.parse(localStorage.getItem('telemetry_queue') || '[]');
  stored.push(...events);
  localStorage.setItem('telemetry_queue', JSON.stringify(stored));
}

async syncOfflineData(): Promise<void> {
  const stored = JSON.parse(localStorage.getItem('telemetry_queue') || '[]');
  
  if (stored.length > 0) {
    try {
      await this.supabase
        .from('telemetry_events')
        .insert(stored);
      
      localStorage.removeItem('telemetry_queue');
    } catch (error) {
      console.error('Offline sync failed', error);
    }
  }
}
```

---

### Phase 8: User Consent & Settings (Woche 6)

#### ✅ 8.1 Consent Dialog Component

**Datei**: `src/components/TelemetryConsentDialog.tsx`

```typescript
export const TelemetryConsentDialog: React.FC = () => {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const consent = localStorage.getItem('telemetry_consent');
    if (consent === null) {
      setShow(true);
    }
  }, []);
  
  const handleAccept = () => {
    localStorage.setItem('telemetry_consent', 'true');
    telemetryProvider.enable();
    setShow(false);
  };
  
  const handleDecline = () => {
    localStorage.setItem('telemetry_consent', 'false');
    telemetryProvider.disable();
    setShow(false);
  };
  
  // UI mit klarer Erklärung
};
```

#### ✅ 8.2 Settings Integration

**Datei**: `src/components/Settings.tsx`

```typescript
<Setting
  label="Telemetrie aktivieren"
  description="Hilf uns, WordRush zu verbessern. Nur anonyme Spielverhaltensdaten."
  value={telemetryEnabled}
  onChange={(enabled) => {
    setTelemetryEnabled(enabled);
    localStorage.setItem('telemetry_consent', enabled.toString());
    enabled ? telemetryProvider.enable() : telemetryProvider.disable();
  }}
/>

<Button onClick={() => telemetryProvider.deleteUserData()}>
  Meine Daten löschen
</Button>
```

---

## 🗃️ Supabase Schema

### Tabelle: `telemetry_sessions`

```sql
CREATE TABLE telemetry_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  
  -- Zeitstempel
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Device Info (optional)
  browser_type TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  
  -- Aggregierte Metriken
  total_rounds INTEGER DEFAULT 0,
  total_items_played INTEGER DEFAULT 0,
  overall_accuracy NUMERIC(5,4),
  overall_mean_rt NUMERIC(10,2),
  overall_rt_cv NUMERIC(5,4),
  
  -- Navigation
  universes_visited TEXT[],
  themes_visited TEXT[],
  chapters_visited TEXT[],
  levels_visited INTEGER[],
  
  -- Abbruch
  completed_naturally BOOLEAN DEFAULT true,
  abort_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_sessions_user_id ON telemetry_sessions(user_id);
CREATE INDEX idx_telemetry_sessions_start_time ON telemetry_sessions(start_time);
```

### Tabelle: `telemetry_navigation`

```sql
CREATE TABLE telemetry_navigation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL, -- 'universe_selected', 'theme_selected', 'chapter_selected', 'level_selected'
  timestamp_ms BIGINT NOT NULL,
  
  -- Navigation Context
  universe_id TEXT,
  theme_id TEXT,
  chapter_id TEXT,
  level INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_navigation_session_id ON telemetry_navigation(session_id);
CREATE INDEX idx_telemetry_navigation_event_type ON telemetry_navigation(event_type);
```

### Tabelle: `telemetry_rounds`

```sql
CREATE TABLE telemetry_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES telemetry_sessions(id) ON DELETE CASCADE,
  
  -- Kontext
  base_item_id TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  game_mode TEXT NOT NULL, -- 'lernmodus' | 'shooter'
  
  -- Zeit
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Reaktionszeiten
  mean_reaction_time NUMERIC(10,2),
  reaction_variance NUMERIC(10,2),
  reaction_cv NUMERIC(5,4), -- Coefficient of Variation
  
  -- Fehler
  total_errors INTEGER DEFAULT 0,
  impulsivity_errors INTEGER DEFAULT 0,
  inattention_errors INTEGER DEFAULT 0,
  
  -- Collection Order
  order_expected TEXT[], -- Array of words
  order_given TEXT[],
  order_failures INTEGER DEFAULT 0,
  order_accuracy NUMERIC(5,4),
  
  -- Bewegung
  movement_score NUMERIC(5,2),
  idle_ratio NUMERIC(5,4),
  path_jitter NUMERIC(10,4),
  
  -- Zeitdruck
  time_pressure_actions INTEGER DEFAULT 0,
  average_time_to_deadline NUMERIC(10,2),
  
  -- Konsistenz
  error_bursts INTEGER DEFAULT 0,
  warm_up_time NUMERIC(10,2),
  fatigue_index NUMERIC(5,4),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_rounds_session_id ON telemetry_rounds(session_id);
CREATE INDEX idx_telemetry_rounds_base_item_id ON telemetry_rounds(base_item_id);
CREATE INDEX idx_telemetry_rounds_universe_theme_chapter ON telemetry_rounds(universe_id, theme_id, chapter_id);
CREATE INDEX idx_telemetry_rounds_level ON telemetry_rounds(level);
```

### Tabelle: `telemetry_events`

```sql
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES telemetry_rounds(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL, -- 'collect', 'shot', 'spawn'
  timestamp_ms BIGINT NOT NULL,
  
  -- Object
  object_id UUID NOT NULL,
  object_type TEXT NOT NULL, -- 'correct', 'distractor'
  word TEXT NOT NULL,
  
  -- Reaktion
  reaction_time NUMERIC(10,2),
  distance_to_ship NUMERIC(10,2),
  
  -- Schiff
  ship_position_x NUMERIC(10,2),
  ship_position_y NUMERIC(10,2),
  ship_velocity_x NUMERIC(10,4),
  ship_velocity_y NUMERIC(10,4),
  
  -- Fehler
  is_error BOOLEAN DEFAULT false,
  error_category TEXT, -- 'impulsivity', 'inattention'
  error_description TEXT, -- 'distractor_collected', 'correct_shot', 'correct_missed', 'stimulus_miss'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_events_round_id ON telemetry_events(round_id);
CREATE INDEX idx_telemetry_events_event_type ON telemetry_events(event_type);
CREATE INDEX idx_telemetry_events_object_type ON telemetry_events(object_type);
CREATE INDEX idx_telemetry_events_word ON telemetry_events(word);
CREATE INDEX idx_telemetry_events_error_category ON telemetry_events(error_category);
```

### Tabelle: `telemetry_objects`

```sql
CREATE TABLE telemetry_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES telemetry_rounds(id) ON DELETE CASCADE,
  
  -- Object
  object_id UUID NOT NULL UNIQUE,
  object_type TEXT NOT NULL, -- 'correct', 'distractor'
  word TEXT NOT NULL,
  
  -- Spawn
  spawn_time BIGINT NOT NULL,
  spawn_position_x NUMERIC(10,2),
  spawn_position_y NUMERIC(10,2),
  speed NUMERIC(5,2),
  behavior TEXT,
  
  -- Outcome
  outcome TEXT, -- 'collected', 'shot', 'ignored', 'passed_base', 'timed_out'
  end_time BIGINT,
  
  -- Tracking
  was_targeted BOOLEAN DEFAULT false,
  time_in_view NUMERIC(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_objects_round_id ON telemetry_objects(round_id);
CREATE INDEX idx_telemetry_objects_object_id ON telemetry_objects(object_id);
CREATE INDEX idx_telemetry_objects_outcome ON telemetry_objects(outcome);
CREATE INDEX idx_telemetry_objects_word ON telemetry_objects(word);
```

### Tabelle: `telemetry_movement`

```sql
CREATE TABLE telemetry_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES telemetry_rounds(id) ON DELETE CASCADE,
  
  -- Snapshot
  timestamp_ms BIGINT NOT NULL,
  position_x NUMERIC(10,2),
  position_y NUMERIC(10,2),
  velocity_x NUMERIC(10,4),
  velocity_y NUMERIC(10,4),
  speed NUMERIC(10,4),
  is_moving BOOLEAN,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_telemetry_movement_round_id ON telemetry_movement(round_id);

-- Optional: Partitionierung nach Zeit für bessere Performance
-- CREATE TABLE telemetry_movement_2024_11 PARTITION OF telemetry_movement
-- FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_movement ENABLE ROW LEVEL SECURITY;

-- Policy: User kann nur eigene Daten sehen/bearbeiten
CREATE POLICY user_own_data ON telemetry_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY user_own_navigation ON telemetry_navigation
  FOR ALL USING (session_id IN (
    SELECT id FROM telemetry_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_rounds ON telemetry_rounds
  FOR ALL USING (session_id IN (
    SELECT id FROM telemetry_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY user_own_events ON telemetry_events
  FOR ALL USING (round_id IN (
    SELECT id FROM telemetry_rounds WHERE session_id IN (
      SELECT id FROM telemetry_sessions WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY user_own_objects ON telemetry_objects
  FOR ALL USING (round_id IN (
    SELECT id FROM telemetry_rounds WHERE session_id IN (
      SELECT id FROM telemetry_sessions WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY user_own_movement ON telemetry_movement
  FOR ALL USING (round_id IN (
    SELECT id FROM telemetry_rounds WHERE session_id IN (
      SELECT id FROM telemetry_sessions WHERE user_id = auth.uid()
    )
  ));
```

---

## 💻 TypeScript Integration

### Datei: `src/types/telemetry.types.ts`

```typescript
export interface Vector2D {
  x: number;
  y: number;
}

// ==================== Session ====================

export interface TelemetrySession {
  id: string;
  user_id: string;
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  
  browser_type?: string;
  screen_width?: number;
  screen_height?: number;
  
  total_rounds: number;
  total_items_played: number;
  overall_accuracy?: number;
  overall_mean_rt?: number;
  overall_rt_cv?: number;
  
  universes_visited: string[];
  themes_visited: string[];
  chapters_visited: string[];
  levels_visited: number[];
  
  completed_naturally: boolean;
  abort_reason?: string;
}

// ==================== Navigation ====================

export type NavigationType = 
  | 'universe_selected'
  | 'theme_selected'
  | 'chapter_selected'
  | 'level_selected';

export interface NavigationEvent {
  id: string;
  session_id: string;
  event_type: NavigationType;
  timestamp_ms: number;
  
  universe_id?: string;
  theme_id?: string;
  chapter_id?: string;
  level?: number;
}

// ==================== Round ====================

export interface TelemetryRound {
  id: string;
  session_id: string;
  
  base_item_id: string;
  universe_id: string;
  theme_id: string;
  chapter_id: string;
  level: number;
  game_mode: 'lernmodus' | 'shooter';
  
  start_time: number;
  end_time?: number;
  duration_ms?: number;
  
  mean_reaction_time?: number;
  reaction_variance?: number;
  reaction_cv?: number;
  
  total_errors: number;
  impulsivity_errors: number;
  inattention_errors: number;
  
  order_expected: string[];
  order_given: string[];
  order_failures: number;
  order_accuracy?: number;
  
  movement_score?: number;
  idle_ratio?: number;
  path_jitter?: number;
  
  time_pressure_actions: number;
  average_time_to_deadline?: number;
  
  error_bursts: number;
  warm_up_time?: number;
  fatigue_index?: number;
}

// ==================== Events ====================

export type EventType = 'collect' | 'shot' | 'spawn';
export type ObjectType = 'correct' | 'distractor';
export type ErrorCategory = 'impulsivity' | 'inattention';
export type ErrorDescription = 
  | 'distractor_collected'
  | 'correct_shot'
  | 'correct_missed'
  | 'stimulus_miss';

export interface TelemetryEvent {
  id: string;
  round_id: string;
  
  event_type: EventType;
  timestamp_ms: number;
  
  object_id: string;
  object_type: ObjectType;
  word: string;
  
  reaction_time?: number;
  distance_to_ship?: number;
  
  ship_position: Vector2D;
  ship_velocity?: Vector2D;
  
  is_error: boolean;
  error_category?: ErrorCategory;
  error_description?: ErrorDescription;
}

// ==================== Objects ====================

export type ObjectOutcome = 
  | 'collected'
  | 'shot'
  | 'ignored'
  | 'passed_base'
  | 'timed_out';

export interface TelemetryObject {
  id: string;
  round_id: string;
  
  object_id: string;
  object_type: ObjectType;
  word: string;
  
  spawn_time: number;
  spawn_position: Vector2D;
  speed: number;
  behavior: string;
  
  outcome?: ObjectOutcome;
  end_time?: number;
  
  was_targeted: boolean;
  time_in_view?: number;
}

// ==================== Movement ====================

export interface MovementSnapshot {
  id: string;
  round_id: string;
  
  timestamp_ms: number;
  position: Vector2D;
  velocity: Vector2D;
  speed: number;
  is_moving: boolean;
}

export interface MovementMetrics {
  total_time: number;
  time_in_motion: number;
  idle_time: number;
  average_speed: number;
  path_jitter: number;
  idle_ratio: number;
}

// ==================== Provider Interface ====================

export interface TelemetryProvider {
  // Session
  startSession(): Promise<string>;
  endSession(sessionId: string, summary: Partial<TelemetrySession>): Promise<void>;
  
  // Navigation
  captureNavigation(event: Omit<NavigationEvent, 'id'>): Promise<void>;
  
  // Round
  startRound(round: Omit<TelemetryRound, 'id'>): Promise<string>;
  endRound(roundId: string, metrics: Partial<TelemetryRound>): Promise<void>;
  
  // Events
  captureEvent(event: Omit<TelemetryEvent, 'id'>): Promise<void>;
  
  // Objects
  captureObject(object: Omit<TelemetryObject, 'id'>): Promise<void>;
  
  // Movement
  captureMovement(snapshot: Omit<MovementSnapshot, 'id'>): Promise<void>;
  
  // Control
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  
  // User Data
  deleteUserData(userId: string): Promise<void>;
}
```

### Datei: `src/infra/providers/TelemetryProvider.ts`

```typescript
import { TelemetryProvider as ITelemetryProvider } from '@/types/telemetry.types';

export class NoOpTelemetryProvider implements ITelemetryProvider {
  async startSession(): Promise<string> { return ''; }
  async endSession(): Promise<void> {}
  async captureNavigation(): Promise<void> {}
  async startRound(): Promise<string> { return ''; }
  async endRound(): Promise<void> {}
  async captureEvent(): Promise<void> {}
  async captureObject(): Promise<void> {}
  async captureMovement(): Promise<void> {}
  enable(): void {}
  disable(): void {}
  isEnabled(): boolean { return false; }
  async deleteUserData(): Promise<void> {}
}

export class TelemetryProviderFactory {
  static create(): ITelemetryProvider {
    const consent = localStorage.getItem('telemetry_consent');
    
    if (consent === 'true') {
      // Lazy load Supabase adapter
      return new SupabaseTelemetryAdapter();
    }
    
    return new NoOpTelemetryProvider();
  }
}
```

### Datei: `src/infra/adapters/SupabaseTelemetryAdapter.ts`

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TelemetryProvider } from '@/types/telemetry.types';

export class SupabaseTelemetryAdapter implements TelemetryProvider {
  private supabase: SupabaseClient;
  private enabled: boolean = true;
  private eventQueue: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
    
    this.startFlushTimer();
  }
  
  // ==================== Session ====================
  
  async startSession(): Promise<string> {
    if (!this.enabled) return '';
    
    const { data, error } = await this.supabase
      .from('telemetry_sessions')
      .insert({
        user_id: this.getUserId(),
        start_time: new Date().toISOString(),
        browser_type: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }
  
  async endSession(sessionId: string, summary: any): Promise<void> {
    if (!this.enabled) return;
    
    await this.flush(); // Flush remaining events
    
    await this.supabase
      .from('telemetry_sessions')
      .update({
        end_time: new Date().toISOString(),
        ...summary
      })
      .eq('id', sessionId);
  }
  
  // ==================== Navigation ====================
  
  async captureNavigation(event: any): Promise<void> {
    if (!this.enabled) return;
    
    this.eventQueue.push({
      table: 'telemetry_navigation',
      data: event
    });
  }
  
  // ==================== Round ====================
  
  async startRound(round: any): Promise<string> {
    if (!this.enabled) return '';
    
    const { data, error } = await this.supabase
      .from('telemetry_rounds')
      .insert({
        ...round,
        start_time: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }
  
  async endRound(roundId: string, metrics: any): Promise<void> {
    if (!this.enabled) return;
    
    await this.supabase
      .from('telemetry_rounds')
      .update({
        end_time: new Date().toISOString(),
        ...metrics
      })
      .eq('id', roundId);
  }
  
  // ==================== Events ====================
  
  async captureEvent(event: any): Promise<void> {
    if (!this.enabled) return;
    
    this.eventQueue.push({
      table: 'telemetry_events',
      data: event
    });
  }
  
  // ==================== Objects ====================
  
  async captureObject(object: any): Promise<void> {
    if (!this.enabled) return;
    
    this.eventQueue.push({
      table: 'telemetry_objects',
      data: object
    });
  }
  
  // ==================== Movement ====================
  
  async captureMovement(snapshot: any): Promise<void> {
    if (!this.enabled) return;
    
    this.eventQueue.push({
      table: 'telemetry_movement',
      data: snapshot
    });
  }
  
  // ==================== Batch Flushing ====================
  
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 5000); // Flush every 5 seconds
  }
  
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const batch = this.eventQueue.splice(0, 100); // Max 100 per batch
    
    // Group by table
    const byTable: Record<string, any[]> = {};
    for (const item of batch) {
      if (!byTable[item.table]) byTable[item.table] = [];
      byTable[item.table].push(item.data);
    }
    
    // Insert by table
    for (const [table, data] of Object.entries(byTable)) {
      try {
        await this.supabase.from(table).insert(data);
      } catch (error) {
        console.error(`Failed to flush ${table}`, error);
        // Fallback: save to localStorage
        this.saveToLocalStorage(table, data);
      }
    }
  }
  
  // ==================== Offline Support ====================
  
  private saveToLocalStorage(table: string, data: any[]): void {
    const key = `telemetry_offline_${table}`;
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    stored.push(...data);
    localStorage.setItem(key, JSON.stringify(stored));
  }
  
  async syncOfflineData(): Promise<void> {
    const tables = [
      'telemetry_navigation',
      'telemetry_events',
      'telemetry_objects',
      'telemetry_movement'
    ];
    
    for (const table of tables) {
      const key = `telemetry_offline_${table}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      
      if (stored.length > 0) {
        try {
          await this.supabase.from(table).insert(stored);
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to sync offline data for ${table}`, error);
        }
      }
    }
  }
  
  // ==================== Control ====================
  
  enable(): void {
    this.enabled = true;
  }
  
  disable(): void {
    this.enabled = false;
    this.flush();
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  // ==================== User Data ====================
  
  async deleteUserData(userId: string): Promise<void> {
    // Cascade delete durch Foreign Keys
    await this.supabase
      .from('telemetry_sessions')
      .delete()
      .eq('user_id', userId);
  }
  
  // ==================== Helpers ====================
  
  private getUserId(): string {
    let userId = localStorage.getItem('telemetry_user_id');
    
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('telemetry_user_id', userId);
    }
    
    return userId;
  }
  
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}
```

---

## 📊 Analytics & Auswertung

### Was du mit diesen Daten auswerten kannst

#### **1. Heatmap: Welche Distractors sind am schwersten?**

```sql
SELECT 
  word,
  COUNT(*) FILTER (WHERE outcome = 'collected') as collected_count,
  COUNT(*) FILTER (WHERE outcome = 'shot') as shot_count,
  COUNT(*) FILTER (WHERE outcome = 'ignored') as ignored_count,
  COUNT(*) FILTER (WHERE outcome = 'timed_out') as timed_out_count
FROM telemetry_objects
WHERE object_type = 'distractor'
GROUP BY word
ORDER BY collected_count DESC;
```

**Interpretation:**
- `collected_count` hoch → Distractor zu schwierig (wird fälschlich eingesammelt)
- `shot_count` hoch → Distractor zu leicht (wird sofort erkannt)

---

#### **2. Welche Corrects werden fälschlich abgeschossen?**

```sql
SELECT 
  word,
  COUNT(*) as shot_count,
  AVG(reaction_time) as avg_rt
FROM telemetry_events
WHERE event_type = 'shot' AND object_type = 'correct'
GROUP BY word
ORDER BY shot_count DESC;
```

**Action:** Redesign (Position, Farbe, Speed anpassen)

---

#### **3. Welche Items sind falsch konzipiert?**

```sql
SELECT 
  r.base_item_id,
  AVG(r.order_accuracy) as avg_order_accuracy,
  AVG(r.mean_reaction_time) as avg_rt,
  COUNT(*) as play_count
FROM telemetry_rounds r
GROUP BY r.base_item_id
HAVING AVG(r.order_accuracy) < 0.2 -- Weniger als 20% Order-Erfolg
ORDER BY avg_order_accuracy ASC;
```

**Interpretation:**
- Order-Accuracy < 20% → Reihenfolge zu schwer
- Avg RT sehr hoch → Item zu komplex

---

#### **4. ADHS-Profil: Inattention Score**

```sql
SELECT 
  r.session_id,
  COUNT(*) FILTER (WHERE e.error_category = 'inattention') as inattention_errors,
  COUNT(*) FILTER (WHERE e.error_category = 'impulsivity') as impulsivity_errors,
  AVG(r.reaction_cv) as avg_reaction_cv,
  AVG(r.idle_ratio) as avg_idle_ratio
FROM telemetry_rounds r
JOIN telemetry_events e ON e.round_id = r.id
GROUP BY r.session_id
HAVING AVG(r.reaction_cv) > 0.3; -- Hohe Variabilität
```

**Interpretation:**
- `reaction_cv` > 0.3 → ADHS-typisch (hohe intraindividuelle Variabilität)
- `inattention_errors` > `impulsivity_errors` → Inattentive Subtype
- `idle_ratio` > 0.3 → Hypoaktivität

---

#### **5. Zeitreihen: Müdigkeit über Zeit**

```sql
SELECT 
  EXTRACT(EPOCH FROM (e.timestamp_ms - r.start_time)) / 1000 as seconds_into_round,
  AVG(e.reaction_time) as avg_rt
FROM telemetry_events e
JOIN telemetry_rounds r ON r.id = e.round_id
WHERE e.event_type = 'collect' AND e.object_type = 'correct'
GROUP BY seconds_into_round
ORDER BY seconds_into_round;
```

**Interpretation:**
- RT steigt über Zeit → Fatigue
- RT konstant → Gute Konzentration

---

#### **6. Session Completion Analysis**

```sql
SELECT 
  completed_naturally,
  abort_reason,
  AVG(duration_ms / 1000.0) as avg_duration_seconds,
  COUNT(*) as session_count
FROM telemetry_sessions
GROUP BY completed_naturally, abort_reason;
```

**Interpretation:**
- Viele Abbrüche → Frustpunkt identifizieren
- Abort bei bestimmtem Level → Difficulty Spike

---

### Dashboard Visualisierungen

#### **Component: TelemetryDashboard.tsx**

```typescript
export const TelemetryDashboard: React.FC = () => {
  return (
    <div className="dashboard">
      {/* 1. Top Distractors (Heatmap) */}
      <DistractorHeatmap />
      
      {/* 2. Reaction Time Distribution */}
      <ReactionTimeHistogram />
      
      {/* 3. Error Profile (Impulsivity vs. Inattention) */}
      <ErrorProfileChart />
      
      {/* 4. Fatigue Curve */}
      <FatigueCurveChart />
      
      {/* 5. Movement Heatmap */}
      <MovementHeatmap />
      
      {/* 6. Order Accuracy by Item */}
      <OrderAccuracyChart />
    </div>
  );
};
```

---

## 🧪 Testing & Validation

### Phase 9: Testing (Woche 7)

#### ✅ 9.1 Unit Tests

**Datei**: `src/logic/__tests__/MetricsCalculator.test.ts`

```typescript
import { MetricsCalculator } from '../MetricsCalculator';

describe('MetricsCalculator', () => {
  const calc = new MetricsCalculator();
  
  test('calculateCV', () => {
    const values = [1, 2, 3, 4, 5];
    const cv = calc.calculateCV(values);
    expect(cv).toBeCloseTo(0.527, 2);
  });
  
  test('detectErrorBursts', () => {
    const errors = [
      { timestamp: 1000 },
      { timestamp: 1500 },
      { timestamp: 2000 },
      { timestamp: 5000 }
    ];
    const bursts = calc.detectErrorBursts(errors);
    expect(bursts).toBe(1);
  });
  
  test('calculateFatigueIndex', () => {
    const reactionTimes = [500, 520, 550, 600, 650];
    const fatigue = calc.calculateFatigueIndex(reactionTimes);
    expect(fatigue).toBeGreaterThan(0); // Langsamer geworden
  });
});
```

#### ✅ 9.2 Integration Tests

**Datei**: `src/infra/adapters/__tests__/SupabaseTelemetryAdapter.test.ts`

```typescript
import { SupabaseTelemetryAdapter } from '../SupabaseTelemetryAdapter';

describe('SupabaseTelemetryAdapter', () => {
  let adapter: SupabaseTelemetryAdapter;
  
  beforeEach(() => {
    adapter = new SupabaseTelemetryAdapter();
  });
  
  test('startSession creates session', async () => {
    const sessionId = await adapter.startSession();
    expect(sessionId).toBeTruthy();
  });
  
  test('captureEvent queues event', async () => {
    await adapter.captureEvent({
      round_id: 'test-round',
      event_type: 'collect',
      object_id: 'test-object',
      object_type: 'correct',
      word: 'test',
      timestamp_ms: performance.now(),
      ship_position: { x: 0, y: 0 },
      is_error: false
    });
    
    // Check queue length
    expect(adapter['eventQueue'].length).toBe(1);
  });
  
  test('flush sends events to Supabase', async () => {
    // Add events
    await adapter.captureEvent({ /* ... */ });
    
    // Flush
    await adapter['flush']();
    
    // Check queue is empty
    expect(adapter['eventQueue'].length).toBe(0);
  });
});
```

#### ✅ 9.3 E2E Tests

**Datei**: `cypress/e2e/telemetry.cy.ts`

```typescript
describe('Telemetry E2E', () => {
  beforeEach(() => {
    cy.visit('/');
    localStorage.setItem('telemetry_consent', 'true');
  });
  
  it('tracks universe selection', () => {
    cy.get('[data-testid="universe-psychiatrie"]').click();
    
    // Verify telemetry event
    cy.window().then((win) => {
      const events = win.localStorage.getItem('telemetry_offline_telemetry_navigation');
      expect(events).to.include('universe_selected');
    });
  });
  
  it('tracks gameplay events', () => {
    // Navigate to game
    cy.get('[data-testid="universe-psychiatrie"]').click();
    cy.get('[data-testid="theme-icd10"]').click();
    cy.get('[data-testid="chapter-F32"]').click();
    
    // Play round
    cy.get('[data-testid="game-canvas"]').click(400, 300);
    
    // Verify events
    cy.window().then((win) => {
      const events = win.localStorage.getItem('telemetry_offline_telemetry_events');
      expect(events).to.include('collect');
    });
  });
});
```

---

## 📅 Zeitplan Übersicht

| Phase | Woche | Aufgaben | Status |
|-------|-------|----------|--------|
| **Phase 1** | 1-2 | Grundstruktur, Types, Provider, Adapter | ⏳ Pending |
| **Phase 2** | 2 | Navigation Tracking | ⏳ Pending |
| **Phase 3** | 3-4 | Gameplay Event Tracking | ⏳ Pending |
| **Phase 4** | 4 | Movement Tracking | ⏳ Pending |
| **Phase 5** | 5 | Round Metrics & Aggregation | ⏳ Pending |
| **Phase 6** | 5 | Session Summary | ⏳ Pending |
| **Phase 7** | 6 | Supabase Integration | ⏳ Pending |
| **Phase 8** | 6 | User Consent & Settings | ⏳ Pending |
| **Phase 9** | 7 | Testing & Validation | ⏳ Pending |

**Gesamtdauer**: ~7 Wochen

---

## 🎯 Nächste Schritte

### Sofort starten:

1. **Supabase Projekt erstellen**
   - Neues Projekt auf supabase.com
   - API Keys in `.env` hinterlegen

2. **Schema aufsetzen**
   - SQL Migration ausführen (siehe oben)
   - RLS Policies aktivieren

3. **TypeScript Types definieren**
   - `src/types/telemetry.types.ts` erstellen

4. **Provider Interface implementieren**
   - `src/infra/providers/TelemetryProvider.ts`

5. **Consent Dialog bauen**
   - `src/components/TelemetryConsentDialog.tsx`

---

## 📚 Ressourcen

### Dokumentation
- [Supabase Docs](https://supabase.com/docs)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [DSGVO Telemetrie Guidelines](https://gdpr.eu/)

### Literatur (ADHS-Diagnostik)
- Riccio, C. A., et al. (2001). The Continuous Performance Test
- Epstein, J. N., et al. (2011). Reaction time variability
- Kofler, M. J., et al. (2013). Reaction time variability in ADHD

---

**Ende Implementationsplan**

Bei Fragen oder Unklarheiten → Siehe auch:
- `README_AI_AGENTS.md` (Projekt-Kontext)
- `TYPES.md` (TypeScript Types)
- `content/CONTENT_GUIDE.md` (Content-Struktur)

