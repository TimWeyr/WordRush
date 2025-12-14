// Galaxy Renderer
// Renders all galaxy elements (planets, moons, items, effects)

import type { Renderer } from '@/core/Renderer';
import type { GalaxyCamera } from '@/logic/GalaxyCamera';
import type { PlanetLayout, MoonLayout, ItemLayout, LevelRingLayout } from '@/logic/GalaxyLayout';
import type { Item, Universe } from '@/types/content.types';
import type { LearningState } from '@/types/progress.types';
import { getItemScore, getLevelScore } from '@/utils/ScoreCalculator';
import { getItemColor, getItemSize, getItemEffects, getPlanetGlowIntensity, getRingColorWithSaturation } from '@/utils/ScoreVisualization';

export interface RenderContext {
  renderer: Renderer;
  camera: GalaxyCamera;
  hoveredElement: { type: 'planet' | 'moon' | 'item' | 'levelRing'; id: string; level?: number; moonId?: string } | null;
  selectedElement: { type: 'planet' | 'moon' | 'item'; id: string } | null;
  themeProgress: Map<string, number>;
  allItems: Item[];
  learningState: LearningState;
  universe: Universe | null;
  planetLayouts: PlanetLayout[];
  moonLayouts: Map<string, MoonLayout[]>;
}

/**
 * Render a planet with glow effect based on theme progress
 */
export function renderPlanet(
  planet: PlanetLayout,
  context: RenderContext
): void {
  const { renderer, camera, hoveredElement, selectedElement, themeProgress } = context;
  const ctx = renderer.getContext();
  
  const screenPos = camera.worldToScreen({ x: planet.x, y: planet.y });
  const isHovered = hoveredElement?.type === 'planet' && hoveredElement.id === planet.id;
  const isSelected = selectedElement?.type === 'planet' && selectedElement.id === planet.id;
  
  // Get theme progress
  const progress = themeProgress.get(planet.id) || 0;
  const glowIntensity = getPlanetGlowIntensity(progress);
  
  // Scale based on hover/selection
  const scale = isHovered || isSelected ? 1.1 : 1.0;
  const radius = planet.radius * scale;
  
  ctx.save();
  
  // Render glow effect with pulsing animation
  if (glowIntensity > 0) {
    const pulseFactor = 1 + Math.sin(Date.now() / 1000) * 0.2;
    const glowRadius = radius * (1 + glowIntensity * 2) * pulseFactor;
    const glowAlpha = glowIntensity * 0.6;
    
    // Parse colorPrimary hex to RGB
    const hex = planet.theme.colorPrimary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const gradient = ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, glowRadius
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Render planet circle
  ctx.fillStyle = planet.theme.colorPrimary;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Render selection ring
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Render planet icon/text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(planet.theme.icon || '🌍', screenPos.x, screenPos.y);
  
  // Render planet name on touch devices (always visible, to the left of planet)
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice) {
    const planetName = planet.theme.name;
    
    // Use universe colorPrimary for text color
    const textColor = context.universe?.colorPrimary || planet.theme.colorPrimary;
    
    // Responsive font size based on screen width
    const screenWidth = ctx.canvas.width;
    const fontSize = screenWidth < 768 ? 14 : 16;
    
    ctx.fillStyle = textColor;
    ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Position text to the left of planet (ending just before planet edge)
    const textX = screenPos.x - radius - 10;
    const textY = screenPos.y;
    
    ctx.fillText(planetName, textX, textY);
    
    // Reset shadow
    ctx.shadowBlur = 0;
  }
  
  ctx.restore();
}

/**
 * Render a moon with progress ring and angle-based gradient
 */
