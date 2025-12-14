# 🚨 CRITICAL BUG FIX: Items wurden beim Speichern gelöscht

**Datum:** 8. Dezember 2025  
**Schweregrad:** KRITISCH - Datenverlust möglich  
**Status:** BEHOBEN ✅

---

## Problem

### Symptome

- Beim Bearbeiten **eines einzelnen Items** im Editor wurden **ALLE Items des Chapters** aus der Datenbank gelöscht
- Der SQL-Query `SELECT * FROM items WHERE round_uuid = '...'` lieferte danach 0 Ergebnisse
- Der Editor zeigte keine Fehlermeldung, sondern meldete "✅ Saved successfully"

### Betroffene Dateien

- `src/infra/utils/SupabaseLoader.ts` - Funktion `saveCompleteItem()`

### Root Cause

Die Funktion `saveCompleteItem()` hatte einen **katastrophalen Fehler** im Error-Handling:

```typescript
// VORHER - GEFÄHRLICHER CODE:
async saveCompleteItem(item: any, chapterId: string) {
  // ...
  
  // Schritt 1: Alte Items löschen
  await this.deleteItemsByRound(item.id); // ✅ Erfolgreich - Items sind WEG
  
  // Schritt 2: Neue Items erstellen
  await this.createItem({ ... }); // ❌ Fehler - KEINE Error-Prüfung!
  
  // Schritt 3: Weitere Items erstellen
  for (const correct of item.correct) {
    await this.createItem({ ... }); // ❌ Fehler - KEINE Error-Prüfung!
  }
  
  for (const distractor of item.distractors) {
    await this.createItem({ ... }); // ❌ Fehler - KEINE Error-Prüfung!
  }
  
  // ❌ KATASTROPHE: Alte Items gelöscht, KEINE neuen Items erstellt
  return { success: true }; // ❌ Meldet fälschlicherweise Erfolg!
}
```

### Ablauf des Bugs

1. **User ändert ein Feld** in einem Item (z.B. ändert ein Wort)
2. **Editor speichert** → `jsonWriter.saveChapter()` wird aufgerufen
3. **SupabaseLoader.saveCompleteItem()** startet:
   - ✅ Löscht alte Items: `DELETE FROM items WHERE round_id = '...'`
   - ❌ Versucht neues Base-Item zu erstellen → **FEHLER** (z.B. NULL constraint, missing field)
   - ❌ Versucht Correct-Items zu erstellen → **FEHLER**
   - ❌ Versucht Distractor-Items zu erstellen → **FEHLER**
   - ❌ Funktion gibt `{ success: true }` zurück (!!!)
4. **Editor zeigt:** "✅ Saved successfully!"
5. **Realität:** Alle Items sind gelöscht, keine neuen Items wurden erstellt

### Warum kein Rollback?

- Supabase-Operationen sind **nicht in einer Transaction**
- Jede `DELETE` und `INSERT` Operation wird sofort committed
- Bei einem Fehler nach dem `DELETE` gibt es **kein Rollback**
- Die alten Items sind **unwiderruflich gelöscht**

---

## Lösung

### Änderungen

1. **Error-Handling hinzugefügt:**
   - Jedes `createItem()` wird auf Erfolg geprüft
   - Bei Fehler wird **sofort** abgebrochen und Fehler zurückgegeben
   - Keine falsch-positiven "success: true" Meldungen mehr

2. **Fehlende Felder hinzugefügt:**
   - `damage` (für Distractors)
   - `collectionorder` (für Correct-Items)

3. **Besseres Logging:**
   - Detaillierte Fehler-Messages
   - Erfolgs-Bestätigung mit Item-Count

### Code nach Fix

