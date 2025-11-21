# WordRush MVP

Educational 2D shooter game built with React + TypeScript + Canvas.

## Features Implemented ✅

- ✅ **Universe/Theme/Chapter Selector** - Choose learning content
- ✅ **Shooter Gameplay** - Ship movement, laser shooting, object spawning
- ✅ **Game Entities** - Ship, Base, Correct objects, Distractors, Lasers
- ✅ **Collision Detection** - Circle-based collision system
- ✅ **Scoring System** - Points, reaction bonuses, collection order bonus
- ✅ **Lernmodus** - Color-coded mode with 10% points
- ✅ **Shooter Mode** - Full points, no color coding
- ✅ **Learning State Tracking** - Per-item progress in LocalStorage
- ✅ **Adaptive Difficulty** - Speed increases with successful replays
- ✅ **HUD** - Health bar, score, level info, context display
- ✅ **Touch Controls** - Tablet-friendly (1 finger move, 2 fingers shoot)
- ✅ **Mouse Controls** - Move with mouse, left-click to shoot
- ✅ **Parallax Background** - Simple 2-layer parallax scrolling
- ✅ **Retro Aesthetic** - Arcade game styling with outlined text
- ✅ **Progress Persistence** - LocalStorage with Supabase-ready adapter pattern
- ✅ **Themed Colors** - Colors from JSON universe/theme files

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The game will open at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
npm run preview
```

## How to Play

### Controls

**Desktop (Mouse):**
- **Move**: Move mouse → Ship follows smoothly
- **Shoot**: Left-click → Fire laser at mouse position
- **Exit**: ESC or click Exit button

**Tablet/Mobile (Touch):**
- **Move**: Touch screen with 1 finger → Ship moves toward finger
- **Shoot**: Touch with 2nd finger → Laser fires toward 2nd finger
- **Exit**: Tap Exit button

### Game Modes

**🎓 Lernmodus (Learning Mode):**
- Correct objects = **GREEN** (easy to identify)
- Distractor objects = **RED** (easy to identify)
- Collection order numbers shown (1., 2., 3.)
- **Only 10% points** (learning phase)
- Automatically switches to Shooter mode after successful completion

**🎯 Shooter Mode:**
- Objects use theme colors (harder to identify)
- No collection order numbers
- **100% points** (full challenge)
- Must identify correct/distractor by word meaning

### Gameplay

1. **Select Universe** (e.g., Psychiatrie 🧠 or Englisch 🇬🇧)
2. **Select Theme** (e.g., ICD-10 Psychopathologie)
3. **Select Chapter** (e.g., F32_Depression)
4. **Choose Mode** (Lernmodus or Shooter)
5. **Click Start** ▶️

**In Game:**
- **Base** (bottom of screen) = Current concept you're learning
- **Correct objects** (falling) = Related facts/symptoms → **Collect them!**
- **Distractor objects** (falling) = Unrelated concepts → **Shoot them!**

**Actions:**
- Collect correct objects by flying your ship into them ✅
- Shoot distractor objects with lasers before they hit you ❌
- If distractor hits ship → Lose health ❤️
- Complete all objects → Next round!
- Lose all health → Game Over!

### Scoring

- **Correct collected**: +points (with reaction time bonus)
- **Correct shot by mistake**: -points
- **Distractor destroyed**: +points
- **Distractor hits ship**: -points + health damage
- **Collection Order Bonus**: x2 score if collected in correct order!

## Project Structure

```
src/
├── components/          # React UI components
│   ├── UniverseSelector.tsx/css  # Selection screen
│   └── Game.tsx/css              # Main game screen + HUD
├── core/               # Game engine core
│   ├── GameLoop.ts              # Main loop (requestAnimationFrame)
│   ├── Renderer.ts              # Canvas rendering
│   └── CollisionSystem.ts       # Circle collision detection
├── entities/           # Game objects
│   ├── GameObject.ts            # Base class
│   ├── Ship.ts                  # Player ship
│   ├── BaseEntity.ts            # Learning concept base
│   ├── CorrectObject.ts         # Correct answers
│   ├── DistractorObject.ts      # Wrong answers
│   └── Laser.ts                 # Projectiles
├── logic/              # Game logic
│   ├── ShooterEngine.ts         # Main game orchestration
│   └── LearningStateManager.ts  # Progress tracking
├── infra/              # Infrastructure
│   ├── providers/
│   │   ├── ProgressProvider.interface.ts  # Storage interface
│   │   └── LocalProgressProvider.ts       # LocalStorage implementation
│   └── utils/
│       └── JSONLoader.ts                   # Content loading
├── types/              # TypeScript definitions
│   ├── content.types.ts         # Universe/Theme/Item types
│   ├── game.types.ts            # Game object types
│   └── progress.types.ts        # Progress/LearningState types
├── config/
│   └── config.json              # Game constants
└── App.tsx             # Main app component
```

## Content Structure

Your existing content files work out of the box:

```
content/
└── themes/
    ├── universe.psychiatrie.json
    ├── universe.englisch.json
    ├── psychiatrie/
    │   ├── themes.icd10.json
    │   └── icd10/
    │       ├── F32_Depression.json
    │       ├── F20_Schizophrenie.json
    │       └── F43_Belastungsstoerung.json
    └── englisch/
        ├── themes.english_cap.json
        └── english_cap/
            ├── EverydayLife_Home.json
            ├── Travel_Leisure.json
            └── Work_Office.json
```

## Adding New Content

See `CONTENT_GUIDE.md` for detailed instructions on creating new Universes, Themes, and Chapters.

Quick example: Just add a new JSON file following the existing structure!

## Technical Details

- **Framework**: React 18 + TypeScript
- **Rendering**: HTML5 Canvas (retro aesthetic)
- **State**: React hooks + LocalStorage
- **Performance**: 60 FPS target, circle collision, object pooling ready
- **Storage**: LocalStorage (Supabase adapter ready)
- **Responsive**: Works on desktop, tablet, mobile

## What's NOT Included (Simplified for MVP)

- ❌ Audio/music (silent game)
- ❌ Complex animations (simple movement only)
- ❌ Galaxy Hub visualization (simple selector instead)
- ❌ Multiple movement patterns (only linear_inward)
- ❌ Particle effects (basic parallax only)
- ❌ PWA/offline mode (dev server only)
- ❌ Supabase cloud sync (LocalStorage only)
- ❌ Mobile native apps (web only)

## Next Steps to Full Build

To upgrade from MVP → Full Build (see BUILD_PLAN.md):

1. Add Howler.js for audio
2. Implement advanced movement patterns (zigzag, wave, seek)
3. Add particle effects and visual polish
4. Create Galaxy Hub 3D visualization
5. Add Supabase integration
6. Build PWA with offline support
7. Package for iOS/Android with Capacitor
8. Comprehensive testing

## Troubleshooting

**Game won't start:**
- Check browser console for errors
- Ensure content files exist in `/content/themes/`

**Touch not working:**
- Try on actual tablet/mobile device (desktop touch simulation can be buggy)
- Ensure browser supports touch events

**Performance issues:**
- Reduce waveDuration in JSON files
- Lower spawnRate in theme config

## License

See project root for license information.

---

**Built following**: `instructions.txt` specification  
**Build Plan**: `BUILD_PLAN.md`, `ARCHITECTURE.md`, `TYPES.md`  
**Version**: MVP 0.1.0

