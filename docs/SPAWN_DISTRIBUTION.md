# Smart Spawn Distribution System

## Overview

The spawn distribution system intelligently positions game objects (correct answers and distractors) across the screen to create a natural, organic gameplay experience while maintaining good spacing and avoiding predictable patterns.

## Key Features

### 1. **Adaptive to Object Count**
- **Few objects (1-5)**: Centered with slight variation to avoid forcing players to screen edges
- **Medium groups (6-10)**: Wider distribution with natural clustering
- **Large groups (>10)**: Full screen utilization with multiple clusters

### 2. **Text Width Awareness**
- Calculates approximate visual width of each word
- Adjusts spacing based on text length
- Prevents overlap of long words

### 3. **Natural Distribution**
- Uses repulsion algorithm to push objects apart
- Creates organic clusters instead of linear rows
- Adds controlled randomness for "wild space shooter" feel

### 4. **Screen Utilization**
- Keeps safety margins (0.15 to 0.85 of screen width)
- Prevents objects from spawning too close to edges
- Balances between central focus and screen coverage

## Algorithm Details

### Text Width Estimation

```typescript
// Character width factors:
// Wide chars (W, M, @): 1.5x
// Normal chars: 1.0x
// Narrow chars (i, l, I): 0.5x
// Numbers: 0.8x
```

### Repulsion-Based Positioning

1. **Initial Placement**: Random positions with central bias for small groups
2. **Force Calculation**: Objects "push away" from each other based on minimum distance
3. **Iteration**: 30-60 iterations to reach stable distribution
4. **Boundary Clamping**: Keep all positions within safe screen bounds

### Distribution Strategies

| Object Count | Strategy | Spread | Clusters |
|--------------|----------|--------|----------|
| 1 | Center | 0.05 | 1 |
| 2 | Left/Right of center | 0.08 | 1 |
| 3-5 | Central cluster | 0.05-0.08 | 1 |
| 6-10 | Wide distribution | 0.06-0.10 | 2-3 |
| >10 | Full screen | 0.07-0.12 | 3-4 |

## Usage in Editor

### Automatic Distribution (New Items)

When creating items via the Text Parser, spawn positions are automatically calculated:

```
b. base word
c. correct1 (context)
c. correct2 (context)
d. distractor1 (redirect)
d. distractor2 (redirect)
```

The system analyzes word lengths and count, then distributes them intelligently.

### Manual Redistribution

For existing items:

1. Select items in Table View (checkbox)
2. Click **"✨ Redistribute Spawns"** button
3. Spawn positions are recalculated based on current words

This is useful when:
- Words have been edited and are now longer/shorter
- Number of corrects/distractors has changed
- You want to refresh the distribution

## Examples

### Example 1: Single Correct + Single Distractor
```
Correct: "computer"     → Position: 0.35 (left of center)
Distractor: "Rechner"   → Position: 0.65 (right of center)
```

### Example 2: Multiple Corrects (5 items)
```
"keyboard"              → Position: 0.42, Spread: 0.06
"mouse"                 → Position: 0.58, Spread: 0.07
"monitor"               → Position: 0.35, Spread: 0.05
"printer"               → Position: 0.65, Spread: 0.08
"scanner"               → Position: 0.50, Spread: 0.06
```
Central clustering with natural variation.

### Example 3: Large Group (12 items)
```
Multiple clusters across full screen (0.15 to 0.85)
Larger spread values (0.07-0.12) for chaos
Jittered positions to avoid patterns
```

## Technical Implementation

### Core Function

```typescript
distributeCorrectAndDistractors(
  corrects: string[],
  distractors: string[]
): {
  corrects: SpawnDistribution[];
  distractors: SpawnDistribution[];
}
```

### Return Type

```typescript
interface SpawnDistribution {
  position: number;      // 0.0 to 1.0 (horizontal position)
  spread: number;        // 0.0 to 0.15 (spread/jitter amount)
  cluster?: number;      // Optional cluster ID for grouping
}
```

### Integration Points

1. **TableView.tsx** - `handleSaveParsedItem()`: Applies distribution when creating items from Text Parser
2. **TableView.tsx** - `handleRedistributeSpawns()`: Recalculates distribution for selected items
3. **TableView.tsx** - `handleAddNewItem()`: Uses simple left/right positioning for single correct + distractor

## Benefits

### For Players
- ✅ Natural, organic gameplay feel
- ✅ No predictable patterns to exploit
- ✅ Appropriate challenge based on item count
- ✅ No unnecessary edge-chasing for small groups

### For Content Creators
- ✅ Automatic intelligent positioning
- ✅ No manual tweaking needed
- ✅ Consistent quality across all items
- ✅ Easy redistribution when editing content

## Future Enhancements

Potential improvements:
- [ ] Vertical distribution (Y-axis) for Zen mode
- [ ] Difficulty-based clustering (harder = more spread)
- [ ] Word similarity clustering (group related words)
- [ ] Adaptive distribution based on player performance
- [ ] Visual preview in editor

## Related Files

- `src/utils/spawnDistribution.ts` - Core algorithm
- `src/components/Editor/TableView.tsx` - Editor integration
- `src/logic/ShooterEngine.ts` - Runtime spawn usage
- `src/types/content.types.ts` - Type definitions

---

**Last Updated**: January 2026  
**Version**: 1.0


