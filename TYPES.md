# WordRush - TypeScript Type Definitions

**Document Version**: 1.0  
**Last Updated**: November 16, 2024

This document contains all TypeScript interfaces and types used throughout WordRush.

---

## Table of Contents

1. [Content Types (JSON)](#content-types-json)
2. [Game Entity Types](#game-entity-types)
3. [Progress & State Types](#progress--state-types)
4. [Settings Types](#settings-types)
5. [System Types](#system-types)

---

## Content Types (JSON)

### Universe

```typescript
interface Universe {
  id: string;
  name: string;
  description: string;
  colorPrimary: string;
  colorAccent: string;
  backgroundGradient: string[];
  icon: string;
  available: boolean;
  language: string;
  music: MusicConfig;
  particleEffect?: string;
  shipSkin?: string;
  laserColor?: string;
  themes: string[];
  meta: MetaInfo;
}

interface MusicConfig {
  theme: string;
  volume: number;
}

interface MetaInfo {
  author: string;
  version: string;
  created: string;
}
```

---

### Theme

```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  colorPrimary: string;
  colorAccent: string;
  backgroundGradient: string[];
  maxLevels?: number;
  icon: string;
  relatedPackages?: string[];
  available: boolean;
  language: string;
  chapters: Record<string, ChapterConfig>;
  meta: MetaInfo;
  
  // Optional overrides from Universe
  particleEffect?: string;
  shipSkin?: string;
  laserColor?: string;
}

interface ChapterConfig {
  backgroundImage?: string;
  backgroundGradient: string[];
  spawnRate: number;
  waveDuration?: number;
  music: string;
  particleEffect?: string;
  
  // Optional overrides from Theme
  shipSkin?: string;
  laserColor?: string;
}
```

---

### Chapter (words.json)

```typescript
interface Chapter {
  items: Item[];
}

interface Item {
  id: string;
  theme: string;
  chapter: string;
  level: number;
  waveDuration?: number;
  base: BaseEntry;
  correct: CorrectEntry[];
  distractors: DistractorEntry[];
  meta: ItemMeta;
}

interface BaseEntry {
  word?: string;
  type: string;
  image?: string;
  visual: VisualConfig;
}

interface CorrectEntry {
  entry: EntryData;
  spawnPosition: number;
  spawnSpread: number;
  spawnDelay?: number;
  speed: number;
  points: number;
  pattern: MovementPattern;
  hp?: number;
  collectionOrder?: number;
  reward?: RewardConfig;
  context: string;
  visual: VisualConfig;
  sound?: string;
}

interface DistractorEntry {
  entry: EntryData;
  spawnPosition: number;
  spawnSpread: number;
  spawnDelay?: number;
  speed: number;
  points: number;
  hp?: number;
  damage: number;
  behavior?: string;
  dropChance?: number;
  redirect: string;
  context: string;
  visual: VisualConfig;
  sound?: string;
}

interface EntryData {
  word?: string;
  type: string;
  image?: string;
}

type MovementPattern = 'linear_inward' | 'zigzag' | 'wave' | 'seek_center';

interface VisualConfig {
  tier?: number;
  size?: number;
  appearance?: string;
  color?: string;
  glow?: boolean;
  pulsate?: boolean;
  shake?: boolean;
  variant?: string;
  fontSize?: number;
  collisionRadius?: number;
}

interface RewardConfig {
  type: string;
  effect: string;
  duration: number;
}

interface ItemMeta {
  source?: string;
  tags?: string[];
  related?: string[];
  difficultyScaling: DifficultyScalingConfig;
}

interface DifficultyScalingConfig {
  speedMultiplierPerReplay: number;
  colorContrastFade: boolean;
  angleVariance?: number;
}
```

---

## Game Entity Types

### Core Entities

```typescript
interface Vector2 {
  x: number;
  y: number;
}

abstract class GameObject {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  active: boolean;
  spawnTime: number;
  
  abstract update(deltaTime: number): void;
  abstract render(renderer: Renderer): void;
  abstract onCollision(other: GameObject): void;
  
  getReactionTime(): number;
  destroy(): void;
}
```

---

### Ship

```typescript
interface ShipConfig {
  startHealth: number;
  speed: number;
  smoothFactor: number;
  radius: number;
}

class Ship extends GameObject {
  health: number;
  maxHealth: number;
  smoothFactor: number;
  targetPosition: Vector2;
  lastShotTime: number;
  
  constructor(position: Vector2, config: ShipConfig);
  
  takeDamage(amount: number): void;
  shoot(direction: Vector2): Laser | null;
  setTarget(position: Vector2): void;
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  onCollision(other: GameObject): void;
}
```

---

### CorrectObject

```typescript
class CorrectObject extends GameObject {
  entry: CorrectEntry;
  points: number;
  pattern: MovementPattern;
  colorCoded: boolean;
  speedMultiplier: number;
  collectionOrder?: number;
  context: string;
  visual: VisualConfig;
  soundFile?: string;
  
  constructor(
    position: Vector2,
    entry: CorrectEntry,
    colorCoded: boolean,
    speedMultiplier: number
  );
  
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  onCollision(other: GameObject): void;
  getDisplayColor(): string;
}
```

---

### DistractorObject

```typescript
class DistractorObject extends GameObject {
  entry: DistractorEntry;
  points: number;
  damage: number;
  hp: number;
  currentHp: number;
  redirect: string;
  colorCoded: boolean;
  speedMultiplier: number;
  context: string;
  visual: VisualConfig;
  soundFile?: string;
  
  constructor(
    position: Vector2,
    entry: DistractorEntry,
    colorCoded: boolean,
    speedMultiplier: number
  );
  
  takeDamage(amount: number): void;
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  onCollision(other: GameObject): void;
  getDisplayColor(): string;
}
```

---

### Laser

```typescript
interface LaserConfig {
  speed: number;
  lifetime: number;
  radius: number;
  color: string;
}

class Laser extends GameObject {
  direction: Vector2;
  lifetime: number;
  age: number;
  color: string;
  
  constructor(position: Vector2, direction: Vector2, config: LaserConfig);
  
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  onCollision(other: GameObject): void;
}
```

---

### BaseEntity

```typescript
class BaseEntity extends GameObject {
  content: BaseEntry;
  visual: VisualConfig;
  orientation: Orientation;
  
  constructor(position: Vector2);
  
  setContent(base: BaseEntry): void;
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  onCollision(other: GameObject): void;
}
```

---

## Progress & State Types

### Progress Data

```typescript
interface ProgressData {
  themes: Record<string, ThemeProgress>;
  meta: ProgressMeta;
}

interface ThemeProgress {
  chapters: Record<string, ChapterProgress>;
  themeProgress: number; // 0.0 - 1.0
  totalScore: number;
}

interface ChapterProgress {
  levelsPlayed: number;
  levelsTotal: number;
  score: number;
  perfectRuns: number;
  failedRuns: number;
  unlocked: boolean;
  mixMode: boolean;
  lastPlayed: string; // ISO timestamp
  collectedCorrectIds: string[];
  failedIds: string[];
}

interface ProgressMeta {
  lastTheme: string;
  lastChapter: string;
  mixModeGlobal: boolean;
  created: string; // ISO timestamp
  updated: string; // ISO timestamp
  version: string;
}
```

---

### Learning State

```typescript
interface LearningState {
  [itemId: string]: ItemLearningState;
}

interface ItemLearningState {
  attempts: number;
  correctCollects: number;
  correctLaserHits: number;
  distractorKills: number;
  distractorCollisions: number;
  trained: boolean;
  colorCoded: boolean;
  difficultyScaling: DifficultyState;
}

interface DifficultyState {
  currentSpeedMultiplier: number;
  replays: number;
  colorContrast: number; // 0.0 - 1.0
}
```

---

### Session State

```typescript
interface SessionState {
  currentUniverse: string | null;
  currentTheme: string | null;
  currentChapter: string | null;
  currentItemId: string | null;
  sessionScore: number;
  sessionStartTime: number;
  itemsPlayed: string[];
  shipHealth: number;
}
```

---

## Settings Types

### UI Settings

```typescript
interface UISettings {
  orientation: Orientation;
  colorScheme: ColorScheme;
  audio: AudioSettings;
  mixModeGlobal: boolean;
  stützräderGlobal: boolean;
  language: string;
}

type Orientation = 'vertical' | 'horizontal' | 'auto';
type ColorScheme = 'dark' | 'light' | 'auto';

interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0.0 - 1.0
  sfxVolume: number; // 0.0 - 1.0
  masterVolume: number; // 0.0 - 1.0
}
```

---

### Config Types

```typescript
interface GameConfig {
  gameplay: GameplayConfig;
  collision: CollisionConfig;
  orientationConfig: OrientationConfigMap;
  version: string;
}

interface GameplayConfig {
  baseSpeed: number;
  shipSpeed: number;
  shipSmoothFactor: number;
  laserSpeed: number;
  laserCooldown: number;
  startHealth: number;
  maxConcurrentObjects: number;
  pointsPerMiss: number;
  waveDuration: number;
}

interface CollisionConfig {
  shipRadius: number;
  defaultObjectRadius: number;
  overlapTolerance: number;
}

interface OrientationConfigMap {
  vertical: OrientationSettings;
  horizontal: OrientationSettings;
}

interface OrientationSettings {
  spawnFrom: 'top' | 'bottom' | 'left' | 'right';
  basePosition: string;
  shipBounds: string;
}
```

---

## System Types

### Provider Interfaces

```typescript
interface ProgressProvider {
  getProgress(): Promise<ProgressData>;
  saveProgress(progress: ProgressData): Promise<void>;
  getLearningState(): Promise<LearningState>;
  saveLearningState(state: LearningState): Promise<void>;
  
  getChapterProgress(themeId: string, chapterId: string): Promise<ChapterProgress>;
  updateChapterProgress(
    themeId: string,
    chapterId: string,
    update: Partial<ChapterProgress>
  ): Promise<void>;
}

interface SettingsProvider {
  getSettings(): UISettings;
  saveSettings(settings: UISettings): void;
  getAudioSettings(): AudioSettings;
  updateAudioSettings(audio: Partial<AudioSettings>): void;
}
```

---

### Renderer Types

```typescript
interface Renderer {
  clear(): void;
  worldToScreen(worldPos: Vector2): Vector2;
  renderText(text: string, pos: Vector2, options: TextOptions): void;
  renderSprite(image: HTMLImageElement, pos: Vector2, options: SpriteOptions): void;
  renderCircle(pos: Vector2, radius: number, color: string): void;
  renderRect(pos: Vector2, width: number, height: number, color: string): void;
  renderLine(from: Vector2, to: Vector2, color: string, width: number): void;
}

interface TextOptions {
  fontSize: number;
  fontFamily: string;
  color: string;
  align: 'left' | 'center' | 'right';
  baseline?: 'top' | 'middle' | 'bottom';
  glow?: boolean;
  glowColor?: string;
}

interface SpriteOptions {
  rotation: number;
  scale: number;
  alpha: number;
  tint?: string;
}
```

---

### Scene Types

```typescript
interface Scene {
  onEnter(): void;
  onExit(): void;
  update(deltaTime: number): void;
  render(renderer: Renderer): void;
  handleInput(input: InputState): void;
}

interface InputState {
  mousePosition: Vector2 | null;
  mouseDown: boolean;
  touches: Map<number, Vector2>;
  keys: Set<string>;
}
```

---

### Collision Types

```typescript
interface CollisionPair {
  objA: GameObject;
  objB: GameObject;
}

interface CollisionCallback {
  (objA: GameObject, objB: GameObject): void;
}
```

---

### Audio Types

```typescript
interface AudioPreloadManifest {
  music: string[];
  sfx: string[];
}

interface SpatialAudioConfig {
  position: Vector2;
  maxDistance: number;
  rolloffFactor: number;
}
```

---

### Loading Types

```typescript
interface LoadingProgress {
  totalAssets: number;
  loadedAssets: number;
  currentAsset: string;
  percentage: number;
}

interface AssetManifest {
  images: string[];
  audio: string[];
  json: string[];
}
```

---

### HUD Types

```typescript
interface HUDState {
  health: number;
  maxHealth: number;
  score: number;
  sessionScore: number;
  themeName: string;
  chapterName: string;
  itemId: string;
  contextText: string;
  contextTimeout: number;
  collectionOrderProgress?: CollectionOrderProgress;
  showQuickBonus: boolean;
  quickBonusPercent: number;
}

interface CollectionOrderProgress {
  current: number;
  total: number;
  lost: boolean;
}
```

---

### Galaxy Hub Types

```typescript
interface GalaxyHubState {
  selectedUniverse: string | null;
  selectedTheme: string | null;
  selectedChapter: string | null;
  zoomLevel: number;
  cameraPosition: Vector2;
}

interface Planet {
  id: string;
  name: string;
  position: Vector2;
  radius: number;
  color: string;
  progress: number; // 0.0 - 1.0
  unlocked: boolean;
  chapters: Orbit[];
}

interface Orbit {
  chapterId: string;
  angle: number;
  radius: number;
  markers: LevelMarker[];
}

interface LevelMarker {
  itemId: string;
  angle: number;
  completed: boolean;
  trained: boolean;
}
```

---

### Animation Types

```typescript
interface Animation {
  update(deltaTime: number): boolean; // Returns true if complete
  render(renderer: Renderer): void;
}

interface ParticleEffect {
  type: string;
  particles: Particle[];
  duration: number;
  age: number;
}

interface Particle {
  position: Vector2;
  velocity: Vector2;
  color: string;
  alpha: number;
  size: number;
  lifetime: number;
  age: number;
}
```

---

### Utility Types

```typescript
// Type guards
function isCorrectObject(obj: GameObject): obj is CorrectObject {
  return obj instanceof CorrectObject;
}

function isDistractorObject(obj: GameObject): obj is DistractorObject {
  return obj instanceof DistractorObject;
}

function isShip(obj: GameObject): obj is Ship {
  return obj instanceof Ship;
}

function isLaser(obj: GameObject): obj is Laser {
  return obj instanceof Laser;
}

// Utility types
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

// JSON validation result
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

---

### Error Types

```typescript
class GameError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'GameError';
  }
}

enum ErrorCode {
  ASSET_LOAD_FAILED = 'ASSET_LOAD_FAILED',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  STORAGE_ERROR = 'STORAGE_ERROR',
  AUDIO_ERROR = 'AUDIO_ERROR',
  RENDER_ERROR = 'RENDER_ERROR',
  COLLISION_ERROR = 'COLLISION_ERROR',
  STATE_ERROR = 'STATE_ERROR'
}
```

---

### Event Types

```typescript
interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data?: any;
}

enum GameEventType {
  ROUND_START = 'ROUND_START',
  ROUND_END = 'ROUND_END',
  GAME_OVER = 'GAME_OVER',
  CORRECT_COLLECTED = 'CORRECT_COLLECTED',
  DISTRACTOR_DESTROYED = 'DISTRACTOR_DESTROYED',
  SHIP_DAMAGED = 'SHIP_DAMAGED',
  SCORE_CHANGED = 'SCORE_CHANGED',
  BONUS_EARNED = 'BONUS_EARNED',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME'
}

interface EventListener {
  (event: GameEvent): void;
}
```

---

## Type Usage Examples

### Loading Content

```typescript
// Load and validate Universe
async function loadUniverse(id: string): Promise<Universe> {
  const response = await fetch(`/content/themes/universe.${id}.json`);
  const data = await response.json();
  
  // Validate against Universe interface
  if (!isValidUniverse(data)) {
    throw new GameError(
      `Invalid universe data: ${id}`,
      ErrorCode.JSON_PARSE_ERROR
    );
  }
  
  return data as Universe;
}

function isValidUniverse(data: any): data is Universe {
  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    Array.isArray(data.themes) &&
    typeof data.available === 'boolean'
  );
}
```

---

### Creating Game Objects

```typescript
function createCorrectObject(
  entry: CorrectEntry,
  orientation: Orientation,
  colorCoded: boolean,
  speedMultiplier: number
): CorrectObject {
  const spawnPos = calculateSpawnPosition(
    entry.spawnPosition,
    entry.spawnSpread,
    orientation
  );
  
  return new CorrectObject(spawnPos, entry, colorCoded, speedMultiplier);
}
```

---

### Progress Updates

```typescript
async function updateProgress(
  provider: ProgressProvider,
  themeId: string,
  chapterId: string,
  itemId: string,
  success: boolean,
  score: number
): Promise<void> {
  const chapterProgress = await provider.getChapterProgress(themeId, chapterId);
  
  const update: Partial<ChapterProgress> = {
    levelsPlayed: chapterProgress.levelsPlayed + 1,
    score: chapterProgress.score + score,
    lastPlayed: new Date().toISOString()
  };
  
  if (success) {
    update.perfectRuns = (chapterProgress.perfectRuns || 0) + 1;
    update.collectedCorrectIds = [
      ...chapterProgress.collectedCorrectIds,
      itemId
    ];
  } else {
    update.failedRuns = (chapterProgress.failedRuns || 0) + 1;
    update.failedIds = [
      ...chapterProgress.failedIds,
      itemId
    ];
  }
  
  await provider.updateChapterProgress(themeId, chapterId, update);
}
```

---

**End of Types Document**

