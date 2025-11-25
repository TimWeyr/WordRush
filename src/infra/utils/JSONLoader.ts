// JSON Content Loader
// Loads Universe, Theme, and Chapter data from content/ folder

import type { Universe, Theme, Item } from '@/types/content.types';

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

  // Load all available universes
  async loadUniverses(): Promise<Universe[]> {
    const universes: Universe[] = [];
    
    // Try to load common universe files
    let universeIds = ['psychiatrie', 'englisch', 'music', 'fussball', 'mathe', 'spanisch', 'pokemon', 'memes', 'essen', 'tiere', 'filme', 'alltag', 'geschichte'];
    
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
        const universe = await this.loadUniverse(id);
        if (universe && universe.available) {
          universes.push(universe);
        }
      } catch (error) {
        console.warn(`Failed to load universe: ${id}`, error);
      }
    }
    
    return universes;
  }

  // Load a specific universe
  async loadUniverse(universeId: string): Promise<Universe | null> {
    const cacheKey = `universe:${universeId}`;
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

  // Load a specific theme
  async loadTheme(universeId: string, themeId: string): Promise<Theme | null> {
    const cacheKey = `theme:${universeId}:${themeId}`;
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

  // Load a chapter (returns array of items)
  async loadChapter(universeId: string, themeId: string, chapterId: string): Promise<Item[]> {
    const cacheKey = `chapter:${universeId}:${themeId}:${chapterId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/content/themes/${universeId}/${themeId}/${chapterId}.json`, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Chapter file not found`);
      }
      
      const text = await response.text();
      
      // Check if response is actually JSON (not HTML error page)
      if (text.trim().startsWith('<!') || text.trim().startsWith('<?')) {
        throw new Error(`Invalid response: received HTML instead of JSON`);
      }
      
      const data = JSON.parse(text);
      const items: Item[] = this.fixUTF8(data);
      this.cache.set(cacheKey, items);
      return items;
    } catch (error) {
      console.error(`Failed to load chapter ${chapterId} (universe: ${universeId}, theme: ${themeId}):`, error instanceof Error ? error.message : error);
      return [];
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const jsonLoader = new JSONLoader();

