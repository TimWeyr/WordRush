// Supabase Content Loader
// Loads content data from Supabase database tables

import { supabase } from '@/infra/supabase/client';
import type { 
  UniverseRow, 
  ThemeRow, 
  ChapterRow, 
  RoundRow, 
  ItemRow,
  ChapterLevelStats 
} from '@/types/database.types';

export class SupabaseLoader {
  /**
   * Load all available universes
   */
  async loadUniverses(): Promise<UniverseRow[]> {
    console.log('🌌 [SupabaseLoader] Loading universes from database...');
    
    const { data, error } = await supabase
      .from('universes')
      .select('*')
      .eq('available', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load universes:', error);
      throw error;
    }
    
    console.log(`✅ [SupabaseLoader] Loaded ${data?.length || 0} universes`);
    return data || [];
  }

  /**
   * Load single universe by ID
   */
  async loadUniverse(universeId: string): Promise<UniverseRow | null> {
    console.log(`🌍 [SupabaseLoader] Loading universe: ${universeId}`);
    
    const { data, error } = await supabase
      .from('universes')
      .select('*')
      .eq('id', universeId)
      .single();
    
    if (error) {
      console.error(`❌ [SupabaseLoader] Failed to load universe ${universeId}:`, error);
      return null;
    }
    
    console.log(`✅ [SupabaseLoader] Loaded universe: ${data.name} (UUID: ${data.uuid})`);
    return data;
  }

  /**
   * Load all theme IDs for a universe
   */
  async loadThemeIds(universeUuid: string): Promise<string[]> {
    console.log(`🎨 [SupabaseLoader] Loading theme IDs for universe UUID: ${universeUuid}`);
    
    const { data, error } = await supabase
      .from('themes')
      .select('id')
      .eq('universe_uuid', universeUuid)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load theme IDs:', error);
      return [];
    }
    
