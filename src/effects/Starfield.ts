// Animated Starfield Effect
// Creates a dynamic space background with multiple star layers

import type { Renderer } from '@/core/Renderer';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
  twinklePhase: number;
  color: string;
}

export class Starfield {
  private stars: Star[] = [];
  private screenWidth: number;
  private screenHeight: number;
  private speedMultiplier: number = 1;

  constructor(screenWidth: number, screenHeight: number, starCount: number = 150) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.initStars(starCount);
  }

  private initStars(count: number): void {
    // Layer 1: Large slow stars (20%)
    const layer1Count = Math.floor(count * 0.2);
    for (let i = 0; i < layer1Count; i++) {
      this.stars.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        size: 2 + Math.random() * 2, // 2-4px
        speed: 20 + Math.random() * 30, // 20-50 px/s
        brightness: 0.6 + Math.random() * 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#4a90e2' // Theme primary
      });
    }

    // Layer 2: Medium stars (30%)
    const layer2Count = Math.floor(count * 0.3);
    for (let i = 0; i < layer2Count; i++) {
      this.stars.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        size: 1.5 + Math.random() * 1.5, // 1.5-3px
        speed: 50 + Math.random() * 50, // 50-100 px/s
        brightness: 0.5 + Math.random() * 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#7bb3f0' // Theme accent
      });
    }

    // Layer 3: Small fast stars (50%)
    const layer3Count = count - layer1Count - layer2Count;
    for (let i = 0; i < layer3Count; i++) {
      this.stars.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        size: 0.5 + Math.random() * 1, // 0.5-1.5px
        speed: 100 + Math.random() * 100, // 100-200 px/s
        brightness: 0.3 + Math.random() * 0.7,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#ffffff' // White
      });
    }
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  update(deltaTime: number): void {
    for (const star of this.stars) {
      // Move star downward
      star.y += star.speed * this.speedMultiplier * deltaTime;

      // Wrap around when off-screen
      if (star.y > this.screenHeight + star.size) {
        star.y = -star.size;
        star.x = Math.random() * this.screenWidth;
      }

      // Twinkle effect
      star.twinklePhase += deltaTime * 2;
      star.brightness = 0.5 + Math.sin(star.twinklePhase) * 0.3;
    }
  }

  render(renderer: Renderer): void {
    const ctx = renderer.getContext();
    
    for (const star of this.stars) {
      const alpha = star.brightness;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Render star with glow
      const gradient = ctx.createRadialGradient(
        star.x, star.y, 0,
        star.x, star.y, star.size * 2
      );
      gradient.addColorStop(0, star.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Bright center
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }
}