export function renderMoon(
  moon: MoonLayout,
  context: RenderContext
): void {
  const { renderer, camera, hoveredElement, selectedElement } = context;
  const ctx = renderer.getContext();
  
  const screenPos = camera.worldToScreen({ x: moon.x, y: moon.y });
  const isHovered = hoveredElement?.type === 'moon' && hoveredElement.id === moon.id;
  const isSelected = selectedElement?.type === 'moon' && selectedElement.id === moon.id;
  
  const scale = isHovered || isSelected ? 1.1 : 1.0;
  const radius = moon.radius * scale;
  
  ctx.save();
  
  // Get gradient colors from chapter config (or fallback to theme/universe colors)
  const gradientColors = moon.chapter?.backgroundGradient;
  let fillStyle: string | CanvasGradient;
  
  if (gradientColors && gradientColors.length > 0) {
    // Create radial gradient with angle-based offset
    // The gradient center is shifted in the direction of the moon's angle (away from planet)
    // This creates a directional lighting effect
    const gradientOffset = radius * 0.4; // Offset distance (40% of radius)
    const gradientCenterX = screenPos.x + Math.cos(moon.angle) * gradientOffset;
    const gradientCenterY = screenPos.y + Math.sin(moon.angle) * gradientOffset;
    
    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      gradientCenterX, gradientCenterY, 0, // Inner circle (center)
      screenPos.x, screenPos.y, radius * 1.5 // Outer circle (extends beyond moon)
    );
    
    // Add color stops - distribute evenly across available colors
    const colorCount = gradientColors.length;
    if (colorCount === 1) {
      // Single color: solid fill
      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(1, gradientColors[0]);
    } else {
      // Multiple colors: distribute stops evenly
      for (let i = 0; i < colorCount; i++) {
        const stop = i / (colorCount - 1);
        gradient.addColorStop(stop, gradientColors[i]);
      }
    }
    
    fillStyle = gradient;
  } else {
    // Fallback: Use theme colorPrimary or default blue
    // Try to get from planet theme via context
    let fallbackColor = '#7bb3f0'; // Default blue
    
    // Try to find planet theme from context
    for (const planet of context.planetLayouts) {
      const moons = context.moonLayouts.get(planet.id) || [];
      if (moons.some(m => m.id === moon.id)) {
        fallbackColor = planet.theme.colorPrimary || fallbackColor;
        break;
      }
    }
    
    fillStyle = fallbackColor;
  }
  
  // Render moon circle with gradient
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Render selection ring
  if (isSelected) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  ctx.restore();
}

/**
 * Render an item particle with score-based visualization
 */
