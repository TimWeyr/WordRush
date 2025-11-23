# WordRush - Content Creation Guide

**Document Version**: 1.0  
**Last Updated**: November 16, 2024

This guide explains how to create new educational content for WordRush.

---

## Table of Contents

1. [Content Structure Overview](#content-structure-overview)
2. [Creating a Universe](#creating-a-universe)
3. [Creating a Theme](#creating-a-theme)
4. [Creating Chapters & Items](#creating-chapters--items)
5. [Visual Configuration](#visual-configuration)
6. [Audio Integration](#audio-integration)
7. [Balancing & Difficulty](#balancing--difficulty)
8. [Testing Your Content](#testing-your-content)
9. [Content Best Practices](#content-best-practices)

---

## Content Structure Overview

WordRush organizes content in a **3-level hierarchy**:

```
Universe (e.g., "English", "Psychiatrie")
  └─ Theme (e.g., "ICD-10", "Business Vocabulary")
      └─ Chapter (e.g., "F32_Depression", "Office Terms")
          └─ Item (e.g., "F32_001", "OFFICE_042")
```

Each level is defined by JSON files:

- **Universe**: `universe.<id>.json` (e.g., `universe.englisch.json`)
- **Theme**: `themes.<theme_id>.json` inside Universe folder
- **Chapter**: `<chapter_id>.json` inside Theme folder (contains array of Items)

---

## Creating a Universe

### Step 1: Create Universe JSON

**Location**: `/content/themes/universe.<your_id>.json`

**Template**:

```json
{
  "id": "your_universe_id",
  "name": "Your Universe Name",
  "description": "A brief description of what this universe teaches",
  "colorPrimary": "#4a90e2",
  "colorAccent": "#7bb3f0",
  "backgroundGradient": ["#1a3a5f", "#2d5a8a"],
  "icon": "🎓",
  "available": true,
  "language": "de",
  "music": {
    "theme": "your_universe_theme.mp3",
    "volume": 0.6
  },
  "particleEffect": "default_particles",
  "shipSkin": "default_ship",
  "laserColor": "#4a90e2",
  "themes": [
    "theme_id_1",
    "theme_id_2"
  ],
  "meta": {
    "author": "Your Name",
    "version": "1.0",
    "created": "2025-11-16"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique identifier (lowercase, no spaces) |
| `name` | string | ✅ | Display name shown in UI |
| `description` | string | ✅ | Short explanation of universe content |
| `colorPrimary` | string | ✅ | Main color (hex) for UI elements |
| `colorAccent` | string | ✅ | Accent color (hex) for highlights |
| `backgroundGradient` | string[] | ✅ | 2+ colors for gradient background |
| `icon` | string | ✅ | Emoji or icon identifier |
| `available` | boolean | ✅ | Show in Galaxy Hub? (false = coming soon) |
| `language` | string | ✅ | ISO language code (de, en, es, etc.) |
| `music.theme` | string | ❌ | Background music filename |
| `music.volume` | number | ❌ | Music volume (0.0-1.0) |
| `particleEffect` | string | ❌ | Particle effect identifier |
| `shipSkin` | string | ❌ | Ship graphics variant |
| `laserColor` | string | ❌ | Laser beam color (hex) |
| `themes` | string[] | ✅ | Array of theme IDs in this universe |

### Step 2: Create Universe Folder

**Location**: `/content/themes/<your_universe_id>/`

This folder will contain all Theme JSON files for your universe.

---

## Creating a Theme

### Step 1: Create Theme JSON

**Location**: `/content/themes/<universe_id>/themes.<theme_id>.json`

**Template**:

```json
{
  "id": "your_theme_id",
  "name": "Your Theme Name",
  "description": "What will players learn in this theme?",
  "colorPrimary": "#6b4bff",
  "colorAccent": "#a58dff",
  "backgroundGradient": ["#110c33", "#221a66"],
  "maxLevels": 10,
  "icon": "🧠",
  "shipSkin": "/assets/ships/default_ship.svg",
  "relatedPackages": ["prerequisite_theme_id"],
  "available": true,
  "language": "de",
  "chapters": {
    "chapter_1": {
      "backgroundGradient": ["#2d1b3d", "#4a2c5a"],
      "spawnRate": 1.5,
      "waveDuration": 8,
      "music": "chapter1_theme.mp3",
      "particleEffect": "custom_particles"
    },
    "chapter_2": {
      "backgroundGradient": ["#ffd700", "#ff8c00"],
      "spawnRate": 2.0,
      "music": "chapter2_theme.mp3",
      "particleEffect": "energy_sparks"
    }
  },
  "meta": {
    "author": "Your Name",
    "version": "1.0",
    "created": "2025-11-16"
  }
}
```

### Chapter Configuration

Each chapter in the `chapters` object defines:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `backgroundGradient` | string[] | ✅ | Colors for this chapter's background |
| `spawnRate` | number | ✅ | Objects per second (1.0-3.0 recommended) |
| `waveDuration` | number | ❌ | Default wave time in seconds (fallback: 5s) |
| `music` | string | ❌ | Chapter-specific music file |
| `particleEffect` | string | ❌ | Visual particle effect name |
| `backgroundImage` | string | ❌ | Background image filename |

### Step 2: Create Theme Folder

**Location**: `/content/themes/<universe_id>/<theme_id>/`

This folder will contain all Chapter JSON files (one per chapter).


---

## Creating Chapters & Items

### Chapter File Structure

**Location**: `/content/themes/<universe_id>/<theme_id>/<chapter_id>.json`

A chapter file contains an **array of Items** (game rounds):

```json
{
  "items": [
    {
      "id": "ITEM_001",
      "theme": "your_theme_id",
      "chapter": "your_chapter_id",
      "level": 1,
      "waveDuration": 10,
      "base": { /* ... */ },
      "correct": [ /* ... */ ],
      "distractors": [ /* ... */ ],
      "meta": { /* ... */ }
    },
    {
      "id": "ITEM_002",
      /* ... */
    }
  ]
}
```

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

#### JSON Validity
- [ ] All JSON files parse without errors
- [ ] All required fields present
- [ ] Field types correct (string, number, boolean, array)
- [ ] IDs are unique and consistent across files

#### Content Quality
- [ ] All text is spelled correctly
- [ ] Context explanations are clear and accurate
- [ ] Related items are properly linked
- [ ] Tags are relevant and consistent

#### Audio/Visual Assets
- [ ] All referenced audio files exist
- [ ] All referenced images exist
- [ ] Audio files are < 500KB each
- [ ] Images are optimized (WebP or PNG)

#### Gameplay Balance
- [ ] Round is completable in waveDuration time
- [ ] Spawn rate doesn't overwhelm screen
- [ ] Difficulty feels appropriate for target audience
- [ ] Lernmodus provides enough visual support

#### Learning Effectiveness
- [ ] Correct/distractor distinction is clear
- [ ] Context text teaches the concept
- [ ] redirect hints are helpful, not confusing
- [ ] collectionOrder makes logical sense (if used)

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

Let's create a complete example:

### Step 1: Universe JSON

**File**: `/content/themes/universe.solar_system.json`

```json
{
  "id": "solar_system",
  "name": "Solar System",
  "description": "Learn about planets, stars, and space exploration",
  "colorPrimary": "#4a90e2",
  "colorAccent": "#f39c12",
  "backgroundGradient": ["#000000", "#1a1a2e"],
  "icon": "🌍",
  "available": true,
  "language": "en",
  "music": {
    "theme": "space_ambient.mp3",
    "volume": 0.5
  },
  "particleEffect": "stars",
  "laserColor": "#00ff99",
  "themes": ["planets", "exploration"],
  "meta": {
    "author": "Space Education Team",
    "version": "1.0",
    "created": "2025-11-16"
  }
}
```

### Step 2: Theme JSON

**File**: `/content/themes/solar_system/themes.planets.json`

```json
{
  "id": "planets",
  "name": "Planets of the Solar System",
  "description": "Learn facts about the 8 planets",
  "colorPrimary": "#3498db",
  "colorAccent": "#e74c3c",
  "backgroundGradient": ["#0c0c1e", "#1a1a3e"],
  "icon": "🪐",
  "available": true,
  "language": "en",
  "chapters": {
    "inner_planets": {
      "backgroundGradient": ["#ff6b35", "#f7931e"],
      "spawnRate": 1.5,
      "music": "inner_planets.mp3",
      "particleEffect": "heat_waves"
    },
    "outer_planets": {
      "backgroundGradient": ["#2980b9", "#16213e"],
      "spawnRate": 1.8,
      "music": "outer_planets.mp3",
      "particleEffect": "ice_crystals"
    }
  },
  "meta": {
    "author": "Space Education Team",
    "version": "1.0",
    "created": "2025-11-16"
  }
}
```

### Step 3: Chapter JSON

**File**: `/content/themes/solar_system/planets/inner_planets.json`

```json
{
  "items": [
    {
      "id": "EARTH_001",
      "theme": "planets",
      "chapter": "inner_planets",
      "level": 1,
      "waveDuration": 10,
      "base": {
        "word": "Earth",
        "type": "Planet",
        "visual": {
          "size": 1.3,
          "color": "#2980b9",
          "glow": true,
          "pulsate": true
        }
      },
      "correct": [
        {
          "entry": {
            "word": "Water",
            "type": "Feature"
          },
          "spawnPosition": 0.5,
          "spawnSpread": 0.1,
          "speed": 0.8,
          "points": 200,
          "pattern": "linear_inward",
          "collectionOrder": 1,
          "context": "Earth is the only planet with liquid water on its surface.",
          "visual": {
            "color": "#3498db",
            "pulsate": true,
            "fontSize": 1.2
          },
          "sound": "water_collect.mp3"
        },
        {
          "entry": {
            "word": "Life",
            "type": "Feature"
          },
          "spawnPosition": 0.3,
          "spawnSpread": 0.1,
          "speed": 0.9,
          "points": 250,
          "pattern": "wave",
          "collectionOrder": 2,
          "context": "Earth is the only known planet to support life.",
          "visual": {
            "color": "#27ae60",
            "pulsate": true,
            "fontSize": 1.2
          },
          "sound": "life_collect.mp3"
        },
        {
          "entry": {
            "word": "Atmosphere",
            "type": "Feature"
          },
          "spawnPosition": 0.7,
          "spawnSpread": 0.1,
          "speed": 1.0,
          "points": 200,
          "pattern": "zigzag",
          "collectionOrder": 3,
          "context": "Earth's atmosphere protects life and retains heat.",
          "visual": {
            "color": "#85c1e9",
            "pulsate": false,
            "fontSize": 1.1
          },
          "sound": "atmosphere_collect.mp3"
        }
      ],
      "distractors": [
        {
          "entry": {
            "word": "Rings",
            "type": "Feature"
          },
          "spawnPosition": 0.2,
          "spawnSpread": 0.05,
          "speed": 1.1,
          "points": 150,
          "damage": 1,
          "redirect": "Saturn",
          "context": "Rings are a feature of Saturn, not Earth.",
          "visual": {
            "color": "#e74c3c",
            "shake": true,
            "fontSize": 1.0
          },
          "sound": "error_beep.mp3"
        },
        {
          "entry": {
            "word": "Great Red Spot",
            "type": "Feature"
          },
          "spawnPosition": 0.8,
          "spawnSpread": 0.05,
          "speed": 1.2,
          "points": 150,
          "damage": 1,
          "redirect": "Jupiter",
          "context": "The Great Red Spot is a storm on Jupiter.",
          "visual": {
            "color": "#c0392b",
            "shake": true,
            "fontSize": 1.0
          },
          "sound": "error_beep.mp3"
        }
      ],
      "meta": {
        "source": "NASA Educational Materials",
        "tags": ["earth", "inner_planets", "habitability"],
        "related": ["MARS_001", "VENUS_001"],
        "difficultyScaling": {
          "speedMultiplierPerReplay": 1.05,
          "colorContrastFade": true,
          "angleVariance": 0.2
        }
      }
    }
  ]
}
```

--- 