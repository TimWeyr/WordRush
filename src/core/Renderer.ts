// Canvas Renderer with retro game aesthetic

import type { Vector2 } from '@/types/game.types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private backgroundColor: string = '#0f1038'; // Default dark blue

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Retro game styling
    this.ctx.imageSmoothingEnabled = false; // Pixelated look
  }

  // Set background color for glow calculations
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // Calculate a contrasting glow color based on background
  private getContrastingGlowColor(bgColor: string): string {
    if (!bgColor.startsWith('#')) return '#ffffff';
    
    const num = parseInt(bgColor.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    
    // Calculate brightness (WCAG formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // For dark backgrounds, use bright glow; for light backgrounds, use dark glow
    // But make it colorful and contrasting
    if (brightness < 100) {
      // Dark background - use bright, saturated colors
      // Try to complement the background color
      const complementR = 255 - r;
      const complementG = 255 - g;
      const complementB = 255 - b;
      
      // Boost saturation and brightness
      return `rgb(${Math.min(255, complementR + 50)}, ${Math.min(255, complementG + 50)}, ${Math.min(255, complementB + 50)})`;
    } else {
      // Light background - use darker, contrasting color
      return `rgb(${Math.max(0, r - 100)}, ${Math.max(0, g - 100)}, ${Math.max(0, b - 100)})`;
    }
  }

  // Render text with arcade game style
  renderText(text: string, pos: Vector2, options: {
    fontSize?: number;
    color?: string;
    outline?: boolean;
    outlineColor?: string;
    align?: CanvasTextAlign;
    bold?: boolean;
    font?: string;
    glow?: boolean;
    glowColor?: string;
    glowSize?: number;
  } = {}): void {
    const {
      fontSize = 20,
      color = '#ffffff',
      outline = true,
      outlineColor = '#000000',
      align = 'center',
      font,
      glow = false,
      glowColor,
      glowSize = 1.2
    } = options;

    this.ctx.save();
    
    // Preserve existing alpha from parent context (for fade effects)
    const parentAlpha = this.ctx.globalAlpha;
    
    // SIMPLE, READABLE FONT - Always use Arial (most readable)
    const fontFamily = font || 'Arial, sans-serif';
    const fontWeight = '700'; // Always bold for game readability
    
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'middle';

    // Render glow shadow if enabled (before outline and fill)
    if (glow) {
      const glowCol = glowColor || this.getContrastingGlowColor(this.backgroundColor);
      const glowRadius = fontSize * glowSize;
      
      // Create multiple layers for smooth glow effect that follows text shape
      // Draw multiple times with increasing blur and decreasing opacity
      const layers = 5;
      for (let i = layers; i >= 1; i--) {
        const layerBlur = (glowRadius * i) / layers;
        const layerAlpha = (0.8 / layers) * i * parentAlpha; // Multiply by parent alpha for fade effect
        
        this.ctx.shadowColor = glowCol;
        this.ctx.shadowBlur = layerBlur;
        this.ctx.globalAlpha = layerAlpha;
        this.ctx.fillStyle = glowCol;
        this.ctx.fillText(text, pos.x, pos.y);
      }
      
      // Reset shadow and restore parent alpha
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = parentAlpha;
    }

    // THICK OUTLINE for maximum contrast
    if (outline) {
      this.ctx.strokeStyle = outlineColor;
      this.ctx.lineWidth = Math.max(5, fontSize * 0.25); // Scale with font size
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
      
      // Draw outline multiple times for thickness
      for (let i = 0; i < 2; i++) {
        this.ctx.strokeText(text, pos.x, pos.y);
      }
    }

    // Fill text with WHITE or BLACK only (max contrast)
    // Ensure parent alpha is applied
    this.ctx.globalAlpha = parentAlpha;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, pos.x, pos.y);
    
    this.ctx.restore();
  }

  // Expose canvas context for custom rendering
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  // Get high-contrast text color for any background
  getComplementaryColor(bgColor: string): string {
    if (!bgColor.startsWith('#')) return '#ffffff';
    
    const num = parseInt(bgColor.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    
    // Calculate perceived brightness (WCAG formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Simple but effective: Use white or black based on brightness
    // This ensures MAXIMUM contrast!
    if (brightness > 140) {
      return '#000000'; // Black text on light background
    } else {
      return '#ffffff'; // White text on dark background
    }
  }

  // Render circle (for simple game objects)
  renderCircle(pos: Vector2, radius: number, color: string, outline?: { color: string; width: number }, opacity: number = 1): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    
    // Fill
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Optional outline
    if (outline) {
      this.ctx.strokeStyle = outline.color;
      this.ctx.lineWidth = outline.width;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // Bubble variant - soft, rounded with highlight
  renderBubble(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    // Main bubble
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Glossy highlight
    const gradient = this.ctx.createRadialGradient(
      pos.x - radius * 0.3, pos.y - radius * 0.3, 0,
      pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.6
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Soft border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Spike variant - aggressive, angular (4 sharp points!)
  renderSpike(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    // Draw 4-pointed spike (like a dangerous diamond)
    this.ctx.beginPath();
    const points = 4;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points + Math.PI / 4; // Rotate 45deg
      const r = i % 2 === 0 ? radius * 1.3 : radius * 0.4; // Sharp spikes!
      const x = pos.x + Math.cos(angle) * r;
      const y = pos.y + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Sharp border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Square variant - geometric
  renderSquare(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    const size = radius * 1.4; // Square slightly larger for same visual weight
    this.ctx.beginPath();
    this.ctx.rect(pos.x - size, pos.y - size, size * 2, size * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Border
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Hexagon variant - 6-sided
  renderHexagon(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = pos.x + radius * Math.cos(angle);
      const y = pos.y + radius * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Gradient overlay
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Diamond variant - 4-sided rotated
  renderDiamond(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    const size = radius * 1.3;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - size);
    this.ctx.lineTo(pos.x + size, pos.y);
    this.ctx.lineTo(pos.x, pos.y + size);
    this.ctx.lineTo(pos.x - size, pos.y);
    this.ctx.closePath();
    
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Shine effect
    const gradient = this.ctx.createLinearGradient(pos.x - size, pos.y - size, pos.x + size, pos.y + size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffff00';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Star variant - 5-pointed star
  renderStar(pos: Vector2, radius: number, color: string): void {
    this.ctx.save();
    
    this.ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const x = pos.x + r * Math.cos(angle);
      const y = pos.y + r * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#ffff88';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Render line (for laser)
  renderLine(from: Vector2, to: Vector2, color: string, width: number): void {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  // Render gradient background
  renderGradientBackground(colors: string[]): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  // Simple parallax layer (scrolling background)
  renderParallaxLayer(offset: number, color: string, opacity: number): void {
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;
    
    // Draw repeating pattern
    const circleSize = 2;
    const spacing = 100;
    
    for (let x = 0; x < this.width + spacing; x += spacing) {
      for (let y = -spacing; y < this.height + spacing; y += spacing) {
        const yPos = (y + offset) % (this.height + spacing * 2);
        this.ctx.beginPath();
        this.ctx.arc(x, yPos, circleSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    this.ctx.restore();
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  // Render an image (for ship skins, etc)
  renderImage(
    image: HTMLImageElement,
    position: Vector2,
    size: { width: number; height: number },
    options: {
      rotation?: number;
      opacity?: number;
    } = {}
  ): void {
    const { rotation = 0, opacity = 1 } = options;
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    // Move to position and rotate
    this.ctx.translate(position.x, position.y);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    
    // Draw image centered
    this.ctx.drawImage(
      image,
      -size.width / 2,
      -size.height / 2,
      size.width,
      size.height
    );
    
    this.ctx.restore();
  }
}

