# Integrated Content Guide 1.0 (StreetSmart Study + WordRush)

## 0) Ziel

Ein einziges Authoring-Format erzeugt:

- **StreetSmart Study**: Lesen + Gap + Multi-Select-Quiz + Quelle (optional)
- **WordRush**: nur wenn „wordrush_ready“ erfüllt (siehe g. & Gate)

---

## 1) Einheit & Felder (Authoring-Format)

**Ein EntrySet = genau ein b.-Block** (plus optionale c/d/s/g/l).

**Syntax (Text-Parser / Copy-Paste):**

- **cid.** Kapitel-ID (optional; wenn System Kapitel eindeutig kennt, wird cid. automatisch vorangestellt)
- **b.** Titel | **Langtext (Markdown) 5 Sätze ca.**
- **c.** Quiz-Option korrekt | **Erklärung (Markdown erlaubt)**
- **d.** Quiz-Option falsch | **Redirect** | **Erklärung (Markdown erlaubt)**
- **a.** Artikel zum Thema das die Konzepte einwebt.  (Markdown explizit gewünscht inkl überschriften)
- **g.** Game-Qualifikation: s / r / rs (wenn leer, DB schreibt rs)
- **l.** Level 1–9
- **s.** Quelle-URL | Originaltext (Langtext)
- **t.** tags zum Inhalt, kurze Tags damit man zwischen den elementen hin und herspringen kann, tags vorher einmal konzeptionell überlegen um dann später gleichförmig zu verteilen.
- **#** Kommentare die nicht vom System gelesen werden aber für den Redakteur wichtig sind.

**Zeilenumbrüche / Listen im Langtext**

- Verwende im Text **/N** für Umbruch.
- Verwende * für Aufzählungen.
- Markdown: **fett** und *kursiv* erlaubt.

---

## 2) Semantik: Was wird wofür genutzt?

### 2.1 StreetSmart Study (immer möglich)

- **b.word** = Überschrift
- **b.context** = **Study-Haupttext** (darf lang sein; /N, * Listen, **fett**, *kursiv*)
- **fett** in b.context markiert **Kernkonzepte**:
  - werden zu **Gap-Lücken**
  - speisen die **korrekten Quizoptionen (c.word)** (Multi-Select)
- **s.** = Quelle: wenn s.word eine URL ist, ist es ein klickbarer Link; s.context ist der Originaltext.

### 2.2 WordRush (nur wenn ready)

- **b.word** wird zur Base im Shooter.
- **c.word** sind Collectables (correct), **d.word** sind Shootables (distractor).
- **Wichtig**: WordRush braucht kurze spawnbare word-Felder.

---

## 3) Quiz-Regeln (StreetSmart = Multi-Select)

- Es dürfen **mehrere c korrekt** sein.
- **Goldene Regel:** c.word muss aus den **fett markierten Kernkonzepten** in b.context stammen (oder eine bewusst definierte Kurzform davon).
- **d.word** muss plausibel sein, aber **kein Kernkonzept aus b.context**.

---

## 4) Gap-Regel (StreetSmart)

- Alles was in b.context **fett** ist (**...**) wird als Lücke interpretiert.
- Empfehlung: Markiere nur Begriffe, die **eindeutig** sind (keine Halbsätze, keine „oder“-Ketten).

---

## 5) Game-Zuordnung über g. (inkl. DB-default rs)

### 5.1 DB-Default

- Wenn g. fehlt/leer: DB schreibt rs.

### 5.2 „wordrush_ready“-Gate (verhindert kaputtes WordRush trotz rs)

WordRush darf **nur aktiv** sein, wenn:

1. **Genug Material:** mindestens 2× c. und 2× d.
2. **Spawnbarkeit:** jedes word-Feld (links vom |) erfüllt:
   - **max 3 Wörter**
   - kein /N, keine Listenmarker *, kein Markdown im word
3. **Distractor vollständig:** jedes d. hat Redirect + Erklärung.

**Interpretation:**

