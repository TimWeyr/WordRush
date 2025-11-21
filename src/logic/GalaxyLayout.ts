// Galaxy Layout System
// Calculates positions for planets (themes) and moons (chapters) using grid-based layout

import type { Theme, ChapterConfig, Item } from '@/types/content.types';

export interface PlanetLayout {
  id: string;
  x: number;
  y: number;
  radius: number;
  theme: Theme;
}

export interface MoonLayout {
  id: string;
  chapterId: string;
  angle: number;
  radius: number;
  x: number;
  y: number;
  chapter: ChapterConfig;
}

export interface ItemLayout {
  id: string;
  itemId: string;
  level: number;
  angle: number;
  x: number;
  y: number;
}

export interface LevelRingLayout {
  level: number;
  radius: number;
  moonId: string;
  chapterId: string;
}

const PLANET_RADIUS = 40;
const MOON_ORBIT_RADIUS = 80;
const MOON_RADIUS = 15;
const BASE_ITEM_DISTANCE = 20;
const BASE_LEVEL_SPACING = 8; // Base spacing per level
const MIN_LEVEL_SPACING = 6; // Minimum spacing to prevent overlap
const MAX_LEVEL_SPACING = 15; // Maximum spacing for very high levels

// New constants for horizontal S-curve and moon spacing
const S_CURVE_AMPLITUDE_FACTOR = 0.3; // Amplitude of S-curve relative to screen height
const PLANET_SPACING_VARIATION = 0.05; // Variation in planet spacing (±5%)
const MOON_RING_PADDING = 15; // Padding between moon rings and planets/moons
const MIN_RING_GAP = 10; // Minimum gap between rings

/**
 * Calculates grid-based positions for planets (themes)
 * Ensures minimum distance between planets
 */
export function calculatePlanetPositions(
  themes: Theme[],
  screenWidth: number,
  screenHeight: number
): PlanetLayout[] {
  const layouts: PlanetLayout[] = [];
  
  if (themes.length === 0) return layouts;
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(themes.length));
  const rows = Math.ceil(themes.length / cols);
  
  // Calculate cell size with padding
  const cellWidth = screenWidth / cols;
  const cellHeight = screenHeight / rows;
  
  // Center offset
  const offsetX = cellWidth / 2;
  const offsetY = cellHeight / 2;
  
  themes.forEach((theme, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = col * cellWidth + offsetX;
    const y = row * cellHeight + offsetY;
    
    layouts.push({
      id: theme.id,
      x,
      y,
      radius: PLANET_RADIUS,
      theme
    });
  });
  
  return layouts;
}

/**
 * Calculates planet positions on a vertical S-curve (maeander)
 * Planets are distributed vertically, x-position follows horizontal S-curve
 * Horizontally centered with slight variation in spacing
 */
export function calculatePlanetPositionsHorizontalMaeander(
  themes: Theme[],
  screenWidth: number,
  screenHeight: number
): PlanetLayout[] {
  const layouts: PlanetLayout[] = [];
  
  if (themes.length === 0) return layouts;
  
  // Calculate S-curve parameters for horizontal S-curve
  const centerX = screenWidth / 2;
  const amplitude = screenWidth * S_CURVE_AMPLITUDE_FACTOR;
  
  // Calculate base vertical spacing
  const padding = PLANET_RADIUS * 2; // Padding from screen edges
  const availableHeight = screenHeight - (padding * 2);
  const baseSpacing = themes.length > 1 ? availableHeight / (themes.length - 1) : screenHeight / 2;
  
  themes.forEach((theme, index) => {
    // Calculate y position with slight variation
    const variation = (Math.random() - 0.5) * PLANET_SPACING_VARIATION * baseSpacing;
    const y = padding + index * baseSpacing + variation;
    
    // Calculate x position following horizontal S-curve
    // Normalize y position to 0-1 range for S-curve calculation
    const normalizedY = (y - padding) / availableHeight;
    // Create S-curve: start at left, go right in S-shape
    const sCurveValue = Math.sin(normalizedY * Math.PI * 2);
    const x = centerX + amplitude * sCurveValue;
    
    // Ensure planets don't go outside screen bounds
    const clampedX = Math.max(PLANET_RADIUS, Math.min(screenWidth - PLANET_RADIUS, x));
    const clampedY = Math.max(PLANET_RADIUS, Math.min(screenHeight - PLANET_RADIUS, y));
    
    layouts.push({
      id: theme.id,
      x: clampedX,
      y: clampedY,
      radius: PLANET_RADIUS,
      theme
    });
  });
  
  return layouts;
}

