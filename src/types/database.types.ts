// Database Row Types
// These represent the raw data structure from Supabase tables
// NULL values are represented as `| null` (not `| undefined`)

export interface UniverseRow {
  id: string;
  name: string;
  description: string | null;
  color_primary: string | null;
  color_accent: string | null;
  background_gradient: string[] | null; // JSONB
  laser_color: string | null;
  icon: string | null;
  available: boolean | null;
  language: string | null;
  music: string | null; // TEXT (filename)
  particle_effect: string | null;
  ship_skin: string | null;
  meta: {
    author?: string;
    version?: string;
    created?: string;
    [key: string]: any;
  } | null; // JSONB
  created_at: string | null;
  updated_at: string | null;
  uuid: string;
}

export interface ThemeRow {
  id: string;
  name: string;
  description: string | null;
  color_primary: string | null;
  color_accent: string | null;
  background_gradient: string[] | null; // JSONB
  laser_color: string | null;
  icon: string | null;
  music: any | null; // JSONB or TEXT
  particle_effect: string | null;
  created_at: string | null;
  updated_at: string | null;
  uuid: string;
  universe_uuid: string | null;
  obsoloete_uuid: string; // Typo in DB schema
}

export interface ChapterRow {
  id: string | null;
  title: string | null;
  description: string | null;
  backgroundimage: string | null;
  background_gradient: string[] | null; // JSONB
  spawn_rate: number | null; // Direct field (optional, may be in meta instead)
  music: string | null; // Direct field (optional, may be in meta instead)
  particle_effect: string | null; // Direct field (optional, may be in meta instead)
  meta: {
    music?: string;
    spawnRate?: number;
    waveDuration?: number;
    particleEffect?: string;
    [key: string]: any;
  } | null; // JSONB with chapter-specific config
  created_at: string | null;
  updated_at: string | null;
  uuid: string;
  themes_uuid: string | null;
  themes_uuid_backup: string | null;
}

export interface RoundRow {
  id: string;
  chapter_id: string;
  level: number | null;
  published: boolean | null;
  wave_duration: number | null; // numeric
  meta_source: string | null;
  detail: string | null; // Changed from meta_detail to detail (matches DB schema)
  meta_tags: string[] | null; // TEXT[]
  meta_difficulty_scaling: {
    speedMultiplierPerReplay?: number;
    colorContrastFade?: boolean;
    angleVariance?: number;
    [key: string]: any;
  } | null; // JSONB
  free_tier: boolean; // NOT NULL default false
  intro_text: string | null;
  meta_related: string[] | null; // TEXT[]
  created_at: string | null;
  updated_at: string | null;
  chapter_uuid: string | null;
  uuid: string | null;
}

export interface ItemRow {
  round_id: string | null;
  object_type: 'base' | 'correct' | 'distractor' | 'bonus';
  collectionorder: number | null;
  word: string | null;
  type: string | null;
  image: string | null;
  context: string | null;
  behavior: string | null;
  damage: number | null;
  redirect: string | null;
  spawn_position: number | null; // double precision
  spawn_spread: number | null;
  spawn_delay: number | null;
  speed: number | null;
  points: number | null;
  hp: number | null;
  sound: string | null;
  color: string | null;
  variant: string | null;
  pulsate: boolean | null;
  font_size: number | null;
  tier: number | null;
  size: number | null; // double precision
  appearance: string | null;
  glow: boolean; // NOT NULL default false
  shake: boolean; // NOT NULL default false
  pattern: string | null;
  level: number | null; // Item-specific difficulty level (1-10), default 1
  created_at: string | null;
  updated_at: string | null;
  round_uuid: string | null;
  uuid: string; // NOT NULL
}

// Helper type for chapter level statistics (used in GalaxyMap)
export interface ChapterLevelStats {
  maxLevel: number;
  levelCount: number;
  levels: number[];
}


