// Game Object Types

export interface Vector2 {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  active: boolean;
  spawnTime: number;
}

export interface GameConfig {
  gameplay: {
    baseSpeed: number;
    shipSpeed: number;
    shipSmoothFactor: number;
    laserSpeed: number;
    laserCooldown: number;
    startHealth: number;
    maxConcurrentObjects: number;
    waveDuration: number;
  };
  collision: {
    shipRadius: number;
    defaultObjectRadius: number;
    overlapTolerance: number;
  };
}

export type GameMode = 'lernmodus' | 'shooter';

export interface ContextEventData {
  type: 'correct_shot' | 'distractor_collision' | 'distractor_reached_base' | 'intro' | 'generic';
  word: string; // The word that was shot/collided
  context: string; // The context message
  pointsChange: number; // Positive for gain, negative for loss
  position: { x: number; y: number }; // Position where event occurred
  streakBroken?: boolean; // True if streak was broken
  previousStreak?: number; // Previous streak count before breaking
  reactionTime?: number; // Reaction time in seconds (for correct shots)
}

export interface ShipConfig {
  health: number;
  maxHealth: number;
  radius: number;
  smoothFactor: number;
  maxSpeed: number;
  shotCooldown: number;
  shipSkin?: string;
}

export interface GameState {
  mode: GameMode;
  currentUniverse: string | null;
  currentTheme: string | null;
  currentChapter: string | null;
  currentItemIndex: number;
  sessionScore: number;
  roundScore: number;
  shipHealth: number;
  isPaused: boolean;
}

