// Base Entity - stationary, represents current learning concept

import { GameObject } from './GameObject';
import type { Vector2 } from '@/types/game.types';
import type { BaseEntry } from '@/types/content.types';
import type { Renderer } from '@/core/Renderer';

export class BaseEntity extends GameObject {
  content: BaseEntry | null;
  word: string;
  damageBlink: number;

  constructor(position: Vector2) {
    super(position, 50); // Fixed radius
    this.content = null;
    this.word = '';
    this.damageBlink = 0;
  }

  setContent(base: BaseEntry): void {
    this.content = base;
    this.word = base.word || '';
  }

  update(deltaTime: number): void {
    // Base is stationary, only update blink effect
    if (this.damageBlink > 0) {
      this.damageBlink -= deltaTime;
    }
  }

  render(renderer: Renderer): void {
    if (!this.content) return;

    // Blink effect when hit by distractor
    const isBlinking = this.damageBlink > 0 && Math.floor(this.damageBlink * 10) % 2 === 0;
    
    if (!isBlinking) {
      const color = this.content.visual.color || '#c05060';
      
      // Render the cool arcade glassmorphism base
      this.renderArcadeGlassBase(renderer, color);
      
      // Render word
      renderer.renderText(this.word, this.position, {
        fontSize: 24 * (this.content.visual.size || 1.0),
        color: '#ffffff',
        outline: true,
        bold: this.content.visual.appearance === 'bold'
      });
    }
  }

  // COOL ARCADE GLASSMORPHISM BASE - combines glass effect with neon arcade aesthetics
  private renderArcadeGlassBase(renderer: Renderer, color: string): void {
    const ctx = renderer.getContext();
    const canvas = ctx.canvas;
    const time = Date.now() / 1000;
    
    // Wide platform (80% of screen width)
    const platformWidth = canvas.width * 0.8;
    const platformHeight = 70; // Slightly taller for better effect
    const x = this.position.x - platformWidth / 2;
    const y = this.position.y - platformHeight / 2;
    
    ctx.save();
    
    // === LAYER 1: Outer Neon Glow (pulsing) ===
    const pulseIntensity = 0.7 + Math.sin(time * 4) * 0.3;
    const glowRadius = 20;
    
    // Outer glow shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = glowRadius * pulseIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // === LAYER 2: Glassmorphism Base ===
    // Create glass effect with blur simulation
    const glassGradient = ctx.createLinearGradient(x, y, x, y + platformHeight);
    
    // Extract RGB from color
    const rgb = this.hexToRgb(color);
    const r = rgb.r;
    const g = rgb.g;
    const b = rgb.b;
    
    // Glass effect: semi-transparent with color tint
    glassGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`); // Top: more transparent
    glassGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.35)`); // Mid-top
    glassGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`); // Center
    glassGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.35)`); // Mid-bottom
    glassGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.3)`); // Bottom
    
    // Rounded corners for modern look
    const cornerRadius = 12;
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + platformWidth - cornerRadius, y);
    ctx.quadraticCurveTo(x + platformWidth, y, x + platformWidth, y + cornerRadius);
    ctx.lineTo(x + platformWidth, y + platformHeight - cornerRadius);
    ctx.quadraticCurveTo(x + platformWidth, y + platformHeight, x + platformWidth - cornerRadius, y + platformHeight);
    ctx.lineTo(x + cornerRadius, y + platformHeight);
    ctx.quadraticCurveTo(x, y + platformHeight, x, y + platformHeight - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    
    ctx.fillStyle = glassGradient;
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // === LAYER 3: Glass Highlight (top edge shine) ===
    const highlightGradient = ctx.createLinearGradient(x, y, x, y + platformHeight * 0.3);
    highlightGradient.addColorStop(0, `rgba(255, 255, 255, 0.4)`);
    highlightGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + platformWidth - cornerRadius, y);
    ctx.quadraticCurveTo(x + platformWidth, y, x + platformWidth, y + cornerRadius);
    ctx.lineTo(x + platformWidth, y + platformHeight * 0.3);
    ctx.lineTo(x, y + platformHeight * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // === LAYER 4: Neon Border (animated) ===
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15 * pulseIntensity;
    
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + platformWidth - cornerRadius, y);
    ctx.quadraticCurveTo(x + platformWidth, y, x + platformWidth, y + cornerRadius);
    ctx.lineTo(x + platformWidth, y + platformHeight - cornerRadius);
    ctx.quadraticCurveTo(x + platformWidth, y + platformHeight, x + platformWidth - cornerRadius, y + platformHeight);
    ctx.lineTo(x + cornerRadius, y + platformHeight);
    ctx.quadraticCurveTo(x, y + platformHeight, x, y + platformHeight - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // === LAYER 5: Hologram Scanlines (arcade effect) ===
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
    ctx.lineWidth = 1;
    
    const scanlineSpeed = time * 50;
    const scanlineSpacing = 4;
    const startY = (y + scanlineSpeed) % scanlineSpacing;
    
    for (let sy = y + startY; sy < y + platformHeight; sy += scanlineSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + platformWidth, sy);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    // === LAYER 6: Energy Grid Pattern ===
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    
    const gridSpacing = 30;
    const gridOffset = (time * 20) % gridSpacing;
    
    // Vertical lines
    for (let gx = x + gridOffset; gx < x + platformWidth; gx += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + platformHeight);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let gy = y + gridOffset; gy < y + platformHeight; gy += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + platformWidth, gy);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    // === LAYER 7: Corner Accents (neon corners) ===
    const cornerSize = 15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + cornerRadius + cornerSize, y);
    ctx.moveTo(x, y + cornerRadius);
    ctx.lineTo(x, y + cornerRadius + cornerSize);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + platformWidth - cornerRadius, y);
    ctx.lineTo(x + platformWidth - cornerRadius - cornerSize, y);
    ctx.moveTo(x + platformWidth, y + cornerRadius);
    ctx.lineTo(x + platformWidth, y + cornerRadius + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y + platformHeight);
    ctx.lineTo(x + cornerRadius + cornerSize, y + platformHeight);
    ctx.moveTo(x, y + platformHeight - cornerRadius);
    ctx.lineTo(x, y + platformHeight - cornerRadius - cornerSize);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + platformWidth - cornerRadius, y + platformHeight);
    ctx.lineTo(x + platformWidth - cornerRadius - cornerSize, y + platformHeight);
    ctx.moveTo(x + platformWidth, y + platformHeight - cornerRadius);
    ctx.lineTo(x + platformWidth, y + platformHeight - cornerRadius - cornerSize);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // === LAYER 8: Inner Glow (subtle) ===
    const innerGlowGradient = ctx.createRadialGradient(
      this.position.x, this.position.y, 0,
      this.position.x, this.position.y, platformWidth * 0.4
    );
    innerGlowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
    innerGlowGradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = innerGlowGradient;
    ctx.fillRect(x, y, platformWidth, platformHeight);
    
    ctx.restore();
  }
  
  // Helper to convert hex to RGB
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (!hex.startsWith('#')) {
      // Fallback for non-hex colors
      return { r: 192, g: 80, b: 96 };
    }
    const num = parseInt(hex.slice(1), 16);
    return {
      r: (num >> 16) & 0xff,
      g: (num >> 8) & 0xff,
      b: num & 0xff
    };
  }


  triggerBlink(): void {
    // Extend blink duration if already blinking, otherwise set to 0.5 seconds
    this.damageBlink = Math.max(this.damageBlink, 0.5); // Blink for 0.5 seconds (longer for better visibility)
  }
}

