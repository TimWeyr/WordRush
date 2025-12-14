/**
 * JSONWriter - Write operations for Editor
 * 
 * IMPORTANT: This only supports Supabase writes.
 * LocalStorage/JSON file writes are NOT supported.
 * 
 * Feature Flag: Requires VITE_USE_SUPABASE_CONTENT=true
 */

import { supabaseLoader } from './SupabaseLoader';
import type { Item, Universe, Theme } from '@/types/content.types';
import type { UniverseRow, ThemeRow, ChapterRow } from '@/types/database.types';

class JSONWriter {
  // Expose supabaseLoader for UUID lookups
  public supabaseLoader = supabaseLoader;

  /**
   * Save a single item to Supabase
   * 
   * @param universeId Universe ID
   * @param themeId Theme ID
   * @param chapterId Chapter ID
   * @param item Item to save
   * @returns Success status
   */
  async saveItem(
    universeId: string,
    themeId: string,
    chapterId: string,
    item: Item
  ): Promise<{ success: boolean; error?: string }> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return {
        success: false,
        error: 'Supabase content is not enabled. Set VITE_USE_SUPABASE_CONTENT=true'
      };
    }

    console.log(`💾 [JSONWriter] Saving item ${item.id} to Supabase...`);

    try {
      const result = await supabaseLoader.saveCompleteItem(item, chapterId);
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Item ${item.id} saved successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to save item ${item.id}:`, result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception saving item:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Save all items for a chapter to Supabase (BATCH)
   * 
   * @param universeId Universe ID
   * @param themeId Theme ID
   * @param chapterId Chapter ID
   * @param items Items to save
   * @returns Success status with errors
   */
  async saveChapter(
    universeId: string,
    themeId: string,
    chapterId: string,
    items: Item[]
  ): Promise<{ success: boolean; errors: string[] }> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return {
        success: false,
        errors: ['Supabase content is not enabled. Set VITE_USE_SUPABASE_CONTENT=true']
      };
    }

    console.log(`💾 [JSONWriter] Saving chapter ${chapterId} (${items.length} items) to Supabase...`);
    console.time('⏱️ Chapter save time');

    try {
      const result = await supabaseLoader.saveAllChapterItems(items, chapterId);
      
      console.timeEnd('⏱️ Chapter save time');
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Chapter ${chapterId} saved successfully`);
      } else {
        console.error(`❌ [JSONWriter] Chapter ${chapterId} saved with errors:`, result.errors);
      }
      
      return result;
    } catch (error) {
      console.timeEnd('⏱️ Chapter save time');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception saving chapter:', error);
      return { success: false, errors: [errorMsg] };
    }
  }

  /**
   * Delete an item from Supabase
   * 
   * @param itemId Item ID (round ID)
   * @returns Success status
   */
  async deleteItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    // Feature flag check
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return {
        success: false,
        error: 'Supabase content is not enabled. Set VITE_USE_SUPABASE_CONTENT=true'
      };
    }

    console.log(`🗑️ [JSONWriter] Deleting item ${itemId} from Supabase...`);

    try {
      const result = await supabaseLoader.deleteRound(itemId);
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Item ${itemId} deleted successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to delete item ${itemId}:`, result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception deleting item:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * ==========================================
   * METADATA SAVE METHODS (Universe, Theme, Chapter)
   * ==========================================
   */

  /**
   * Save Universe metadata to Supabase
   * Converts from Universe (app) to UniverseRow (database) format
   */
  async saveUniverse(universe: Universe, universeUuid: string): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [JSONWriter] Saving universe ${universe.id} to Supabase...`);
    
    // Convert Universe (app format) to UniverseRow (database format)
    const universeData: Partial<UniverseRow> = {
      name: universe.name,
      description: universe.description,
      color_primary: universe.colorPrimary,
      color_accent: universe.colorAccent,
      background_gradient: universe.backgroundGradient,
      laser_color: universe.laserColor,
      icon: universe.icon,
      available: universe.available,
      language: universe.language,
      music: universe.music?.theme, // Extract theme string from music object
      particle_effect: universe.particleEffect,
      ship_skin: universe.shipSkin,
      meta: universe.meta,
    };

    try {
      const result = await supabaseLoader.updateUniverse(universeUuid, universeData);
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Universe ${universe.id} saved successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to save universe:`, result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception saving universe:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Save Theme metadata to Supabase
   * Converts from Theme (app) to ThemeRow (database) format
   */
  async saveTheme(theme: Theme, themeUuid: string): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [JSONWriter] Saving theme ${theme.id} to Supabase...`);
    
    // Convert Theme (app format) to ThemeRow (database format)
    const themeData: Partial<ThemeRow> = {
      name: theme.name,
      description: theme.description,
      color_primary: theme.colorPrimary,
      color_accent: theme.colorAccent,
      background_gradient: theme.backgroundGradient,
      laser_color: theme.laserColor,
      icon: theme.icon,
      music: theme.music, // JSONB field
      particle_effect: theme.particleEffect,
    };

    try {
      const result = await supabaseLoader.updateTheme(themeUuid, themeData);
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Theme ${theme.id} saved successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to save theme:`, result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception saving theme:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Save Chapter metadata to Supabase
   */
  async saveChapterMetadata(
    chapterId: string, 
    chapterUuid: string, 
    config: any
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`💾 [JSONWriter] Saving chapter metadata ${chapterId} to Supabase...`);
    
    // Convert chapter config to ChapterRow format
    const chapterData: Partial<ChapterRow> = {
      title: config.title,
      description: config.description,
      backgroundimage: config.backgroundImage,
      background_gradient: config.backgroundGradient,
      meta: config.meta,
    };

    try {
      const result = await supabaseLoader.updateChapter(chapterUuid, chapterData);
      
      if (result.success) {
        console.log(`✅ [JSONWriter] Chapter ${chapterId} metadata saved successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to save chapter metadata:`, result.error);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception saving chapter metadata:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a new universe
   */
  async createUniverse(universeData: any): Promise<{ success: boolean; error?: string }> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return { success: false, error: 'Supabase content is not enabled' };
    }

    console.log(`🌌 [JSONWriter] Creating universe: ${universeData.id}`);

    try {
      const result = await supabaseLoader.createUniverse(universeData);
      if (result.success) {
        console.log(`✅ [JSONWriter] Universe ${universeData.id} created successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to create universe ${universeData.id}:`, result.error);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception creating universe:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a new theme
   */
  async createTheme(universeId: string, themeData: any): Promise<{ success: boolean; error?: string }> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return { success: false, error: 'Supabase content is not enabled' };
    }

    console.log(`🪐 [JSONWriter] Creating theme: ${themeData.id} in universe: ${universeId}`);

    try {
      const result = await supabaseLoader.createTheme(universeId, themeData);
      if (result.success) {
        console.log(`✅ [JSONWriter] Theme ${themeData.id} created successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to create theme ${themeData.id}:`, result.error);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception creating theme:', error);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Create a new chapter
   */
  async createChapter(universeId: string, themeId: string, chapterData: any): Promise<{ success: boolean; error?: string }> {
    if (import.meta.env.VITE_USE_SUPABASE_CONTENT !== 'true') {
      return { success: false, error: 'Supabase content is not enabled' };
    }

    console.log(`🌙 [JSONWriter] Creating chapter: ${chapterData.id} in theme: ${themeId}`);

    try {
      const result = await supabaseLoader.createChapter(universeId, themeId, chapterData);
      if (result.success) {
        console.log(`✅ [JSONWriter] Chapter ${chapterData.id} created successfully`);
      } else {
        console.error(`❌ [JSONWriter] Failed to create chapter ${chapterData.id}:`, result.error);
      }
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ [JSONWriter] Exception creating chapter:', error);
      return { success: false, error: errorMsg };
    }
  }
}

// Singleton instance
export const jsonWriter = new JSONWriter();


