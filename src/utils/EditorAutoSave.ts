// Editor Auto-Save System
// Saves editor state to LocalStorage with auto-recovery on page load

import type { Item } from '@/types/content.types';

export interface EditorDraft {
  universeId: string;
  themeId: string;
  chapterId: string;
  items: Item[];
  timestamp: number;
  unsavedChanges: boolean;
}

class EditorAutoSave {
  private readonly STORAGE_PREFIX = 'wordRush_editor_draft_';
  private readonly AUTOSAVE_INTERVAL = 30000; // 30 seconds
  private autosaveTimer: NodeJS.Timeout | null = null;

  // Generate storage key for a chapter
  private getStorageKey(universeId: string, themeId: string, chapterId: string): string {
    return `${this.STORAGE_PREFIX}${universeId}_${themeId}_${chapterId}`;
  }

  // Save draft to LocalStorage
  saveDraft(draft: EditorDraft): void {
    try {
      const key = this.getStorageKey(draft.universeId, draft.themeId, draft.chapterId);
      const data = JSON.stringify({
        ...draft,
        timestamp: Date.now(),
        unsavedChanges: true,
      });
      localStorage.setItem(key, data);
      console.log(`💾 Auto-saved draft for ${draft.chapterId} at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  // Load draft from LocalStorage
  loadDraft(universeId: string, themeId: string, chapterId: string): EditorDraft | null {
    try {
      const key = this.getStorageKey(universeId, themeId, chapterId);
      const data = localStorage.getItem(key);
      if (!data) return null;

      const draft: EditorDraft = JSON.parse(data);
      
      // Check if draft is older than 7 days
      const age = Date.now() - draft.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (age > maxAge) {
        this.clearDraft(universeId, themeId, chapterId);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  // Clear draft from LocalStorage
  clearDraft(universeId: string, themeId: string, chapterId: string): void {
    try {
      const key = this.getStorageKey(universeId, themeId, chapterId);
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared draft for ${chapterId}`);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  // Check if draft exists
  hasDraft(universeId: string, themeId: string, chapterId: string): boolean {
    const draft = this.loadDraft(universeId, themeId, chapterId);
    return draft !== null && draft.unsavedChanges;
  }

  // Get all drafts (for listing)
  getAllDrafts(): EditorDraft[] {
    const drafts: EditorDraft[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            const draft: EditorDraft = JSON.parse(data);
            drafts.push(draft);
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all drafts:', error);
    }
    return drafts.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Start auto-save timer (saves draft every 30 seconds)
  startAutoSave(
    universeId: string,
    themeId: string,
    chapterId: string,
    getItems: () => Item[]
  ): void {
    this.stopAutoSave();
    
    this.autosaveTimer = setInterval(() => {
      const items = getItems();
      if (items.length > 0) {
        this.saveDraft({
          universeId,
          themeId,
          chapterId,
          items,
          timestamp: Date.now(),
          unsavedChanges: true,
        });
      }
    }, this.AUTOSAVE_INTERVAL);

    console.log(`⏰ Auto-save started (every ${this.AUTOSAVE_INTERVAL / 1000}s)`);
  }

  // Stop auto-save timer
  stopAutoSave(): void {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      console.log('⏰ Auto-save stopped');
    }
  }

  // Mark draft as saved (clear unsavedChanges flag)
  markAsSaved(universeId: string, themeId: string, chapterId: string): void {
    const draft = this.loadDraft(universeId, themeId, chapterId);
    if (draft) {
      draft.unsavedChanges = false;
      const key = this.getStorageKey(universeId, themeId, chapterId);
      localStorage.setItem(key, JSON.stringify(draft));
    }
  }

  // Get formatted age string
  getDraftAge(timestamp: number): string {
    const age = Date.now() - timestamp;
    const minutes = Math.floor(age / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}

// Singleton instance
export const editorAutoSave = new EditorAutoSave();

