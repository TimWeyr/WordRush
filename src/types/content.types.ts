// Content Types from JSON files

export interface Universe {
  id: string;
  name: string;
  description: string;
  colorPrimary: string;
  colorAccent: string;
  backgroundGradient: string[];
  icon: string;
  available: boolean;
  language: string;
  music?: {
    theme: string;
    volume: number;
  };
  particleEffect?: string;
  shipSkin?: string;
  laserColor?: string;
  ringColor?: string;
  themes: string[];
  meta: {
    author: string;
    version: string;
    created: string;
  };
}

export interface Theme {
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
  meta: {
    author: string;
    version: string;
    created: string;
  };
  // Optional overrides from Universe
  particleEffect?: string;
  shipSkin?: string;
  laserColor?: string;
}

export interface ChapterConfig {
  backgroundImage?: string;
  backgroundGradient: string[];
  spawnRate: number;
  waveDuration?: number;
  music?: string;
  particleEffect?: string;
}

export interface Item {
  id: string;
  theme: string;
  chapter: string;
  level: number;
  waveDuration?: number;
  introText?: string;
  base: BaseEntry;
  correct: CorrectEntry[];
  distractors: DistractorEntry[];
  meta: ItemMeta;
}

export interface BaseEntry {
  word?: string;
  type: string;
  image?: string;
  visual: VisualConfig;
}

export interface CorrectEntry {
  entry: {
    word?: string;
    type: string;
    image?: string;
  };
  spawnPosition: number;
  spawnSpread: number;
  spawnDelay?: number;
  speed: number;
  points: number;
  pattern: string;
  behavior?: string;
  hp?: number;
  collectionOrder?: number;
  context: string;
  visual: VisualConfig;
  sound?: string;
}

export interface DistractorEntry {
  entry: {
    word?: string;
    type: string;
    image?: string;
  };
  spawnPosition: number;
  spawnSpread: number;
  spawnDelay?: number;
  speed: number;
  points: number;
  hp?: number;
  damage: number;
  behavior?: string;
  redirect: string;
  context: string;
  visual: VisualConfig;
  sound?: string;
}

export interface VisualConfig {
  tier?: number;
  size?: number;
  appearance?: string;
  color?: string;
  glow?: boolean;
  pulsate?: boolean;
  shake?: boolean;
  variant?: string;
  fontSize?: number;
  font?: string;
  collisionRadius?: number;
}

export interface ItemMeta {
  source?: string;
  tags?: string[];
  related?: string[];
  difficultyScaling: {
    speedMultiplierPerReplay: number;
    colorContrastFade: boolean;
    angleVariance?: number;
  };
}

