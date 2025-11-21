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
  difficultyLevel: 'easy' | 'medium' | 'hard';
  itemOrder?: 'default' | 'random' | 'worst-first-unplayed';
}

