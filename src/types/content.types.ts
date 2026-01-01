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
  aiModel?: string; // AI model for content generation (e.g., "gpt-4", "claude-sonnet")
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
  title?: string; // Display name for the chapter (fallback to id if not provided)
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
  published?: boolean; // Whether item is published and visible to end users (default: true)
  freeTier?: boolean; // Whether item is available for free (guest users without login) - default: false (Opt-in for security)
  waveDuration?: number;
  introText?: string;
  base: BaseEntry;
  correct: CorrectEntry[];
  distractors: DistractorEntry[];
  meta: ItemMeta;
  roundUuid?: string; // UUID from database (only present when loaded from Supabase)
}

export interface BaseEntry {
  word?: string;
  type: string;
  image?: string;
  context?: string; // Optional context for base word
  visual: VisualConfig;
  uuid?: string; // UUID from database (only present when loaded from Supabase)
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
  level?: number; // Item-specific difficulty level (1-10), default 1
  visual: VisualConfig;
  sound?: string;
  uuid?: string; // UUID from database (only present when loaded from Supabase)
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
  level?: number; // Item-specific difficulty level (1-10), default 1
  visual: VisualConfig;
  sound?: string;
  uuid?: string; // UUID from database (only present when loaded from Supabase)
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
  detail?: string; // Optional detail field (stored in rounds.meta_detail)
  tags?: string[];
  related?: string[];
  difficultyScaling: {
    speedMultiplierPerReplay: number;
    colorContrastFade: boolean;
    angleVariance?: number;
  };
}

