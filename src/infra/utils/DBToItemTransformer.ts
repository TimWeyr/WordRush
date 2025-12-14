// Database to TypeScript Transformer
// Transforms raw DB rows into typed application objects

import type { 
  Universe,
  Theme, 
  ChapterConfig,
  Item, 
  BaseEntry, 
  CorrectEntry, 
  DistractorEntry, 
  VisualConfig 
} from '@/types/content.types';
import type { 
  UniverseRow,
  ThemeRow,
  ChapterRow,
  RoundRow, 
  ItemRow 
} from '@/types/database.types';

/**
 * Transform DB rows (rounds + items) to TypeScript Item objects
 * Groups items by round_id and object_type to build Item structure
 */
export function transformRoundsToItems(rounds: RoundRow[], items: ItemRow[], themeId: string): Item[] {
  console.log(`🔄 [Transformer] Transforming ${rounds.length} rounds with ${items.length} items to Item[]`);
  
  // Group items by round_uuid (using UUIDs now!)
  const itemsByRound = new Map<string, ItemRow[]>();
  for (const item of items) {
    if (!item.round_uuid) {
      console.warn(`⚠️ [Transformer] Item ${item.uuid} has no round_uuid, skipping`);
      continue;
    }
    if (!itemsByRound.has(item.round_uuid)) {
      itemsByRound.set(item.round_uuid, []);
    }
    itemsByRound.get(item.round_uuid)!.push(item);
  }
  
  // Transform each round to Item
  const transformedItems: Item[] = [];
  let skippedCount = 0;
  
  for (const round of rounds) {
    const roundItems = itemsByRound.get(round.uuid || '') || [];
    
    // Separate by object_type
    const baseItem = roundItems.find(i => i.object_type === 'base');
    const correctItems = roundItems.filter(i => i.object_type === 'correct');
    const distractorItems = roundItems.filter(i => i.object_type === 'distractor');
    
    // Validation
    if (!baseItem) {
      console.warn(`⚠️ [Transformer] Round ${round.id}: Missing base item! Skipping...`);
      skippedCount++;
      continue;
    }
    
    if (correctItems.length === 0) {
      console.warn(`⚠️ [Transformer] Round ${round.id}: No correct items found!`);
    }
    
    // Build Item object
    const item: Item = {
      id: round.id,
      theme: themeId,
      chapter: round.chapter_id,
      level: round.level || 1,
      published: round.published ?? true,
      freeTier: round.free_tier,
      waveDuration: round.wave_duration ? Number(round.wave_duration) : undefined,
      introText: round.intro_text ?? undefined,
      base: transformBaseItem(baseItem),
      correct: correctItems.map(transformCorrectItem),
      distractors: distractorItems.map(transformDistractorItem),
      meta: {
        source: round.meta_source ?? undefined,
        tags: round.meta_tags ?? undefined,
        related: round.meta_related ?? undefined,
        difficultyScaling: round.meta_difficulty_scaling ?? {
          speedMultiplierPerReplay: 1.1,
          colorContrastFade: false
        }
      },
      roundUuid: round.uuid ?? undefined // Add round UUID if available
    };
    
    transformedItems.push(item);
  }
  
  if (skippedCount > 0) {
    console.warn(`⚠️ [Transformer] Skipped ${skippedCount} rounds due to missing base items`);
  }
  
  console.log(`✅ [Transformer] Successfully transformed ${transformedItems.length} items`);
  
  return transformedItems;
}

/**
 * Transform base item row to BaseEntry
 */
function transformBaseItem(item: ItemRow): BaseEntry {
  return {
    word: item.word ?? undefined,
    type: item.type || '',
    image: item.image ?? undefined,
    context: item.context ?? undefined, // Base context from database
    visual: transformVisualConfig(item, 'base'),
    uuid: item.uuid // Add item UUID
  };
}

/**
 * Transform correct item row to CorrectEntry
 */
function transformCorrectItem(item: ItemRow): CorrectEntry {
  return {
    entry: {
      word: item.word ?? undefined,
      type: item.type || '',
      image: item.image ?? undefined
    },
    spawnPosition: item.spawn_position ?? 0.5,
    spawnSpread: item.spawn_spread ?? 0.05,
    spawnDelay: item.spawn_delay ?? undefined,
    speed: item.speed ?? 0.9,
    points: item.points ?? 200,
    pattern: item.pattern || 'linear_inward',
    behavior: item.behavior ?? undefined,
    hp: item.hp ?? 1,
    collectionOrder: item.collectionorder ?? undefined,
    context: item.context || '',
    visual: transformVisualConfig(item, 'correct'),
    sound: item.sound ?? undefined,
    uuid: item.uuid // Add item UUID
  };
}

