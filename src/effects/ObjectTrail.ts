// Object Trail Effect
// Creates particle trails behind moving game objects

import type { Vector2 } from '@/types/game.types';
import type { Renderer } from '@/core/Renderer';

interface TrailParticle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  vx: number;
  vy: number;
}

export class ObjectTrail {
  private particles: TrailParticle[] = [];

  // Helper to create colorful variations
  private varyColor(baseColor: string): string {
    // Parse hex color
    if (!baseColor.startsWith('#')) {
      // If already RGB, try to parse it
      if (baseColor.startsWith('rgb')) {
        return baseColor;
      }
      return baseColor;
    }
    const num = parseInt(baseColor.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    
    // Add random variation (±30) for colorful fairy dust effect
    const variation = 30;
    const newR = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * variation * 2));
    const newG = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * variation * 2));
    const newB = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * variation * 2));
    
    return `rgb(${Math.floor(newR)}, ${Math.floor(newG)}, ${Math.floor(newB)})`;
  }

  // Helper to convert RGB color to RGBA with opacity
  private colorWithOpacity(color: string, opacity: number): string {
    // If already RGB format
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', `rgba(`).replace(')', `, ${opacity})`);
    }
    // If hex format
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = (num >> 16) & 0xff;
      const g = (num >> 8) & 0xff;
      const b = num & 0xff;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }

  // Spawn trail particles for an object
  spawnTrail(position: Vector2, velocity: Vector2, color: string, type: 'sparkle' | 'fire' = 'sparkle', wordWidth: number = 60): void {
    // More particles distributed across word width
    const particleCount = 4; // More particles for better distribution
    
    // Calculate speed and direction
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const normalizedVx = speed > 0 ? velocity.x / speed : 0;
    const normalizedVy = speed > 0 ? velocity.y / speed : 0;
    
    // Distribute particles across word width
    for (let i = 0; i < particleCount; i++) {
      // Distribute evenly across word width (from left to right edges)
      const t = i / (particleCount - 1 || 1); // 0 to 1
      const xOffset = (t - 0.5) * wordWidth; // -halfWidth to +halfWidth
      
      // Calculate distance from center (0 = center, 0.5 = edge)
      const distanceFromCenter = Math.abs(t - 0.5) * 2; // 0 to 1 (0 = center, 1 = edge)
      
      // Small vertical spread
      const yOffset = (Math.random() - 0.5) * 3;
      
      const startX = position.x + xOffset;
      const startY = position.y + yOffset;
      
      // Velocity: parallel backward movement (NO convergence)
      // Particles move straight back, not toward center
      const backwardStrength = 0.4;
      
      // Backward velocity (opposite to movement direction) - parallel, no convergence
      const backwardVelX = -normalizedVx * speed * backwardStrength;
      const backwardVelY = -normalizedVy * speed * backwardStrength;
      
      // Add small random variation for natural movement (but keep parallel)
      const randomSpread = 2; // Smaller spread to keep parallel
      const randomVx = (Math.random() - 0.5) * randomSpread;
      const randomVy = (Math.random() - 0.5) * randomSpread;
      
      // Life duration: shorter for particles further from center
      // Center particles live longest, edge particles live shortest
      const baseLife = 0.6;
      const lifeVariation = 0.3;
      const lifeReduction = distanceFromCenter * 0.4; // Up to 0.4 seconds reduction at edges
      const particleLife = baseLife + Math.random() * lifeVariation - lifeReduction;
      const particleMaxLife = 0.8 - lifeReduction;
      
      this.particles.push({
        x: startX,
        y: startY,
        size: 0.3 + Math.random() * 0.7, // Much smaller: 0.3-1.0 pixels
        life: Math.max(0.2, particleLife), // Ensure minimum life
        maxLife: Math.max(0.3, particleMaxLife), // Ensure minimum max life
        color: this.varyColor(color), // Colorful variation
        vx: backwardVelX + randomVx,
        vy: backwardVelY + randomVy
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      
      // Fade out
      p.life -= deltaTime;
      
      // Remove if dead
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(renderer: Renderer): void {
    const ctx = renderer.getContext();
    
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * 0.8; // Softer, more transparent
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Soft glow effect for fairy dust
      const glowSize = p.size * 3; // Larger glow relative to size
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.5, this.colorWithOpacity(p.color, 0.5)); // 50% opacity
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
      ctx.fill();
      
      // Small bright center (fairy dust sparkle)
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

