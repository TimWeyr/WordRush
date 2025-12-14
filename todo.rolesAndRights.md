# 📊 Erweitertes Datenbank-Schema

## 1. Content Permissions (Statische Freigaben)

Definiert welcher Content grundsätzlich verfügbar ist.

```sql
CREATE TABLE content_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Hierarchie (mindestens eine muss gesetzt sein)
  universe_id TEXT NULLABLE,
  theme_id TEXT NULLABLE,
  chapter_id TEXT NULLABLE,
  round_id TEXT NULLABLE,
  -- Dein "Item"
  item_id UUID NULLABLE,   -- Einzelnes Objekt
  
  -- Access-Level
  access_type TEXT NOT NULL,  -- 'free', 'premium', 'score_unlock', 'purchase_required'
  required_score INTEGER NULLABLE,  -- Wenn access_type='score_unlock'
  required_purchase_id UUID NULLABLE,  -- Referenz zu Paket
  
  -- Granularität für Items
  item_type TEXT NULLABLE,  -- 'base', 'correct', 'distractor', 'bonus'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (universe_id IS NOT NULL) OR 
    (theme_id IS NOT NULL) OR 
    (chapter_id IS NOT NULL) OR 
    (round_id IS NOT NULL) OR
    (item_id IS NOT NULL)
  ),
  
  -- Indexes
  INDEX(universe_id),
  INDEX(theme_id),
  INDEX(chapter_id),
  INDEX(round_id),
  INDEX(access_type)
);
```

## 2. User Unlocks (Dynamische Freischaltungen)

Speichert was ein User freigeschaltet hat.

```sql
CREATE TABLE user_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Was wurde freigeschaltet? (mindestens eins)
  universe_id TEXT NULLABLE,
  theme_id TEXT NULLABLE,
  chapter_id TEXT NULLABLE,
  round_id TEXT NULLABLE,
  item_id UUID NULLABLE,
  
  -- Wie wurde es freigeschaltet?
  unlock_type TEXT NOT NULL,  -- 'achievement', 'score', 'manual', 'purchase', 'gift'
  unlock_reason TEXT NULLABLE,  -- z.B. "Reached 1000 points in Chapter X"
  
  -- Metadata
  unlocked_at TIMESTAMP DEFAULT NOW(),
  unlocked_by_score INTEGER NULLABLE,  -- Score bei Freischaltung
  unlocked_by_admin UUID NULLABLE REFERENCES auth.users(id),  -- Wenn manuell
  
  -- Unique: User kann Content nur einmal freischalten
  UNIQUE(user_id, universe_id, theme_id, chapter_id, round_id, item_id),
  
  INDEX(user_id),
  INDEX(unlock_type)
);
```

## 3. Purchases (Käufe)

Gekaufte Pakete/Content.

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  package_id TEXT NOT NULL,  -- z.B. "premium_all", "universe_psychiatrie", "theme_icd10"
  package_type TEXT NOT NULL,  -- 'universe', 'theme', 'chapter', 'bundle'
  
  -- Was wurde gekauft?
  universe_id TEXT NULLABLE,
  theme_id TEXT NULLABLE,
  chapter_id TEXT NULLABLE,
  
  -- Payment
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_provider TEXT,  -- 'stripe', 'paypal', etc.
  transaction_id TEXT UNIQUE,
  
  -- Status
  status TEXT DEFAULT 'completed',  -- 'pending', 'completed', 'refunded'
  purchased_at TIMESTAMP DEFAULT NOW(),
  refunded_at TIMESTAMP NULLABLE,
  
  INDEX(user_id),
  INDEX(package_id),
  INDEX(status)
);
```

## 4. User Permissions (Editor-Rechte)

Editor-Rechte für Content-Bearbeitung.

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content-Scope (NULL = alle)
  universe_id TEXT NULLABLE,
  theme_id TEXT NULLABLE,
  chapter_id TEXT NULLABLE,
  
  -- Permissions
  can_read BOOLEAN DEFAULT true,
  can_write BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_publish BOOLEAN DEFAULT false,
  
  -- Metadata
  granted_by UUID REFERENCES auth.users(id),  -- Admin der Rechte vergeben hat
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULLABLE,
  
  UNIQUE(user_id, universe_id, theme_id, chapter_id),
  INDEX(user_id)
);
```

## 5. Packages (Verkaufbare Pakete)

Definiert verkaufbare Content-Pakete.