/**
 * Calculates positions for moons (chapters) around a planet
 * Evenly distributes moons in a circle
 */
export function calculateMoonPositions(
  chapters: Record<string, ChapterConfig>,
  planetX: number,
  planetY: number
): MoonLayout[] {
  const layouts: MoonLayout[] = [];
  
  const chapterIds = Object.keys(chapters);
  if (chapterIds.length === 0) return layouts;
  
  const angleStep = (Math.PI * 2) / chapterIds.length;
  
  chapterIds.forEach((chapterId, index) => {
    const angle = index * angleStep;
    const x = planetX + Math.cos(angle) * MOON_ORBIT_RADIUS;
    const y = planetY + Math.sin(angle) * MOON_ORBIT_RADIUS;
    
    layouts.push({
      id: `${chapterId}`,
      chapterId,
      angle,
      radius: MOON_RADIUS,
      x,
      y,
      chapter: chapters[chapterId]
    });
  });
  
  return layouts;
}

/**
 * Calculates adaptive moon positions around a planet
 * Moons with many levels alternate with moons with few levels
 * Distances are based on maximum ring radius
 * Dynamic angle distribution based on required space
 */
export function calculateMoonPositionsAdaptive(
  chapters: Record<string, ChapterConfig>,
  planetX: number,
  planetY: number,
  chapterItemsMap: Map<string, Item[]>
): MoonLayout[] {
  const layouts: MoonLayout[] = [];
  
  const chapterIds = Object.keys(chapters);
  if (chapterIds.length === 0) return layouts;
  
  // Create array of chapter info with level count and required radius
  const chapterInfos: Array<{ chapterId: string; levelCount: number; maxRadius: number; items: Item[] }> = [];
  
  for (const chapterId of chapterIds) {
    const items = chapterItemsMap.get(chapterId) || [];
    const levels = new Set(items.map(item => item.level));
    const levelCount = levels.size;
    const maxRadius = calculateRequiredMoonRadius(items);
    
    chapterInfos.push({
      chapterId,
      levelCount,
      maxRadius,
      items
    });
  }
  
  // Sort by level count (descending)
  chapterInfos.sort((a, b) => b.levelCount - a.levelCount);
  
  // Alternate: many ↔ few ↔ many ↔ few
  const sortedChapters: typeof chapterInfos = [];
  const manyLevels: typeof chapterInfos = [];
  const fewLevels: typeof chapterInfos = [];
  
  // Calculate median level count
  if (chapterInfos.length === 0) {
    return layouts;
  }
  
  const medianIndex = Math.floor(chapterInfos.length / 2);
  const medianLevelCount = chapterInfos[medianIndex]?.levelCount || 0;
  
  for (const info of chapterInfos) {
    if (info.levelCount >= medianLevelCount) {
      manyLevels.push(info);
    } else {
      fewLevels.push(info);
    }
  }
  
  // Alternate between many and few
  let manyIndex = 0;
  let fewIndex = 0;
  
  for (let i = 0; i < chapterInfos.length; i++) {
    if (i % 2 === 0 && manyIndex < manyLevels.length) {
      sortedChapters.push(manyLevels[manyIndex++]);
    } else if (fewIndex < fewLevels.length) {
      sortedChapters.push(fewLevels[fewIndex++]);
    } else if (manyIndex < manyLevels.length) {
      sortedChapters.push(manyLevels[manyIndex++]);
    }
  }
  
  // Calculate distances based on max ring radius
  const distances: number[] = [];
  for (const info of sortedChapters) {
    // Distance = max ring radius + padding
    const distance = info.maxRadius + MOON_RING_PADDING;
    distances.push(distance);
  }
  
  // Calculate angles with dynamic spacing
  // Moons with many levels get more space (both distance and angle)
  const angles: number[] = [];
  const totalAngle = Math.PI * 2;
  
  // Calculate minimum required angles between adjacent moons
  const minAngles: number[] = [];
  for (let i = 0; i < sortedChapters.length; i++) {
    const distance = distances[i];
    const nextDistance = distances[(i + 1) % sortedChapters.length];
    const maxRadius1 = distance;
    const maxRadius2 = nextDistance;
    
    // Calculate minimum angle to avoid collision
    // Law of cosines: c² = a² + b² - 2ab*cos(C)
    const minSeparation = MOON_RADIUS * 2 + MOON_RING_PADDING;
    const a = maxRadius1;
    const b = maxRadius2;
    const c = minSeparation;
    
    // Calculate angle using law of cosines
    const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
    let minAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    // Give moons with many levels extra angle space
    // Factor based on level count relative to max level count
    const maxLevelCount = Math.max(...sortedChapters.map(info => info.levelCount));
    const currentLevelCount = sortedChapters[i].levelCount;
    const levelFactor = maxLevelCount > 0 ? currentLevelCount / maxLevelCount : 1;
    
    // Increase angle for moons with many levels (up to 50% more)
    const angleBonus = minAngle * 0.5 * levelFactor;
    minAngle += angleBonus;
    
    minAngles.push(minAngle);
  }
  
  // Distribute angles ensuring all minimum angles are met
  const sumMinAngles = minAngles.reduce((sum, angle) => sum + angle, 0);
  
  if (sumMinAngles > totalAngle) {
    // Not enough space - scale down proportionally
    const scale = totalAngle / sumMinAngles;
    let currentAngle = 0;
    for (let i = 0; i < sortedChapters.length; i++) {
      angles.push(currentAngle);
      currentAngle += minAngles[i] * scale;
    }
  } else {
    // Enough space - distribute remaining angle proportionally to level count
    const remainingAngle = totalAngle - sumMinAngles;
    
    // Calculate total level count for proportional distribution
    const totalLevelCount = sortedChapters.reduce((sum, info) => sum + info.levelCount, 0);
    
    let currentAngle = 0;
    for (let i = 0; i < sortedChapters.length; i++) {
      angles.push(currentAngle);
      
      // Distribute extra angle proportionally to level count
      const levelCount = sortedChapters[i].levelCount;
      const extraAngle = totalLevelCount > 0 
        ? (remainingAngle * levelCount) / totalLevelCount
        : remainingAngle / sortedChapters.length;
      
      currentAngle += minAngles[i] + extraAngle;
    }
  }
  
  // Create layouts with calculated positions
  for (let i = 0; i < sortedChapters.length; i++) {
    const info = sortedChapters[i];
    const chapterId = info.chapterId;
    const distance = distances[i];
    const angle = angles[i];
    
    const x = planetX + Math.cos(angle) * distance;
    const y = planetY + Math.sin(angle) * distance;
    
    layouts.push({
      id: `${chapterId}`,
      chapterId,
      angle,
      radius: MOON_RADIUS,
      x,
      y,
      chapter: chapters[chapterId]
    });
  }
  
  return layouts;
}

