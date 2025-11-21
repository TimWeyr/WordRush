// Difficulty level configuration
// Defines multipliers and parameters for each difficulty level

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  speedMultiplier: number;
  spawnRateMultiplier: number;
  startHealth: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    speedMultiplier: 0.5,
    spawnRateMultiplier: 0.8,
    startHealth: 12
  },
  medium: {
    speedMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    startHealth: 10
  },
  hard: {
    speedMultiplier: 1.3,
    spawnRateMultiplier: 1.2,
    startHealth: 8
  }
};

export function getDifficultyConfig(level: DifficultyLevel): DifficultyConfig {
  return DIFFICULTY_CONFIGS[level];
}

