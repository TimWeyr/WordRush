// JSON Content Loader
// Loads Universe, Theme, and Chapter data from content/ folder
// Supports both JSON files and Supabase database (via feature flag)

import type { Universe, Theme, Item } from '@/types/content.types';
import { supabaseLoader } from '@/infra/utils/SupabaseLoader';
import { 
  transformRoundsToItems, 
  transformUniverseRow, 
  transformThemeRow, 
  transformChapterRow 
} from '@/infra/utils/DBToItemTransformer';
import type { ChapterConfig } from '@/types/content.types';

class JSONLoader {
  private cache: Map<string, any> = new Map();

  // Fix UTF-8 encoding issues (Ã¤ → ä, Ã¶ → ö, Ã¼ → ü, etc.)
  private fixUTF8(obj: any): any {
    if (typeof obj === 'string') {
      return obj
        .replace(/Ã¤/g, 'ä')
        .replace(/Ã¶/g, 'ö')
        .replace(/Ã¼/g, 'ü')
        .replace(/Ã„/g, 'Ä')
        .replace(/Ã–/g, 'Ö')
        .replace(/Ãœ/g, 'Ü')
        .replace(/ÃŸ/g, 'ß')
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
        .replace(/Ã /g, 'à')
        .replace(/Ã¡/g, 'á');
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.fixUTF8(item));
    } else if (obj && typeof obj === 'object') {
      const fixed: any = {};
      for (const key in obj) {
        fixed[key] = this.fixUTF8(obj[key]);
      }
      return fixed;
    }
    return obj;
  }

  /**
   * 🚀 OPTIMIZED: Load ONLY universe metadata (for dropdown)
   * No theme data loaded - super fast!
   * Use this for initial dropdown population.
   */
  async loadUniversesList(): Promise<Array<{ id: string; name: string; icon: string; available: boolean }>> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      console.log('📋 [JSONLoader] Loading universe list (metadata only)...');
      const universeRows = await supabaseLoader.loadUniverses();
      return universeRows.map(row => ({
        id: row.id,
        name: row.name,
        icon: row.icon || '🌌',
        available: row.available ?? true
      }));
    }
    
    // JSON fallback
    console.log('📋 [JSONLoader] Loading universe list from JSON...');
    const universes = await this.loadUniversesFromJSON();
    return universes.map(u => ({
      id: u.id,
      name: u.name,
      icon: u.icon,
      available: u.available
    }));
  }

  // Load all available universes (with theme IDs)
  // NOTE: This loads theme IDs for all universes. Use loadUniversesList() if you only need metadata.
  async loadUniverses(): Promise<Universe[]> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      console.log('🔄 [JSONLoader] Using Supabase for content loading');
      return await this.loadUniversesFromSupabase();
    }
    
    console.log('📁 [JSONLoader] Using JSON files for content loading');
    return await this.loadUniversesFromJSON();
  }

  // Load universes from JSON files (legacy)
  private async loadUniversesFromJSON(): Promise<Universe[]> {
    const universes: Universe[] = [];
    
    // Try to load common universe files
    let universeIds = ['psychiatrie', 'englisch', 'music', 'fussball', 'mathe', 'spanisch', 'pokemon', 'memes', 'essen', 'tiere', 'filme', 'alltag', 'geschichte', 'stvo', 'checkst_du', 'therapie'];
    
    // Check URL parameters for universe filtering
    // Allows embedding specific universes via URL: ?universes=psychiatrie,englisch
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlUniverseIds = params.get('universeIds') || params.get('universes');
      
      if (urlUniverseIds) {
        // Parse comma-separated list and remove array brackets/quotes if present
        const cleaned = urlUniverseIds.replace(/[\[\]"']/g, '');
        universeIds = cleaned.split(',').map(id => id.trim()).filter(id => id.length > 0);
      }
    }
    
    for (const id of universeIds) {
      try {
        const universe = await this.loadUniverseFromJSON(id);
        if (universe && universe.available) {
          universes.push(universe);
        }
      } catch (error) {
        console.warn(`Failed to load universe: ${id}`, error);
      }
    }
    
    return universes;
  }

  // Load universes from Supabase
  // 🚀 PERFORMANCE: Uses batch loading for themes (1 query instead of N queries)
  private async loadUniversesFromSupabase(): Promise<Universe[]> {
    try {
      console.time('⏱️ [JSONLoader] Total universe loading time');
      
      // Phase 1: Load all universe basics (1 query)
      console.time('⏱️ Phase 1: Universe basics');
      const universeRows = await supabaseLoader.loadUniverses();
      console.timeEnd('⏱️ Phase 1: Universe basics');
      
      if (universeRows.length === 0) {
        console.log('✅ [JSONLoader] No universes found in database');
        return [];
      }
      
      // Phase 2: Batch load ALL themes for ALL universes (1 query!)
      console.time('⏱️ Phase 2: Batch load themes');
      const universeUuids = universeRows.map(row => row.uuid);
      const themesMap = await supabaseLoader.loadAllThemeIdsBatch(universeUuids);
      console.timeEnd('⏱️ Phase 2: Batch load themes');
      
      // Phase 3: Transform all universes
      console.time('⏱️ Phase 3: Transform data');
      const universes: Universe[] = [];
      for (const row of universeRows) {
        // Get themes from batch result
        const themeIds = themesMap.get(row.uuid) || [];
        
        // Transform
        const universe = transformUniverseRow(row, themeIds);
        universes.push(universe);
      }
      console.timeEnd('⏱️ Phase 3: Transform data');
      
      console.timeEnd('⏱️ [JSONLoader] Total universe loading time');
      console.log(`✅ [JSONLoader] Loaded ${universes.length} universes with ${themesMap.size} theme groups from Supabase (2 queries total!)`);
      
      return universes;
    } catch (error) {
      console.error('❌ [JSONLoader] Failed to load universes from Supabase, falling back to JSON:', error);
      return await this.loadUniversesFromJSON();
    }
  }

  // Load a specific universe
  async loadUniverse(universeId: string): Promise<Universe | null> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      return await this.loadUniverseFromSupabase(universeId);
    }
    
    return await this.loadUniverseFromJSON(universeId);
  }

  // Load universe from JSON file (legacy)
  private async loadUniverseFromJSON(universeId: string): Promise<Universe | null> {
    const cacheKey = `universe:${universeId}:json`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Force UTF-8 encoding
      const response = await fetch(`/content/themes/universe.${universeId}.json`, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // Get as text first, then parse
      const text = await response.text();
      const data = JSON.parse(text);
      const universe: Universe = this.fixUTF8(data);
      this.cache.set(cacheKey, universe);
      return universe;
    } catch (error) {
      console.error(`Failed to load universe ${universeId}:`, error);
      return null;
    }
  }

  // Load universe from Supabase
  private async loadUniverseFromSupabase(universeId: string): Promise<Universe | null> {
    const cacheKey = `universe:${universeId}:supabase`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const universeRow = await supabaseLoader.loadUniverse(universeId);
      if (!universeRow) return null;
      
      // Load theme IDs for this universe
      const themeIds = await supabaseLoader.loadThemeIds(universeRow.uuid);
      
      // Transform
      const universe = transformUniverseRow(universeRow, themeIds);
      this.cache.set(cacheKey, universe);
      return universe;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to load universe ${universeId} from Supabase, falling back to JSON:`, error);
      return await this.loadUniverseFromJSON(universeId);
    }
  }

  // Load a specific theme
  async loadTheme(universeId: string, themeId: string): Promise<Theme | null> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      return await this.loadThemeFromSupabase(universeId, themeId);
    }
    
    return await this.loadThemeFromJSON(universeId, themeId);
  }

  // Load theme from JSON file (legacy)
  private async loadThemeFromJSON(universeId: string, themeId: string): Promise<Theme | null> {
    const cacheKey = `theme:${universeId}:${themeId}:json`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/content/themes/${universeId}/themes.${themeId}.json`, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Theme file not found`);
      }
      
      const text = await response.text();
      
      // Check if response is actually JSON (not HTML error page)
      if (text.trim().startsWith('<!') || text.trim().startsWith('<?')) {
        throw new Error(`Invalid response: received HTML instead of JSON`);
      }
      
      const data = JSON.parse(text);
      const theme: Theme = this.fixUTF8(data);
      this.cache.set(cacheKey, theme);
      return theme;
    } catch (error) {
      console.warn(`Failed to load theme ${themeId} (universe: ${universeId}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 🚀 ULTRA-OPTIMIZED: Load ALL themes + chapters for a universe in 2 queries (Batch)
   * Avoids N+1 query problem completely!
   * Query 1: All themes for universe
   * Query 2: All chapters for all themes
   */
  async loadAllThemesForUniverse(universeId: string): Promise<Theme[]> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      // Fallback to loading individually (legacy JSON mode)
      const universe = await this.loadUniverse(universeId);
      if (!universe) return [];
      
      const themes: Theme[] = [];
      for (const themeId of universe.themes) {
        const theme = await this.loadThemeFromJSON(universeId, themeId);
        if (theme) themes.push(theme);
      }
      return themes;
    }
    
    // Supabase ULTRA-OPTIMIZED batch loading
    console.log(`⚡ [JSONLoader] ULTRA-BATCH loading themes + chapters for universe ${universeId}...`);
    console.time('⏱️ Total load time');
    
    try {
      // 1. Load universe to get UUID
      const universeRow = await supabaseLoader.loadUniverse(universeId);
      if (!universeRow) {
        console.error(`❌ [JSONLoader] Universe ${universeId} not found`);
        return [];
      }
      
      // 2. Batch load ALL theme rows (1 query!)
      console.time('⏱️ Load themes');
      const themeRows = await supabaseLoader.loadAllThemesForUniverse(universeRow.uuid);
      console.timeEnd('⏱️ Load themes');
      
      // 3. Batch load ALL chapters for ALL themes (1 query!)
      console.time('⏱️ Load chapters');
      const allChapterRows = await supabaseLoader.loadAllChaptersForUniverse(universeRow.uuid);
      console.timeEnd('⏱️ Load chapters');
      
      // 4. Group chapters by theme_uuid for fast lookup
      const chaptersByThemeUuid = new Map<string, typeof allChapterRows>();
      for (const chapter of allChapterRows) {
        if (!chapter.themes_uuid) continue;
        if (!chaptersByThemeUuid.has(chapter.themes_uuid)) {
          chaptersByThemeUuid.set(chapter.themes_uuid, []);
        }
        chaptersByThemeUuid.get(chapter.themes_uuid)!.push(chapter);
      }
      
      // 5. Transform all themes with their chapters
      console.time('⏱️ Transform data');
      const themes: Theme[] = [];
      for (const themeRow of themeRows) {
        // Check cache first
        const cacheKey = `theme:${universeId}:${themeRow.id}:supabase`;
        if (this.cache.has(cacheKey)) {
          themes.push(this.cache.get(cacheKey));
          continue;
        }
        
        // Get chapters for this theme from batch result
        const chapterRows = chaptersByThemeUuid.get(themeRow.uuid) || [];
        
        // Build chapters map
        const chaptersMap: Record<string, ChapterConfig> = {};
        for (const row of chapterRows) {
          if (!row.id) continue;
          chaptersMap[row.id] = transformChapterRow(row);
        }
        
        // Transform
        const theme = transformThemeRow(themeRow, chaptersMap);
        this.cache.set(cacheKey, theme);
        themes.push(theme);
      }
      console.timeEnd('⏱️ Transform data');
      
      console.timeEnd('⏱️ Total load time');
      console.log(`✅ [JSONLoader] Ultra-batch loaded ${themes.length} themes with ${allChapterRows.length} chapters (2 queries total!)`);
      
      return themes;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to batch load themes for ${universeId}, falling back to individual loads:`, error);
      
      // Fallback: Load themes individually
      const universe = await this.loadUniverse(universeId);
      if (!universe) return [];
      
      const themes: Theme[] = [];
      for (const themeId of universe.themes) {
        const theme = await this.loadThemeFromSupabase(universeId, themeId);
        if (theme) themes.push(theme);
      }
      return themes;
    }
  }

  // Load theme from Supabase
  private async loadThemeFromSupabase(universeId: string, themeId: string): Promise<Theme | null> {
    const cacheKey = `theme:${universeId}:${themeId}:supabase`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const themeRow = await supabaseLoader.loadTheme(universeId, themeId);
      if (!themeRow) return null;
      
      // Load chapters for this theme
      const chapterRows = await supabaseLoader.loadChapters(themeId);
      
      // Build chapters map
      const chaptersMap: Record<string, ChapterConfig> = {};
      for (const row of chapterRows) {
        if (!row.id) continue;
        chaptersMap[row.id] = transformChapterRow(row);
      }
      
      // Transform
      const theme = transformThemeRow(themeRow, chaptersMap);
      this.cache.set(cacheKey, theme);
      return theme;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to load theme ${themeId} from Supabase, falling back to JSON:`, error);
      return await this.loadThemeFromJSON(universeId, themeId);
    }
  }

  // Load a chapter (returns array of items)
  // Supports multiple file formats:
  // - chapterId.json (legacy single file)
  // - chapterId.1.json, chapterId.2.json, etc. (level-based files)
  // All files are merged into a single array
  async loadChapter(universeId: string, themeId: string, chapterId: string, filterPublished: boolean = false): Promise<Item[]> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT === 'true') {
      return await this.loadChapterFromSupabase(universeId, themeId, chapterId, filterPublished);
    }
    
    return await this.loadChapterFromJSON(universeId, themeId, chapterId, filterPublished);
  }

  // Load chapter from JSON files (legacy)
  private async loadChapterFromJSON(universeId: string, themeId: string, chapterId: string, filterPublished: boolean = false): Promise<Item[]> {
    const cacheKey = `chapter:${universeId}:${themeId}:${chapterId}:${filterPublished}:json`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const basePath = `/content/themes/${universeId}/${themeId}`;
      const allItems: Item[] = [];
      
      // Try loading main file (legacy format)
      try {
        const mainFile = await this.loadChapterFile(`${basePath}/${chapterId}.json`);
        if (mainFile.length > 0) {
          allItems.push(...mainFile);
          console.log(`📄 Loaded ${mainFile.length} items from ${chapterId}.json`);
        }
      } catch (error) {
        // Main file doesn't exist, that's okay
      }
      
      // Try loading level-based files (chapterId.1.json, chapterId.2.json, etc.)
      // Try up to 10 levels
      for (let level = 1; level <= 10; level++) {
        try {
          const levelFile = await this.loadChapterFile(`${basePath}/${chapterId}.${level}.json`);
          if (levelFile.length > 0) {
            allItems.push(...levelFile);
            console.log(`📄 Loaded ${levelFile.length} items from ${chapterId}.${level}.json`);
          }
        } catch (error) {
          // Level file doesn't exist, stop trying higher levels
          if (level > 1) break; // Only break if we've tried at least one level file
        }
      }
      
      if (allItems.length === 0) {
        throw new Error(`No chapter files found for ${chapterId}`);
      }
      
      // Filter by published status if requested
      let items = allItems;
      if (filterPublished) {
        items = allItems.filter(item => item.published !== false); // Default to true if not specified
      }
      
      console.log(`✅ Loaded ${items.length} total items from chapter ${chapterId} (${allItems.length - items.length} unpublished filtered out)`);
      
      this.cache.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(`Failed to load chapter ${chapterId} (universe: ${universeId}, theme: ${themeId}):`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Load chapter from Supabase
  private async loadChapterFromSupabase(universeId: string, themeId: string, chapterId: string, filterPublished: boolean = false): Promise<Item[]> {
    const cacheKey = `chapter:${universeId}:${themeId}:${chapterId}:${filterPublished}:supabase`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`📦 [JSONLoader loadChapterFromSupabase] Loading chapter ${chapterId} from Supabase...`);
      
      // 1. Load rounds for chapter
      const rounds = await supabaseLoader.loadRounds(chapterId);
      
      if (rounds.length === 0) {
        console.warn(`⚠️ [JSONLoader loadChapterFromSupabase] No rounds found for chapter ${chapterId}`);
        return [];
      }
      
      // 2. Load items for all rounds (batch query) - using UUIDs now
      console.log(`📦 [JSONLoader loadChapterFromSupabase] Rounds loaded:`, rounds.map(r => ({ id: r.id, uuid: r.uuid })));
      const roundUuids = rounds.map(r => r.uuid).filter(uuid => uuid != null) as string[];
      console.log(`📦 [JSONLoader loadChapterFromSupabase] Extracted ${roundUuids.length} round UUIDs for item loading`);
      const items = await supabaseLoader.loadItemsForRounds(roundUuids);
      console.log(`📦 [JSONLoader loadChapterFromSupabase] Items loaded from DB: ${items.length}`);
      
      // 3. Transform to Item[]
      console.log(`📦 [JSONLoader loadChapterFromSupabase] Starting transformation...`);
      let transformedItems = transformRoundsToItems(rounds, items, themeId);
      console.log(`📦 [JSONLoader] Transformed to ${transformedItems.length} items`);
      console.log(`   Item IDs:`, transformedItems.map(i => i.id).join(', '));
      
      // 4. Filter by published status
      if (filterPublished) {
        const beforeCount = transformedItems.length;
        transformedItems = transformedItems.filter(item => item.published !== false);
        const filteredCount = beforeCount - transformedItems.length;
        if (filteredCount > 0) {
          console.log(`   Filtered out ${filteredCount} unpublished items`);
        }
      }
      
      console.log(`✅ [JSONLoader] Loaded ${transformedItems.length} items from Supabase for chapter ${chapterId}`);
      
      this.cache.set(cacheKey, transformedItems);
      return transformedItems;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to load chapter ${chapterId} from Supabase, falling back to JSON:`, error);
      return await this.loadChapterFromJSON(universeId, themeId, chapterId, filterPublished);
    }
  }

  // Helper method to load a single chapter file
  private async loadChapterFile(filePath: string): Promise<Item[]> {
    const response = await fetch(filePath, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: File not found`);
    }
    
    const text = await response.text();
    
    // Check if response is actually JSON (not HTML error page)
    if (text.trim().startsWith('<!') || text.trim().startsWith('<?')) {
      throw new Error(`Invalid response: received HTML instead of JSON`);
    }
    
    const data = JSON.parse(text);
    return this.fixUTF8(data);
  }

  // Load ALL items from ALL chapters of a theme (for chaotic planet mode)
  async loadAllThemeItems(universeId: string, themeId: string, chapterIds: string[]): Promise<Item[]> {
    const cacheKey = `all-items:${universeId}:${themeId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`📦 [JSONLoader] Loading ALL items from theme ${themeId} (${chapterIds.length} chapters)...`);
      
      // Load all chapters in parallel (works for both JSON and Supabase)
      const chapterPromises = chapterIds.map(chapterId => 
        this.loadChapter(universeId, themeId, chapterId)
      );
      
      const chaptersItems = await Promise.all(chapterPromises);
      
      // Flatten all items into one array
      const allItems = chaptersItems.flat();
      
      console.log(`✅ [JSONLoader] Loaded ${allItems.length} total items from ${chapterIds.length} chapters`);
      
      this.cache.set(cacheKey, allItems);
      return allItems;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to load all theme items (universe: ${universeId}, theme: ${themeId}):`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * 🚀 ULTRA-PERFORMANCE: Load ONLY level stats for GalaxyLayout
   * Instead of loading all items (74 items just to count levels!), 
   * we use an aggregat query to get: maxLevel, levelCount, roundCount per chapter
   * 
   * @param universeId Universe ID
   * @returns Map of chapterId -> { maxLevel, levelCount, roundCount }
   */
  async loadChapterLevelStats(universeId: string): Promise<Map<string, { maxLevel: number; levelCount: number; roundCount: number }>> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      console.log(`📊 [JSONLoader] Level stats not available in JSON mode (use Supabase)`);
      return new Map();
    }
    
    const cacheKey = `levelStats:${universeId}:supabase`;
    if (this.cache.has(cacheKey)) {
      console.log(`📊 [JSONLoader] Using cached level stats for ${universeId}`);
      return this.cache.get(cacheKey);
    }
    
    try {
      // Get universe UUID first
      const universeRow = await supabaseLoader.loadUniverse(universeId);
      if (!universeRow) {
        console.error(`❌ [JSONLoader] Universe ${universeId} not found`);
        return new Map();
      }
      
      // Load aggregat stats (1 query!)
      const stats = await supabaseLoader.loadChapterLevelStatsForUniverse(universeRow.uuid);
      
      this.cache.set(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error(`❌ [JSONLoader] Failed to load level stats:`, error);
      return new Map();
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Invalidate cache for a specific universe
  invalidateUniverseCache(universeId: string): void {
    const supabaseKey = `universe:${universeId}:supabase`;
    const jsonKey = `universe:${universeId}:json`;
    this.cache.delete(supabaseKey);
    this.cache.delete(jsonKey);
    console.log(`🗑️ [JSONLoader] Invalidated cache for universe: ${universeId}`);
  }

  // Invalidate cache for a specific theme
  invalidateThemeCache(universeId: string, themeId: string): void {
    const supabaseKey = `theme:${universeId}:${themeId}:supabase`;
    const jsonKey = `theme:${universeId}:${themeId}:json`;
    this.cache.delete(supabaseKey);
    this.cache.delete(jsonKey);
    console.log(`🗑️ [JSONLoader] Invalidated cache for theme: ${universeId}/${themeId}`);
  }
}

// Singleton instance
export const jsonLoader = new JSONLoader();