/**
 * Calculates the maximum radius required for a moon based on its level rings
 * Used to determine moon-planet distance and moon-moon distance
 */
export function calculateRequiredMoonRadius(items: Item[]): number {
  if (items.length === 0) return MOON_RADIUS;
  
  const levels = new Set(items.map(item => item.level));
  const levelsArray = Array.from(levels).sort((a, b) => a - b);
  const maxLevel = Math.max(...levelsArray);
  
  if (levelsArray.length === 0) return MOON_RADIUS;
  
  // Calculate dynamic spacing based on maximum level
  const levelSpacing = calculateLevelSpacing(maxLevel);
  
  // Calculate maximum ring radius by simulating ring calculation
  // Use same two-pass approach as calculateLevelRings
  const baseRadii: number[] = [];
  levelsArray.forEach((level) => {
    const baseRadius = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * level);
    baseRadii.push(baseRadius);
  });
  
  // Second pass: adjust radii to ensure MIN_RING_GAP between adjacent rings
  const adjustedRadii: number[] = [];
  for (let i = 0; i < baseRadii.length; i++) {
    let radius = baseRadii[i];
    
    // Ensure minimum gap from previous ring
    if (i > 0) {
      const prevRadius = adjustedRadii[i - 1];
      const minRadius = prevRadius + MIN_RING_GAP;
      radius = Math.max(radius, minRadius);
    }
    
    adjustedRadii.push(radius);
  }
  
  // Return maximum radius
  return adjustedRadii.length > 0 ? Math.max(...adjustedRadii) : MOON_RADIUS + BASE_ITEM_DISTANCE;
}