```sql
CREATE TABLE packages (
  id TEXT PRIMARY KEY,  -- z.B. "premium_all", "universe_psychiatrie"
  name TEXT NOT NULL,
  description TEXT,
  
  -- Package-Typ
  type TEXT NOT NULL,  -- 'universe', 'theme', 'chapter', 'bundle'
  
  -- Was ist enthalten?
  universe_ids TEXT[] NULLABLE,
  theme_ids TEXT[] NULLABLE,
  chapter_ids TEXT[] NULLABLE,
  
  -- Pricing
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Availability
  available BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

# 🔍 Zugriffs-Logik (Permission Check)

## Funktion: `hasUserAccess(user_id, content_type, content_id)`

```typescript
async function hasUserAccess(
  userId: string | null,  // null = Guest
  contentType: 'universe' | 'theme' | 'chapter' | 'round' | 'item',
  contentId: string
): Promise<boolean> {
  // 1. Check freeTier (öffentlich für alle)
  const isFreeTier = await checkContentAccess(contentType, contentId, 'free');
  if (isFreeTier) return true;
  
  // 2. Guest? Nur freeTier!
  if (!userId) return false;
  
  // 3. Check User Unlocks (Achievements, Score, etc.)
  const hasUnlock = await checkUserUnlock(userId, contentType, contentId);
  if (hasUnlock) return true;
  
  // 4. Check Purchases (gekaufte Pakete)
  const hasPurchase = await checkUserPurchase(userId, contentType, contentId);
  if (hasPurchase) return true;
  
  // 5. Check Score-Based Unlock
  const userScore = await getUserScore(userId, contentType, contentId);
  const requiredScore = await getRequiredScore(contentType, contentId);
  if (requiredScore && userScore >= requiredScore) {
    // Auto-Unlock!
    await createUserUnlock(userId, contentType, contentId, 'score', userScore);
    return true;
  }
  
  // 6. Kein Zugriff
  return false;
}
```

---

# 🎮 Use Cases & Beispiele

## 1. freeTier Items (wie bisher)

Chapter "Business_Communication" ist komplett frei:

```sql
INSERT INTO content_access (chapter_id, access_type)
VALUES ('Business_Communication', 'free');
```

Einzelnes Round/Item ist frei:

```sql
INSERT INTO content_access (round_id, access_type)
VALUES ('BC_001', 'free');
```

## 2. Score-Based Unlock

Chapter wird ab 500 Punkten freigeschaltet:

```sql
INSERT INTO content_access (
  chapter_id, 
  access_type, 
  required_score
) VALUES (
  'Advanced_Grammar', 
  'score_unlock', 
  500
);
```

## 3. Gekauftes Paket

Package definieren:

```sql
INSERT INTO packages (id, name, type, universe_ids, price_cents)
VALUES (
  'premium_englisch',
  'Englisch Premium',
  'universe',
  ARRAY['englisch'],
  999  -- 9.99 EUR
);
```

User kauft Paket:

```sql
INSERT INTO purchases (user_id, package_id, package_type, universe_id, price_cents)
VALUES (
  'user-123',
  'premium_englisch',
  'universe',
  'englisch',
  999
);
```

## 4. Einzelne Distractors freischalten

Nur bestimmte Distractors sind schwieriger (Premium):

```sql
INSERT INTO content_access (
  item_id,  -- UUID des Distractors
  item_type,
  access_type
) VALUES (
  'uuid-of-distractor',
  'distractor',
  'premium'
);
```

## 5. Editor-Rechte

User darf "Englisch" Universe bearbeiten:

```sql
INSERT INTO user_permissions (
  user_id,
  universe_id,
  can_read,
  can_write,
  can_delete,
  granted_by
) VALUES (
  'user-123',
  'englisch',
  true,
  true,
  false,  -- Löschen nur für Admins
  'admin-uuid'
);
```

---

# 🚀 Migration-Path von freeTier

## Phase 1 (Jetzt)

`freeTier` Property bleibt in JSON.

## Phase 2 (DB-Migration)

Alle Items mit `freeTier=true` werden migriert:

```sql
INSERT INTO content_access (round_id, access_type)
SELECT id, 'free'
FROM rounds
WHERE base->>'freeTier' = 'true';  -- JSON Property
```

---

# 🎯 Vorteile dieses Systems

- ✅ **Flexibel**: Freischaltung auf jeder Ebene (Universe → Item)
- ✅ **Skalierbar**: Neue Access-Types einfach hinzufügbar
- ✅ **Granular**: Sogar einzelne Distractors steuerbar
- ✅ **Performance**: Indexes auf allen wichtigen Feldern
- ✅ **Audit-Trail**: Wer hat was wann freigeschaltet/gekauft
- ✅ **Business-Ready**: Purchases, Packages, Refunds
