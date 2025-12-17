# WordRush - AI Agents & Automation Guide

**Document Version**: 1.0  
**Last Updated**: November 2024  
**Project**: WordRush - Educational 2D Shooter Game

This document provides guidance for AI development assistants, automated scripts, and CI/CD agents working with the WordRush project.

---

## Table of Contents

1. [AI Development Assistants](#ai-development-assistants)
2. [Automated Content Generation Scripts](#automated-content-generation-scripts)
3. [CI/CD Agents](#cicd-agents)
4. [Best Practices](#best-practices)
5. [Project-Specific Context](#project-specific-context)

---

## AI Development Assistants

### Cursor AI / GitHub Copilot

When working with AI assistants (Cursor, GitHub Copilot, ChatGPT, etc.) on this project, provide the following context:

#### Key Project Files to Reference

**Architecture & Types:**
- `src/types/content.types.ts` - Content structure types (Universe, Theme, Chapter, Item)
- `src/types/game.types.ts` - Game entity types (Ship, Laser, GameObject)
- `src/types/progress.types.ts` - Learning state and progress tracking
- `TYPES.md` - Complete type documentation

**Core Game Engine:**
- `src/core/GameLoop.ts` - Main game loop (requestAnimationFrame)
- `src/core/Renderer.ts` - Canvas rendering system
- `src/core/CollisionSystem.ts` - Circle-based collision detection

**Game Logic:**
- `src/logic/ShooterEngine.ts` - Main game orchestration
- `src/logic/LearningStateManager.ts` - Progress tracking
- `src/logic/GalaxyLayout.ts` - Planet/moon positioning algorithms
- `src/config/config.json` - Game constants and configuration

**Navigation:**
- `src/components/GalaxyUniverseView.tsx` - Rotational planet orbit view
- `src/components/GalaxyPlanetView.tsx` - Single planet with moons
- `src/components/GalaxyRenderer.ts` - Galaxy rendering (sun, planets, moons)

**Content System:**
- `src/infra/utils/JSONLoader.ts` - Content loading utilities (loads from Supabase)
- `src/infra/utils/SupabaseLoader.ts` - Direct Supabase database operations
- `src/infra/utils/JSONWriter.ts` - Content writing utilities (saves to Supabase)
- `src/components/Editor/` - Visual editor for content creation
- **Note**: All content is stored in Supabase, not JSON files

#### Coding Standards

**TypeScript:**
- Use strict mode (`strict: true` in tsconfig.json)
- Prefer interfaces over types for public APIs
- Use explicit return types for public functions
- Follow existing naming conventions (PascalCase for classes, camelCase for functions/variables)

**React:**
- Use functional components with hooks
- Prefer `useState` and `useEffect` over class components
- Keep components focused and single-purpose
- Use CSS Modules for styling (`.module.css` files)

**Game Development:**
- All game entities extend `GameObject` base class
- Use composition over inheritance where possible
- Keep game loop logic separate from rendering
- Use requestAnimationFrame for smooth 60 FPS gameplay

#### Common Patterns

**Entity Creation:**
```typescript
// Entities follow this pattern:
class MyEntity extends GameObject {
  constructor(position: Vector2D, config: EntityConfig) {
    super(position, config);
    // Initialize entity-specific properties
  }
  
  update(deltaTime: number): void {
    // Update logic
    super.update(deltaTime);
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    // Rendering logic
    super.render(ctx);
  }
}
```

**Content Loading:**
```typescript
// JSONLoader with automatic caching:
import { jsonLoader } from '@/infra/utils/JSONLoader';

const universe = await jsonLoader.loadUniverse('psychiatrie');
const theme = await jsonLoader.loadTheme('psychiatrie', 'icd10');
const items = await jsonLoader.loadChapter('psychiatrie', 'icd10', 'F32_Depression');
// Repeated calls use cache (instant, no DB query)
```

**State Management:**
```typescript
// Use LearningStateManager for progress:
import { LearningStateManager } from '@/logic/LearningStateManager';

const stateManager = new LearningStateManager(progressProvider);
const learningState = await stateManager.getItemState(itemId);
```

#### What NOT to Do

- ❌ Don't hardcode content - all content is in Supabase database
- ❌ Don't create JSON files - use the Editor (`/editor`) instead
- ❌ Don't modify core game loop without understanding performance implications
- ❌ Don't create new entity types without extending GameObject
- ❌ Don't bypass the collision system
- ❌ Don't modify database schema without updating TypeScript types

---

## Automated Content Generation Scripts

### Overview

**Note**: Content is now primarily created via the **Editor** (`/editor`) and stored in **Supabase**. Python scripts for JSON generation are legacy and may still exist but are no longer the primary method.

The Editor provides:
- **Visual UI** for content creation
- **Text Parser** for bulk item creation (`b.`, `c.`, `d.`, `l.` format)
- **Direct database integration** - no file management needed

### Available Scripts

#### 1. `generate_business_english.py`

**Purpose:** Generates Business English theme entries (6 chapters × 6 levels × 10 terms = 360 entries)

**Usage:**
```bash
python generate_business_english.py
```

**Output:**
- Creates JSON files in `content/themes/englisch/business_english/`
- Generates chapters: Business_Communication, Meetings_Presentations, Finance_Accounting, Management_Leadership, Marketing_Sales, Negotiations_Contracts
- Each chapter contains 60 entries (levels 1-6, 10 terms each)

**Structure Generated:**
- Entry IDs: `BC_001` to `BC_060` (Business_Communication), `MP_001` to `MP_060`, etc.
- Each entry includes: base word, correct answers, distractors (3 regular + 1 humorous)
- Visual configurations, spawn positions, speeds, points, and context strings

**Key Features:**
- Generates humorous distractors (e.g., "Kaffeepause", "Mittagspause")
- Creates related entry links
- Assigns colors and visual variants
- Sets difficulty scaling parameters

#### 2. `generate_technical_english.py`

**Purpose:** Generates Technical/MINT English theme entries (6 chapters × 6 levels × 10 terms = 360 entries)

**Usage:**
```bash
python generate_technical_english.py
```

**Output:**
- Creates JSON files in `content/themes/englisch/technical_english/`
- Generates chapters: Computer_Basics, Programming_Software, Hardware_Devices, Networks_Internet, Data_Science_AI, Cybersecurity
- Supports emojis in terms (e.g., "computer 💻", "keyboard ⌨️")

**Structure Generated:**
- Entry IDs: `CB_001` to `CB_060` (Computer_Basics), `PS_001` to `PS_060`, etc.
- Similar structure to business_english but with technical vocabulary
- Includes emoji support in word entries

#### 3. `add_bc_level1.py`

**Purpose:** Adds Level 1 entries (BC_001 to BC_010) to Business_Communication.json

**Usage:**
```bash
python add_bc_level1.py
```

**What it does:**
- Reads existing `Business_Communication.json`
- Creates 10 Level 1 entries (BC_001 to BC_010)
- Merges with existing entries (BC_011 to BC_060)
- Fixes related entry links

**Use Case:**
- When Business_Communication chapter needs Level 1 entries added
- After running `generate_business_english.py` (which starts at Level 2)

#### 4. `restore_bc_entries.py`

**Purpose:** Restore BC_001 to BC_010 entries (currently placeholder)

**Usage:**
```bash
python restore_bc_entries.py
```

**Status:** Placeholder script - needs manual entry restoration

#### 5. `temp_update_levels.py`

**Purpose:** Temporary script for updating level configurations (currently empty)

**Usage:**
```bash
python temp_update_levels.py
```

**Status:** Placeholder script

### Content Generation Workflow

**Step 1: Generate Base Content**
```bash
# Generate Business English content
python generate_business_english.py

# Generate Technical English content
python generate_technical_english.py
```

**Step 2: Add Missing Levels (if needed)**
```bash
# Add Level 1 entries to Business_Communication
python add_bc_level1.py
```

**Step 3: Validate JSON**
```bash
# Check JSON syntax (manual or use jsonlint)
python -m json.tool content/themes/englisch/business_english/Business_Communication.json
```

**Step 4: Test in Game**
```bash
npm run dev
# Navigate to Universe → Theme → Chapter in game
# Verify entries load correctly
```

### JSON Structure Requirements

All generated JSON files must follow the structure defined in `src/types/content.types.ts`:

**Required Fields:**
- `id`: Unique identifier (e.g., "BC_001")
- `theme`: Theme ID (e.g., "business_english")
- `chapter`: Chapter name (e.g., "Business_Communication")
- `level`: Level number (1-6)
- `base`: Base entry with word, type, and visual config
- `correct`: Array of correct answer entries
- `distractors`: Array of distractor entries (minimum 3 regular + 1 humorous)
- `meta`: Metadata including source, tags, related entries, difficulty scaling

**Visual Config:**
- `color`: Hex color code (e.g., "#2196F3")
- `variant`: Shape variant ("hexagon", "star", "bubble", "spike", "square", "diamond")
- `pulsate`: Boolean for pulsation animation
- `shake`: Boolean for shake animation
- `fontSize`: Number (typically 1.0 to 1.2)

**Spawn Configuration:**
- `spawnPosition`: Number between 0.0 and 1.0 (horizontal position)
- `spawnSpread`: Number (typically 0.05)
- `speed`: Number (typically 0.9 for correct, 1.1-1.2 for distractors)
- `behavior`: Movement pattern ("linear_inward", "seek_center", etc.)

### Color System & Usage

The WordRush project uses a hierarchical color system across different JSON configuration levels. Understanding where each color property is used is crucial for content generation and theming.

#### Color Properties by Level

**1. Universe Level** (`universe.[id].json`):
- **`colorPrimary`** (required): Main theme color
  - Used for: Planet rendering in GalaxyMap (`GalaxyRenderer.ts`), glow effects around planets, fallback for ring colors, PDF export headers
  - Example: `"#4a90e2"` (Englisch universe)
  - Location in code: `src/components/GalaxyRenderer.ts:56,75`, `src/utils/PDFExporter.ts:153`

- **`colorAccent`** (required): Secondary theme color
  - Used for: Particle effects (moon particles), secondary UI elements
  - Example: `"#7bb3f0"` (Englisch universe)
  - Location in code: `src/components/GalaxyMap.tsx:308`

- **`backgroundGradient`** (required): Array of 2+ hex colors
  - Used for: Background rendering in GalaxyMap (universe selection screen)
  - Example: `["#1a3a5f", "#2d5a8a"]` (Englisch universe)
  - Location in code: `src/components/GalaxyMap.tsx:590`, `src/components/UniverseSelector.tsx:127`
  - Implementation: Creates linear gradient from top to bottom using `Renderer.renderGradientBackground()`

- **`laserColor`** (optional): Color for laser projectiles
  - Used for: Laser rendering when firing from ship
  - Example: `"#4a90e2"` (Englisch universe)
  - Location in code: `src/entities/Laser.ts:14,55`, `src/logic/ShooterEngine.ts:500`
  - Fallback: Falls back to `theme.laserColor` or `universe.laserColor` or `"#4a90e2"`

**2. Theme Level** (`themes.[id].json`):
- **`colorPrimary`** (required): Main theme color
  - Used for: Planet rendering in GalaxyMap (when zoomed into theme), glow effects, connection lines
  - Example: `"#1a237e"` (Business English theme)
  - Location in code: `src/components/GalaxyRenderer.ts:56,75,354,367,377`
  - Overrides: Universe `colorPrimary` when theme is selected

- **`colorAccent`** (required): Secondary theme color
  - Used for: Particle effects, secondary visual elements
  - Example: `"#3f51b5"` (Business English theme)
  - Location in code: `src/components/GalaxyMap.tsx:308`

- **`backgroundGradient`** (required): Array of 2+ hex colors
  - Used for: Theme-level background (currently not directly used, chapters override)
  - Example: `["#0d1b2a", "#1b263b"]` (Business English theme)
  - Note: Chapter-level `backgroundGradient` takes precedence in game rendering

- **`laserColor`** (optional): Color for laser projectiles
  - Used for: Laser rendering in game (`Game.tsx`)
  - Example: `"#5c6bc0"` (Business English theme)
  - Location in code: `src/components/Game.tsx:307`, `src/logic/ShooterEngine.ts:500`
  - Priority: `theme.laserColor` > `universe.laserColor` > `"#4a90e2"`

**3. Chapter Level** (`themes.[id].json` → `chapters.{chapterName}`):
- **`backgroundGradient`** (required): Array of 2+ hex colors
  - Used for: Game background rendering during gameplay
  - Example: `["#1a237e", "#283593"]` (Business_Communication chapter)
  - Location in code: `src/components/Game.tsx:466,469`
  - Implementation: 
    - First color (`backgroundGradient[0]`) used for main background layer
    - Second color (`backgroundGradient[1]`) used for parallax scrolling layer
    - Creates depth effect with multiple gradient stops
  - Overrides: Theme-level `backgroundGradient` when chapter is active

**4. Item/Entry Level** (`[chapter].json` → `base.visual.color`, `correct[].visual.color`, `distractors[].visual.color`):
- **`visual.color`** (required): Individual object color
  - Used for: Rendering game objects (CorrectObject, DistractorObject, BaseEntity)
  - Example: `"#00a8cc"` (Hardware_Devices entries)
  - Location in code: 
    - `src/entities/CorrectObject.ts:130` - Correct objects (Shooter mode)
    - `src/entities/DistractorObject.ts:241` - Distractor objects (Shooter mode)
    - `src/entities/BaseEntity.ts:39` - Base word display
  - **Important**: In Lernmodus (Learning Mode), colors are overridden:
    - Correct objects: Always `"#00ff88"` (green) regardless of `visual.color`
    - Distractor objects: Always `"#ff3333"` (red) regardless of `visual.color`
  - In Shooter Mode: Uses `visual.color` from JSON entry
  - Used for: Object shapes, glow effects, explosion particles (Shooter mode)

#### Color Usage Examples

**Example 1: Universe → Theme → Chapter Hierarchy**
```json
// universe.englisch.json
{
  "colorPrimary": "#4a90e2",
  "colorAccent": "#7bb3f0",
  "backgroundGradient": ["#1a3a5f", "#2d5a8a"],
  "laserColor": "#4a90e2"
}

// themes.business_english.json
{
  "colorPrimary": "#1a237e",
  "colorAccent": "#3f51b5",
  "backgroundGradient": ["#0d1b2a", "#1b263b"],
  "laserColor": "#5c6bc0",
  "chapters": {
    "Business_Communication": {
      "backgroundGradient": ["#1a237e", "#283593"]
    }
  }
}
```

**Example 2: Entry-Level Colors**
```json
// Hardware_Devices.json
{
  "base": {
    "visual": {
      "color": "#00a8cc"  // Used for base word display
    }
  },
  "correct": [{
    "visual": {
      "color": "#00a8cc"  // Used in Shooter mode, overridden in Lernmodus
    }
  }],
  "distractors": [{
    "visual": {
      "color": "#00E676"  // Used in Shooter mode, overridden in Lernmodus
    }
  }]
}
```

#### Color Rendering Flow

1. **GalaxyMap (Universe Selection)**:
   - Uses `universe.backgroundGradient` for background
   - Uses `theme.colorPrimary` for planet colors and glow effects
   - Uses `theme.colorAccent` for particle effects

2. **Game (During Play)**:
   - Uses `chapter.backgroundGradient` for game background
   - Uses `theme.laserColor` (or fallback) for laser projectiles
   - Uses `entry.visual.color` for game objects (Shooter mode)
   - Overrides to green/red in Lernmodus

3. **Visual Hierarchy**:
   - Universe colors → Theme colors → Chapter colors → Entry colors
   - Each level can override or extend the previous level
   - Chapter-level `backgroundGradient` always takes precedence in game

#### Best Practices for Color Selection

1. **Contrast**: Ensure sufficient contrast between `backgroundGradient` colors and game object colors
2. **Consistency**: Use similar color families within a theme (e.g., all blues for Business English)
3. **Accessibility**: Consider colorblind users - don't rely solely on color for differentiation
4. **Lernmodus Override**: Remember that Lernmodus always uses green/red, so `visual.color` only matters in Shooter mode
5. **Gradient Colors**: Use 2-3 colors that blend well together for `backgroundGradient`

### Creating New Generation Scripts

When creating new content generation scripts:

1. **Follow Existing Patterns:**
   - Use the same JSON structure
   - Include humorous distractors
   - Set proper related entry links
   - Use consistent color schemes

2. **Include Required Functions:**
   - `generate_distractors()` - Creates 3 regular + 1 humorous distractor
   - `generate_entry()` - Creates a single entry
   - `generate_chapter()` - Generates all entries for a chapter

3. **Output Location:**
   - Place files in `content/themes/[universe]/[theme]/[chapter].json`
   - Follow existing naming conventions

4. **Validation:**
   - Ensure all entries have unique IDs
   - Verify related entry links are correct
   - Check that all required fields are present

---

## CI/CD Agents

### Current Status

**No CI/CD workflows are currently configured.**

### Recommended Setup

When setting up CI/CD agents (GitHub Actions, GitLab CI, etc.), include:

#### 1. Automated Testing

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:integration
```

#### 2. Content Validation

```yaml
# Validate JSON content structure
- name: Validate Content
  run: |
    python scripts/validate_content.py
    npm run validate-types
```

#### 3. Build Verification

```yaml
# Ensure project builds successfully
- name: Build
  run: npm run build
```

#### 4. Deployment (Future)

```yaml
# Deploy to Vercel/Netlify
- name: Deploy
  if: github.ref == 'refs/heads/main'
  run: |
    npm run build
    # Deploy commands
```

### Future CI/CD Tasks

- [ ] Set up GitHub Actions workflows
- [ ] Add automated content validation
- [ ] Configure automated testing
- [ ] Set up deployment pipelines
- [ ] Add performance benchmarks
- [ ] Configure code coverage reporting

---

## Best Practices

### For AI Assistants

#### 1. Context Awareness

**Always provide:**
- Current file being edited
- Related files (imports, types, similar components)
- Project structure context
- Type definitions from `src/types/`

**Example Prompt:**
```
I'm working on src/entities/Ship.ts. 
The Ship extends GameObject (see src/entities/GameObject.ts).
It needs to follow the collision system in src/core/CollisionSystem.ts.
Please add a method to handle laser firing.
```

#### 2. Type Safety

**Always:**
- Use TypeScript types from `src/types/`
- Import types explicitly
- Don't use `any` - use proper types
- Check `TYPES.md` for available interfaces

**Example:**
```typescript
import { Item, CorrectEntry } from '@/types/content.types';
import { Vector2D } from '@/types/game.types';

function processItem(item: Item): void {
  // Type-safe implementation
}
```

#### 3. Code Style

**Follow existing patterns:**
- Use arrow functions for callbacks
- Use async/await for promises
- Use destructuring for object properties
- Use template literals for strings
- Keep functions focused and small

#### 4. Performance Considerations

**Game Loop:**
- Keep update/render logic efficient
- Avoid allocations in game loop
- Use object pooling for frequently created entities
- Cache frequently accessed values

**Rendering:**
- Batch similar draw calls
- Use `save()`/`restore()` sparingly
- Avoid unnecessary canvas state changes
- Use offscreen canvas for complex graphics

### For Content Generation Scripts

#### 1. Consistency

- Use consistent ID patterns (e.g., `BC_001`, `MP_001`)
- Follow existing color schemes
- Use similar spawn patterns
- Maintain consistent difficulty scaling

#### 2. Validation

- Validate JSON before writing
- Check for duplicate IDs
- Verify related entry links
- Ensure all required fields are present

#### 3. Error Handling

- Handle file I/O errors gracefully
- Validate input data
- Provide clear error messages
- Log generation statistics

#### 4. Documentation

- Document script purpose in header
- Include usage examples
- Document output structure
- Note any special requirements

### For CI/CD Agents

#### 1. Fast Feedback

- Run quick checks first (lint, type check)
- Run slower tests second (integration, e2e)
- Fail fast on critical errors
- Provide clear error messages

#### 2. Caching

- Cache node_modules
- Cache build artifacts
- Cache test results when possible
- Use incremental builds

#### 3. Security

- Don't commit secrets
- Use environment variables
- Validate dependencies
- Scan for vulnerabilities

---

## Project-Specific Context

### Architecture Overview

**Layered Architecture:**
```
src/
├── components/     # React UI (UniverseSelector, Game, Settings)
├── core/          # Game engine (GameLoop, Renderer, CollisionSystem)
├── entities/      # Game objects (Ship, Laser, CorrectObject, DistractorObject)
├── logic/         # Game logic (ShooterEngine, LearningStateManager)
├── infra/         # Infrastructure (providers, utils)
├── types/         # TypeScript type definitions
└── config/        # Configuration files
```

### Content Structure

**Hierarchy:**
```
Universe (e.g., "psychiatrie", "englisch")
  └── Theme (e.g., "icd10", "business_english")
      └── Chapter (e.g., "F32_Depression", "Business_Communication")
          └── Items (e.g., "BC_001", "BC_002", ...)
```

**Storage:**
- All content stored in Supabase database (`universes`, `themes`, `chapters`, `rounds`, `items` tables)
- Editor available at `/editor` route for content creation
- Content can be created via:
  - **Visual Editor**: Table View and Detail View
  - **Text Parser**: Bulk creation with `b.`, `c.`, `d.`, `l.` format

### Galaxy Map Navigation System

#### Rotational Orbit Layout (Universe → Planets → Moons)

Die GalaxyMap verwendet eine **3-Ebenen-Hierarchie** mit rotationalem Scroll:

**Komponenten:**
- `GalaxyUniverseView.tsx` - Planeten-Orbit-Ansicht (horizontal scrollbar)
- `GalaxyPlanetView.tsx` - Einzelplanet mit Monden (pan & zoom)
- `GalaxyLayout.ts` - Layout-Berechnungen (`calculatePlanetPositionsOnOrbit`, `calculateMoonPositionsAdaptive`)
- `GalaxyRenderer.ts` - Rendering (Sonne, Planeten, Monde, Orbit)

**Universe View:**
- Sonne fix in Ecke unten-links (25% sichtbar)
- Planeten auf Kreisbahn (55% der Bildschirm-Diagonale)
- Horizontaler Scroll rotiert Orbit (360°)
- Inertia + Snapping auf nächsten Planeten
- Fokussierter Planet: Glow-Highlight + Name-Label

**Planet View:**
- Zentrierter Planet mit Monden auf Ringen
- Pan & Zoom Navigation
- Klick auf Mond/Level/Item → Spiel starten
- "Zurück"-Button → Universe View (fokussiert letzten Planeten)

**Performance:**
- **Lazy Loading:** Universe View lädt nur Theme-Metadaten (schnell)
- **Background Preload:** Chapters werden async im Hintergrund geladen + gecacht
- **Cache-Nutzung:** Planet View nutzt JSONLoader Cache (instant, kein DB-Call)

### Key Concepts

**Game Modes:**
- **Lernmodus (Learning Mode):** Color-coded (green=correct, red=distractor), 10% points
- **Shooter Mode:** Theme colors, full points, no color coding

**Game Feel & Visual Feedback:**
- **Particles:** `Particle.ts` supports gravity, friction, and floating text.
  - Types: `'correct'` (small), `'distractor'` (heavy/fiery), `'collection'` (confetti fireworks).
- **Floating Text:** Spawns at event location (Green for positive, Red for negative).
- **Screen Shake:** Triggered via `Ship` damage or massive explosions.
- **HUD Animations:** Score pulses green (gain) or red (loss).

**Ship States:**
- **State Machine:** `idle`, `damage`, `shield`, `boost`.
- **Sprites:** Loads separate SVG for each state (e.g., `ship.shield.svg`). Fallbacks to `idle` if missing.
- **Behavior:**
  - `damage`: Blinks on hit / low HP.
  - `shield`: Visual overlay, absorbs 1 hit.
  - `boost`: Active only during Level-End sequence.

**Gameplay Mechanics:**
- **Streak System:** Tracks consecutive correct collects.
  - **Persistent:** Streak count survives round changes (reset only on error/game over).
  - **Bonus:** 5 Streak -> Activates Shield.
- **Level End Sequence:**
  - Normal rounds: Instant/fast transition.
  - Last round of chapter: Ship engages `boost` and flies out (cinematic exit).

**Learning State:**
- Tracks per-item progress in LocalStorage
- Adaptive difficulty increases speed with successful replays
- Automatically switches from Lernmodus to Shooter mode

**Scoring:**
- Correct collected: +points (with reaction time bonus)
- Correct shot by mistake: -points
- Distractor destroyed: +points
- Collection order bonus: x2 score if collected in order

### Common Tasks

**Adding New Content:**
1. Use Editor at `/editor` route
2. Create Universe → Theme → Chapter via UI
3. Add items via Text Parser (`b.`, `c.`, `d.`, `l.` format) or Table View
4. Content is automatically saved to Supabase
5. Test in game (`npm run dev`) - content loads directly from database

**Adding New Features:**
1. Define types in `src/types/`
2. Implement in appropriate layer (core/logic/entities)
3. Update UI components if needed
4. Test thoroughly
5. Update documentation

**Debugging:**
- Check browser console for errors
- Use React DevTools for component debugging
- Use Canvas debugging tools for rendering issues
- Check LocalStorage for progress data

### Dependencies

**Core:**
- React 18+ (UI framework)
- TypeScript 5+ (type safety)
- Vite 5+ (build tool)

**Game Engine:**
- HTML5 Canvas (rendering)
- Custom collision system
- Custom game loop

**Storage:**
- **Content**: Supabase database (all Universes, Themes, Chapters, Items)
- **Progress**: LocalStorage (default) or Supabase adapter (optional)

### Performance Targets

- **Frame Rate:** 60 FPS
- **Load Time:** < 3s on 4G
- **Bundle Size:** < 2MB gzipped
- **Memory:** Efficient object management

---

## Quick Reference

### File Paths

| Purpose | Path |
|---------|------|
| Type Definitions | `src/types/` |
| Game Engine | `src/core/` |
| Game Entities | `src/entities/` |
| Game Logic | `src/logic/` |
| UI Components | `src/components/` |
| Content Editor | `src/components/Editor/` |
| Database Utils | `src/infra/utils/SupabaseLoader.ts`, `JSONWriter.ts` |
| Config | `src/config/config.json` |

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Content Creation (use Editor at /editor)
# Or use Text Parser for bulk item creation
```

### Important Types

```typescript
// Content
Universe, Theme, Chapter, Item
BaseEntry, CorrectEntry, DistractorEntry

// Game
GameObject, Ship, Laser, CorrectObject, DistractorObject
Vector2D, GameMode, ItemLearningState

// Progress
LearningState, ProgressProvider
```

---

## Questions & Support

For questions about:
- **Architecture:** See `README_BUILD_PLAN.md`
- **Types:** See `TYPES.md`
- **Content:** See `content/CONTENT_GUIDE.md`
- **Deployment:** See `DEPLOYMENT.md` (if exists)

---

## URL Parameter Feature

WordRush supports URL parameters for deep linking, content filtering, and preset configuration. This enables shareable links, kiosk mode, and customizable experiences.

**Supported Parameters:**
- `universes` / `universeIds`: Comma-separated list of universe IDs to load (e.g., `?universes=psychiatrie,englisch`)
- `universe`: Universe ID to select on load (e.g., `?universe=psychiatrie`)
- `theme`: Theme ID to focus/zoom on (e.g., `?theme=f10_f19`)
- `mode`: Game mode (`lernmodus` or `shooter`)
- `preset`: Gameplay preset (`zen`, `easy`, `medium`, `hard`, `custom`)

**Implementation:**
- URL parsing in `src/components/GalaxyMap.tsx` (`loadData` function)
- Universe filtering in `src/infra/utils/JSONLoader.ts` (`loadUniverses` method)
- Preset application via `localProgressProvider.saveUISettings()`

**Example URLs:**
- `?universe=psychiatrie&theme=f10_f19&mode=shooter&preset=hard` - Direct link to specific content with settings
- `?universes=geschichte,englisch` - Filter to show only specific universes
- `?universe=englisch&preset=zen` - Zen mode for relaxed learning

---

**Last Updated:** December 2024  
**Maintained by:** WordRush Development Team

