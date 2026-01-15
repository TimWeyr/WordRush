/**
 * Color Contrast Utilities
 * 
 * Provides functions for color manipulation and contrast calculation
 * based on WCAG (Web Content Accessibility Guidelines) standards.
 */

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * @param hex - Hex color string (e.g., "#ff0000")
 * @returns Luminance value between 0 (darkest) and 1 (lightest)
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  
  // Convert to sRGB
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio between 1 (no contrast) and 21 (maximum contrast)
 */
export function getContrast(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Interpolate between two colors based on progress
 * @param color1 - Start color (hex)
 * @param color2 - End color (hex)
 * @param progress - Progress between 0 and 1
 * @returns Interpolated hex color
 */
export function interpolateColor(color1: string, color2: string, progress: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * progress;
  const g = rgb1.g + (rgb2.g - rgb1.g) * progress;
  const b = rgb1.b + (rgb2.b - rgb1.b) * progress;
  
  return rgbToHex(r, g, b);
}

/**
 * Darken a color by a given amount
 * @param hex - Hex color to darken
 * @param amount - Amount to darken (0-1, where 0.5 = 50% darker)
 * @returns Darkened hex color
 */
export function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - amount;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/**
 * Lighten a color by a given amount
 * @param hex - Hex color to lighten
 * @param amount - Amount to lighten (0-1, where 0.5 = 50% lighter)
 * @returns Lightened hex color
 */
export function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

/**
 * Adjust text color to ensure sufficient contrast with background
 * @param textColor - Original text color (hex)
 * @param backgroundColor - Background color (hex)
 * @param minContrast - Minimum required contrast ratio (WCAG AA = 4.5, AAA = 7.0)
 * @returns Adjusted text color with sufficient contrast
 */
export function adjustColorForContrast(
  textColor: string,
  backgroundColor: string,
  minContrast: number = 4.5
): string {
  const currentContrast = getContrast(textColor, backgroundColor);
  
  // If contrast is already sufficient, return original color
  if (currentContrast >= minContrast) {
    return textColor;
  }
  
  // Determine if background is light or dark
  const bgLuminance = getLuminance(backgroundColor);
  const isLightBackground = bgLuminance > 0.5;
  
  // Adjust color in steps until contrast is sufficient
  let adjustedColor = textColor;
  let step = 0.1;
  let iterations = 0;
  const maxIterations = 10;
  
  while (getContrast(adjustedColor, backgroundColor) < minContrast && iterations < maxIterations) {
    if (isLightBackground) {
      // Light background → darken text
      adjustedColor = darkenColor(adjustedColor, step);
    } else {
      // Dark background → lighten text
      adjustedColor = lightenColor(adjustedColor, step);
    }
    iterations++;
  }
  
  return adjustedColor;
}

/**
 * Get background color at a specific Y position in a gradient
 * @param gradient - Array of gradient colors (top to bottom)
 * @param yPosition - Y position on screen (0 = top)
 * @param canvasHeight - Total canvas height
 * @returns Interpolated background color at that position
 */
export function getBackgroundColorAtPosition(
  gradient: string[],
  yPosition: number,
  canvasHeight: number
): string {
  if (gradient.length === 0) {
    return '#000000'; // Fallback
  }
  
  if (gradient.length === 1) {
    return gradient[0]; // Single color
  }
  
  // Calculate progress through gradient (0 = top, 1 = bottom)
  const progress = Math.max(0, Math.min(1, yPosition / canvasHeight));
  
  // For 2-color gradient, simple interpolation
  if (gradient.length === 2) {
    return interpolateColor(gradient[0], gradient[1], progress);
  }
  
  // For multi-color gradient, find segment and interpolate
  const segmentCount = gradient.length - 1;
  const segmentIndex = Math.floor(progress * segmentCount);
  const segmentProgress = (progress * segmentCount) - segmentIndex;
  
  const startColor = gradient[Math.min(segmentIndex, gradient.length - 1)];
  const endColor = gradient[Math.min(segmentIndex + 1, gradient.length - 1)];
  
  return interpolateColor(startColor, endColor, segmentProgress);
}