export function renderItemParticle(
  itemLayout: ItemLayout,
  item: Item,
  context: RenderContext
): void {
  const { renderer, camera, learningState } = context;
  const ctx = renderer.getContext();
  
  const screenPos = camera.worldToScreen({ x: itemLayout.x, y: itemLayout.y });
  
  // Get score data
  const scoreData = getItemScore(item.id, item, learningState);
  
  // Validate item ID matches
  if (item.id !== itemLayout.itemId) {
    console.error(`❌ Item ID mismatch! item.id=${item.id}, itemLayout.itemId=${itemLayout.itemId}`);
  }
  
  // Use bestScore for all visualizations (best single attempt), not totalScore (sum of all attempts)
  // This ensures the visualization reflects the player's best performance, not cumulative score
  // The percentage is already calculated based on bestScore in getItemScore()
  const color = getItemColor(scoreData.bestScore, scoreData.maxScore);
  const size = getItemSize(scoreData.bestScore, scoreData.maxScore);
  const effects = getItemEffects(scoreData.bestScore, scoreData.maxScore);
  
  ctx.save();
  
  // Render glow effect
  if (effects.glow) {
    const glowRadius = size * 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = glowRadius;
    ctx.globalAlpha = 0.6;
  }
  
  // Pulse effect disabled to prevent any movement/oscillation
  // if (effects.pulse) {
  //   const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.3;
  //   ctx.scale(pulseScale, pulseScale);
  // }
  
  // Render particle at fixed position (no animations)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Render a level ring around a moon
 * Ring color saturation is based on score percentage
 */
export function renderLevelRing(
  ring: LevelRingLayout,
  moon: MoonLayout,
  chapterItems: Item[],
  context: RenderContext
): void {
  const { renderer, camera, hoveredElement, learningState, universe } = context;
  const ctx = renderer.getContext();
  
  const moonScreen = camera.worldToScreen({ x: moon.x, y: moon.y });
  const ringRadius = ring.radius * camera.zoom;
  
  const isHovered = hoveredElement?.type === 'levelRing' && 
                    hoveredElement.moonId === ring.moonId && 
                    hoveredElement.level === ring.level;
  
  // Get level score
  const levelScore = getLevelScore(ring.chapterId, ring.level, chapterItems, learningState);
  
  // Get ring color from universe (fallback to colorPrimary if ringColor not set)
  const ringColorHex = universe?.ringColor || universe?.colorPrimary || '#4a90e2';
  
  // Calculate color with score-based saturation
  const ringColor = getRingColorWithSaturation(ringColorHex, levelScore.percentage);
  
  ctx.save();
  
  // Ring opacity: base 0.4, hover 0.8
  const opacity = isHovered ? 0.8 : 0.4;
  
  // Ring line width: very thin (1-2px)
  const lineWidth = isHovered ? 2 : 1.5;
  
  // Render glow effect when hovered
  if (isHovered) {
    // Parse ring color to get RGB values for glow
    const hex = ringColorHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Create glow effect with shadow blur
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.shadowBlur = 8;
  }
  
  // Render ring circle
  ctx.strokeStyle = ringColor;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(moonScreen.x, moonScreen.y, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Reset shadow after rendering
  if (isHovered) {
    ctx.shadowBlur = 0;
  }
  
  ctx.restore();
}

/**
 * Render connection lines between planet and moons
 */
export function renderConnectionLines(
  planet: PlanetLayout,
  moons: MoonLayout[],
  context: RenderContext
): void {
  const { renderer, camera } = context;
  const ctx = renderer.getContext();
  
  const planetScreen = camera.worldToScreen({ x: planet.x, y: planet.y });
  
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'; // Increased from 0.2 - brighter lines
  ctx.lineWidth = 1;
  
  for (const moon of moons) {
    const moonScreen = camera.worldToScreen({ x: moon.x, y: moon.y });
    
    ctx.beginPath();
    ctx.moveTo(planetScreen.x, planetScreen.y);
    ctx.lineTo(moonScreen.x, moonScreen.y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Helper function to wrap text to fit within a maximum width
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const words = text.split(' ');
  const lines: string[] = [];
  
  if (words.length === 0) {
    return [];
  }
  
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine + ' ' + word;
    const width = ctx.measureText(testLine).width;
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Render tooltip for an element with glassmorphism style
 */
export function renderTooltip(
  text: string,
  position: { x: number; y: number },
  context: RenderContext
): void {
  const { renderer, hoveredElement, planetLayouts } = context;
  const ctx = renderer.getContext();
  
  ctx.save();
  
  // Parse text: split by newline, first line is name/text, second line contains score
  // We want score on top, name below - so swap the order when rendering
  const lines = text.split('\n');
  const nameText = lines[0] || '';  // Original first line (name)
  const scoreText = lines[1] || '';  // Original second line (score)
  
  // Determine click hint text based on element type and get planet color
  let clickHintText = '';
  let planetColor = '#4a90e2'; // Default color
  if (hoveredElement) {
    switch (hoveredElement.type) {
      case 'levelRing':
        clickHintText = 'Klick um dies Level zu spielen';
        // Find planet for moon via moonId (which is chapterId)
        if (hoveredElement.moonId) {
          for (const planet of planetLayouts) {
            const moons = context.moonLayouts.get(planet.id) || [];
            const moon = moons.find(m => m.id === hoveredElement.moonId);
            if (moon) {
              planetColor = planet.theme.colorPrimary;
              break;
            }
          }
        }
        break;
      case 'moon':
        clickHintText = 'Klick um alle Level dieses Mondes zu spielen';
        // Find planet for moon via moon id (which is chapterId)
        for (const planet of planetLayouts) {
          const moons = context.moonLayouts.get(planet.id) || [];
          const moon = moons.find(m => m.id === hoveredElement.id);
          if (moon) {
            planetColor = planet.theme.colorPrimary;
            break;
          }
        }
        break;
      case 'planet':
        clickHintText = 'Klick um den Planeten zu spielen';
        // Find planet color
        const planet = planetLayouts.find(p => p.id === hoveredElement.id);
        if (planet) {
          planetColor = planet.theme.colorPrimary;
        }
        break;
      default:
        clickHintText = '';
    }
  }
  
  // Font sizes
  const scoreFontSize = 11;
  const nameFontSize = 16;
  const padding = 14;
  const maxWidth = 250; // Narrower, like info boxes
  const lineSpacing = 8;
  const textMaxWidth = maxWidth - padding * 2;
  
  // Wrap score text if needed
  ctx.font = `${scoreFontSize}px Arial`;
  const scoreLines = scoreText ? wrapText(ctx, scoreText, textMaxWidth) : [];
  
  // Wrap name text if needed
  ctx.font = `bold ${nameFontSize}px 'Segoe UI', Arial, sans-serif`;
  const nameLines = nameText ? wrapText(ctx, nameText, textMaxWidth) : [];
  
  // Calculate box dimensions based on wrapped text
  let maxTextWidth = 0;
  
  // Measure score lines
  ctx.font = `${scoreFontSize}px Arial`;
  for (const line of scoreLines) {
    const width = ctx.measureText(line).width;
    maxTextWidth = Math.max(maxTextWidth, width);
  }
  
  // Measure name lines
  ctx.font = `bold ${nameFontSize}px 'Segoe UI', Arial, sans-serif`;
  for (const line of nameLines) {
    const width = ctx.measureText(line).width;
    maxTextWidth = Math.max(maxTextWidth, width);
  }
  
  // Measure click hint text if present
  const hintFontSize = 9;
  let hintWidth = 0;
  let hintHeight = 0;
  if (clickHintText) {
    ctx.font = `${hintFontSize}px Arial`;
    hintWidth = ctx.measureText(clickHintText).width;
    hintHeight = hintFontSize;
  }
  
  // Ensure width accounts for hint text if it's wider
  const minWidthForHint = clickHintText ? hintWidth + padding * 2 : 0;
  const width = Math.min(Math.max(maxTextWidth + padding * 2, minWidthForHint), maxWidth);
  const scoreHeight = scoreLines.length * scoreFontSize + (scoreLines.length > 0 ? (scoreLines.length - 1) * (lineSpacing - 2) : 0);
  const nameHeight = nameLines.length * nameFontSize + (nameLines.length > 0 ? (nameLines.length - 1) * (lineSpacing - 2) : 0);
  // Add extra spacing for hint: separator line (1px) + spacing (6px) + hint height + bottom padding (already included in padding)
  const hintSpacing = clickHintText ? 7 + hintHeight : 0; // 7px (1px separator + 6px spacing) + hint height
  const totalContentHeight = (scoreLines.length > 0 ? scoreHeight + lineSpacing : 0) + nameHeight + hintSpacing;
  const height = totalContentHeight + padding * 2;
  
  const x = position.x - width / 2;
  const y = position.y - height - 20;
  
  // Enhanced Glassmorphism background
  // Multiple layers for depth effect
  
  // Layer 1: Outer glow/shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  // Layer 2: Main background with planet color
  // Parse planet color hex to RGB
  const hex = planetColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`; // Use planet color with higher transparency
  ctx.fillRect(x, y, width, height);
  
  // Reset shadow
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Layer 3: Inner highlight (top edge)
  const gradient = ctx.createLinearGradient(x, y, x, y + height * 0.3);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height * 0.3);
  
  // Layer 4: Outer border with glow
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, width, height);
  
  // Layer 5: Inner border for glass effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
  
  // Layer 6: Subtle inner highlight line at top
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 1);
  ctx.lineTo(x + width - 2, y + 1);
  ctx.stroke();
  
  // Score text (top, smaller font) - render with wrapping
  let currentY = y + padding;
  if (scoreLines.length > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = `${scoreFontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i < scoreLines.length; i++) {
      ctx.fillText(scoreLines[i], position.x, currentY);
      if (i < scoreLines.length - 1) {
        currentY += scoreFontSize + (lineSpacing - 2);
      } else {
        currentY += scoreFontSize + lineSpacing;
      }
    }
  }
  
  // Name/text (below score, different font) - render with wrapping
  if (nameLines.length > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${nameFontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i < nameLines.length; i++) {
      ctx.fillText(nameLines[i], position.x, currentY);
      if (i < nameLines.length - 1) {
        currentY += nameFontSize + (lineSpacing - 2);
      }
    }
  }
  
  // Click hint text (right bottom, small font) with separator - positioned at bottom
  if (clickHintText) {
    // Calculate position for hint at bottom of box
    const hintY = y + height - padding - hintHeight;
    
    // Draw subtle separator line above hint
    const separatorY = hintY - 6; // 6px spacing before hint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + padding, separatorY);
    ctx.lineTo(x + width - padding, separatorY);
    ctx.stroke();
    
    // Draw hint text at bottom, right-aligned
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = `${hintFontSize}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(clickHintText, x + width - padding, y + height - padding);
  }
  
  ctx.restore();
}