/**
 * Transform distractor item row to DistractorEntry
 */
function transformDistractorItem(item: ItemRow): DistractorEntry {
  return {
    entry: {
      word: item.word ?? undefined,
      type: item.type || '',
      image: item.image ?? undefined
    },
    spawnPosition: item.spawn_position ?? 0.5,
    spawnSpread: item.spawn_spread ?? 0.05,
    spawnDelay: item.spawn_delay ?? undefined,
    speed: item.speed ?? 1.1,
    points: item.points ?? 100,
    hp: item.hp ?? 1,
    damage: item.damage ?? 1,
    behavior: item.behavior ?? undefined,
    redirect: item.redirect || '',
    context: item.context || '',
    visual: transformVisualConfig(item, 'distractor'),
    sound: item.sound ?? undefined,
    uuid: item.uuid // Add item UUID
  };
}

/**
 * Transform visual config fields to VisualConfig
 * Handles different fields based on object type (base, correct, distractor)
 */
function transformVisualConfig(item: ItemRow, type: 'base' | 'correct' | 'distractor'): VisualConfig {
  const visual: VisualConfig = {
    color: item.color ?? undefined,
    variant: item.variant ?? undefined,
    pulsate: item.pulsate ?? false,
    shake: item.shake, // NOT NULL field
    glow: item.glow, // NOT NULL field
    fontSize: item.font_size ?? undefined
  };
  
  // Only for base items
  if (type === 'base') {
    visual.tier = item.tier ?? undefined;
    visual.size = item.size ?? undefined;
    visual.appearance = item.appearance ?? undefined;
  }
  
  return visual;
}

/**
 * Transform UniverseRow + theme IDs to Universe
 */
export function transformUniverseRow(row: UniverseRow, themes: string[]): Universe {
  // Removed verbose logging - summary is logged in JSONLoader
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    colorPrimary: row.color_primary || '#4a90e2',
    colorAccent: row.color_accent || '#7bb3f0',
    backgroundGradient: row.background_gradient || ['#1a3a5f', '#2d5a8a'],
    icon: row.icon || '🌟',
    available: row.available ?? true,
    language: row.language || 'en',
    music: row.music ? { theme: row.music, volume: 1.0 } : undefined,
    particleEffect: row.particle_effect ?? undefined,
    shipSkin: row.ship_skin ?? undefined,
    laserColor: row.laser_color ?? undefined,
    themes, // Provided by caller
    meta: row.meta || {
      author: 'Unknown',
      version: '1.0',
      created: new Date().toISOString()
    }
  };
}

/**
 * Transform ThemeRow + chapters to Theme
 */
export function transformThemeRow(row: ThemeRow, chaptersMap: Record<string, ChapterConfig>): Theme {
  // Removed verbose logging - summary is logged in JSONLoader
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    colorPrimary: row.color_primary || '#1a237e',
    colorAccent: row.color_accent || '#3f51b5',
    backgroundGradient: row.background_gradient || ['#0d1b2a', '#1b263b'],
    icon: row.icon || '🎓',
    available: true,
    language: row.language || 'en',
    chapters: chaptersMap, // Provided by caller
    meta: {
      author: 'Unknown',
      version: '1.0',
      created: new Date().toISOString()
    },
    particleEffect: row.particle_effect ?? undefined,
    laserColor: row.laser_color ?? undefined
  };
}

/**
 * Transform ChapterRow to ChapterConfig
 * Extracts config from meta JSONB field (priority) or direct fields (fallback)
 */
export function transformChapterRow(row: ChapterRow): ChapterConfig {
  // Parse meta JSONB field
  const meta = row.meta || {};
  
  // Priority: meta JSONB > direct field > default
  const spawnRate = meta.spawnRate ?? row.spawn_rate ?? 1.5;
  const music = meta.music ?? row.music ?? undefined;
  const particleEffect = meta.particleEffect ?? row.particle_effect ?? undefined;
  const waveDuration = meta.waveDuration ?? undefined;
  
  // Only log chapter meta in verbose mode (disabled by default to reduce console spam)
  // Uncomment next line for debugging chapter metadata:
  // console.log(`   📦 [Transformer] Chapter ${row.id} meta:`, { spawnRate, music, particleEffect, waveDuration });
  
  return {
    title: row.title ?? undefined,
    backgroundImage: row.backgroundimage ?? undefined,
    backgroundGradient: row.background_gradient || ['#1a237e', '#283593'],
    spawnRate,
    waveDuration,
    music,
    particleEffect
  };
}