/**
 * Calculates dynamic level spacing based on maximum level
 * Ensures rings don't overlap even with many levels
 */
function calculateLevelSpacing(maxLevel: number): number {
  if (maxLevel <= 1) return BASE_LEVEL_SPACING;
  
  // Calculate spacing factor: more levels = more spacing needed
  // Formula: spacing increases logarithmically with max level
  const spacingFactor = Math.min(MAX_LEVEL_SPACING, Math.max(MIN_LEVEL_SPACING, BASE_LEVEL_SPACING * (1 + Math.log(maxLevel) / 2)));
  
  return spacingFactor;
}

/**
 * Calculates level rings for a moon
 * Returns ring layouts for each level that has items
 * Uses dynamic spacing based on maximum level to prevent overlap
 * Ensures MIN_RING_GAP between rings
 */
export function calculateLevelRings(
  items: Item[],
  moonId: string,
  chapterId: string
): LevelRingLayout[] {
  const rings: LevelRingLayout[] = [];
  
  if (items.length === 0) return rings;
  
  // Get unique levels from items, sorted
  const levels = new Set(items.map(item => item.level));
  const levelsArray = Array.from(levels).sort((a, b) => a - b);
  const maxLevel = Math.max(...levelsArray);
  
  // Calculate dynamic spacing based on maximum level
  const levelSpacing = calculateLevelSpacing(maxLevel);
  
  // Create ring for each level with guaranteed minimum gap
  // Use a two-pass approach: first calculate base radii, then adjust to ensure gaps
  const baseRadii: number[] = [];
  levelsArray.forEach((level) => {
    const baseRadius = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * level);
    baseRadii.push(baseRadius);
  });
  
  // Second pass: adjust radii to ensure MIN_RING_GAP between adjacent rings
  const adjustedRadii: number[] = [];
  for (let i = 0; i < baseRadii.length; i++) {
    let radius = baseRadii[i];
    
    // Ensure minimum gap from previous ring
    if (i > 0) {
      const prevRadius = adjustedRadii[i - 1];
      const minRadius = prevRadius + MIN_RING_GAP;
      radius = Math.max(radius, minRadius);
    }
    
    adjustedRadii.push(radius);
  }
  
  // Create rings with adjusted radii
  levelsArray.forEach((level, index) => {
    rings.push({
      level,
      radius: adjustedRadii[index],
      moonId,
      chapterId
    });
  });
  
  // Sort by level (should already be sorted, but just in case)
  rings.sort((a, b) => a.level - b.level);
  
  return rings;
}

/**
 * Calculates positions for items around a moon
 * Groups items by level and distributes them on level-specific orbits
 */
export function calculateItemPositions(
  items: Item[],
  moonX: number,
  moonY: number
): ItemLayout[] {
  const layouts: ItemLayout[] = [];
  
  if (items.length === 0) return layouts;
  
  // Group items by level
  const itemsByLevel = new Map<number, Item[]>();
  for (const item of items) {
    if (!itemsByLevel.has(item.level)) {
      itemsByLevel.set(item.level, []);
    }
    itemsByLevel.get(item.level)!.push(item);
  }
  
  // Get maximum level for dynamic spacing calculation
  const maxLevel = Math.max(...Array.from(itemsByLevel.keys()));
  const levelSpacing = calculateLevelSpacing(maxLevel);
  
  // Calculate positions for each level group
  for (const [level, levelItems] of itemsByLevel) {
    // Calculate orbit radius for this level using dynamic spacing
    const orbitRadius = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * level);
    
    // Distribute items evenly on circle
    const angleStep = (Math.PI * 2) / levelItems.length;
    
    levelItems.forEach((item, index) => {
      const angle = index * angleStep;
      const x = moonX + Math.cos(angle) * orbitRadius;
      const y = moonY + Math.sin(angle) * orbitRadius;
      
      layouts.push({
        id: item.id,
        itemId: item.id,
        level: item.level,
        angle,
        x,
        y
      });
    });
  }
  
  return layouts;
}

