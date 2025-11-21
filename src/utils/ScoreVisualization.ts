// Score Visualization Utility
// Calculates colors, sizes, and effects based on score

/**
 * Calculates color based on score percentage
 * Formula: Je schlechter = weißer, je besser = bunter (höhere Sättigung)
 */
export function getItemColor(score: number, maxScore: number): string {
  if (maxScore === 0) return '#ffffff';
  
  const percentage = (score / maxScore) * 100;
  
  // Calculate saturation: 0% = 0% saturation (white), 100%+ = 100% saturation (full color)
  const saturation = Math.min(100, Math.max(0, percentage * 1.2));
  
  // Hue shifts from red (bad) to green (good) to blue/purple (excellent)
  let hue: number;
  if (percentage < 50) {
    // 0-50%: Red to Orange (0-30°)
    hue = (percentage / 50) * 30;
  } else if (percentage < 80) {
    // 50-80%: Orange to Yellow (30-60°)
    hue = 30 + ((percentage - 50) / 30) * 30;
  } else if (percentage < 100) {
    // 80-100%: Yellow to Green (60-120°)
    hue = 60 + ((percentage - 80) / 20) * 60;
  } else {
    // >100%: Green to Blue/Purple (120-270°)
    const excess = Math.min(100, percentage - 100);
    hue = 120 + (excess / 100) * 150;
  }
  
  // Lightness: 50% for good visibility
  const lightness = 50;
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Calculates size based on score percentage
 * Base: 4px, >50%: 6-8px, >80%: 10px
 * Uses percentage instead of absolute score for consistency
 */
export function getItemSize(score: number, maxScore: number): number {
  if (maxScore === 0) return 4;
  
  const percentage = (score / maxScore) * 100;
  const baseSize = 4;
  
  if (percentage >= 80) {
    return 10;
  } else if (percentage >= 50) {
    // Interpolate between 6 and 8 based on percentage (50-80%)
    const factor = (percentage - 50) / 30; // 0 to 1 as percentage goes from 50% to 80%
    return 6 + factor * 2;
  }
  
  return baseSize;
}

/**
 * Determines visual effects based on score percentage
 * Uses percentage instead of absolute score for consistency
 */
export function getItemEffects(score: number, maxScore: number): { glow: boolean; pulse: boolean } {
  if (maxScore === 0) return { glow: false, pulse: false };
  
  const percentage = (score / maxScore) * 100;
  
  return {
    glow: percentage >= 50,  // Glow if at least 50% of max score
    pulse: percentage >= 80   // Pulse if at least 80% of max score
  };
}

/**
 * Calculates saturation percentage for color
 */
export function calculateSaturation(percentage: number): number {
  return Math.min(100, Math.max(0, percentage * 1.2));
}

/**
 * Gets planet glow intensity based on theme progress (0.0 - 1.0)
 */
export function getPlanetGlowIntensity(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

/**
 * Converts hex color to HSL and adjusts saturation based on score percentage
 * Returns HSL color string with score-based saturation
 */
export function getRingColorWithSaturation(hexColor: string, percentage: number): string {
  // Parse hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  // Adjust saturation based on score percentage
  // 0% score = 0% saturation (grayscale), 100% score = original saturation (full color)
  // percentage is 0-100, s is 0-1, so we multiply s by percentage/100, then convert to percent
  const adjustedSaturation = Math.min(100, Math.max(0, s * percentage));
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(adjustedSaturation)}%, ${Math.round(l * 100)}%)`;
}

