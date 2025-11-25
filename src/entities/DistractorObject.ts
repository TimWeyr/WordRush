// Distractor Object - should be shot, not collected

import { GameObject } from './GameObject';
import type { Vector2 } from '@/types/game.types';
import type { DistractorEntry } from '@/types/content.types';
import type { Renderer } from '@/core/Renderer';

export class DistractorObject extends GameObject {
  entry: DistractorEntry;
  word: string;
  points: number;
  damage: number;
  hp: number;
  currentHp: number;
  speed: number;
  speedMultiplier: number;
  redirect: string;
  context: string;
  colorCoded: boolean;
  isLernmodus: boolean;
  isRedirected: boolean; // Has been hit and is now returning
  hasHitShip: boolean = false; // Track if already collided with ship
  flashTime: number = 0; // Flash effect timer
  showRedirectTime: number = 0; // Show redirect text timer
  redirectFadeTime: number = 0; // Fade out timer after redirect (1.2 seconds)
  
  // Visual animation properties
  pulsatePhase: number = 0;
  shakeOffset: number = 0;
  glowIntensity: number = 0;
  hasLoggedVariant: boolean = false; // Debug flag to log variant once

  constructor(
    position: Vector2,
    entry: DistractorEntry,
    colorCoded: boolean,
    speedMultiplier: number,
    baseSpeed: number,
    isLernmodus: boolean = false,
    isZenMode: boolean = false
  ) {
    const radius = entry.visual.collisionRadius || 40;
    super(position, radius);
    
    this.entry = entry;
    this.word = entry.entry.word || '';
    this.points = entry.points;
    this.damage = entry.damage;
    this.hp = entry.hp || 1;
    this.currentHp = this.hp;
    this.speed = entry.speed * speedMultiplier * baseSpeed;
    this.speedMultiplier = speedMultiplier;
    this.redirect = entry.redirect;
    this.context = entry.context;
    this.colorCoded = colorCoded;
    this.isLernmodus = isLernmodus;
    this.isRedirected = false;
    
    // Set initial velocity
    if (isZenMode) {
      // ZEN MODE: Static objects (no movement)
      this.velocity.y = 0;
      this.velocity.x = 0;
    } else {
      // NORMAL MODE: Moving downward/toward base
      this.velocity.y = this.speed;
    }
    
    // DEBUG: Log color at spawn
    console.log('🎨 DISTRACTOR Constructor:', this.word, '| Zen:', isZenMode, '| velocity:', this.velocity);
  }

  update(deltaTime: number): void {
    // Apply behavior-based movement (only if not redirected)
    if (!this.isRedirected) {
      const behavior = this.entry.behavior || 'linear_inward';
      
      switch (behavior) {
        case 'seek_center': {
          // Move toward screen center
          const targetX = 400; // Screen width / 2
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
          // Standard straight down
          break;
      }
    }
    
    // Move based on current velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Update timers
    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
    }
    if (this.showRedirectTime > 0) {
      this.showRedirectTime -= deltaTime;
    }
    
    // Update redirect fade timer (has priority)
    if (this.isRedirected && this.redirectFadeTime > 0) {
      this.redirectFadeTime -= deltaTime;
      
      // Destroy after fade time expires
      if (this.redirectFadeTime <= 0) {
        this.destroy();
        return;
      }
    }
    
    // Update animation phases
    if (this.entry.visual.pulsate) {
      this.pulsatePhase += deltaTime * 3;
    }
    
    if (this.entry.visual.shake) {
      this.shakeOffset = Math.sin(this.spawnTime * 10) * 5;
    }
    
    if (this.entry.visual.glow) {
      this.glowIntensity = 0.5 + Math.sin(this.spawnTime * 4) * 0.5;
    }
    
    // If redirected and flies off-screen (upward), destroy it only if fade timer expired
    // (Fade timer has priority - let it complete even if off-screen)
    if (this.isRedirected && this.position.y < -this.radius && this.redirectFadeTime <= 0) {
      this.destroy();
    }
  }

  render(renderer: Renderer): void {
    const renderPos = {
      x: this.position.x + this.shakeOffset,
      y: this.position.y
    };

    // Calculate fade alpha if redirected
    let fadeAlpha = 1.0;
    if (this.isRedirected && this.redirectFadeTime > 0) {
      const fadeDuration = 1.2; // Total fade duration (1.2 seconds)
      const remainingTime = this.redirectFadeTime;
      fadeAlpha = remainingTime / fadeDuration; // Fade from 1.0 to 0.0
    }

    // Don't render if completely faded
    if (fadeAlpha <= 0) {
      return;
    }

    const ctx = renderer.getContext();
    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Shapes removed - only text is rendered

    // Show redirect text during collision flash
    let displayWord = this.word;
    if (this.isRedirected) {
      displayWord = this.redirect;
    } else if (this.showRedirectTime > 0 && this.redirect) {
      displayWord = `→ ${this.redirect}`;
    }
    
    // BIGGER font for better readability
    const baseFont = 18 * (this.entry.visual.fontSize || 1.0);
    const wordLength = displayWord.length;
    const fontScale = wordLength > 10 ? Math.max(0.8, 1 - (wordLength - 10) * 0.02) : 1;
    
    // Always WHITE text (unless showing redirect)
    const textColor = this.showRedirectTime > 0 ? '#ffff00' : '#ffffff';
    
    renderer.renderText(displayWord, renderPos, {
      fontSize: baseFont * fontScale,
      color: textColor,
      outline: true,
      outlineColor: '#000000',
      bold: true,
      glow: true,
      glowSize: 1.5 // Glow slightly larger than text
    });

    ctx.restore();

    // Show HP if more than 1 (and not redirected)
    if (this.hp > 1 && !this.isRedirected) {
      renderer.renderText(
        `HP: ${this.currentHp}`,
        { x: this.position.x, y: this.position.y + this.radius + 15 },
        {
          fontSize: 12,
          color: '#ffff00',
          outline: true,
          bold: false
        }
      );
    }
  }

  takeDamage(amount: number): void {
    this.currentHp -= amount;
    if (this.currentHp <= 0) {
      // If has redirect, transform instead of destroy
      if (this.redirect && !this.isRedirected) {
        this.triggerRedirect();
      } else {
        this.destroy();
      }
    }
  }

  triggerRedirect(): void {
    console.log('🔄 Redirect triggered:', this.word, '→', this.redirect);
    this.isRedirected = true;
    
    // Reverse direction (fly back up)
    this.velocity.y = -this.speed * 2; // Double speed going back
    
    // Reset HP so it can't be shot again
    this.currentHp = 999;
    
    // Start fade out timer (1.2 seconds)
    this.redirectFadeTime = 1.2;
  }

  triggerCollisionEffect(): void {
    this.flashTime = 0.3; // Flash for 300ms
    if (this.redirect) {
      this.showRedirectTime = 0.5; // Show redirect for 500ms
    }
    this.hasHitShip = true;
  }

  getDisplayColor(): string {
    return this.colorCoded ? '#ff3333' : (this.entry.visual.color || '#ff6666');
  }
}

