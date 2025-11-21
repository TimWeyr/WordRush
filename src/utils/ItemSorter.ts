// Item Sorter Utility
// Sorts items based on different ordering strategies

import type { Item } from '@/types/content.types';
import type { LearningState } from '@/types/progress.types';
import { calculateMaxPossibleScore } from './ScoreCalculator';

export type ItemOrder = 'default' | 'random' | 'worst-first-unplayed';

/**
 * Sorts items based on the specified order strategy
 */
export function sortItems(
  items: Item[],
  order: ItemOrder,
  learningState: LearningState
): Item[] {
  // Create a copy to avoid mutating the original array
  const sortedItems = [...items];

  switch (order) {
    case 'default':
      // Return items in original order
      return sortedItems;

    case 'random':
      // Fisher-Yates shuffle
      for (let i = sortedItems.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sortedItems[i], sortedItems[j]] = [sortedItems[j], sortedItems[i]];
      }
      return sortedItems;

    case 'worst-first-unplayed':
      // Sort by score percentage (lowest first), then unplayed items first
      return sortedItems.sort((a, b) => {
        const itemStateA = learningState[a.id];
        const itemStateB = learningState[b.id];
        
        // Get attempts (0 if item not played yet)
        const attemptsA = itemStateA?.attempts || 0;
        const attemptsB = itemStateB?.attempts || 0;
        
        // Calculate score percentages
        const maxScoreA = calculateMaxPossibleScore(a);
        const maxScoreB = calculateMaxPossibleScore(b);
        
        const percentageA = maxScoreA > 0 
          ? ((itemStateA?.bestScore || 0) / maxScoreA) * 100 
          : 0;
        const percentageB = maxScoreB > 0 
          ? ((itemStateB?.bestScore || 0) / maxScoreB) * 100 
          : 0;
        
        // First sort by percentage (lowest first)
        if (percentageA !== percentageB) {
          return percentageA - percentageB;
        }
        
        // If percentages are equal, sort by played status
        // Ungespielte (attempts === 0) come first
        if (attemptsA === 0 && attemptsB > 0) {
          return -1; // A comes before B
        }
        if (attemptsA > 0 && attemptsB === 0) {
          return 1; // B comes before A
        }
        
        // If both are played or both are unplayed, maintain original order
        return 0;
      });

    default:
      return sortedItems;
  }
}

