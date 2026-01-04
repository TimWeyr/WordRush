// Progress & Learning State Types (per instructions.txt section 11)

export interface ProgressData {
  themes: Record<string, ThemeProgress>;
  meta: ProgressMeta;
}

export interface ThemeProgress {
  chapters: Record<string, ChapterProgress>;
  themeProgress: number;
  totalScore: number;
}

export interface ChapterProgress {
  levelsPlayed: number;
  levelsTotal: number;
  score: number;
  perfectRuns: number;
  failedRuns: number;
  unlocked: boolean;
  mixMode: boolean;
  lastPlayed: string;
  collectedCorrectIds: string[];
  failedIds: string[];
}

export interface ProgressMeta {
  lastTheme: string;
  lastChapter: string;
  mixModeGlobal: boolean;
  created: string;
  updated: string;
  version: string;
}

export interface LearningState {
  [itemId: string]: ItemLearningState;
}

export interface ItemLearningState {
  attempts: number;
  correctCollects: number;
  correctLaserHits: number;
  distractorKills: number;
  distractorCollisions: number;
  trained: boolean;
  colorCoded: boolean;
  bestScore: number;
  totalScore: number;
  difficultyScaling: {
    currentSpeedMultiplier: number;
    replays: number;
    colorContrast: number;
  };
}

export interface UISettings {
  orientation: 'vertical' | 'horizontal' | 'auto';
  colorScheme: 'dark' | 'light';
  stützräderGlobal: boolean;
  mixModeGlobal: boolean;
  itemOrder?: 'default' | 'random' | 'worst-first-unplayed' | 'newest-first';
  gameMode?: 'lernmodus' | 'shooter'; // Default: 'shooter'
  gameplaySettings?: GameplaySettings;
}

export type GameplayPreset = 'zen' | 'easy' | 'medium' | 'hard' | 'custom';

export interface GameplaySettings {
  // Active preset or 'custom' if manually adjusted
  preset: GameplayPreset;
  
  // 5 Sliders (0-100 range for UI, mapped to actual values in game logic)
  objectSpeed: number;        // 0-100 → maps to speedMultiplier (0-2.0)
  spawnRate: number;          // 0-100 → maps to objects/second (0-5)
  maxCorrect: number;         // 1-10
  maxDistractors: number;     // 1-10
  animationIntensity: number; // 0-10
  
  // Context message settings
  showContextMessages: boolean;
  pauseOnContextMessages: boolean;
}

