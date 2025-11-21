// Score Calculator Utility
// Calculates maximum possible scores and percentages for items, chapters, themes, and universes

import type { Item, CorrectEntry, DistractorEntry, Theme, Universe, ChapterConfig } from '@/types/content.types';
import type { LearningState, ItemLearningState } from '@/types/progress.types';

/**
 * Calculates the maximum possible score for an item
 * This is the theoretical maximum if everything is done perfectly:
 * - All correct objects collected (+points)
 * - All distractors shot (+points)
 * - Collection order bonus (x2) if collectionOrder is present
 * - Reaction time bonus is ignored for max calculation (too variable)
 */
export function calculateMaxPossibleScore(item: Item): number {
  // Sum of all correct points (if all collected)
  const correctPoints = item.correct.reduce((sum, entry) => sum + entry.points, 0);
  
  // Sum of all distractor points (if all shot)
  const distractorPoints = item.distractors.reduce((sum, entry) => sum + entry.points, 0);
  
  // Base score
  let maxScore = correctPoints + distractorPoints;
  
  // Check if collection order bonus applies (if any correct has collectionOrder)
  const hasCollectionOrder = item.correct.some(entry => entry.collectionOrder !== undefined);
  if (hasCollectionOrder) {
    // Collection order bonus: double the correct points
    maxScore = distractorPoints + (correctPoints * 2);
  }
  
  return maxScore;
}

/**
 * Calculates percentage score for an item
 * Uses bestScore (best single attempt) instead of totalScore (sum of all attempts)
 * This reflects the player's best performance, not cumulative score
 */
export function calculateItemScorePercentage(itemState: ItemLearningState, maxScore: number): number {
  if (maxScore === 0) return 0;
  // Use bestScore for percentage calculation - reflects best single attempt performance
  const percentage = (itemState.bestScore / maxScore) * 100;
  return Math.min(100, Math.max(0, percentage)); // Cap between 0 and 100
}

/**
 * Get complete score information for an item
 */
export function getItemScore(
  itemId: string,
  item: Item,
  learningState: LearningState
): { bestScore: number; totalScore: number; maxScore: number; percentage: number } {
  const itemState = learningState[itemId] || {
    bestScore: 0,
    totalScore: 0
  } as ItemLearningState;
  
  const maxScore = calculateMaxPossibleScore(item);
  const percentage = calculateItemScorePercentage(itemState, maxScore);
  
  return {
    bestScore: itemState.bestScore || 0,
    totalScore: itemState.totalScore || 0,
    maxScore,
    percentage
  };
}

/**
 * Get complete score information for a chapter
 * Aggregates all items in the chapter
 * Uses bestScore for percentage calculation (average of best attempts per item)
 * Uses totalScore for cumulative score tracking
 */
export function getChapterScore(
  chapterId: string,
  chapterItems: Item[],
  learningState: LearningState
): { totalScore: number; maxScore: number; percentage: number } {
  let totalScore = 0;
  let bestScoreSum = 0; // Sum of best scores for percentage calculation
  let maxScore = 0;
  
  for (const item of chapterItems) {
    const itemScore = getItemScore(item.id, item, learningState);
    totalScore += itemScore.totalScore; // Cumulative score for tracking
    bestScoreSum += itemScore.bestScore; // Best scores for percentage
    maxScore += itemScore.maxScore;
  }
  
  // Calculate percentage based on best scores (average best performance)
  // This reflects the player's best performance across all items, not cumulative attempts
  const percentage = maxScore > 0 ? Math.min(100, Math.max(0, (bestScoreSum / maxScore) * 100)) : 0;
  
  return {
    totalScore,
    maxScore,
    percentage
  };
}

/**
 * Get complete score information for a specific level within a chapter
 * Filters items by level and calculates aggregated score
 */
export function getLevelScore(
  chapterId: string,
  level: number,
  chapterItems: Item[],
  learningState: LearningState
): { totalScore: number; maxScore: number; percentage: number } {
  // Filter items by level
  const levelItems = chapterItems.filter(item => item.level === level);
  
  if (levelItems.length === 0) {
    return { totalScore: 0, maxScore: 0, percentage: 0 };
  }
  
  let totalScore = 0;
  let bestScoreSum = 0; // Sum of best scores for percentage calculation
  let maxScore = 0;
  
  for (const item of levelItems) {
    const itemScore = getItemScore(item.id, item, learningState);
    totalScore += itemScore.totalScore; // Cumulative score for tracking
    bestScoreSum += itemScore.bestScore; // Best scores for percentage
    maxScore += itemScore.maxScore;
  }
  
  // Calculate percentage based on best scores (average best performance)
  // This reflects the player's best performance across all items in this level
  const percentage = maxScore > 0 
    ? Math.min(100, Math.max(0, (bestScoreSum / maxScore) * 100)) 
    : 0;
  
  return { totalScore, maxScore, percentage };
}

/**
 * Get complete score information for a theme
 * Aggregates all chapters in the theme
 */
export function getThemeScore(
  themeId: string,
  theme: Theme,
  allItems: Item[],
  learningState: LearningState
): { totalScore: number; maxScore: number; percentage: number } {
  let totalScore = 0;
  let maxScore = 0;
  
  // Get all items for this theme
  const themeItems = allItems.filter(item => item.theme === themeId);
  
  // Group items by chapter
  const itemsByChapter = new Map<string, Item[]>();
  for (const item of themeItems) {
    if (!itemsByChapter.has(item.chapter)) {
      itemsByChapter.set(item.chapter, []);
    }
    itemsByChapter.get(item.chapter)!.push(item);
  }
  
  // Calculate score for each chapter
  for (const [chapterId, chapterItems] of itemsByChapter) {
    const chapterScore = getChapterScore(chapterId, chapterItems, learningState);
    totalScore += chapterScore.totalScore;
    maxScore += chapterScore.maxScore;
  }
  
  const percentage = maxScore > 0 ? Math.min(100, Math.max(0, (totalScore / maxScore) * 100)) : 0;
  
  return {
    totalScore,
    maxScore,
    percentage
  };
}

/**
 * Get complete score information for a universe
 * Aggregates all themes in the universe
 */
export function getUniverseScore(
  universeId: string,
  universe: Universe,
  allThemes: Theme[],
  allItems: Item[],
  learningState: LearningState
): { totalScore: number; maxScore: number; percentage: number } {
  let totalScore = 0;
  let maxScore = 0;
  
  // Get all themes for this universe
  const universeThemes = allThemes.filter(theme => universe.themes.includes(theme.id));
  
  // Calculate score for each theme
  for (const theme of universeThemes) {
    const themeScore = getThemeScore(theme.id, theme, allItems, learningState);
    totalScore += themeScore.totalScore;
    maxScore += themeScore.maxScore;
  }
  
  const percentage = maxScore > 0 ? Math.min(100, Math.max(0, (totalScore / maxScore) * 100)) : 0;
  
  return {
    totalScore,
    maxScore,
    percentage
  };
}

