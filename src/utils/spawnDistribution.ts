/**
 * Smart Spawn Distribution Algorithm
 * 
 * Distributes game objects (correct answers and distractors) across the screen
 * in a natural, organic way that considers:
 * - Number of objects (few = central, many = spread out)
 * - Text width (longer words need more space)
 * - Natural clustering (avoid linear patterns)
 * - Screen utilization (don't force players to edges)
 */

export interface SpawnObject {
  word: string;
  type: 'correct' | 'distractor';
}

export interface SpawnDistribution {
  position: number;      // 0.0 to 1.0 (horizontal position)
  spread: number;        // 0.0 to 0.15 (spread/jitter amount)
  cluster?: number;      // Optional cluster ID for grouping
}

/**
 * Estimates visual width of text (rough approximation)
 * Used to determine spacing requirements
 */
function estimateTextWidth(text: string): number {
  if (!text) return 5;
  
  // Rough character width estimation
  // Wide chars (W, M, @): 1.5x
  // Normal chars (most letters): 1.0x
  // Narrow chars (i, l, I): 0.5x
  // Numbers: 0.8x
  
  let width = 0;
  for (const char of text) {
    if (/[WMw@]/.test(char)) width += 1.5;
    else if (/[iIl1\.,;:]/.test(char)) width += 0.5;
    else if (/[0-9]/.test(char)) width += 0.8;
    else width += 1.0;
  }
  
  return width;
}

/**
 * Calculates average text width for a group of objects
 */
function calculateAverageWidth(objects: SpawnObject[]): number {
  if (objects.length === 0) return 10;
  
  const totalWidth = objects.reduce((sum, obj) => sum + estimateTextWidth(obj.word), 0);
  return totalWidth / objects.length;
}

/**
 * Generates spawn positions using a repulsion-based algorithm
 * Objects "push away" from each other based on their text width
 */
function generateWithRepulsion(
  objects: SpawnObject[],
  avgWidth: number,
  iterations: number = 50
): number[] {
  const positions: number[] = [];
  
  // Initial random positions (with central bias for small groups)
  const centralBias = Math.max(0, 1 - objects.length / 10); // Strong bias for <10 objects
  
  for (let i = 0; i < objects.length; i++) {
    if (centralBias > 0.5 && objects.length <= 5) {
      // Small groups: cluster around center with slight variation
      positions.push(0.5 + (Math.random() - 0.5) * 0.3);
    } else {
      // Larger groups: more spread out initial positions
      positions.push(0.2 + Math.random() * 0.6);
    }
  }
  
  // Repulsion iterations
  const minDistance = Math.max(0.08, avgWidth / 150); // Minimum distance based on text width
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces: number[] = new Array(objects.length).fill(0);
    
    // Calculate repulsion forces
    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        const distance = Math.abs(positions[i] - positions[j]);
        
        if (distance < minDistance) {
          // Objects too close - apply repulsion force
          const force = (minDistance - distance) * 0.1;
          const direction = positions[i] < positions[j] ? -1 : 1;
          
          forces[i] += direction * force;
          forces[j] -= direction * force;
        }
      }
    }
    
    // Apply forces
    for (let i = 0; i < objects.length; i++) {
      positions[i] += forces[i];
      
      // Keep within bounds (0.15 to 0.85 for safety margin)
      positions[i] = Math.max(0.15, Math.min(0.85, positions[i]));
    }
  }
  
  return positions;
}

/**
 * Creates natural clusters for larger groups
 * Prevents linear "row" appearance
 */
function createClusters(count: number): number[] {
  if (count <= 6) return [0]; // Single cluster for small groups
  
  // Create 2-4 clusters based on count
  const clusterCount = Math.min(4, Math.ceil(count / 4));
  const clusters: number[] = [];
  
  for (let i = 0; i < count; i++) {
    clusters.push(i % clusterCount);
  }
  
  // Shuffle to avoid predictable patterns
  for (let i = clusters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clusters[i], clusters[j]] = [clusters[j], clusters[i]];
  }
  
  return clusters;
}

/**
 * Main function: Distributes spawn positions intelligently
 * 
 * @param objects - Array of objects to spawn (correct + distractors)
 * @returns Array of spawn distributions (position + spread)
 */
export function distributeSpawnPositions(objects: SpawnObject[]): SpawnDistribution[] {
  if (objects.length === 0) return [];
  
  const avgWidth = calculateAverageWidth(objects);
  const count = objects.length;
  
  // Strategy selection based on count
  if (count === 1) {
    // Single object: center with small spread
    return [{
      position: 0.5,
      spread: 0.05,
    }];
  }
  
  if (count === 2) {
    // Two objects: left and right of center
    return [
      { position: 0.35, spread: 0.08 },
      { position: 0.65, spread: 0.08 },
    ];
  }
  
  if (count <= 5) {
    // Small group: central cluster with natural spacing
    const positions = generateWithRepulsion(objects, avgWidth, 30);
    
    return positions.map(pos => ({
      position: pos,
      spread: 0.05 + Math.random() * 0.03, // Small spread for natural feel
    }));
  }
  
  if (count <= 10) {
    // Medium group: wider distribution, slight clustering
    const positions = generateWithRepulsion(objects, avgWidth, 50);
    const clusters = createClusters(count);
    
    return positions.map((pos, idx) => ({
      position: pos,
      spread: 0.06 + Math.random() * 0.04,
      cluster: clusters[idx],
    }));
  }
  
  // Large group (>10): Full screen distribution with multiple clusters
  const positions = generateWithRepulsion(objects, avgWidth, 60);
  const clusters = createClusters(count);
  
  // Add extra jitter for large groups to avoid patterns
  const jitteredPositions = positions.map(pos => {
    const jitter = (Math.random() - 0.5) * 0.1;
    return Math.max(0.1, Math.min(0.9, pos + jitter));
  });
  
  return jitteredPositions.map((pos, idx) => ({
    position: pos,
    spread: 0.07 + Math.random() * 0.05, // Larger spread for chaos
    cluster: clusters[idx],
  }));
}

/**
 * Distributes corrects and distractors separately, then merges
 * This ensures good distribution within each group
 */
export function distributeCorrectAndDistractors(
  corrects: string[],
  distractors: string[]
): {
  corrects: SpawnDistribution[];
  distractors: SpawnDistribution[];
} {
  const correctObjects: SpawnObject[] = corrects.map(word => ({ word, type: 'correct' }));
  const distractorObjects: SpawnObject[] = distractors.map(word => ({ word, type: 'distractor' }));
  
  // Distribute each group
  const correctDistributions = distributeSpawnPositions(correctObjects);
  const distractorDistributions = distributeSpawnPositions(distractorObjects);
  
  // Apply offset to avoid overlap between groups
  // Shift distractors slightly to create visual separation
  const offset = 0.05;
  const adjustedDistractors = distractorDistributions.map(dist => ({
    ...dist,
    position: Math.max(0.1, Math.min(0.9, dist.position + (Math.random() - 0.5) * offset)),
  }));
  
  return {
    corrects: correctDistributions,
    distractors: adjustedDistractors,
  };
}

/**
 * Helper: Apply distribution to existing item data
 * Updates spawnPosition and spawnSpread fields
 */
export function applyDistribution<T extends { spawnPosition: number; spawnSpread: number }>(
  items: T[],
  distributions: SpawnDistribution[]
): T[] {
  return items.map((item, idx) => ({
    ...item,
    spawnPosition: distributions[idx]?.position ?? item.spawnPosition,
    spawnSpread: distributions[idx]?.spread ?? item.spawnSpread,
  }));
}









