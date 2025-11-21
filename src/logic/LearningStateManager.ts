// Learning State Manager - tracks per-item learning progress

import type { LearningState, ItemLearningState } from '@/types/progress.types';
import type { ProgressProvider } from '@/infra/providers/ProgressProvider.interface';

export class LearningStateManager {
  private state: LearningState = {};
  private provider: ProgressProvider;

  constructor(provider: ProgressProvider) {
    this.provider = provider;
  }

  async load(): Promise<void> {
    this.state = await this.provider.getLearningState();
  }

  getState(itemId: string): ItemLearningState {
    if (!this.state[itemId]) {
      this.state[itemId] = this.createDefaultState();
    }
    return this.state[itemId];
  }

  // Record interactions
  recordCorrectCollect(itemId: string): void {
    const state = this.getState(itemId);
    state.correctCollects += 1;
    this.checkTrainedStatus(state);
    this.save();
  }

  recordCorrectShot(itemId: string): void {
    const state = this.getState(itemId);
    state.correctLaserHits += 1;
    this.save();
  }

  recordDistractorKill(itemId: string): void {
    const state = this.getState(itemId);
    state.distractorKills += 1;
    this.checkTrainedStatus(state);
    this.save();
  }

  recordDistractorCollision(itemId: string): void {
    const state = this.getState(itemId);
    state.distractorCollisions += 1;
    this.save();
  }

  recordAttempt(itemId: string, success: boolean): void {
    const state = this.getState(itemId);
    state.attempts += 1;
    
    // Adjust difficulty based on success
    if (success) {
      state.difficultyScaling.replays += 1;
      state.difficultyScaling.currentSpeedMultiplier *= 1.05; // Increase speed 5%
      
      // Fade color contrast if trained
      if (state.trained && state.difficultyScaling.colorContrast > 0.5) {
        state.difficultyScaling.colorContrast -= 0.1;
      }
    } else {
      // Decrease difficulty slightly on failure
      state.difficultyScaling.currentSpeedMultiplier = Math.max(
        1.0,
        state.difficultyScaling.currentSpeedMultiplier * 0.95
      );
    }
    
    this.save();
  }

  recordItemScore(itemId: string, score: number): void {
    const state = this.getState(itemId);
    
    // Update best score if new score is higher
    if (score > state.bestScore) {
      state.bestScore = score;
    }
    
    // Add to total score
    state.totalScore += score;
    
    this.save();
  }

  // Check if item is trained (per instructions.txt section 8.2)
  // Trained = at least 1 correct collect AND 1 distractor kill
  private checkTrainedStatus(state: ItemLearningState): void {
    if (state.correctCollects > 0 && state.distractorKills > 0) {
      state.trained = true;
      state.colorCoded = false;
    }
  }

  // Override color-coded mode (global Lernmodus setting)
  setGlobalColorCoded(_enabled: boolean): void {
    // This would override the per-item colorCoded status
    // For now, this is controlled at the UI level
  }

  private createDefaultState(): ItemLearningState {
    return {
      attempts: 0,
      correctCollects: 0,
      correctLaserHits: 0,
      distractorKills: 0,
      distractorCollisions: 0,
      trained: false,
      colorCoded: true, // Start with color-coded mode
      bestScore: 0,
      totalScore: 0,
      difficultyScaling: {
        currentSpeedMultiplier: 1.0,
        replays: 0,
        colorContrast: 1.0
      }
    };
  }

  private async save(): Promise<void> {
    await this.provider.saveLearningState(this.state);
  }
}

