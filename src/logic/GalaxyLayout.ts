// Galaxy Layout System
// Calculates positions for planets (themes) and moons (chapters) using grid-based layout

import type { Theme, ChapterConfig, Item } from '@/types/content.types';

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================

/** Enable detailed debug logging for layout calculations */
const DEBUG_LAYOUT = false;

/** Helper object for conditional debug logging */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debugLog = DEBUG_LAYOUT ? {
  log: (...args: any[]): void => {
    // eslint-disable-next-line no-console
    console.log('🪐✨🌓🌌', ...args);
  },
  group: (...args: any[]): void => {
    // eslint-disable-next-line no-console
    console.group('🪐✨🌓🌌', ...args);
  },
  groupEnd: (): void => {
    // eslint-disable-next-line no-console
    console.groupEnd();
  },
  warn: (...args: any[]): void => {
    // eslint-disable-next-line no-console
    console.warn('🪐✨🌓🌌', ...args);
  },
} : {
  log: (): void => {},
  group: (): void => {},
  groupEnd: (): void => {},
  warn: (): void => {},
};

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

const PLANET_RADIUS = 50;
const MOON_ORBIT_RADIUS = 80;
const MOON_RADIUS = 25;
const BASE_ITEM_DISTANCE = 2; // Distance from moon center to first ring
const MIN_LEVEL_SPACING = 8; // Minimum spacing (for MANY levels - prevents overlap)
const MAX_LEVEL_SPACING = 30; // Maximum spacing (for very few levels - looks good)

// New constants for horizontal S-curve and moon spacing
const S_CURVE_AMPLITUDE_FACTOR = 0.3; // Amplitude of S-curve relative to screen height
const PLANET_SPACING_VARIATION = 0.05; // Variation in planet spacing (±5%)

// Moon spacing constants - CLARIFIED NAMING
const MOON_MIN_CLEARANCE = 80; // Minimum space between outermost rings of adjacent moons
const PLANET_TO_MOON_BASE_DISTANCE = 100; // Base distance from planet center to moon center (very small moons)
const MOON_EXTRA_DISTANCE_PER_RING_PX = 0.5; // Additional distance per pixel of ring extent (0.5 = 50% of ring size)

// Ring spacing constants
const MIN_RING_GAP = 15; // Minimum gap between adjacent rings on same moon

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
 * Simple version: Evenly distributes moons in a circle at fixed distance
 * (Does not adapt to moon size)
 */