- g=rs + wordrush_ready=false ⇒ EntrySet wird **nur StreetSmart** gespielt (WordRush gesperrt/ausgegraut).
- g=s ⇒ immer nur StreetSmart.
- g=r ⇒ nur WordRush (nur nutzen, wenn ready).
- g=rs ⇒ beide (wenn ready).

---

## 6) 5-Schritt-Logik (für KI/LLM) – robust gegen Distractor-Verwirrung

### Schritt 1: b. schreiben (Langtext als Master)

- Schreibe **b.word** kurz (Überschrift).
- Schreibe **b.context** als klaren Study-Text:
  - nutze **/N** als Umbruch
  - nutze * für Aufzählungen
  - markiere Kernkonzepte als **fett** (Gap + Quizquelle)
  - *kursiv* für Hervorhebungen/Begriffsnuancen ok

### Schritt 2: c. erzeugen (Extraktion + Explikation)

- Erzeuge **c.word** aus den **fett**-Kernkonzepten.
- **Wenn ein Kernkonzept zu lang ist:** erlaube eine **kurze, spawnbare Form** als c.word (z. B. „verminderter Antrieb“ statt „verminderte Antriebskraft in Alltagssituationen“).
- **c.context** erklärt das Konzept (Study darf lang; für WordRush optional zusätzlich eine kurze erste Zeile).

### Schritt 3: d.word erzeugen (nur falsche Optionen)

- Erzeuge pro 1–2 c mindestens einen **d.word**, der **verwechselbar** ist (gleiche Domäne/nahe Kategorie).
- Verbot: **d.word** darf **nicht** identisch mit einem c.word sein und darf **kein fett markiertes Kernkonzept** aus b.context sein.

### Schritt 4: d.redirect setzen (Einordnung)

- Für jedes **d.word**: setze d.redirect als **korrekte Zielkategorie** (1–3 Wörter), z. B. anderes Störungsbild / anderer Chapter / anderes Symptomcluster.

### Schritt 5: d.context schreiben (didaktischer Mehrwert)

**d.context** muss immer liefern:

1. **Was ist das?** (Kurzdefinition)
2. **Warum nicht b?** (Abgrenzungskriterium)
3. **Wo gehört es hin?** (typisch bei redirect, wann/warum relevant)

---

## 7) Kürzungs-Regeln (damit es nicht redundant/inkonsistent wird)

- In diesem integrierten Guide werden **keine** Visual-/Spawn-Parameter erklärt (Editor randomisiert das; gehört in „Advanced“).
- Es gibt **nur eine** Stelle für Syntax (Abschnitt 1).
- Es gibt **nur eine** Stelle für „WordRush-ready“ (Abschnitt 5.2).
- Kontext-Längen sind **modusabhängig**:
  - Study: lang erlaubt (b/c/d Erklärungen)
  - WordRush: word kurz, Erklärung möglichst kurz/erste Zeile kurz

---

## 8) Minimalbeispiele

### A) Nur Study (kein Quiz, WordRush gesperrt obwohl DB rs)

```
cid. chapter_f32
b. Depressive Episode (F32) | **Hauptsymptome:**/N* **Gedrückte Stimmung**/N* **Interessenverlust**/N* **Verminderter Antrieb**/N/N* *Dauer:* mindestens 2 Wochen.
g.
l. 2
s. https://example.org | Originaltext …
```

### B) Study + Multi-Quiz (wordrush_ready nur wenn Wörter kurz)

```
cid. chapter_f32
b. Depressive Episode (F32) | **Hauptsymptome:**/N* **Gedrückte Stimmung**/N* **Interessenverlust**/N* **Antriebsmangel**
c. Gedrückte Stimmung | Affekt ↓, tageszeitlich schwankend möglich.
c. Interessenverlust | Anhedonie: Belohnungssystem reagiert kaum.
c. Antriebsmangel | Psychomotorik ↓, Initiativkraft ↓.
d. Ideenflucht | Manie | Beschleunigtes Denken ↔ Manie, nicht F32.
d. Wahn | Psychose | Realitätsverlust typisch für psychotische Störungen.
g.
l. 3
```

---
