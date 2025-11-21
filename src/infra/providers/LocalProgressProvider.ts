// LocalStorage implementation of ProgressProvider
// Stores all data in browser LocalStorage

import type { ProgressProvider } from './ProgressProvider.interface';
import type { ProgressData, LearningState, ChapterProgress, UISettings } from '@/types/progress.types';

const KEYS = {
  PROGRESS: 'wordrush_progress',
  LEARNING_STATE: 'wordrush_learningState',
  UI_SETTINGS: 'wf_ui_settings',
  USERNAME: 'wordrush_username',
  GALAXY_CAMERA: 'wordrush_galaxy_camera'
};

export class LocalProgressProvider implements ProgressProvider {
  // Progress Data
  async getProgress(): Promise<ProgressData> {
    const stored = localStorage.getItem(KEYS.PROGRESS);
    if (!stored) {
      return this.createDefaultProgress();
    }
    try {
      return JSON.parse(stored);
    } catch {
      return this.createDefaultProgress();
    }
  }

  async saveProgress(progress: ProgressData): Promise<void> {
    progress.meta.updated = new Date().toISOString();
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  }

  // Learning State
  async getLearningState(): Promise<LearningState> {
    const stored = localStorage.getItem(KEYS.LEARNING_STATE);
    if (!stored) {
      return {};
    }
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  async saveLearningState(state: LearningState): Promise<void> {
    localStorage.setItem(KEYS.LEARNING_STATE, JSON.stringify(state));
  }

  // Chapter Progress
  async getChapterProgress(themeId: string, chapterId: string): Promise<ChapterProgress | null> {
    const progress = await this.getProgress();
    const themeProgress = progress.themes[themeId];
    if (!themeProgress) return null;
    
    const chapterProgress = themeProgress.chapters[chapterId];
    return chapterProgress || null;
  }

  async updateChapterProgress(
    themeId: string,
    chapterId: string,
    update: Partial<ChapterProgress>
  ): Promise<void> {
    const progress = await this.getProgress();
    
    // Ensure theme exists
    if (!progress.themes[themeId]) {
      progress.themes[themeId] = {
        chapters: {},
        themeProgress: 0,
        totalScore: 0
      };
    }
    
    // Ensure chapter exists
    if (!progress.themes[themeId].chapters[chapterId]) {
      progress.themes[themeId].chapters[chapterId] = this.createDefaultChapterProgress();
    }
    
    // Update chapter
    const chapter = progress.themes[themeId].chapters[chapterId];
    Object.assign(chapter, update);
    
    // Recalculate theme progress
    const theme = progress.themes[themeId];
    const chapters = Object.values(theme.chapters);
    const totalLevels = chapters.reduce((sum, c) => sum + c.levelsTotal, 0);
    const playedLevels = chapters.reduce((sum, c) => sum + c.levelsPlayed, 0);
    theme.themeProgress = totalLevels > 0 ? playedLevels / totalLevels : 0;
    theme.totalScore = chapters.reduce((sum, c) => sum + c.score, 0);
    
    await this.saveProgress(progress);
  }

  // UI Settings
  async getUISettings(): Promise<UISettings> {
    const stored = localStorage.getItem(KEYS.UI_SETTINGS);
    if (!stored) {
      return this.createDefaultSettings();
    }
    try {
      return JSON.parse(stored);
    } catch {
      return this.createDefaultSettings();
    }
  }

  async saveUISettings(settings: UISettings): Promise<void> {
    localStorage.setItem(KEYS.UI_SETTINGS, JSON.stringify(settings));
  }

  // Username
  getUsername(): string | null {
    return localStorage.getItem(KEYS.USERNAME);
  }

  saveUsername(username: string): void {
    localStorage.setItem(KEYS.USERNAME, username);
  }

  // Galaxy Camera State (per universe)
  getGalaxyCameraState(universeId: string): { x: number; y: number; zoom: number } | null {
    const stored = localStorage.getItem(`${KEYS.GALAXY_CAMERA}_${universeId}`);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  saveGalaxyCameraState(universeId: string, x: number, y: number, zoom: number): void {
    localStorage.setItem(`${KEYS.GALAXY_CAMERA}_${universeId}`, JSON.stringify({ x, y, zoom }));
  }

  // Defaults
  private createDefaultProgress(): ProgressData {
    return {
      themes: {},
      meta: {
        lastTheme: '',
        lastChapter: '',
        mixModeGlobal: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0'
      }
    };
  }

  private createDefaultChapterProgress(): ChapterProgress {
    return {
      levelsPlayed: 0,
      levelsTotal: 0,
      score: 0,
      perfectRuns: 0,
      failedRuns: 0,
      unlocked: true,
      mixMode: false,
      lastPlayed: new Date().toISOString(),
      collectedCorrectIds: [],
      failedIds: []
    };
  }

  private createDefaultSettings(): UISettings {
    return {
      orientation: 'auto',
      colorScheme: 'dark',
      stützräderGlobal: true,
      mixModeGlobal: false,
      difficultyLevel: 'medium'
    };
  }
}

// Singleton instance
export const localProgressProvider = new LocalProgressProvider();

