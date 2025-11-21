// Correct Object - should be collected by ship

import { GameObject } from './GameObject';
import type { Vector2 } from '@/types/game.types';
import type { CorrectEntry } from '@/types/content.types';
import type { Renderer } from '@/core/Renderer';

export class CorrectObject extends GameObject {
  entry: CorrectEntry;
  word: string;
  points: number;
  speed: number;
  speedMultiplier: number;
  collectionOrder?: number;
  context: string;
  colorCoded: boolean;
  isLernmodus: boolean;
  
  // Visual animation properties
  pulsatePhase: number = 0;
  shakeOffset: number = 0;
  glowIntensity: number = 0;
  hasLoggedVariant: boolean = false; // Debug flag to log variant once

  constructor(
    position: Vector2,
    entry: CorrectEntry,
    colorCoded: boolean,
    speedMultiplier: number,
    baseSpeed: number,
    isLernmodus: boolean = false
  ) {
    const radius = entry.visual.collisionRadius || 40;
    super(position, radius);
    
    this.entry = entry;
    this.word = entry.entry.word || '';
    this.points = entry.points;
    this.speed = entry.speed * speedMultiplier * baseSpeed;
    this.speedMultiplier = speedMultiplier;
    this.collectionOrder = entry.collectionOrder;
    this.context = entry.context;
    this.colorCoded = colorCoded;
    this.isLernmodus = isLernmodus;
    
    // Set initial velocity (moving downward/toward base)
    this.velocity.y = this.speed;
  }

  update(deltaTime: number): void {
    // Apply behavior-based movement
    const behavior = this.entry.behavior || 'linear_inward';
    
    switch (behavior) {
      case 'seek_center': {
        // Move toward screen center
        const targetX = 400; // Screen width / 2 (from config)
        const dx = targetX - this.position.x;
        const attractForce = 0.3;
        this.velocity.x = dx * attractForce;
        break;
      }
      
      case 'zigzag': {
        // Sine wave horizontal movement
        const amplitude = 80;
        const frequency = 2;
        this.velocity.x = Math.cos(this.spawnTime * frequency) * amplitude;
        break;
      }
      
      case 'linear_inward':
      default:
        // Standard straight down (velocity already set in constructor)
        break;
    }
    
    // Move downward
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Update animation phases
    if (this.entry.visual.pulsate) {
      this.pulsatePhase += deltaTime * 3; // 3 cycles per second
    }
    
    if (this.entry.visual.shake) {
      this.shakeOffset = Math.sin(this.spawnTime * 10) * 5;
    }
    
    if (this.entry.visual.glow) {
      this.glowIntensity = 0.5 + Math.sin(this.spawnTime * 4) * 0.5;
    }
  }

  render(renderer: Renderer): void {
    const renderPos = {
      x: this.position.x + this.shakeOffset,
      y: this.position.y
    };

    // Shapes removed - only text is rendered

    // Render word with collection order (ONLY in Lernmodus)
    const displayText = this.collectionOrder && this.isLernmodus
      ? `${this.collectionOrder}. ${this.word}`
      : this.word;

    // BIGGER font for better readability
    const baseFont = 18 * (this.entry.visual.fontSize || 1.0);
    const wordLength = displayText.length;
    // Less aggressive scaling
    const fontScale = wordLength > 10 ? Math.max(0.8, 1 - (wordLength - 10) * 0.02) : 1;

    // Use GREEN text in Lernmodus, WHITE otherwise
    const textColor = this.isLernmodus ? '#00ff88' : '#ffffff';

    renderer.renderText(displayText, renderPos, {
      fontSize: baseFont * fontScale,
      color: textColor,
      outline: true,
      outlineColor: '#000000',
      bold: true,
      glow: true,
      glowSize: 1.5 // Glow slightly larger than text
    });
  }

  getDisplayColor(): string {
    return this.colorCoded ? '#00ff88' : (this.entry.visual.color || '#7fe8a2');
  }
}

