# WordRush - Content Creation Guide

**Document Version**: 2.0  
**Last Updated**: December 2024

This guide explains how to create new educational content for WordRush using the **Editor** and **Supabase** database.

**⚠️ Important**: This guide has been updated for Supabase-based content management. JSON files are no longer used - all content is created and managed through the Editor interface.

---

## Table of Contents

1. [Content Structure Overview](#content-structure-overview)
2. [Accessing the Editor](#accessing-the-editor)
3. [Creating a Universe](#creating-a-universe)
4. [Creating a Theme](#creating-a-theme)
5. [Creating Chapters](#creating-chapters)
6. [Creating Items - Quick Method (Text Parser)](#creating-items---quick-method-text-parser)
7. [Creating Items - Advanced Method (Table View)](#creating-items---advanced-method-table-view)
8. [Visual Configuration](#visual-configuration)
9. [Audio Integration](#audio-integration)
10. [Balancing & Difficulty](#balancing--difficulty)
11. [Testing Your Content](#testing-your-content)
12. [Content Best Practices](#content-best-practices)

---

## Content Structure Overview

WordRush organizes content in a **3-level hierarchy**:

```
Universe (e.g., "English", "Psychiatrie")
  └─ Theme (e.g., "ICD-10", "Business Vocabulary")
      └─ Chapter (e.g., "F32_Depression", "Office Terms")
          └─ Item (e.g., "F32_001", "OFFICE_042")
```

**All content is stored in Supabase database** and managed through the **WordRush Editor**.

### Key Benefits

✅ **No JSON Files**: Everything is stored in Supabase - no file management needed  
✅ **Instant Availability**: New content is immediately available in the game  
✅ **Visual Editor**: User-friendly interface for all content creation  
✅ **Text Parser**: Quick bulk creation with simple text format  
✅ **Version Control**: Database tracks all changes automatically  
✅ **Collaboration**: Multiple editors can work simultaneously  

### Editor Features

The Editor provides:
- **Visual UI** for creating and editing content
- **Text Parser** for quick bulk item creation (`b.`, `c.`, `d.`, `l.` format)
- **Table View** for inline editing and bulk operations
- **Detail View** for comprehensive single-item editing
- **Metadata Editor** for Universe/Theme/Chapter settings
- **Direct database integration** - no JSON files needed

---

## Accessing the Editor

1. Navigate to `/editor` in your WordRush application
2. Select a Universe from the sidebar (or create a new one)
3. Select a Theme (or create a new one)
4. Select a Chapter (or create a new one)
5. Start creating Items!

**Note**: New universes, themes, and chapters are automatically saved to Supabase and immediately available in the game.

---

## Creating a Universe

### Using the Editor

1. **Navigate to Editor**: Go to `/editor` in your browser
2. **Click "+" button** next to "Universe" dropdown in the sidebar
3. **Fill in the form**:
   - **ID**: Unique identifier (lowercase, letters/numbers/hyphens/underscores, must start with letter)
     - Example: `psychiatrie`, `englisch`, `mathematik`
     - Used in URLs: `/?universe=psychiatrie`
   - **Name**: Display name shown in UI
     - Example: `Psychiatrie`, `English`, `Mathematics`
   - **Description**: Brief explanation (optional)
   - **Primary Color**: Main theme color (hex)
   - **Accent Color**: Secondary theme color (hex)
   - **Icon**: Emoji (optional, e.g., `🌌`, `🎓`)
4. **Click "Create Universe"**
5. **Universe is automatically selected** and saved to Supabase

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier (lowercase, URL-safe: letters, numbers, hyphens, underscores, must start with letter) |
| `name` | string | ✅ | Display name shown in UI |
| `description` | string | ❌ | Short explanation of universe content |
| `colorPrimary` | string | ✅ | Main color (hex) for UI elements |
| `colorAccent` | string | ✅ | Accent color (hex) for highlights |
| `backgroundGradient` | string[] | ✅ | Auto-generated from primary/accent colors |
| `icon` | string | ❌ | Emoji or icon identifier |
| `language` | string | ✅ | ISO language code (de, en, es, etc.) |

**Note**: Universes are automatically loaded from Supabase. No code changes needed!

---

## Creating a Theme

### Using the Editor

1. **Select a Universe** first (from sidebar dropdown)
2. **Click "+" button** next to "Theme" dropdown
3. **Fill in the form**:
   - **ID**: Unique identifier (lowercase, URL-safe)
     - Example: `icd10`, `business_english`, `f10_f19`
   - **Name**: Display name
     - Example: `ICD-10`, `Business English`, `F10-F19`
   - **Description**: What players will learn (optional)
   - **Primary Color**: Theme color
   - **Accent Color**: Secondary color
   - **Icon**: Emoji (optional)
4. **Click "Create Theme"**
5. **Theme is automatically selected** and saved to Supabase

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier (lowercase, URL-safe) |
| `name` | string | ✅ | Display name shown in UI |
| `description` | string | ❌ | What players will learn |
| `colorPrimary` | string | ✅ | Main theme color (hex) |
| `colorAccent` | string | ✅ | Accent color (hex) |
| `backgroundGradient` | string[] | ✅ | Auto-generated from colors |
| `icon` | string | ❌ | Emoji identifier |
| `language` | string | ✅ | ISO language code |

---

## Creating Chapters

### Using the Editor

1. **Select a Universe and Theme** first
2. **Click "+" button** next to "Chapter" dropdown
3. **Fill in the form**:
   - **ID**: Unique identifier (lowercase, URL-safe)
     - Example: `f32_depression`, `office_terms`, `suizid`
   - **Title**: Display name
     - Example: `F32 Depression`, `Office Terms`, `Suizid`
   - **Primary Color**: Chapter color
   - **Accent Color**: Secondary color
4. **Click "Create Chapter"**
5. **Chapter is automatically selected** and saved to Supabase

### Chapter Configuration (Metadata Editor)

After creating a chapter, you can edit its settings in the **Metadata Editor** panel:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `backgroundGradient` | string[] | ✅ | Colors for chapter background |
| `spawnRate` | number | ✅ | Objects per second (stored in `meta.spawnRate`) |
| `waveDuration` | number | ❌ | Default wave time in seconds (stored in `meta.waveDuration`) |
| `music` | string | ❌ | Music filename (stored in `meta.music`) |
| `particleEffect` | string | ❌ | Particle effect name (stored in `meta.particleEffect`) |

**Note**: Chapter metadata is stored in the `meta` JSONB field in Supabase.


---

## Creating Items - Quick Method (Text Parser)

The **Text Parser** is the fastest way to create multiple items at once. Perfect for bulk content creation!

### Accessing the Text Parser

1. **Select a Chapter** in the Editor
2. **Click "+ New Item"** button (top right of table)
3. **Select "Text Parser"** from the dropdown menu
4. A modal opens with a large text field

### Text Format

Each item follows this simple format:

```
cid. chapter_id
rid. round_id
b. Basewort | base context
c. correct1 | context1 | order | level
c. correct2 | context2 | order | level
d. distractor1 | redirect1 | context1 | level
d. distractor2 | redirect2 | context2 | level
s. source | detail
t. tag1 | tag2 | tag3
l. level
```

**Rules**:
- **`cid.`** = Chapter ID (optional) - for cross-chapter updates, format: `cid. F40.00`
- **`rid.`** = Round ID (optional) - identifies existing item to update, format: `rid. F40.00_001`
- **`b.`** = Base word (starts a new item) - format: `b. Basewort | base context` (context optional)
- **`c.`** = Correct entry - format: `c. word | context | order | level` (order and level optional, default level: 1)
- **`d.`** = Distractor entry - format: `d. word | redirect | context | level` (level optional, default: 1)
- **`s.`** = Source/Detail - format: `s. source | detail` (detail optional, if missing keeps existing)
- **`t.`** = Tags - format: `t. tag1 | tag2 | tag3` (pipe-separated, optional, overrides all tags)
- **`l.`** = Round Level (1-10, optional, applies to all following items until next `l.`)
- **`#`** = Comment line (ignored during parsing)
- **Field separators**: Use **pipe (`|`)** to separate fields, NOT commas
- Field markers are **case-insensitive** (b/B, c/C, d/D, s/S, t/T, l/L)
- Empty lines are ignored
- Multiple items: Each `b.` line starts a new item

**Update vs. Create**:
- **Without `rid.`**: Creates a new item with auto-generated ID
- **With `rid.`**: Updates existing item (matches by `object_type + word`, preserves visual configs)

### Example: Creating a New Item

```
b. Depression | Affektive Störung
c. Freudlosigkeit | Depression zeigt sich durch Freudlosigkeit. | 1 | 2
c. Antriebslosigkeit | Depression zeigt sich durch Antriebslosigkeit. | 2 | 3
d. Wahn | Schizophrenie | Wahn gehört zur Schizophrenie. | 2
d. Manie | Affektive Störungen | Manie gehört zu Affektiven Störungen. | 1
s. ICD-10 F3 | Depressive Episode
t. affektive_störungen | mood | depression
l. 1
```

**Note**: Correct/Distractor level (4th parameter) is optional, defaults to 1.

### Example: Updating an Existing Item

```
cid. F32_Depression
rid. F32_001
b. Depression | Affektive Störung (updated context)
c. Freudlosigkeit | NEW context text | 1 | 3
c. Hoffnungslosigkeit | New correct entry | 3 | 2
d. Wahn | Schizophrenie | Updated context | 3
s. ICD-10 F3.2 | Major Depressive Disorder
t. depression | affective_disorder | mood
l. 2
```

**Update Logic**:
- **Base context**: Can be changed
- **Correct/Distractor**: Matches by `word` → updates `context`, `redirect`, `level`
- **New entries**: Items with new `word` values are added
- **Existing entries**: Preserved if not mentioned (c./d. items are NOT deleted)
- **Source**: If `s.` missing, keeps existing value
- **Tags**: `t.` overrides all existing tags

### Example: Multiple Items

```
# First item about Depression
b. Depression | Affektive Störung
c. Freudlosigkeit | Depression zeigt sich durch Freudlosigkeit. | 1
c. Antriebslosigkeit | Depression zeigt sich durch Antriebslosigkeit. | 2
d. Wahn | Schizophrenie | Wahn gehört zur Schizophrenie.
s. ICD-10 F3
t. affektive_störungen | mood
l. 1

# Second item about Schizophrenia
b. Schizophrenie | Psychotische Störung
c. Wahn | Schizophrenie zeigt sich durch Wahn. | 1
c. Halluzinationen | Schizophrenie zeigt sich durch Halluzinationen. | 2
d. Manie | Affektive Störungen | Manie gehört zu Affektiven Störungen.
s. ICD-10 F2
t. psychose | schizophrenie
l. 2
```

This creates **2 items** with different levels.

### Field Details

#### Base (`b.`)
- **Format**: `b. Basewort | base context`
- **Required**: Yes (one per item)
- **Fields**:
  - `Basewort`: The base word/phrase (required)
  - `base context`: Optional context for the base word (optional)
- **Examples**:
  - `b. Depression` (no context)
  - `b. Depression | Affektive Störung` (with context)

#### Chapter ID (`cid.`)
- **Format**: `cid. chapter_id`
- **Required**: No (optional, for cross-chapter updates)
- **Fields**: Chapter ID (e.g., `F40.00`, `Business_Communication`)
- **Behavior**: Allows updating items in different chapters
- **Examples**:
  - `cid. F40.00` = Update item in F40.00 chapter
  - `cid. Business_Communication` = Update item in Business_Communication chapter

#### Round ID (`rid.`)
- **Format**: `rid. round_id`
- **Required**: No (optional, triggers UPDATE mode instead of CREATE)
- **Fields**: Existing round/item ID (e.g., `F40.00_001`, `BC_023`)
- **Behavior**: Updates existing item instead of creating new one
- **Examples**:
  - `rid. F40.00_001` = Update round F40.00_001
  - `rid. BC_023` = Update round BC_023

#### Correct (`c.`)
- **Format**: `c. word | context | order | level`
- **Required**: At least one per item
- **Fields**:
  - `word`: The correct word/phrase (required)
  - `context`: Explanation text (optional, can be empty)
  - `order`: Collection order number (optional, default: 0)
  - `level`: Item-specific difficulty level 1-10 (optional, default: 1)
- **Examples**:
  - `c. Freudlosigkeit | Depression zeigt sich durch Freudlosigkeit. | 1 | 2` (with level 2)
  - `c. Antriebslosigkeit | | 2 | 3` (no context, level 3)
  - `c. Traurigkeit` (no context, no order, default level 1)

#### Distractor (`d.`)
- **Format**: `d. word | redirect | context | level`
- **Required**: No (but recommended)
- **Fields**:
  - `word`: The distractor word/phrase (required)
  - `redirect`: Where this distractor actually belongs (required)
  - `context`: Explanation text (optional)
  - `level`: Item-specific difficulty level 1-10 (optional, default: 1)
- **Examples**:
  - `d. Wahn | Schizophrenie | Wahn gehört zur Schizophrenie. | 3` (level 3)
  - `d. Manie | Affektive Störungen | | 2` (no context, level 2)

#### Source/Detail (`s.`)
- **Format**: `s. source | detail`
- **Required**: No (optional)
- **Fields**:
  - `source`: Source reference (required if using s. line)
  - `detail`: Additional detail text (optional)
- **Examples**:
  - `s. ICD-10 F3` (source only)
  - `s. ICD-10 F3 | Depressive Episode` (source and detail)

#### Tags (`t.`)
- **Format**: `t. tag1 | tag2 | tag3`
- **Required**: No (optional)
- **Fields**: Pipe-separated list of tags
- **Examples**:
  - `t. affektive_störungen | mood | depression`
  - `t. psychose | schizophrenie`

#### Round Level (`l.`)
- **Format**: `l. number`
- **Required**: No (default: 1)
- **Range**: 1-10
- **Behavior**: Sets **round-level** difficulty for all following items until next `l.` line
- **Note**: This is different from item-level (4th parameter in c./d.)
  - **Round Level (`l.`)**: Overall difficulty of the entire round
  - **Item Level (c./d. 4th param)**: Individual difficulty of each correct/distractor entry
- **Examples**:
  - `l. 1` = Round Level 1 (beginner)
  - `l. 5` = Round Level 5 (intermediate)

#### Comments (`#`)
- **Format**: `# comment text`
- **Required**: No (optional)
- **Behavior**: Lines starting with `#` are completely ignored during parsing
- **Examples**:
  - `# This is a comment`
  - `# First item about Depression`

### Editing Existing Items in Text Parser

You can export existing items to the text parser for quick editing:

**From Table View**:
1. Find the item in the table
2. Click the **📝** button in the Actions column
3. Item opens in text parser with `cid.` and `rid.` pre-filled
4. Edit as needed, click **Save**

**From Detail View**:
1. Open an item in Detail View (click ✏️ on item)
2. Click **📝 Edit in Text Parser** button (top-left)
3. Item opens in text parser with all data
4. Edit as needed, click **Save**

**What you can edit**:
- ✅ Base context (word cannot be changed)
- ✅ Correct/Distractor: context, redirect, order, level
- ✅ Source, Detail, Tags
- ✅ Round Level
- ✅ Add new correct/distractor entries

**What is preserved**:
- 🔒 Visual configs (colors, variants, etc.)
- 🔒 Spawn configs (position, spread, speed)
- 🔒 Base word (cannot be changed)
- 🔒 Existing entries (not deleted if omitted)

### Using the Text Parser

1. **Type your content** in the text field (see format above)
2. **Click "🔍 Prüfen"** to validate:
   - Checks for errors
   - Shows validation results
   - Auto-validates on Enter key (new line)
3. **Click "💾 Speichern"** to create items:
   - Parser runs again (final validation)
   - Items are created with auto-generated IDs
   - Visual/spawn configs are randomized automatically
   - Items are saved to Supabase
   - Modal closes and scrolls to last created item

### Validation Rules

The parser validates:
- ✅ Base word exists
- ✅ At least one correct entry per item
- ✅ Collection order is a number
- ✅ Level is 1-10
- ✅ Distractors have redirect
- ✅ Tags are non-empty (if t. line is used)
- ✅ Source is non-empty (if s. line is used)
- ✅ No syntactically unparseable lines
- ✅ Comment lines (starting with #) are ignored

**Errors are shown** with line numbers and descriptions.

### Auto-Generated Properties

When saving, the parser automatically sets:
- **ID**: `{CHAPTER_PREFIX}_XXX` (e.g., `F32_001`, `F32_002`)
- **Colors**: Random colors for each object
- **Variants**: Random shape variants (hexagon, star, bubble, etc.)
- **Spawn Positions**: Random (0.1-0.9)
- **Spawn Spreads**: Random (0.05-0.1)
- **Speeds**: Random (Correct: 0.9-1.1, Distractor: 1.1-1.4)
- **Published**: `false` (unpublished by default)

You can edit these later in the Table View or Detail View.

---

## Creating Items - Advanced Method (Table View)

For detailed editing, use the **Table View**:

1. **Select a Chapter** in the Editor
2. **Click "+ New Item"** button (without dropdown)
3. **Item is created** with randomized configs
4. **Edit directly in the table**:
   - Click cells to edit inline
   - Use dropdowns for level, variants, etc.
   - Click **💾** button to save individual item
   - Click **🗑️** button to delete item
5. **Or click ✏️** to open Detail View for full editing

### Table View Features

- **Inline Editing**: Click any cell to edit
- **Bulk Actions**: Select multiple items for bulk operations
- **Sorting**: Sort by ID, Level, or Word
- **Search**: Filter items by search term
- **Per-Item Save**: Save individual items without affecting others
- **Visual Feedback**: Color-coded correct (green tint) and distractor (red tint) columns

### Detail View (Full Editing)

For comprehensive editing of a single item:

1. **Click ✏️ button** on any item row in Table View
2. **Detail View opens** with full editing capabilities:
   - **Base Section**: Edit base word, visual config, type
   - **Correct Entries**: Add/remove/edit correct objects
   - **Distractor Entries**: Add/remove/edit distractor objects
   - **Meta Section**: Edit tags, related items, difficulty scaling
   - **Visual Config**: Full control over colors, variants, animations
   - **Spawn Config**: Precise control over positions, spreads, speeds
3. **Click "💾 Save Changes"** to save to Supabase
4. **Click "← Back to Table"** to return to Table View

**Detail View Features**:
- **Add/Remove Entries**: Buttons to add new correct/distractor entries
- **Visual Preview**: See how objects will look
- **Randomize Button**: 🎲 Randomize All visual and spawn configs
- **Full Field Access**: Edit all properties not available in Table View

---

### Item Structure

Each Item represents **one game round** with:
- A **Base** concept (shown at bottom/left of screen)
- **Correct** objects to collect
- **Distractor** objects to avoid/shoot

---

### Base Configuration

```json
"base": {
  "word": "Depression",
  "type": "CoreConcept",
  "image": "depression_icon.png",
  "visual": {
    "tier": 2,
    "size": 1.2,
    "appearance": "bold",
    "color": "#c05060",
    "glow": true,
    "pulsate": true
  }
}
```

**Rules**:
- **Either** `word` **or** `image` must be present (image takes priority)
- `visual` settings apply to both text and images
- `type` is for metadata/categorization only

---

### Correct Objects

Objects the player should **collect** (fly Ship into them):

```json
"correct": [
  {
    "entry": {
      "word": "Freudlosigkeit",
      "type": "Symptom",
      "image": null
    },
    "spawnPosition": 0.5,
    "spawnSpread": 0.05,
    "spawnDelay": 0,
    "speed": 0.9,
    "points": 200,
    "pattern": "linear_inward",
    "hp": 1,
    "collectionOrder": 1,
    "context": "Depression zeigt sich durch Freudlosigkeit.",
    "visual": {
      "color": "#7fe8a2",
      "variant": "bubble",
      "pulsate": true,
      "fontSize": 1.1
    },
    "sound": "bubble_hit_soft.mp3"
  }
]
```

### Correct Fields Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entry.word` | string | ⚠️ | Text to display (required if no image) |
| `entry.image` | string | ⚠️ | Image filename (required if no word) |
| `entry.type` | string | ✅ | Category/type for metadata |
| `spawnPosition` | number | ✅ | Spawn location (0.0-1.0 across screen) |
| `spawnSpread` | number | ✅ | Random variance (e.g., 0.05 = ±5%) |
| `spawnDelay` | number | ❌ | Delay in seconds from round start |
| `speed` | number | ✅ | Speed multiplier (0.5-2.0 typical) |
| `points` | number | ✅ | Points awarded when collected |
| `pattern` | string | ✅ | Movement: `linear_inward`, `zigzag`, `wave`, `seek_center` |
| `hp` | number | ❌ | Hit points (default: 1) |
| `collectionOrder` | number | ❌ | Required collection sequence (1, 2, 3, ...) |
| `context` | string | ✅ | Explanation text shown after collection |
| `visual` | object | ✅ | Visual appearance settings |
| `sound` | string | ❌ | Sound effect filename |

### Numeric Values Explained

#### `spawnPosition` (0.0 - 1.0)
**What it does**: Horizontal spawn location across the screen width.

- **0.1** = minimum
- **0.5** = Center of screen
- **1.0** = Far right edge
- **0.25** = Left quarter
- **0.75** = Right quarter
- **0.9** = max

**Examples**:
- `0.5` = Spawns in center
- `0.3` = Spawns on left side
- `0.7` = Spawns on right side

**Tip**: Distribute objects across the screen (0.2, 0.5, 0.8) for varied gameplay.

---

#### `spawnSpread` (0.0 - 0.2)
**What it does**: Random horizontal variance around `spawnPosition`.

- **0.0** = No randomness (exact position)
- **0.05** = Small variance (±5% of screen width)
- **0.1** = Medium variance (±10% of screen width)
- **0.2** = Large variance (±20% of screen width)

**Examples**:
- `0.05` = Spawns near exact position (precise)
- `0.1` = Moderate randomness (balanced)
- `0.15` = High randomness (unpredictable)

**Tip**: Use 0.05-0.1 for predictable patterns, 0.15+ for chaotic gameplay.

**important**: the closer spawnPowistion to the edge of the screen is the smaller is the capacity to have a big spread
---

#### `speed` (0.5 - 2.0)
**What it does**: Movement speed multiplier (relative to base speed).

- **0.5** = Very slow (easy to track)
- **0.8** = Slow (comfortable)
- **1.0** = Normal speed (standard)
- **1.2** = Fast (challenging)
- **1.5** = Very fast (expert)
- **2.0** = Extremely fast (hardcore)

**Examples**:
- `0.7` = slower than normal (good for difficult objects)
- `1.2` = Faster than normal (the ones fast to read and easy to know)
- `1.5` = Very fast (easy short content)
 

---

#### `points` (50 - 500)
**What it does**: Score awarded when object is collected/destroyed.

**Typical ranges**:
- **50-100** = Low value (easy objects, common distractors)
- **150-200** = Medium value (standard objects)
- **250-300** = High value (important concepts, difficult distractors)
- **400-500** = Very high value (rare, expert-level)

**Examples**:
- `100` = Basic distractor
- `200` = Standard correct object
- `300` = Important concept
- `150` = Quick reaction bonus

**Tip**: Balance points with difficulty - faster/harder objects should reward more.

---

#### `hp` (1 - 5)
**What it does**: Hit points (how many shots needed to destroy).

- **1** = One-shot kill (default, most common)
- **2** = Requires 2 shots (tanky objects)
- **3+** = Very durable (boss-like objects)

**Examples**:
- `1` = Standard object (most common)
- `2` = Stronger distractor (requires 2 laser hits, things that are more important to learn)
- `3` = Boss-level object (rare, high points)

**Tip**: Use HP > 1 only for special,  objects. Most objects should be HP 1.

---

#### `damage` (1 - 3)
**What it does**: Ship health lost when distractor collides with ship.

- **1** = Light damage (common mistake)
- **2** = Medium damage (should have known better)
- **3** = Heavy damage (obvious mistake)

**Examples**:
- `1` = Plausible distractor (forgiving)
- `2` = Medium difficulty distractor
- `3` = Obvious wrong answer (punishing)

**Tip**: Match damage to distractor difficulty - obvious mistakes = higher damage.

--- 
 

#### `collectionOrder` (1, 2, 3, ...)
**What it does**: Required sequence for collecting correct objects (Lernmodus only).
- **1** = Must collect first
- **2** = Must collect second (after 1)
- **3** = Must collect third (after 1 and 2)
- **undefined** = No order required 

**Examples**:
- `1, 2, 3` = Sequential learning (step-by-step)
- `undefined` = Free collection (any order)

**Tip**: Use for teaching sequences (e.g., "First learn A, then B, then C" e.g. stages of Grief).

---

### Distractor Objects

Objects the player should **shoot** (not collect):

```json
"distractors": [
  {
    "entry": {
      "word": "Wahn",
      "type": "Symptom"
    },
    "spawnPosition": 0.3,
    "spawnSpread": 0.05,
    "speed": 1.2,
    "points": 150,
    "hp": 2,
    "damage": 1,
    "redirect": "Schizophrenie",
    "context": "Wahn gehört zu Schizophrenie.",
    "visual": {
      "color": "#ff6666",
      "variant": "spike",
      "shake": true,
      "fontSize": 1.0
    },
    "sound": "explosion_minor.mp3"
  }
]
```

### Distractor Fields Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entry.word` | string | ⚠️ | Text to display |
| `entry.image` | string | ⚠️ | Image filename |
| `spawnPosition` | number | ✅ | Spawn location (0.0-1.0) |
| `spawnSpread` | number | ✅ | Random variance |
| `spawnDelay` | number | ❌ | Delay in seconds |
| `speed` | number | ✅ | Speed multiplier |
| `points` | number | ✅ | Points awarded when destroyed |
| `hp` | number | ❌ | Hit points (default: 1) |
| `damage` | number | ✅ | Damage dealt to Ship on collision |
| `redirect` | string | ✅ | Correct category hint (e.g., "Schizophrenia") |
| `context` | string | ✅ | Explanation text |
| `visual` | object | ✅ | Visual appearance |
| `sound` | string | ❌ | Sound effect |

**Note**: Numeric values (`spawnPosition`, `spawnSpread`, `speed`, `points`, `hp`, `damage`) work the same as for Correct objects. See "Numeric Values Explained" section above for detailed explanations.

**Important**: The user should not be able to tell which one is a distractor and which one is correct.

---

### Item Meta

```json
"meta": {
  "source": "ICD-10 F3",
  "tags": ["affektive_störungen", "mood"],
  "related": ["F32_002", "F30_001"],
  "difficultyScaling": {
    "speedMultiplierPerReplay": 1.05,
    "colorContrastFade": true,
    "angleVariance": 0.3
  }
}
```

**Difficulty Scaling**:
- `speedMultiplierPerReplay`: Speed increase per replay (1.05 = +5%)
- `colorContrastFade`: Reduce color distinction as player improves?
- `angleVariance`: Random angle deviation for movement (0.0-1.0)

### Difficulty Scaling Explained

#### `speedMultiplierPerReplay` (1.0 - 1.1)
**What it does**: Speed multiplier applied each time player replays the item.

- **1.0** = No speed increase (same difficulty)
- **1.03** = +3% speed per replay (gentle increase)
- **1.05** = +5% speed per replay (standard, recommended)
- **1.08** = +8% speed per replay (aggressive)
- **1.1** = +10% speed per replay (very challenging)

**Examples**:
- First play: Speed 1.0
- Second play: Speed 1.05 (5% faster)
- Third play: Speed 1.1025 (10.25% faster)
- Fourth play: Speed 1.1576 (15.76% faster)

**Tip**: Use 1.03-1.05 for gradual learning curve, 1.08+ for expert content.

---

#### `colorContrastFade` (Boolean)
**What it does**: Reduces color distinction between correct/distractor as player improves.

- **false** = Colors always distinct (easier)
- **true** = Colors fade to similar as player masters content (harder)

**Use when**:
- ✅ Player should learn to distinguish by meaning, not color
- ✅ Advanced difficulty progression
- ✅ Removing visual crutches

**Avoid when**:
- ❌ Beginner content (needs visual support)
- ❌ Learning mode (colors are teaching tool)

**Example**: `"colorContrastFade": true` for expert-level content

---

#### `angleVariance` (0.0 - 1.0)
**What it does**: Random angle deviation for object movement (unpredictability).

- **0.0** = No variance (straight, predictable)
- **0.2** = Small variance (slightly unpredictable)
- **0.3** = Medium variance (moderate unpredictability)
- **0.5** = Large variance (very unpredictable)
- **1.0** = Maximum variance (chaotic)

**Examples**:
- `0.0` = Objects move straight down (easy to predict)
- `0.3` = Objects drift slightly left/right (moderate challenge)
- `0.5` = Objects move erratically (expert level)

**Tip**: Use 0.0-0.2 for learning, 0.3-0.5 for challenge.

---

## Visual Configuration

### Common Visual Properties

```json
"visual": {
  "color": "#ff6666",
  "variant": "bubble",
  "pulsate": true,
  "shake": false,
  "glow": false,
  "fontSize": 1.1,
  "collisionRadius": 40
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | string | "#ffffff" | Hex color code (e.g., "#FF5722", "#7fe8a2") |
| `variant` | string | "default" | Shape style (see "Available Variants" below) |
| `pulsate` | boolean | false | Breathing/pulsing animation (grows/shrinks) |
| `shake` | boolean | false | Shaking animation (for threats/warnings) |
| `glow` | boolean | false | Glowing halo effect (for important objects) |
| `fontSize` | number | 1.0 | Font size multiplier (1.0 = normal, 1.5 = 50% larger) |
| `collisionRadius` | number | 40 | Collision detection radius in pixels (optional) |

---

### Available Variants

The `variant` property determines the **shape** of the object. Choose based on the **concept being taught** or visual style, **NOT** to differentiate between correct and distractor objects.

**⚠️ IMPORTANT**: Variants should be **mixed randomly** between correct and distractor objects. Players must learn by **meaning**, not by visual appearance. Never use shape, color, or any visual property to distinguish correct from distractors.

---

#### `"bubble"` 🫧
**Appearance**: Soft, rounded circle with glossy highlight and soft border.

**Best for**:
- Soft, organic concepts (e.g., "water", "cloud", "bubble")
- Fluid, flowing concepts
- Gentle, rounded themes

**Visual style**: Smooth, rounded, friendly

**Example use**: Words related to liquids, soft materials, organic shapes

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"spike"` ⚡
**Appearance**: Aggressive 4-pointed star/diamond with sharp edges.

**Best for**:
- Sharp, angular concepts (e.g., "knife", "crystal", "thorn")
- Technical, precise terms
- Aggressive, energetic themes

**Visual style**: Sharp, angular, dynamic

**Example use**: Words related to sharp objects, technical terms, angular concepts

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"square"` ⬜
**Appearance**: Geometric square with clean edges and border.

**Best for**:
- Structured, organized concepts (e.g., "building", "box", "frame")
- Technical, systematic terms
- Balanced, geometric themes

**Visual style**: Clean, geometric, neutral

**Example use**: Words related to structures, containers, organized concepts

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"hexagon"` ⬡
**Appearance**: 6-sided hexagon with gradient overlay and border.

**Best for**:
- Modern, technical concepts (e.g., "honeycomb", "crystal", "network")
- Scientific, precise terms
- Balanced, professional themes

**Visual style**: Modern, geometric, distinctive

**Example use**: Words related to science, technology, structured patterns

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"diamond"` 💎
**Appearance**: 4-sided rotated diamond with shine effect and yellow border.

**Best for**:
- Precious, valuable concepts (e.g., "diamond", "gem", "treasure")
- Eye-catching, special terms
- Premium, high-value themes

**Visual style**: Precious, shiny, attention-grabbing

**Example use**: Words related to valuable items, special concepts, premium themes

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"star"` ⭐
**Appearance**: 5-pointed star with glow effect and yellow border.

**Best for**:
- Celestial, bright concepts (e.g., "star", "light", "sparkle")
- Celebratory, special terms
- Highlighted, important themes

**Visual style**: Bright, glowing, special

**Example use**: Words related to light, celebration, special concepts

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

#### `"default"` (or omitted) ⭕
**Appearance**: Simple circle with white border.

**Best for**:
- Standard, neutral concepts
- When no specific style matches the concept
- Simple, clean appearance

**Visual style**: Simple, clean, neutral

**Example use**: Default fallback, neutral concepts, when other variants don't fit

**⚠️ Use for BOTH correct AND distractor objects** - mix with other variants

---

### Visual Property Guidelines

#### `color` (Hex Color Code)
**Format**: `"#RRGGBB"` (e.g., `"#FF5722"`, `"#7fe8a2"`)

**Tips**:
- Use theme colors for consistency
- High contrast for readability
- Match color to concept theme (e.g., blue for water, red for fire)

**⚠️ IMPORTANT**: Do NOT use color to distinguish correct from distractors. Colors should be mixed randomly between correct and distractor objects. Players must learn by meaning, not by color.

**Examples**:
- `"#FF5722"` = Orange-red (warm, attention-grabbing)
- `"#7fe8a2"` = Green (nature, organic concepts)
- `"#85C1E2"` = Light blue (water, sky, calm concepts)

**Note**: In Lernmodus, correct objects are automatically colored green for learning support, but in Shooter mode, colors should be mixed randomly.

---

#### `pulsate` (Boolean)
**Effect**: Object grows and shrinks rhythmically (breathing animation).

**Use when**:
- ✅ Important concepts that need attention
- ✅ Concepts that benefit from emphasis
- ✅ Special, highlighted terms

**Avoid when**:
- ❌ Too many objects pulsating (visual clutter)
- ❌ Using pulsate to distinguish correct from distractors (players must learn by meaning)

**⚠️ IMPORTANT**: Use pulsate for BOTH correct AND distractor objects - mix randomly

**Example**: `"pulsate": true` for key learning concepts

---

#### `shake` (Boolean)
**Effect**: Object shakes/vibrates horizontally.

**Use when**:
- ✅ Concepts that benefit from dynamic movement
- ✅ Energetic, active terms
- ✅ Concepts that match "shaking" theme

**Avoid when**:
- ❌ Using shake to distinguish correct from distractors (players must learn by meaning)
- ❌ Too many shaking objects (motion sickness, visual clutter)

**⚠️ IMPORTANT**: Use shake for BOTH correct AND distractor objects - mix randomly

**Example**: `"shake": true` for energetic, dynamic concepts

---

#### `glow` (Boolean)
**Effect**: Multi-layer glowing halo around object.

**Use when**:
- ✅ Very important concepts
- ✅ Special, highlighted terms
- ✅ Concepts that benefit from emphasis

**Avoid when**:
- ❌ Every object (loses impact)
- ❌ Low-end devices (performance)
- ❌ Using glow to distinguish correct from distractors (players must learn by meaning)

**⚠️ IMPORTANT**: Use glow for BOTH correct AND distractor objects - mix randomly

**Example**: `"glow": true` for premium objects

---

#### `fontSize` (Number)
**Range**: 0.8 - 1.5 (recommended)

**What it does**: Multiplies base font size.

- **0.8** = 20% smaller (for long words)
- **1.0** = Normal size (default)
- **1.1** = 10% larger (slightly emphasized)
- **1.2** = 20% larger (important)
- **1.5** = 50% larger (very important, use sparingly only for very  short words)

**Tips**:
- Use 1.0-1.2 for most objects
- Use 0.8-0.9 for very long words (e.g., "Schizophrenie")
- Use 1.3+ only for special emphasis and short ones

**Example**: `"fontSize": 1.1` for slightly larger text

---

#### `collisionRadius` (Number, Optional)
**Range**: 20 - 60 pixels (typical)

**What it does**: Collision detection size (how close player needs to be).

- **20-30** = Small hitbox (precise, challenging)
- **40** = Default (balanced)
- **50-60** = Large hitbox (forgiving, easier)

**Tip**: Larger radius = easier to collect, but may feel "unfair" if too large.

**Example**: `"collisionRadius": 45` for slightly easier collection





















## Balancing & Difficulty

### Spawn Rate Guidelines

| Difficulty | Spawn Rate | Objects/Wave | Description |
|------------|------------|--------------|-------------|
| Easy | 1.0-1.5 | 2-4 | Beginner friendly |
| Medium | 1.5-2.0 | 3-6 | Standard gameplay |
| Hard | 2.0-2.5 | 6-10 | Challenging |
| Expert | 2.5-3.0 | 8-15 | Very difficult |

### Speed Guidelines

| Speed | Multiplier | Description |
|-------|------------|-------------|
| Slow | 0.5-0.8 | Easy to track |
| Normal | 0.9-1.1 | Standard |
| Fast | 1.2-1.5 | Requires quick reactions |
| Very Fast | 1.6-2.0 | Expert players only |

### Point Distribution

- **Correct objects**: 100-300 points (importance-based)
- **Distractors**: 100-200 points (difficulty-based)
- **Reaction bonus**: Up to +50% for quick reactions
- **Collection order bonus**: x2 score multiplier

### Health & Damage

- **Ship starting health**: 10 (from `config.json`)
- **Typical distractor damage**: 1-3 per collision (if the distractor is tricky to reveal: 1; if you can reveal medium: 2; if you have to be stupid to think thats a correct one to collect: 3) 

---

## Testing Your Content

### Validation Checklist

Before releasing content, verify:

#### Database & Editor
- [ ] All items saved successfully to Supabase
- [ ] No console errors when loading content
- [ ] Items appear correctly in Table View
- [ ] IDs are unique and follow naming convention (`{PREFIX}_XXX`)

#### Content Quality
- [ ] All text is spelled correctly
- [ ] Context explanations are clear and accurate
- [ ] Related items are properly linked
- [ ] Tags are relevant and consistent

#### Audio/Visual Assets
- [ ] All referenced audio files exist (if using audio)
- [ ] All referenced images exist (if using images)
- [ ] Audio files are < 500KB each
- [ ] Images are optimized (WebP or PNG)

#### Editor Workflow
- [ ] Text Parser validates correctly
- [ ] Items can be edited in Table View
- [ ] Items can be edited in Detail View
- [ ] Save buttons work correctly
- [ ] Items persist after page reload

#### Gameplay Balance
- [ ] Round is completable in waveDuration time
- [ ] Spawn rate doesn't overwhelm screen
- [ ] Difficulty feels appropriate for target audience
- [ ] Lernmodus provides enough visual support

#### Learning Effectiveness
- [ ] Correct/distractor distinction is clear (by meaning, not visuals!)
- [ ] Context text teaches the concept
- [ ] redirect hints are helpful, not confusing
- [ ] collectionOrder makes logical sense (if used)

### Testing in Game

1. **Click "▶️ Play Chapter"** button in Editor header
2. **Game opens in new window** with your content
3. **Test gameplay**:
   - Collect correct objects
   - Shoot distractors
   - Verify context text appears
   - Check redirect hints work
   - Test collection order (if used)
4. **Verify visual configs**:
   - Colors display correctly
   - Variants render properly
   - Animations work (pulsate, shake, glow)
   - Font sizes are readable

--- 

## Content Best Practices

### 1. Pedagogical Design

**Clear Learning Goals**:
- Each item should teach ONE concept
- Context text should explain WHY, not just WHAT
- Build from simple to complex within a chapter

**Spaced Repetition**:
- Mix-Mode naturally implements spaced repetition
- Related items should reference each other
- Use `meta.related` to create learning paths

**Immediate Feedback**:
- Context text appears instantly on interaction
- redirect hints guide correct understanding
- Visual feedback (glow, pulsate) draws attention

---

### 2. Content Organization

**Universe = Subject Area**:
- Broad topics (English, Math, Psychology)
- Shared visual theme and style
- 3-8 themes per universe

**Theme = Course Module**:
- Coherent subtopic (ICD-10, Business Vocabulary)
- 5-10 chapters per theme
- Clear prerequisite structure

**Chapter = Lesson**:
- Single focus (Depression, Office Terms)
- 10-20 items per chapter
- Progressive difficulty

**Item = Quiz Question**:
- One base concept + related correct/distractors
- 3-6 correct objects
- 2-5 distractor objects

---

### 3. Writing Guidelines

**Base Concepts**:
- 1-5 words maximum
- Core term, can also be a question
- Example: "Depression" not "Depressive Episode" or "Phasen der suizidalen Entwicklung nach Pöldinger"

**Correct Objects**:
- Related facts, symptoms, examples
- Clearly correct, no ambiguity
- Example: "Freudlosigkeit" for "Depression"
- Example for Pöldinger with 3 corrects with collectionOrder: "1 Erwägung · 2. Ambivalenz · 3. Entschlossenheit"
- 2 words max

**Distractors**:
- Plausible but incorrect
- From related but different category
- Example: "Wahn" (belongs to Schizophrenia, not Depression)
- 2 words max

**Context Text**:
- One complete sentence
- Explains relationship clearly
- Example for correct: "Depression zeigt sich durch Freudlosigkeit."
- Example for distractor: "Wahn gehört zur Schizophrenie."
- 6 words max

**Redirect Hints**:
- Short category name
- Where distractor actually belongs
- Example: "Schizophrenie" for "Wahn"
- Example for languages: "Huhn" for the distractor-word "Chicken"
- 2 words max (should not be much larger than the distractor:word)

---

### 4. Visual Design

**Consistency**:
- Use theme colors throughout chapter
- Similar objects should look similar
- Maintain visual hierarchy (tier system)

**Clarity**:
- Readable font sizes (fontSize: 1.0-1.5)
- High contrast against background
- Avoid cluttered visuals

**Emotion**:
- Pulsate for important concepts
- Shake for threats/warnings
- Glow for rewards/achievements

---

### 5. Difficulty Progression

**Within Chapter**:
```
Items 1-3:   Easy (slow speed, few objects)
Items 4-7:   Medium (normal speed, moderate objects)
Items 8-12:  Hard (faster, more objects)
Items 13-15: Expert (use collectionOrder, complex patterns)
```

**Adaptive Scaling**:
- Set `speedMultiplierPerReplay`: 1.03-1.08 for gradual increase
- Use `colorContrastFade: true` for trained items
- Higher `angleVariance` for unpredictable movement

---

### 6. Common Mistakes to Avoid

❌ **Too many objects per wave**
- Causes visual clutter and frustration
- Max 8-10 objects on screen simultaneously

❌ **Ambiguous distractors**
- Players should understand WHY distractor is wrong
- redirect hint should clarify the distinction
- sometimes similiar distractors distract just right and funny and train accuracy

❌ **Inconsistent difficulty**
- Don't spike difficulty suddenly
- Gradually increase challenge
- Indicate difficulty with "level"

❌ **Missing context**
- Every interaction should teach something
- Empty context text = missed learning opportunity

❌ **Wrong spawn timing**
- Don't spawn all objects at once
- Spread spawns across waveDuration

❌ **Unbalanced points**
- More difficult actions should reward more points
- Fast-moving distractors > slow distractors

---

## Example: Creating "Solar System" Universe

Let's create a complete example using the Editor:

### Step 1: Create Universe

1. Go to `/editor`
2. Click **"+"** next to "Universe" dropdown
3. Fill in:
   - **ID**: `solar_system`
   - **Name**: `Solar System`
   - **Description**: `Learn about planets, stars, and space exploration`
   - **Primary Color**: `#4a90e2`
   - **Accent Color**: `#f39c12`
   - **Icon**: `🌍`
4. Click **"Create Universe"**
5. Universe is automatically selected

### Step 2: Create Theme

1. Click **"+"** next to "Theme" dropdown
2. Fill in:
   - **ID**: `planets`
   - **Name**: `Planets of the Solar System`
   - **Description**: `Learn facts about the 8 planets`
   - **Primary Color**: `#3498db`
   - **Accent Color**: `#e74c3c`
   - **Icon**: `🪐`
3. Click **"Create Theme"**
4. Theme is automatically selected

### Step 3: Create Chapter

1. Click **"+"** next to "Chapter" dropdown
2. Fill in:
   - **ID**: `inner_planets`
   - **Title**: `Inner Planets`
   - **Primary Color**: `#ff6b35`
   - **Accent Color**: `#f7931e`
3. Click **"Create Chapter"**
4. Chapter is automatically selected

### Step 4: Create Items with Text Parser

1. Click **"+ New Item"** → **"Text Parser"**
2. Enter this text:

```
# Earth - our home planet
b. Earth | Third planet from the Sun
c. Water | Earth is the only planet with liquid water on its surface. | 1
c. Life | Earth is the only known planet to support life. | 2
c. Atmosphere | Earth's atmosphere protects life and retains heat. | 3
d. Rings | Saturn | Rings are a feature of Saturn, not Earth.
d. Great Red Spot | Jupiter | The Great Red Spot is a storm on Jupiter.
s. NASA | Terrestrial planet
t. planets | earth | solar_system
l. 1

# Mars - the red planet
b. Mars | Fourth planet from the Sun
c. Red Planet | Mars is known as the Red Planet due to iron oxide. | 1
c. Olympus Mons | Mars has the largest volcano in the solar system. | 2
d. Great Red Spot | Jupiter | The Great Red Spot is on Jupiter, not Mars.
d. Rings | Saturn | Rings belong to Saturn, not Mars.
s. NASA | Terrestrial planet
t. planets | mars | solar_system
l. 1
```

3. Click **"🔍 Prüfen"** to validate
4. Click **"💾 Speichern"** to create both items
5. Items are automatically created with IDs `INN_001` and `INN_002`

### Step 5: Edit Chapter Settings (Optional)

1. In the **Metadata Editor** panel, edit chapter settings:
   - **Background Gradient**: `["#ff6b35", "#f7931e"]`
   - **Spawn Rate**: `1.5`
   - **Wave Duration**: `8`
   - **Music**: `inner_planets.mp3` (if available)
   - **Particle Effect**: `heat_waves` (if available)
2. Click **"💾 Save Chapter Settings"**

### Step 6: Fine-Tune Items (Optional)

1. In **Table View**, click **✏️** on any item to open Detail View
2. Adjust visual configs, spawn positions, speeds, etc.
3. Click **"💾 Save Changes"** to save individual item

### Result

You now have:
- ✅ Universe "Solar System" in Supabase
- ✅ Theme "Planets" linked to universe
- ✅ Chapter "Inner Planets" with 2 items
- ✅ All content immediately available in the game!

**Test it**: Click **"▶️ Play Chapter"** button to test your content!

--- 