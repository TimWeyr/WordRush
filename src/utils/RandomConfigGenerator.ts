// Random Configuration Generator
// Generates random but sensible visual and spawn configurations
// Ensures uniqueness within a chapter

import type { VisualConfig, CorrectEntry, DistractorEntry, Item } from '@/types/content.types';

const COLORS = [
  '#2196F3', '#4CAF50', '#f44336', '#FFC107', '#9C27B0',
  '#00BCD4', '#FF5722', '#795548', '#E91E63', '#3F51B5',
  '#00E676', '#FF6D00', '#D500F9', '#00B0FF', '#FF1744',
];

const VARIANTS = ['hexagon', 'star', 'bubble', 'spike', 'square', 'diamond'];

interface UsedConfig {
  color: string;
  variant: string;
}

export class RandomConfigGenerator {
  private usedConfigs: Map<string, UsedConfig[]> = new Map();

  // Track used configs for a chapter
  setChapterItems(chapterId: string, items: Item[]) {
    const used: UsedConfig[] = [];
    
    items.forEach(item => {
      // Track base config
      if (item.base.visual.color && item.base.visual.variant) {
        used.push({
          color: item.base.visual.color,
          variant: item.base.visual.variant,
        });
      }

      // Track correct configs
      item.correct.forEach(c => {
        if (c.visual.color && c.visual.variant) {
          used.push({
            color: c.visual.color,
            variant: c.visual.variant,
          });
        }
      });

      // Track distractor configs
      item.distractors.forEach(d => {
        if (d.visual.color && d.visual.variant) {
          used.push({
            color: d.visual.color,
            variant: d.visual.variant,
          });
        }
      });
    });

    this.usedConfigs.set(chapterId, used);
  }

  // Check if config combo is already used
  private isConfigUsed(chapterId: string, color: string, variant: string): boolean {
    const used = this.usedConfigs.get(chapterId) || [];
    return used.some(c => c.color === color && c.variant === variant);
  }

  // Generate random visual config
  generateVisualConfig(chapterId: string, existingItems: Item[]): VisualConfig {
    // Update used configs
    this.setChapterItems(chapterId, existingItems);

    let color = COLORS[Math.floor(Math.random() * COLORS.length)];
    let variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

    // Try to find unique combo (max 20 attempts)
    let attempts = 0;
    while (this.isConfigUsed(chapterId, color, variant) && attempts < 20) {
      color = COLORS[Math.floor(Math.random() * COLORS.length)];
      variant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
      attempts++;
    }

    const fontSize = 0.9 + Math.random() * 0.3; // 0.9 to 1.2
    const pulsate = Math.random() > 0.7; // 30% chance
    const shake = Math.random() > 0.9; // 10% chance
    const glow = Math.random() > 0.5; // 50% chance

    return {
      color,
      variant,
      fontSize: parseFloat(fontSize.toFixed(1)),
      pulsate,
      shake,
      glow,
    };
  }

  // Generate random spawn config for correct entry
  generateCorrectSpawnConfig(): Partial<CorrectEntry> {
    const spawnPosition = 0.2 + Math.random() * 0.6; // 0.2 to 0.8
    const spawnSpread = 0.03 + Math.random() * 0.07; // 0.03 to 0.10
    const speed = 0.8 + Math.random() * 0.5; // 0.8 to 1.3
    const points = Math.round((10 + Math.random() * 20) / 5) * 5; // 10, 15, 20, 25, 30
    
    const behaviors = ['linear_inward', 'seek_center', 'wave'];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

    return {
      spawnPosition: parseFloat(spawnPosition.toFixed(2)),
      spawnSpread: parseFloat(spawnSpread.toFixed(2)),
      speed: parseFloat(speed.toFixed(1)),
      points,
      behavior,
    };
  }

  // Generate random spawn config for distractor entry
  generateDistractorSpawnConfig(): Partial<DistractorEntry> {
    const spawnPosition = 0.2 + Math.random() * 0.6; // 0.2 to 0.8
    const spawnSpread = 0.03 + Math.random() * 0.07; // 0.03 to 0.10
    const speed = 1.0 + Math.random() * 0.6; // 1.0 to 1.6 (faster than correct)
    const points = -Math.round((5 + Math.random() * 15) / 5) * 5; // -5, -10, -15, -20
    const damage = Math.round((5 + Math.random() * 15) / 5) * 5; // 5, 10, 15, 20
    
    const behaviors = ['linear_inward', 'zigzag', 'spiral'];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];

    return {
      spawnPosition: parseFloat(spawnPosition.toFixed(2)),
      spawnSpread: parseFloat(spawnSpread.toFixed(2)),
      speed: parseFloat(speed.toFixed(1)),
      points,
      damage,
      behavior,
    };
  }

  // Apply random config to entire item
  applyRandomToItem(item: Item, allChapterItems: Item[]): Item {
    this.setChapterItems(item.chapter, allChapterItems);

    const newItem = { ...item };

    // Randomize base visual
    newItem.base = {
      ...newItem.base,
      visual: this.generateVisualConfig(item.chapter, allChapterItems),
    };

    // Randomize correct entries
    newItem.correct = newItem.correct.map(correct => ({
      ...correct,
      ...this.generateCorrectSpawnConfig(),
      visual: this.generateVisualConfig(item.chapter, allChapterItems),
    }));

    // Randomize distractor entries
    newItem.distractors = newItem.distractors.map(distractor => ({
      ...distractor,
      ...this.generateDistractorSpawnConfig(),
      visual: this.generateVisualConfig(item.chapter, allChapterItems),
    }));

    return newItem;
  }
}

// Singleton instance
export const randomConfigGenerator = new RandomConfigGenerator();