```typescript
// NACHHER - SICHERER CODE:
async saveCompleteItem(item: any, chapterId: string) {
  try {
    // Schritt 1: Round update/create
    // ...
    
    // Schritt 2: Alte Items löschen
    const deleteResult = await this.deleteItemsByRound(item.id);
    if (!deleteResult.success) {
      console.error(`❌ Failed to delete old items`);
      return deleteResult; // ✅ Abbruch bei Fehler
    }
    
    // Schritt 3: Base item erstellen
    const baseResult = await this.createItem({ ... });
    if (!baseResult.success) {
      console.error(`❌ Failed to create base item: ${baseResult.error}`);
      return { success: false, error: `Failed to create base item: ${baseResult.error}` };
    }
    
    // Schritt 4: Correct items erstellen
    for (let i = 0; i < item.correct.length; i++) {
      const correctResult = await this.createItem({
        // ... alle Felder inkl. collectionorder
        collectionorder: correct.collectionOrder ?? (i + 1),
      });
      
      if (!correctResult.success) {
        console.error(`❌ Failed to create correct item #${i}: ${correctResult.error}`);
        return { success: false, error: `Failed to create correct item #${i}: ${correctResult.error}` };
      }
    }
    
    // Schritt 5: Distractor items erstellen
    for (let i = 0; i < item.distractors.length; i++) {
      const distractorResult = await this.createItem({
        // ... alle Felder inkl. damage
        damage: distractor.damage,
      });
      
      if (!distractorResult.success) {
        console.error(`❌ Failed to create distractor item #${i}: ${distractorResult.error}`);
        return { success: false, error: `Failed to create distractor item #${i}: ${distractorResult.error}` };
      }
    }
    
    console.log(`✅ Complete item saved: ${item.id} (1 base + ${item.correct.length} correct + ${item.distractors.length} distractors)`);
    return { success: true }; // ✅ Nur bei ECHTEM Erfolg
  } catch (error) {
    console.error('❌ Exception saving complete item:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Verbleibende Risiken

### 🔴 KEIN ROLLBACK bei Partial Failure

**Problem:**
- Wenn das Base-Item erfolgreich erstellt wird, aber ein Correct-Item fehlschlägt:
  - ✅ Base-Item ist in der Datenbank
  - ❌ Correct-Items sind NICHT in der Datenbank
  - ❌ Alte Items sind gelöscht
  - → **Inconsistent State!**

**Beispiel:**

```
VORHER:  1 Base + 3 Correct + 5 Distractor = 9 Items
LÖSCHEN: Alle 9 Items weg
ERSTELLEN: Base ✅, Correct #1 ✅, Correct #2 ❌ FEHLER
NACHHER: 1 Base + 1 Correct = 2 Items (7 Items verloren!)
```

**Lösung (zukünftig):**

1. **Option A: Transaction mit RPC Function**
   ```sql
   CREATE OR REPLACE FUNCTION save_complete_item(...)
   RETURNS void
   LANGUAGE plpgsql
   AS $$
   BEGIN
     DELETE FROM items WHERE round_id = p_round_id;
     INSERT INTO items (...) VALUES (...);
     INSERT INTO items (...) VALUES (...);
     -- Bei Fehler wird ALLES zurückgerollt
   END;
   $$;
   ```

2. **Option B: Erst neue Items erstellen, dann alte löschen**
   ```typescript
   // 1. Neue Items mit temporären IDs erstellen
   await createItem({ round_id: 'TEMP_...' });
   
   // 2. Alte Items löschen
   await deleteItemsByRound(item.id);
   
   // 3. Temporäre IDs auf echte IDs updaten
   await updateItemsRoundId('TEMP_...', item.id);
   ```

3. **Option C: Optimistic Updates + Retry**
   ```typescript
   // Items lokal im Editor cachen
   const backup = [...items];
   
   try {
     await saveAllChapterItems(items, chapterId);
   } catch (error) {
     // Bei Fehler: Rollback im Editor
     setItems(backup);
     // Reload aus Datenbank
     reloadFromDatabase();
   }
   ```

---

## Empfohlene Sofortmaßnahmen

### 1. Datenbank-Backup erstellen

```bash
# Backup VOR jeder Editor-Session
pg_dump -h your-supabase-host -U postgres -d postgres \
  -t public.rounds -t public.items \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Supabase RPC Function für atomare Saves

Siehe `Option A` oben.

### 3. Editor-Warning hinzufügen

```typescript
// In EditorHeader.tsx - vor Save Button
<div style={{ color: 'orange', fontSize: '0.85rem' }}>
  ⚠️ Saving is not transactional. Create backup before editing.
</div>
```

### 4. Auto-Backup im Editor

```typescript
// In EditorLayout.tsx - vor handleSave()
const handleSave = async () => {
  // 1. Backup erstellen
  const backup = await jsonLoader.loadChapter(universeId, themeId, chapterId);
  localStorage.setItem(`backup_${chapterId}_${Date.now()}`, JSON.stringify(backup));
  
  // 2. Speichern
  const result = await jsonWriter.saveChapter(...);
  
  // 3. Bei Fehler: Restore aus Backup
  if (!result.success) {
    await jsonWriter.saveChapter(...backup);
  }
};
```

---

## Testing

### Test Case 1: Erfolgreicher Save

**Setup:**
- Chapter mit 5 Items

**Action:**
- Ändere 1 Item
- Klicke "Save"

**Expected:**
- ✅ 5 Items in Datenbank
- ✅ "Saved successfully" Message

### Test Case 2: Fehler beim Base-Item erstellen

**Setup:**
- Chapter mit 5 Items
- Manipuliere Item so, dass Base-Item NULL constraint verletzt

**Action:**
- Klicke "Save"

**Expected:**
- ❌ Fehler-Message: "Failed to create base item: ..."
- ❌ KEINE Items in Datenbank (alte gelöscht, neue nicht erstellt)
- ⚠️ **BEKANNTES PROBLEM** - Alte Items sind verloren!

### Test Case 3: Fehler beim Correct-Item erstellen

**Setup:**
- Chapter mit 5 Items
- Manipuliere Item so, dass Correct-Item #2 fehlschlägt

**Action:**
- Klicke "Save"

**Expected:**
- ❌ Fehler-Message: "Failed to create correct item #1: ..."
- ⚠️ Partial Save: Base ✅, Correct #0 ✅, Correct #1 ❌
- ⚠️ **BEKANNTES PROBLEM** - Inconsistent State!

---

## Betroffene User

- **Alle Editor-User**, die mit Supabase Content arbeiten
- **Gefahr besteht seit:** Einführung von `SupabaseLoader.saveCompleteItem()`
- **Betroffene Chapters:** Potenziell alle, die im Editor bearbeitet wurden

---

## Wiederherstellung verlorener Daten

Falls Items verloren gegangen sind:

### Option 1: Aus Supabase Backup wiederherstellen

```sql
-- Supabase Point-in-Time Recovery (wenn aktiviert)
-- Kontaktiere Supabase Support für Backup-Restore
```

### Option 2: Aus JSON Files wiederherstellen

```bash
# Wenn du noch JSON-Backups hast
cd public/content/themes/...
# Kopiere JSON files
# Re-import via Python-Script oder Editor
```

### Option 3: Aus Git-History wiederherstellen

```bash
# Wenn JSON files in Git committed waren
git log --all --full-history -- "public/content/themes/**/*.json"
git show <commit-hash>:path/to/file.json
```

---

## Lessons Learned

1. ✅ **IMMER Error-Handling bei DB-Operations**
2. ✅ **Niemals `success: true` zurückgeben ohne echte Prüfung**
3. ✅ **DELETE sollte IMMER transaktional sein**
4. ✅ **Logging ist essentiell für Debugging**
5. ✅ **Testing mit Fehler-Cases ist wichtig**
6. ✅ **Backups BEVOR man Daten löscht**

---

## Changelog

- **2025-12-08**: Bug entdeckt und behoben
  - Error-Handling hinzugefügt
  - `damage` und `collectionorder` Felder hinzugefügt
  - Logging verbessert

---

## Weiterführende Dokumentation

- [docs/EDITOR_SUPABASE_INTEGRATION.md](docs/EDITOR_SUPABASE_INTEGRATION.md)
- [src/infra/utils/SupabaseLoader.ts](src/infra/utils/SupabaseLoader.ts) (Zeile 371-520)
- [src/infra/utils/JSONWriter.ts](src/infra/utils/JSONWriter.ts) (Zeile 65-100)

---

**ACHTUNG:** Das fundamentale Problem (kein Rollback bei Partial Failure) besteht weiterhin!  
**EMPFEHLUNG:** Implementiere Transaction-Support via Supabase RPC Functions.

