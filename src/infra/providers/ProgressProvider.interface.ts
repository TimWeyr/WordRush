// Provider Interface for Progress Storage
// Allows easy swap between LocalStorage and Supabase

import type { ProgressData, LearningState, ChapterProgress } from '@/types/progress.types';

export interface ProgressProvider {
  // Progress Data
  getProgress(): Promise<ProgressData>;
  saveProgress(progress: ProgressData): Promise<void>;
  
  // Learning State
  getLearningState(): Promise<LearningState>;
  saveLearningState(state: LearningState): Promise<void>;
  
  // Chapter-specific operations
  getChapterProgress(themeId: string, chapterId: string): Promise<ChapterProgress | null>;
  updateChapterProgress(
    themeId: string,
    chapterId: string,
    update: Partial<ChapterProgress>
  ): Promise<void>;
}

