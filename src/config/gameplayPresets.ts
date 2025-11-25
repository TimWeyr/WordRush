// Gameplay Presets & Mappers
// Maps UI slider values (0-100) to actual game parameters

import type { GameplaySettings, GameplayPreset } from '@/types/progress.types';

// Preset configurations (UI values 0-100)
export const GAMEPLAY_PRESETS: Record<GameplayPreset, Omit<GameplaySettings, 'showContextMessages' | 'pauseOnContextMessages'>> = {
  zen: {
    preset: 'zen',
    objectSpeed: 0,        // No movement
    spawnRate: 0,          // Instant spawn (special case)
    maxCorrect: 10,
    maxDistractors: 10,
    animationIntensity: 0  // No background animations
  },
  easy: {
    preset: 'easy',
    objectSpeed: 25,       // Slow
    spawnRate: 30,         // ~1.5 obj/sec
    maxCorrect: 3,
    maxDistractors: 3,
    animationIntensity: 5  // Medium animations
  },
  medium: {
    preset: 'medium',
    objectSpeed: 50,       // Normal
    spawnRate: 50,         // ~2.5 obj/sec
    maxCorrect: 5,
    maxDistractors: 5,
    animationIntensity: 7  // More animations
  },
  hard: {
    preset: 'hard',
    objectSpeed: 75,       // Fast
    spawnRate: 75,         // ~3.75 obj/sec
    maxCorrect: 8,
    maxDistractors: 8,
    animationIntensity: 10 // Maximum animations
  },
  custom: {
    preset: 'custom',
    objectSpeed: 50,       // Default to medium
    spawnRate: 50,
    maxCorrect: 5,
    maxDistractors: 5,
    animationIntensity: 7
  }
};

// Default settings
export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
  ...GAMEPLAY_PRESETS.medium,
  showContextMessages: true,
  pauseOnContextMessages: false
};

// Mapper functions: UI values (0-100) → Game values

/**
 * Maps object speed slider (0-100) to speed multiplier (0-2.0)
 * 0 = stationary (Zen mode)
 * 50 = normal speed (1.0x)
 * 100 = double speed (2.0x)
 */
export function mapObjectSpeed(sliderValue: number): number {
  return (sliderValue / 100) * 2.0;
}

/**
 * Maps spawn rate slider (0-100) to objects per second (0-5)
 * 0 = no spawning / instant spawn (Zen mode)
 * 50 = 2.5 obj/sec
 * 100 = 5 obj/sec
 */
export function mapSpawnRate(sliderValue: number): number {
  return (sliderValue / 100) * 5.0;
}

/**
 * Maps animation intensity (0-10) to animation speed multiplier (0-2.0)
 * 0 = no background animations
 * 5 = normal speed (1.0x)
 * 10 = double speed (2.0x)
 */
export function mapAnimationIntensity(intensity: number): number {
  return (intensity / 10) * 2.0;
}

/**
 * Gets health based on preset
 */
export function getHealthForPreset(preset: GameplayPreset): number {
  const healthMap: Record<GameplayPreset, number> = {
    zen: 20,
    easy: 12,
    medium: 10,
    hard: 8,
    custom: 10 // Default to medium
  };
  return healthMap[preset];
}

/**
 * Calculates total spawn time based on object count and spawn rate
 * @param objectCount Total number of objects to spawn
 * @param objectsPerSecond Spawn rate (0 = instant)
 * @returns Total spawn time in seconds (0 for instant spawn)
 */
export function calculateSpawnTime(objectCount: number, objectsPerSecond: number): number {
  if (objectsPerSecond === 0) {
    return 0; // Instant spawn (Zen mode)
  }
  return objectCount / objectsPerSecond;
}