export function calculateMoonPositions(
  chapters: Record<string, ChapterConfig>,
  planetX: number,
  planetY: number
): MoonLayout[] {
  const layouts: MoonLayout[] = [];
  
  const chapterIds = Object.keys(chapters);
  if (chapterIds.length === 0) return layouts;
  
  const angleStepBetweenMoons = (Math.PI * 2) / chapterIds.length;
  
  chapterIds.forEach((chapterId, index) => {
    const angleAroundPlanet = index * angleStepBetweenMoons;
    const distanceFromPlanetCenter = MOON_ORBIT_RADIUS;
    
    const x = planetX + Math.cos(angleAroundPlanet) * distanceFromPlanetCenter;
    const y = planetY + Math.sin(angleAroundPlanet) * distanceFromPlanetCenter;
    
    layouts.push({
      id: `${chapterId}`,
      chapterId,
      angle: angleAroundPlanet,
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
  
  // Create array of chapter info with level count and ring extent
  // ringExtent = radius from moon center to outermost ring (includes all level rings)
  const chapterInfos: Array<{ 
    chapterId: string; 
    levelCount: number; 
    ringExtent: number; // Distance from moon center to outermost ring
    items: Item[] 
  }> = [];
  
  debugLog.group('🔍 Analyzing Moon Sizes');
  for (const chapterId of chapterIds) {
    const items = chapterItemsMap.get(chapterId) || [];
    const levels = new Set(items.map(item => item.level));
    const levelCount = levels.size;
    const ringExtent = calculateMoonRingExtent(items);
    
    debugLog.log(`  📊 ${chapterId}: ${levelCount} levels, ${items.length} items → ringExtent=${ringExtent.toFixed(1)}px`);
    
    chapterInfos.push({
      chapterId,
      levelCount,
      ringExtent,
      items
    });
  }
  debugLog.groupEnd();
  
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
  
  // Alternate between many and few for better visual distribution
  // Strategy: Distribute evenly, prioritizing alternation when possible
  let manyIndex = 0;
  let fewIndex = 0;
  
  // Calculate ratio to determine optimal alternation pattern
  const totalChapters = chapterInfos.length;
  const manyCount = manyLevels.length;
  const fewCount = fewLevels.length;
  
  // If counts are very different, use weighted alternation
  if (manyCount > 0 && fewCount > 0) {
    // Calculate how often to alternate
    const ratio = manyCount / fewCount;
    
    if (ratio <= 2 && ratio >= 0.5) {
      // Similar counts: strict alternation
      for (let i = 0; i < totalChapters; i++) {
        if (i % 2 === 0 && manyIndex < manyCount) {
          sortedChapters.push(manyLevels[manyIndex++]);
        } else if (fewIndex < fewCount) {
          sortedChapters.push(fewLevels[fewIndex++]);
        } else if (manyIndex < manyCount) {
          sortedChapters.push(manyLevels[manyIndex++]);
        }
      }
    } else {
      // Very different counts: distribute evenly but prioritize alternation
      // Use pattern: many, few, many, few, ... until one runs out
      let useMany = manyCount >= fewCount;
      
      for (let i = 0; i < totalChapters; i++) {
        if (useMany && manyIndex < manyCount) {
          sortedChapters.push(manyLevels[manyIndex++]);
          // Switch if we have both types left
          if (fewIndex < fewCount) useMany = false;
        } else if (fewIndex < fewCount) {
          sortedChapters.push(fewLevels[fewIndex++]);
          // Switch if we have both types left
          if (manyIndex < manyCount) useMany = true;
        } else if (manyIndex < manyCount) {
          sortedChapters.push(manyLevels[manyIndex++]);
        }
      }
    }
  } else {
    // Only one type: just use all of them
    sortedChapters.push(...chapterInfos);
  }
  
  // Calculate moon-to-planet distances based on ring extent
  // Strategy: Variable distances - small moons close, large moons far
  const moonToPlanetDistances: number[] = [];
  
  debugLog.group('🌙 Moon Distance Calculation');
  debugLog.log(`Total moons: ${sortedChapters.length}`);
  debugLog.log(`PLANET_TO_MOON_BASE_DISTANCE: ${PLANET_TO_MOON_BASE_DISTANCE}px`);
  debugLog.log(`MOON_EXTRA_DISTANCE_PER_RING_PX: ${MOON_EXTRA_DISTANCE_PER_RING_PX}`);
  
  // Find the largest ring extent among all moons
  const maxRingExtent = Math.max(...sortedChapters.map(info => info.ringExtent));
  const minRingExtent = Math.min(...sortedChapters.map(info => info.ringExtent));
  
  // Set distance range for small to large moons
  const minMoonDistance = 100; // Small moons close to planet (130px)
  const maxMoonDistance = 1.1*maxRingExtent + PLANET_RADIUS + MOON_MIN_CLEARANCE; // Large moons far enough to avoid overlap
  
  debugLog.log(`📏 Ring extents: ${minRingExtent.toFixed(1)}px (min) to ${maxRingExtent.toFixed(1)}px (max)`);
  debugLog.log(`📏 Distance range: ${minMoonDistance}px (small moons) to ${maxMoonDistance.toFixed(1)}px (large moons)`);
  
  for (const info of sortedChapters) {
    // Scale distance based on moon size relative to largest moon
    // Small moons (minRingExtent) → minMoonDistance (130px)
    // Large moons (maxRingExtent) → maxMoonDistance
    
    const sizeRatio = (info.ringExtent - minRingExtent) / (maxRingExtent - minRingExtent || 1);
    const distanceToPlanet = minMoonDistance + (maxMoonDistance - minMoonDistance) * sizeRatio;
    
    moonToPlanetDistances.push(distanceToPlanet);
    
    debugLog.log(`  📍 ${info.chapterId}: ${info.levelCount} levels, ringExtent=${info.ringExtent.toFixed(1)}px (${(sizeRatio * 100).toFixed(0)}% of max) → distance=${distanceToPlanet.toFixed(1)}px`);
  }
  debugLog.groupEnd();
  
  // Calculate angles with dynamic spacing to prevent ring overlap
  // Moons with many levels get more angular space
  const angles: number[] = [];
  const totalAngle = Math.PI * 2;
  
  debugLog.group('📐 Angle Calculation (Collision Avoidance)');
  debugLog.log(`MOON_MIN_CLEARANCE: ${MOON_MIN_CLEARANCE}px`);
  
  // Calculate minimum required angles between adjacent moons
  const minAngles: number[] = [];
  for (let i = 0; i < sortedChapters.length; i++) {
    const nextIndex = (i + 1) % sortedChapters.length;
    
    // Get moon-to-planet distances and ring extents
    const moonToPlanetDist1 = moonToPlanetDistances[i];
    const moonToPlanetDist2 = moonToPlanetDistances[nextIndex];
    const ringExtent1 = sortedChapters[i].ringExtent;
    const ringExtent2 = sortedChapters[nextIndex].ringExtent;
    
    // Total extent from planet center = moon distance + ring extent (reaches to outermost ring)
    const totalExtentFromPlanet1 = moonToPlanetDist1 + ringExtent1;
    const totalExtentFromPlanet2 = moonToPlanetDist2 + ringExtent2;
    
    // Required clearance between outermost rings
    const requiredClearance = MOON_MIN_CLEARANCE;
    
    // Calculate minimum angle using law of cosines
    // We need the angle such that the distance between outermost points >= requiredClearance
    // c² = a² + b² - 2ab*cos(C)
    // where a = totalExtentFromPlanet1, b = totalExtentFromPlanet2, c = requiredClearance
    const a = totalExtentFromPlanet1;
    const b = totalExtentFromPlanet2;
    const c = requiredClearance;
    
    // Calculate angle using law of cosines
    const cosAngle = (a * a + b * b - c * c) / (2 * a * b);
    let minAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    // Give moons with many levels extra angle space (up to 50% more)
    const maxLevelCount = Math.max(...sortedChapters.map(info => info.levelCount));
    const currentLevelCount = sortedChapters[i].levelCount;
    const nextLevelCount = sortedChapters[nextIndex].levelCount;
    const avgLevelCount = (currentLevelCount + nextLevelCount) / 2;
    const levelFactor = maxLevelCount > 0 ? avgLevelCount / maxLevelCount : 1;
    
    // Increase angle for moons with many levels
    const angleBonus = minAngle * 0.5 * levelFactor;
    const minAngleWithBonus = minAngle + angleBonus;
    
    debugLog.log(`  🔀 ${sortedChapters[i].chapterId} ↔ ${sortedChapters[nextIndex].chapterId}:`);
    debugLog.log(`     Moon1: dist=${moonToPlanetDist1.toFixed(1)}px + rings=${ringExtent1.toFixed(1)}px = ${totalExtentFromPlanet1.toFixed(1)}px total`);
    debugLog.log(`     Moon2: dist=${moonToPlanetDist2.toFixed(1)}px + rings=${ringExtent2.toFixed(1)}px = ${totalExtentFromPlanet2.toFixed(1)}px total`);
    debugLog.log(`     Required clearance: ${requiredClearance}px`);
    debugLog.log(`     Min angle: ${(minAngle * 180 / Math.PI).toFixed(1)}° → with bonus: ${(minAngleWithBonus * 180 / Math.PI).toFixed(1)}°`);
    
    minAngles.push(minAngleWithBonus);
  }
  debugLog.groupEnd();
  
  // Distribute angles ensuring all minimum angles are met
  const sumMinAngles = minAngles.reduce((sum, angle) => sum + angle, 0);
  
  debugLog.group('⚖️ Angle Distribution');
  debugLog.log(`Sum of min angles: ${(sumMinAngles * 180 / Math.PI).toFixed(1)}° (${(sumMinAngles / (Math.PI * 2) * 100).toFixed(1)}% of circle)`);
  debugLog.log(`Total available: 360°`);
  
  // Random starting angle to avoid all moons pointing in same direction
  const startAngleOffset = Math.random() * Math.PI * 2;
  debugLog.log(`Random start offset: ${(startAngleOffset * 180 / Math.PI).toFixed(1)}°`);
  
  if (sumMinAngles > totalAngle) {
    // Not enough space - scale down proportionally
    const scale = totalAngle / sumMinAngles;
    debugLog.warn(`⚠️ NOT ENOUGH SPACE! Scaling down by ${(scale * 100).toFixed(1)}%`);
    debugLog.log(`This means moons WILL overlap! Consider:
    - Increasing MOON_MIN_CLEARANCE
    - Increasing moon-to-planet distances
    - Reducing ring extents`);
    
    let currentAngle = startAngleOffset;
    for (let i = 0; i < sortedChapters.length; i++) {
      angles.push(currentAngle % (Math.PI * 2));
      const scaledAngle = minAngles[i] * scale;
      debugLog.log(`  Moon ${i} (${sortedChapters[i].chapterId}): ${(currentAngle * 180 / Math.PI).toFixed(1)}° (step: ${(scaledAngle * 180 / Math.PI).toFixed(1)}°)`);
      currentAngle += scaledAngle;
    }
  } else {
    // Enough space - distribute remaining angle proportionally to level count
    const remainingAngle = totalAngle - sumMinAngles;
    debugLog.log(`✅ Enough space! Remaining: ${(remainingAngle * 180 / Math.PI).toFixed(1)}° to distribute`);
    
    // Calculate total level count for proportional distribution
    const totalLevelCount = sortedChapters.reduce((sum, info) => sum + info.levelCount, 0);
    
    let currentAngle = startAngleOffset;
    for (let i = 0; i < sortedChapters.length; i++) {
      angles.push(currentAngle % (Math.PI * 2));
      
      // Distribute extra angle proportionally to level count
      const levelCount = sortedChapters[i].levelCount;
      const extraAngle = totalLevelCount > 0 
        ? (remainingAngle * levelCount) / totalLevelCount
        : remainingAngle / sortedChapters.length;
      
      const totalStepAngle = minAngles[i] + extraAngle;
      debugLog.log(`  Moon ${i} (${sortedChapters[i].chapterId}): ${(currentAngle * 180 / Math.PI).toFixed(1)}° (step: ${(totalStepAngle * 180 / Math.PI).toFixed(1)}°)`);
      
      currentAngle += totalStepAngle;
    }
  }
  debugLog.groupEnd();
  
  // Create layouts with calculated positions
  debugLog.group('🎯 Final Moon Positions');
  for (let i = 0; i < sortedChapters.length; i++) {
    const info = sortedChapters[i];
    const chapterId = info.chapterId;
    const distanceFromPlanetCenter = moonToPlanetDistances[i];
    const angleAroundPlanet = angles[i];
    
    const x = planetX + Math.cos(angleAroundPlanet) * distanceFromPlanetCenter;
    const y = planetY + Math.sin(angleAroundPlanet) * distanceFromPlanetCenter;
    
    debugLog.log(`  🌙 ${chapterId}:`);
    debugLog.log(`     Position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    debugLog.log(`     Distance from planet: ${distanceFromPlanetCenter.toFixed(1)}px at ${(angleAroundPlanet * 180 / Math.PI).toFixed(1)}°`);
    debugLog.log(`     Ring extent: ${info.ringExtent.toFixed(1)}px (outermost ring at ${(distanceFromPlanetCenter + info.ringExtent).toFixed(1)}px from planet)`);
    debugLog.log(`     Levels: ${info.levelCount}`);
    
    layouts.push({
      id: `${chapterId}`,
      chapterId,
      angle: angleAroundPlanet,
      radius: MOON_RADIUS,
      x,
      y,
      chapter: chapters[chapterId]
    });
  }
  debugLog.groupEnd();
  
  debugLog.log('📊 Summary: Adaptive moon layout complete');
  debugLog.log(`   Total moons: ${layouts.length}`);
  debugLog.log(`   Planet position: (${planetX}, ${planetY})`);
  
  return layouts;
}

/**
 * Calculates the ring extent (radius from moon center to outermost ring)
 * This is used to determine moon-planet distance and prevent moon-moon overlap
 * 
 * Returns: Distance from moon center to the outermost ring
 */
export function calculateMoonRingExtent(items: Item[]): number {
  if (items.length === 0) return MOON_RADIUS + BASE_ITEM_DISTANCE;
  
  const levels = new Set(items.map(item => item.level));
  const levelsArray = Array.from(levels).sort((a, b) => a - b);
  const maxLevel = Math.max(...levelsArray);
  
  if (levelsArray.length === 0) return MOON_RADIUS + BASE_ITEM_DISTANCE;
  
  // Calculate dynamic spacing based on maximum level
  const levelSpacing = calculateLevelSpacing(maxLevel);
  
  debugLog.log(`    Levels: [${levelsArray.join(', ')}]`);
  debugLog.log(`    MOON_RADIUS=${MOON_RADIUS}, BASE_ITEM_DISTANCE=${BASE_ITEM_DISTANCE}, spacing=${levelSpacing.toFixed(1)}px`);
  
  // Calculate maximum ring radius by simulating ring calculation
  // Use same two-pass approach as calculateLevelRings
  const baseRadii: number[] = [];
  levelsArray.forEach((level) => {
    // Level starts at 1, not 0! If level is 0, treat as level 1
    const effectiveLevel = Math.max(1, level);
    const baseRadius = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * effectiveLevel);
    baseRadii.push(baseRadius);
    debugLog.log(`    Level ${level} (eff=${effectiveLevel}): baseRadius=${baseRadius.toFixed(1)}px`);
  });
  
  // Second pass: adjust radii to ensure MIN_RING_GAP between adjacent rings
  const adjustedRadii: number[] = [];
  for (let i = 0; i < baseRadii.length; i++) {
    let radius = baseRadii[i];
    
    // Ensure minimum gap from previous ring
    if (i > 0) {
      const prevRadius = adjustedRadii[i - 1];
      const minRadius = prevRadius + MIN_RING_GAP;
      if (radius < minRadius) {
        debugLog.log(`    Level ${levelsArray[i]}: adjusted ${radius.toFixed(1)}px → ${minRadius.toFixed(1)}px (gap enforcement)`);
        radius = minRadius;
      }
    }
    
    adjustedRadii.push(radius);
  }
  
  // Return maximum radius (outermost ring)
  const maxRadius = adjustedRadii.length > 0 ? Math.max(...adjustedRadii) : MOON_RADIUS + BASE_ITEM_DISTANCE;
  debugLog.log(`    → Outermost ring at ${maxRadius.toFixed(1)}px from moon center`);
  return maxRadius;
}

/**
 * @deprecated Use calculateMoonRingExtent instead
 * Kept for backward compatibility
 */
export function calculateRequiredMoonRadius(items: Item[]): number {
  return calculateMoonRingExtent(items);
}

/**
 * Calculates dynamic level spacing based on maximum level
 * Ensures rings don't overlap even with many levels
 * 
 * Strategy:
 * - Few levels (1-3): Use MAX_LEVEL_SPACING (30px - rings far apart, looks spacious)
 * - Many levels (10+): Use MIN_LEVEL_SPACING (8px - rings closer, prevents huge moon extent)
 * - Extreme levels (50+): Approaches MIN_LEVEL_SPACING asymptotically
 * - In between: Smooth logarithmic transition
 */
function calculateLevelSpacing(maxLevel: number): number {
  if (maxLevel <= 1) return MAX_LEVEL_SPACING;
  
  // Logarithmic scaling: more levels = tighter spacing
  // log2(2) = 1, log2(10) ≈ 3.32, log2(20) ≈ 4.32, log2(50) ≈ 5.64, log2(100) ≈ 6.64
  const logFactor = Math.log2(maxLevel);
  
  // Interpolate between MAX and MIN based on log factor
  // At maxLevel=2: logFactor=1 → close to MAX (t ≈ 0.17)
  // At maxLevel=16: logFactor=4 → midway (t ≈ 0.67)
  // At maxLevel=64: logFactor=6 → close to MIN (t = 1.0)
  const t = Math.min(1, logFactor / 6); // Normalize to 0-1 range (max at level 64)
  const spacing = MAX_LEVEL_SPACING - t * (MAX_LEVEL_SPACING - MIN_LEVEL_SPACING);
  const finalSpacing = Math.max(MIN_LEVEL_SPACING, spacing);
  
  debugLog.log(`    Level spacing calc: maxLevel=${maxLevel} → log2=${logFactor.toFixed(2)} → t=${t.toFixed(2)} → ${finalSpacing.toFixed(1)}px`);
  
  return finalSpacing;
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
    // Level starts at 1, not 0! If level is 0, treat as level 1
    const effectiveLevel = Math.max(1, level);
    const baseRadius = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * effectiveLevel);
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
    // Calculate ring radius for this level using dynamic spacing
    // Level starts at 1, not 0! If level is 0, treat as level 1
    const effectiveLevel = Math.max(1, level);
    const ringRadiusFromMoonCenter = MOON_RADIUS + BASE_ITEM_DISTANCE + (levelSpacing * effectiveLevel);
    
    // Distribute items evenly around the ring
    const angleStepBetweenItems = (Math.PI * 2) / levelItems.length;
    
    levelItems.forEach((item, index) => {
      const angleAroundMoon = index * angleStepBetweenItems;
      const x = moonX + Math.cos(angleAroundMoon) * ringRadiusFromMoonCenter;
      const y = moonY + Math.sin(angleAroundMoon) * ringRadiusFromMoonCenter;
      
      layouts.push({
        id: item.id,
        itemId: item.id,
        level: item.level,
        angle: angleAroundMoon,
        x,
        y
      });
    });
  }
  
  return layouts;
}

// ============================================================================
// ORBIT-BASED PLANET LAYOUT (New Universe View)
// ============================================================================

/** Planet radius in universe view */
const UNIVERSE_PLANET_RADIUS = 40;

/**
 * Calculate planet positions on a circular orbit
 * Planets are distributed evenly around the full 360° orbit
 * 
 * @param themes - Array of themes (planets)
 * @param rotationAngle - Current rotation angle in radians
 * @param centerX - Center X of the orbit (sun position, typically 0 for bottom-left)
 * @param centerY - Center Y of the orbit (sun position, typically screen height for bottom-left)
 * @param orbitRadius - Radius of the orbit (dynamically calculated based on screen size)
 * @returns Array of planet layouts with positions
 */
export function calculatePlanetPositionsOnOrbit(
  themes: Theme[],
  rotationAngle: number,
  centerX: number,
  centerY: number,
  orbitRadius: number
): PlanetLayout[] {
  const layouts: PlanetLayout[] = [];
  
  if (themes.length === 0) return layouts;
  
  // Distribute planets evenly around the full 360° orbit
  const angleStep = (Math.PI * 2) / themes.length;
  
  themes.forEach((theme, index) => {
    // Calculate angle for this planet (base angle + rotation)
    const baseAngle = index * angleStep;
    const angle = baseAngle + rotationAngle;
    
    // Calculate position on orbit
    const x = centerX + Math.cos(angle) * orbitRadius;
    const y = centerY + Math.sin(angle) * orbitRadius;
    
    layouts.push({
      id: theme.id,
      x,
      y,
      radius: UNIVERSE_PLANET_RADIUS,
      theme
    });
  });
  
  return layouts;
}

/**
 * Find the planet closest to the center of the screen
 * This is used to determine which planet is "focused"
 * 
 * @param planetLayouts - Array of planet layouts
 * @param screenCenterX - Screen center X coordinate
 * @param screenCenterY - Screen center Y coordinate
 * @returns ID of the focused planet, or null if no planets
 */
export function findFocusedPlanet(
  planetLayouts: PlanetLayout[],
  screenCenterX: number,
  screenCenterY: number
): string | null {
  if (planetLayouts.length === 0) return null;
  
  let closestPlanet: PlanetLayout | null = null;
  let closestDistance = Infinity;
  
  for (const planet of planetLayouts) {
    const distance = Math.hypot(planet.x - screenCenterX, planet.y - screenCenterY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPlanet = planet;
    }
  }
  
  return closestPlanet ? closestPlanet.id : null;
}

/**
 * Calculate the rotation angle needed to center a specific planet
 * 
 * @param themes - Array of themes (planets)
 * @param targetPlanetId - ID of the planet to center
 * @param screenWidth - Screen width (optional, for precise centering)
 * @param screenHeight - Screen height (optional, for precise centering)
 * @returns Rotation angle in radians, or 0 if planet not found
 */
export function calculateRotationAngleForPlanet(
  themes: Theme[],
  targetPlanetId: string,
  screenWidth?: number,
  screenHeight?: number
): number {
  const planetIndex = themes.findIndex(t => t.id === targetPlanetId);
  if (planetIndex === -1) return 0;
  
  // Planets are distributed evenly around full 360° orbit
  const angleStep = (Math.PI * 2) / themes.length;
  const planetBaseAngle = planetIndex * angleStep;
  
  // Calculate the target angle (where we want the planet to be)
  // If screen dimensions provided, calculate angle from sun (bottom-left) to screen center
  let targetAngle = 0; // Default: 0° (pointing right)
  
  if (screenWidth && screenHeight) {
    // Sun is at (0, screenHeight) - bottom-left
    // Screen center is at (screenWidth/2, screenHeight/2)
    const sunX = 0;
    const sunY = screenHeight;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    // Calculate angle from sun to screen center
    targetAngle = Math.atan2(centerY - sunY, centerX - sunX);
  }
  
  // Calculate rotation needed: we want planetBaseAngle to end up at targetAngle
  // rotation + planetBaseAngle = targetAngle
  // rotation = targetAngle - planetBaseAngle
  return targetAngle - planetBaseAngle;
}