    const themeIds = data.map(row => row.id);
    console.log(`✅ [SupabaseLoader] Found ${themeIds.length} themes:`, themeIds);
    return themeIds;
  }

  /**
   * 🚀 PERFORMANCE: Load all themes for all universes in ONE query (Batch JOIN)
   * Used for progressive loading - avoids N+1 query problem
   * 
   * @param universeUuids Array of universe UUIDs to load themes for
   * @returns Map of universeUuid -> themeIds[]
   */
  async loadAllThemeIdsBatch(universeUuids: string[]): Promise<Map<string, string[]>> {
    if (universeUuids.length === 0) {
      console.warn('⚠️ [SupabaseLoader] No universe UUIDs provided for batch theme loading');
      return new Map();
    }
    
    console.log(`⚡ [SupabaseLoader] BATCH loading themes for ${universeUuids.length} universes...`);
    
    const { data, error } = await supabase
      .from('themes')
      .select('id, universe_uuid')
      .in('universe_uuid', universeUuids)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to batch load themes:', error);
      return new Map();
    }
    
    // Group themes by universe_uuid
    const themesMap = new Map<string, string[]>();
    for (const row of data || []) {
      if (!row.universe_uuid) continue;
      
      if (!themesMap.has(row.universe_uuid)) {
        themesMap.set(row.universe_uuid, []);
      }
      themesMap.get(row.universe_uuid)!.push(row.id);
    }
    
    const totalThemes = data?.length || 0;
    console.log(`✅ [SupabaseLoader] Batch loaded ${totalThemes} themes across ${themesMap.size} universes (1 query!)`);
    
    // Log sample
    const sampleUuid = Array.from(themesMap.keys())[0];
    if (sampleUuid) {
      const sampleThemes = themesMap.get(sampleUuid)!;
      console.log(`   Example: Universe ${sampleUuid} has ${sampleThemes.length} themes:`, sampleThemes);
    }
    
    return themesMap;
  }

  // ============================================================================
  // WRITE OPERATIONS (Editor Support)
  // ============================================================================

  /**
   * 💾 Create a new round in the database
   */
  async createRound(round: {
    id: string;
    chapter_id: string;
    level: number;
    published?: boolean;
    free_tier?: boolean;
    wave_duration?: number;
    intro_text?: string;
    meta_source?: string;
    meta_detail?: string;
    meta_tags?: string[];
    meta_related?: string[];
    meta_difficulty_scaling?: any;
  }): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [SupabaseLoader] Creating round: ${round.id}`);
    
    try {
      // Get chapter UUID
      const { data: chapter } = await supabase
        .from('chapters')
        .select('uuid')
        .eq('id', round.chapter_id)
        .single();
      
      if (!chapter) {
        return { success: false, error: `Chapter ${round.chapter_id} not found` };
      }
      
      const { error } = await supabase
        .from('rounds')
        .insert({
          id: round.id,
          // chapter_id: optional (nullable), we use chapter_uuid instead
          chapter_uuid: chapter.uuid,
          level: round.level,
          published: round.published ?? true,
          free_tier: round.free_tier ?? false,
          wave_duration: round.wave_duration,
          intro_text: round.intro_text,
          meta_source: round.meta_source,
          meta_detail: round.meta_detail,
          meta_tags: round.meta_tags,
          meta_related: round.meta_related,
          meta_difficulty_scaling: round.meta_difficulty_scaling
        });
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to create round:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Round created: ${round.id}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception creating round:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 Update an existing round
   */
  async updateRound(roundId: string, updates: Partial<{
    level: number;
    published: boolean;
    free_tier: boolean;
    wave_duration: number;
    intro_text: string;
    meta_source: string;
    meta_detail: string;
    meta_tags: string[];
    meta_related: string[];
    meta_difficulty_scaling: any;
  }>): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [SupabaseLoader] Updating round: ${roundId}`);
    
    try {
      const { error } = await supabase
        .from('rounds')
        .update(updates)
        .eq('id', roundId);
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to update round:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Round updated: ${roundId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception updating round:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 Delete a round and all its items
   */
  async deleteRound(roundId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🗑️ [SupabaseLoader] Deleting round: ${roundId}`);
    
    try {
      // Items will be cascade-deleted by database constraint
      const { error } = await supabase
        .from('rounds')
        .delete()
        .eq('id', roundId);
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to delete round:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Round deleted: ${roundId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception deleting round:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 Create a new item (base/correct/distractor)
   */
  async createItem(item: {
    round_uuid: string;
    object_type: 'base' | 'correct' | 'distractor';
    word?: string;
    type?: string;
    image?: string;
    context?: string;
    redirect?: string;
    collectionorder?: number;
    spawn_position?: number;
    spawn_spread?: number;
    speed?: number;
    behavior?: string;
    points?: number;
    damage?: number;
    // Visual config - individual columns (NOT JSONB)
    color?: string;
    variant?: string;
    font_size?: number;
    pulsate?: boolean;
    shake?: boolean;
    glow?: boolean;
    // Base-only visual fields
    tier?: string;
    size?: string;
    appearance?: string;
  }): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [SupabaseLoader] Creating item: ${item.object_type} for round UUID ${item.round_uuid}`);
    
    try {
      // UUID is auto-generated by database (DEFAULT gen_random_uuid())
      const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select('uuid')
        .single();
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to create item:', error);
        console.error('   Item data:', JSON.stringify(item, null, 2));
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Item created with UUID: ${data?.uuid}`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception creating item:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 Update an existing item
   */
  async updateItem(itemUuid: string, updates: Partial<{
    word: string;
    type: string;
    image: string;
    context: string;
    redirect: string;
    spawn_position: number;
    spawn_spread: number;
    speed: number;
    behavior: string;
    points: number;
    damage: number;
    collectionorder: number;
    // Visual config - individual columns
    color: string;
    variant: string;
    font_size: number;
    pulsate: boolean;
    shake: boolean;
    glow: boolean;
    tier: string;
    size: string;
    appearance: string;
  }>): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [SupabaseLoader] Updating item: ${itemUuid}`);
    
    try {
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('uuid', itemUuid);
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to update item:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Item updated`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception updating item:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 Delete items by round_uuid
   */
  async deleteItemsByRound(roundUuid: string): Promise<{ success: boolean; error?: string }> {
    console.log(`🗑️ [SupabaseLoader] Deleting items for round UUID: ${roundUuid}`);
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('round_uuid', roundUuid);
      
      if (error) {
        console.error('❌ [SupabaseLoader] Failed to delete items:', error);
        return { success: false, error: error.message };
      }
      
      console.log(`✅ [SupabaseLoader] Items deleted`);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception deleting items:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 HIGH-LEVEL: Save complete Item (round + all items)
   * This is a transaction-like operation that saves/updates a complete Item structure
   * 
   * @param item Complete Item object from Editor
   * @param chapterId Chapter ID for the round
   * @returns Success status
   */
  async saveCompleteItem(item: any, chapterId: string): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [SupabaseLoader] Saving complete item: ${item.id}`);
    console.time(`⏱️ Save ${item.id}`);
    
    try {
      // Step 1: Check if round exists and get UUID
      let { data: existingRound } = await supabase
        .from('rounds')
        .select('id, uuid')
        .eq('id', item.id)
        .single();
      
      if (existingRound) {
        // UPDATE existing round
        const updateResult = await this.updateRound(item.id, {
          level: item.level,
          published: item.published,
          free_tier: item.freeTier,
          wave_duration: item.waveDuration,
          intro_text: item.introText,
          meta_source: item.meta?.source,
          meta_detail: item.meta?.detail,
          meta_tags: item.meta?.tags,
          meta_related: item.meta?.related,
          meta_difficulty_scaling: item.meta?.difficultyScaling
        });
        
        if (!updateResult.success) {
          console.error(`❌ [SupabaseLoader] Failed to update round ${item.id}`);
          return updateResult;
        }
        
        // Delete old items and re-create
        const deleteResult = await this.deleteItemsByRound(existingRound.uuid);
        if (!deleteResult.success) {
          console.error(`❌ [SupabaseLoader] Failed to delete old items for round ${item.id}`);
          return deleteResult;
        }
        console.log(`✅ [SupabaseLoader] Old items deleted for round ${item.id}`);
      } else {
        // CREATE new round
        const createResult = await this.createRound({
          id: item.id,
          chapter_id: chapterId,
          level: item.level,
          published: item.published,
          free_tier: item.freeTier,
          wave_duration: item.waveDuration,
          intro_text: item.introText,
          meta_source: item.meta?.source,
          meta_detail: item.meta?.detail,
          meta_tags: item.meta?.tags,
          meta_related: item.meta?.related,
          meta_difficulty_scaling: item.meta?.difficultyScaling
        });
        
        if (!createResult.success) {
          console.error(`❌ [SupabaseLoader] Failed to create round ${item.id}`);
          return createResult;
        }
        
        // Get the newly created round's UUID
        const { data: newRound } = await supabase
          .from('rounds')
          .select('id, uuid')
          .eq('id', item.id)
          .single();
        
        if (!newRound) {
          return { success: false, error: `Failed to get UUID for newly created round ${item.id}` };
        }
        
        existingRound = newRound;
      }
      
      if (!existingRound) {
        return { success: false, error: `Failed to get round UUID for ${item.id}` };
      }
      
      const roundUuid = existingRound.uuid;
      console.log(`📍 [SupabaseLoader] Using round UUID: ${roundUuid} for round ID: ${item.id}`);
      
      // Step 2: Create base item
      const baseResult = await this.createItem({
        round_uuid: roundUuid,
        object_type: 'base',
        word: item.base.word,
        type: item.base.type,
        image: item.base.image,
        context: (item.base as any).context,
        // Visual config - individual columns
        color: item.base.visual?.color,
        variant: item.base.visual?.variant,
        font_size: item.base.visual?.fontSize,
        pulsate: item.base.visual?.pulsate,
        shake: item.base.visual?.shake,
        glow: item.base.visual?.glow,
        // Base-only fields
        tier: item.base.visual?.tier,
        size: item.base.visual?.size,
        appearance: item.base.visual?.appearance
      });
      
      if (!baseResult.success) {
        console.error(`❌ [SupabaseLoader] Failed to create base item for ${item.id}: ${baseResult.error}`);
        return { success: false, error: `Failed to create base item: ${baseResult.error}` };
      }
      
      // Step 3: Create correct items
      for (let i = 0; i < item.correct.length; i++) {
        const correct = item.correct[i];
        const correctResult = await this.createItem({
          round_uuid: roundUuid,
          object_type: 'correct',
          word: correct.entry.word,
          type: correct.entry.type,
          image: correct.entry.image,
          context: correct.context,
          collectionorder: correct.collectionOrder ?? (i + 1),
          spawn_position: correct.spawnPosition,
          spawn_spread: correct.spawnSpread,
          speed: correct.speed,
          behavior: correct.behavior,
          points: correct.points,
          // Visual config - individual columns
          color: correct.visual?.color,
          variant: correct.visual?.variant,
          font_size: correct.visual?.fontSize,
          pulsate: correct.visual?.pulsate,
          shake: correct.visual?.shake,
          glow: correct.visual?.glow
        });
        
        if (!correctResult.success) {
          console.error(`❌ [SupabaseLoader] Failed to create correct item #${i} for ${item.id}: ${correctResult.error}`);
          return { success: false, error: `Failed to create correct item #${i}: ${correctResult.error}` };
        }
      }
      
      // Step 4: Create distractor items
      for (let i = 0; i < item.distractors.length; i++) {
        const distractor = item.distractors[i];
        const distractorResult = await this.createItem({
          round_uuid: roundUuid,
          object_type: 'distractor',
          word: distractor.entry.word,
          type: distractor.entry.type,
          image: distractor.entry.image,
          context: distractor.context,
          redirect: distractor.redirect,
          spawn_position: distractor.spawnPosition,
          spawn_spread: distractor.spawnSpread,
          speed: distractor.speed,
          behavior: distractor.behavior,
          points: distractor.points,
          damage: distractor.damage,
          // Visual config - individual columns
          color: distractor.visual?.color,
          variant: distractor.visual?.variant,
          font_size: distractor.visual?.fontSize,
          pulsate: distractor.visual?.pulsate,
          shake: distractor.visual?.shake,
          glow: distractor.visual?.glow
        });
        
        if (!distractorResult.success) {
          console.error(`❌ [SupabaseLoader] Failed to create distractor item #${i} for ${item.id}: ${distractorResult.error}`);
          return { success: false, error: `Failed to create distractor item #${i}: ${distractorResult.error}` };
        }
      }
      
      console.timeEnd(`⏱️ Save ${item.id}`);
      console.log(`✅ [SupabaseLoader] Complete item saved: ${item.id} (1 base + ${item.correct.length} correct + ${item.distractors.length} distractors)`);
      
      // Log SQL query for verification
      console.log(`
📋 [SQL VERIFICATION] To verify the saved data in Supabase, run this query:

SELECT
  u.name AS universe_name,
  t.name AS theme_name,
  c.title AS chapter_name,
  r.level AS round_level,
  i.word AS word,
  i.object_type AS type,
  i.redirect,
  i.collectionorder,
  i.uuid AS item_uuid,
  r.uuid AS round_uuid
FROM public.items i
JOIN public.rounds   r ON i.round_uuid    = r.uuid
JOIN public.chapters c ON r.chapter_uuid  = c.uuid
JOIN public.themes   t ON c.themes_uuid  = t.uuid
JOIN public.universes u ON t.universe_uuid = u.uuid
WHERE r.uuid = '${roundUuid}'
ORDER BY
  CASE i.object_type
    WHEN 'base'    THEN 1
    WHEN 'correct' THEN 2
    ELSE 3
  END,
  i.collectionorder;

-- Or using the round ID:
-- WHERE r.id = '${item.id}'
      `);
      
      return { success: true };
    } catch (error) {
      console.timeEnd(`⏱️ Save ${item.id}`);
      console.error('❌ [SupabaseLoader] Exception saving complete item:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * 💾 HIGH-LEVEL: Save all items for a chapter (BATCH)
   */
  async saveAllChapterItems(items: any[], chapterId: string): Promise<{ success: boolean; errors: string[] }> {
    console.log(`💾 [SupabaseLoader] Batch saving ${items.length} items for chapter ${chapterId}`);
    console.time('⏱️ Batch save');
    
    const errors: string[] = [];
    
    for (const item of items) {
      const result = await this.saveCompleteItem(item, chapterId);
      if (!result.success) {
        errors.push(`${item.id}: ${result.error}`);
      }
    }
    
    console.timeEnd('⏱️ Batch save');
    
    if (errors.length > 0) {
      console.warn(`⚠️ [SupabaseLoader] Batch save completed with ${errors.length} errors`);
      return { success: false, errors };
    }
    
    console.log(`✅ [SupabaseLoader] Batch save completed successfully`);
    return { success: true, errors: [] };
  }

  // ============================================================================
  // READ OPERATIONS (Performance Optimized)
  // ============================================================================

  /**
   * 🚀 ULTRA-PERFORMANCE: Load level stats for ALL chapters in a universe (1 query!)
   * Returns only the data needed for GalaxyLayout: max_level, level_count, round_count
   * 
   * This replaces loading all items just to count levels!
   * 
   * @param universeUuid UUID of the universe
   * @returns Map of chapterId -> { maxLevel, levelCount, roundCount }
   */
  async loadChapterLevelStatsForUniverse(universeUuid: string): Promise<Map<string, { maxLevel: number; levelCount: number; roundCount: number }>> {
    console.log(`⚡ [SupabaseLoader] Loading chapter level stats for universe (1 aggregat query!)...`);
    console.time('⏱️ Chapter level stats query');
    
    // Aggregat-Query: JOIN universe → themes → chapters → rounds
    const { data, error } = await supabase
      .from('rounds')
      .select(`
        level,
        chapters!inner (
          id,
          themes!inner (
            universe_uuid
          )
        )
      `)
      .eq('chapters.themes.universe_uuid', universeUuid);
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load chapter level stats:', error);
      console.timeEnd('⏱️ Chapter level stats query');
      return new Map();
    }
    
    // Aggregate results by chapter
    const statsMap = new Map<string, { maxLevel: number; levelCount: number; roundCount: number; levels: Set<number> }>();
    
    for (const row of data || []) {
      const chapterId = (row.chapters as any)?.id;
      if (!chapterId) continue;
      
      if (!statsMap.has(chapterId)) {
        statsMap.set(chapterId, { maxLevel: 0, levelCount: 0, roundCount: 0, levels: new Set() });
      }
      
      const stats = statsMap.get(chapterId)!;
      stats.roundCount++;
      stats.levels.add(row.level);
      stats.maxLevel = Math.max(stats.maxLevel, row.level);
    }
    
    // Convert Sets to counts
    const resultMap = new Map<string, { maxLevel: number; levelCount: number; roundCount: number }>();
    for (const [chapterId, stats] of statsMap) {
      resultMap.set(chapterId, {
        maxLevel: stats.maxLevel,
        levelCount: stats.levels.size,
        roundCount: stats.roundCount
      });
    }
    
    console.timeEnd('⏱️ Chapter level stats query');
    console.log(`✅ [SupabaseLoader] Got level stats for ${resultMap.size} chapters (1 query!)`);
    
    // Log sample
    const sampleChapter = Array.from(resultMap.keys())[0];
    if (sampleChapter) {
      const sample = resultMap.get(sampleChapter)!;
      console.log(`   Example: ${sampleChapter} → ${sample.roundCount} rounds, ${sample.levelCount} levels, max level ${sample.maxLevel}`);
    }
    
    return resultMap;
  }

  /**
   * 🚀 PERFORMANCE: Load ALL themes for ONE universe in ONE query (Batch)
   * Avoids N+1 query problem when loading multiple themes
   * 
   * @param universeUuid UUID of the universe
   * @returns Array of ThemeRows for this universe
   */
  async loadAllThemesForUniverse(universeUuid: string): Promise<ThemeRow[]> {
    console.log(`⚡ [SupabaseLoader] BATCH loading ALL themes for universe UUID: ${universeUuid}...`);
    
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('universe_uuid', universeUuid)
      .order('name', { ascending: true });
    
    if (error) {
      console.error(`❌ [SupabaseLoader] Failed to batch load themes:`, error);
      return [];
    }
    
    console.log(`✅ [SupabaseLoader] Batch loaded ${data.length} themes for universe (1 query!)`);
    return data || [];
  }

  /**
   * Load theme by ID
   */
  async loadTheme(universeId: string, themeId: string): Promise<ThemeRow | null> {
    console.log(`🎭 [SupabaseLoader] Loading theme: ${themeId} (universe: ${universeId})`);
    
    // 1. Get universe UUID
    const universe = await this.loadUniverse(universeId);
    if (!universe) {
      console.error(`❌ [SupabaseLoader] Universe ${universeId} not found`);
      return null;
    }
    
    // 2. Load theme
    const { data, error } = await supabase
      .from('themes')
      .select('*')
      .eq('id', themeId)
      .eq('universe_uuid', universe.uuid)
      .single();
    
    if (error) {
      console.error(`❌ [SupabaseLoader] Failed to load theme ${themeId}:`, error);
      return null;
    }
    
    console.log(`✅ [SupabaseLoader] Loaded theme: ${data.name} (UUID: ${data.uuid})`);
    return data;
  }

  /**
   * Load all chapters for a theme
   */
  async loadChapters(themeId: string): Promise<ChapterRow[]> {
    console.log(`📚 [SupabaseLoader] Loading chapters for theme: ${themeId}`);
    
    // 1. Get theme UUID
    const { data: theme } = await supabase
      .from('themes')
      .select('uuid')
      .eq('id', themeId)
      .single();
    
    if (!theme) {
      console.error(`❌ [SupabaseLoader] Theme ${themeId} not found`);
      return [];
    }
    
    // 2. Load chapters
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('themes_uuid', theme.uuid);
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load chapters:', error);
      return [];
    }
    
    console.log(`✅ [SupabaseLoader] Loaded ${data?.length || 0} chapters for theme ${themeId}`);
    if (data && data.length > 0) {
      console.log(`   Chapter IDs:`, data.map(c => c.id).join(', '));
    }
    
    return data || [];
  }

  /**
   * Load rounds for a chapter
   */
  async loadRounds(chapterId: string, levelFilter?: number): Promise<RoundRow[]> {
    const levelInfo = levelFilter !== undefined ? ` (level: ${levelFilter})` : '';
    console.log(`🎮 [SupabaseLoader] Loading rounds for chapter: ${chapterId}${levelInfo}`);
    
    // First, get chapter UUID from chapter ID
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('uuid')
      .eq('id', chapterId)
      .single();
    
    if (chapterError || !chapter) {
      console.error(`❌ [SupabaseLoader] Chapter ${chapterId} not found:`, chapterError);
      return [];
    }
    
    console.log(`📍 [SupabaseLoader] Chapter ${chapterId} has UUID: ${chapter.uuid}`);
    
    // Now load rounds using chapter_uuid (not chapter_id!)
    let query = supabase
      .from('rounds')
      .select('*')
      .eq('chapter_uuid', chapter.uuid);
    
    if (levelFilter !== undefined) {
      query = query.eq('level', levelFilter);
    }
    
    const { data, error } = await query.order('level', { ascending: true });
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load rounds:', error);
      return [];
    }
    
    console.log(`✅ [SupabaseLoader] Loaded ${data?.length || 0} rounds for chapter ${chapterId}`);
    if (data && data.length > 0) {
      const levels = [...new Set(data.map(r => r.level))].sort();
      console.log(`   Levels found:`, levels);
      console.log(`   Round IDs:`, data.slice(0, 5).map(r => r.id).join(', '), data.length > 5 ? '...' : '');
    }
    
    return data || [];
  }

  /**
   * Load items for multiple rounds (optimized batch query)
   * Now uses round UUIDs instead of string IDs
   */
  async loadItemsForRounds(roundUuids: string[]): Promise<ItemRow[]> {
    if (roundUuids.length === 0) {
      console.warn('⚠️ [SupabaseLoader] No round UUIDs provided for loading items');
      return [];
    }
    
    console.log(`🎯 [SupabaseLoader] Loading items for ${roundUuids.length} rounds...`);
    console.log(`   Round UUIDs to load:`, roundUuids);
    
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('round_uuid', roundUuids)
      .order('round_uuid', { ascending: true })
      .order('object_type', { ascending: true })
      .order('collectionorder', { ascending: true });
    
    if (error) {
      console.error('❌ [SupabaseLoader] Failed to load items:', error);
      return [];
    }
    
    // Count items by type
    const baseCount = data?.filter(i => i.object_type === 'base').length || 0;
    const correctCount = data?.filter(i => i.object_type === 'correct').length || 0;
    const distractorCount = data?.filter(i => i.object_type === 'distractor').length || 0;
    
    console.log(`✅ [SupabaseLoader] Loaded ${data?.length || 0} items total`);
    console.log(`   Base: ${baseCount}, Correct: ${correctCount}, Distractor: ${distractorCount}`);
    
    // Log which rounds have items
    if (data && data.length > 0) {
      const itemsByRound = new Map<string, number>();
      data.forEach(item => {
        const uuid = item.round_uuid || 'null';
        itemsByRound.set(uuid, (itemsByRound.get(uuid) || 0) + 1);
      });
      console.log(`   Items by round UUID:`);
      itemsByRound.forEach((count, uuid) => {
        console.log(`      ${uuid}: ${count} items`);
      });
    }
    
    return data || [];
  }

  /**
   * 🎯 PERFORMANCE: Get chapter level statistics
   * Used for GalaxyMap level rings - avoids loading all items
   * 
   * @param chapterIds Array of chapter IDs to get stats for
   * @returns Map of chapterId -> level statistics
   */
  async getChapterLevelStats(chapterIds: string[]): Promise<Map<string, ChapterLevelStats>> {
    if (chapterIds.length === 0) {
      console.warn('⚠️ [SupabaseLoader] No chapter IDs provided for level stats');
      return new Map();
    }
    
    console.log(`📊 [SupabaseLoader] Loading level statistics for ${chapterIds.length} chapters...`);
    
    const { data, error } = await supabase
      .from('rounds')
      .select('chapter_id, level')
      .in('chapter_id', chapterIds)
      .eq('published', true);
    
    if (error || !data) {
      console.error('❌ [SupabaseLoader] Failed to load level stats:', error);
      return new Map();
    }
    
    // Group by chapter_id and calculate stats
    const statsMap = new Map<string, ChapterLevelStats>();
    const chapterLevels = new Map<string, Set<number>>();
    
    for (const row of data) {
      if (!chapterLevels.has(row.chapter_id)) {
        chapterLevels.set(row.chapter_id, new Set());
      }
      if (row.level !== null) {
        chapterLevels.get(row.chapter_id)!.add(row.level);
      }
    }
    
    for (const [chapterId, levels] of chapterLevels) {
      const levelsArray = Array.from(levels).sort((a, b) => a - b);
      statsMap.set(chapterId, {
        maxLevel: Math.max(...levelsArray),
        levelCount: levelsArray.length,
        levels: levelsArray
      });
    }
    
    console.log(`✅ [SupabaseLoader] Calculated level stats for ${statsMap.size} chapters`);
    
    // Log sample stats
    const sampleChapterId = Array.from(statsMap.keys())[0];
    if (sampleChapterId) {
      const stats = statsMap.get(sampleChapterId)!;
      console.log(`   Example (${sampleChapterId}): ${stats.levelCount} levels (max: ${stats.maxLevel})`);
    }
    
    return statsMap;
  }

  /**
   * ==========================================
   * METADATA UPDATE METHODS (Universe, Theme, Chapter)
   * ==========================================
   */

  /**
   * Get Universe UUID by ID
   */
  async getUniverseUuid(universeId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('universes')
      .select('uuid')
      .eq('id', universeId)
      .single();
    
    if (error || !data) {
      console.error('❌ Failed to get universe UUID:', error);
      return null;
    }
    
    return data.uuid;
  }

  /**
   * Get Theme UUID by ID (optionally filtered by universe)
   */
  async getThemeUuid(themeId: string, universeId?: string): Promise<string | null> {
    let query = supabase
      .from('themes')
      .select('uuid')
      .eq('id', themeId);
    
    // If universeId is provided, also filter by universe_uuid
    if (universeId) {
      const universeUuid = await this.getUniverseUuid(universeId);
      if (universeUuid) {
        query = query.eq('universe_uuid', universeUuid);
      }
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      console.error('❌ Failed to get theme UUID:', error);
      return null;
    }
    
    return data.uuid;
  }

  /**
   * Get Chapter UUID by ID
   */
  async getChapterUuid(chapterId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chapters')
      .select('uuid')
      .eq('id', chapterId)
      .single();
    
    if (error || !data) {
      console.error('❌ Failed to get chapter UUID:', error);
      return null;
    }
    
    return data.uuid;
  }

  /**
   * Update Universe metadata
   */
  async updateUniverse(universeUuid: string, data: Partial<UniverseRow>): Promise<{ success: boolean; error?: string }> {
    console.log(`🌍 [SupabaseLoader] Updating universe UUID: ${universeUuid}`);
    
    try {
      const { error } = await supabase
        .from('universes')
        .update({
          name: data.name,
          description: data.description,
          color_primary: data.color_primary,
          color_accent: data.color_accent,
          background_gradient: data.background_gradient,
          laser_color: data.laser_color,
          icon: data.icon,
          available: data.available,
          language: data.language,
          music: data.music,
          particle_effect: data.particle_effect,
          ship_skin: data.ship_skin,
          meta: data.meta,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', universeUuid);

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to update universe:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Universe updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [SupabaseLoader] Exception updating universe:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update Theme metadata
   */
  async updateTheme(themeUuid: string, data: Partial<ThemeRow>): Promise<{ success: boolean; error?: string }> {
    console.log(`🎨 [SupabaseLoader] Updating theme UUID: ${themeUuid}`);
    
    try {
      const { error } = await supabase
        .from('themes')
        .update({
          name: data.name,
          description: data.description,
          color_primary: data.color_primary,
          color_accent: data.color_accent,
          background_gradient: data.background_gradient,
          laser_color: data.laser_color,
          icon: data.icon,
          music: data.music,
          particle_effect: data.particle_effect,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', themeUuid);

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to update theme:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Theme updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [SupabaseLoader] Exception updating theme:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update Chapter metadata
   */
  async updateChapter(chapterUuid: string, data: Partial<ChapterRow>): Promise<{ success: boolean; error?: string }> {
    console.log(`📚 [SupabaseLoader] Updating chapter UUID: ${chapterUuid}`);
    
    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          title: data.title,
          description: data.description,
          backgroundimage: data.backgroundimage,
          background_gradient: data.background_gradient,
          meta: data.meta,
          updated_at: new Date().toISOString()
        })
        .eq('uuid', chapterUuid);

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to update chapter:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Chapter updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [SupabaseLoader] Exception updating chapter:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new universe in the database
   */
  async createUniverse(universeData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('universes')
        .insert({
          id: universeData.id,
          name: universeData.name,
          description: universeData.description || '',
          icon: universeData.icon || '🌌',
          available: true,
          language: universeData.language || 'de',
          color_primary: universeData.colorPrimary || '#2196F3',
          color_accent: universeData.colorAccent || '#64B5F6',
          background_gradient: universeData.backgroundGradient || [universeData.colorPrimary, universeData.colorAccent],
          laser_color: universeData.laserColor || universeData.colorPrimary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to create universe:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Universe created:', data);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception creating universe:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a new theme in the database
   */
  async createTheme(universeId: string, themeData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get universe UUID
      const universeUuid = await this.getUniverseUuid(universeId);
      if (!universeUuid) {
        return { success: false, error: `Universe ${universeId} not found` };
      }

      const { data, error } = await supabase
        .from('themes')
        .insert({
          id: themeData.id,
          name: themeData.name,
          description: themeData.description || '',
          icon: themeData.icon || '🪐',
          color_primary: themeData.colorPrimary || '#2196F3',
          color_accent: themeData.colorAccent || '#64B5F6',
          background_gradient: themeData.backgroundGradient || [themeData.colorPrimary, themeData.colorAccent],
          laser_color: themeData.laserColor || themeData.colorPrimary,
          universe_uuid: universeUuid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to create theme:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Theme created:', data);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception creating theme:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a new chapter in the database
   */
  async createChapter(universeId: string, themeId: string, chapterData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Get theme UUID (filter by universeId to ensure uniqueness)
      const themeUuid = await this.getThemeUuid(themeId, universeId);
      if (!themeUuid) {
        return { success: false, error: `Theme ${themeId} not found in universe ${universeId}` };
      }

      // Build meta JSONB object
      const meta: any = {};
      if (chapterData.spawnRate !== undefined) {
        meta.spawnRate = chapterData.spawnRate;
      }
      if (chapterData.waveDuration !== undefined) {
        meta.waveDuration = chapterData.waveDuration;
      }
      if (chapterData.music !== undefined) {
        meta.music = chapterData.music;
      }
      if (chapterData.particleEffect !== undefined) {
        meta.particleEffect = chapterData.particleEffect;
      }
      
      // Set defaults if meta is empty
      if (Object.keys(meta).length === 0) {
        meta.spawnRate = 1.0;
        meta.waveDuration = 30000;
      }

      const { data, error } = await supabase
        .from('chapters')
        .insert({
          id: chapterData.id,
          title: chapterData.title,
          description: chapterData.description || '',
          themes_uuid: themeUuid,
          background_gradient: chapterData.backgroundGradient || ['#1a237e', '#283593'],
          meta: meta,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [SupabaseLoader] Failed to create chapter:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [SupabaseLoader] Chapter created:', data);
      return { success: true };
    } catch (error) {
      console.error('❌ [SupabaseLoader] Exception creating chapter:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Singleton instance
export const supabaseLoader = new SupabaseLoader();

