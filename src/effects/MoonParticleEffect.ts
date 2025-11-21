// Moon Particle Effect
// Sprinkles small particles from moon when all items reach 100%

import type { Renderer } from '@/core/Renderer';

interface MoonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  angle: number;
  distance: number;
}

export class MoonParticleEffect {
  private particles: MoonParticle[] = [];
  private moonX: number = 0;
  private moonY: number = 0;
  private active: boolean = false;
  private colors: string[] = ['#4a90e2', '#7bb3f0', '#8e44ad'];
  
  constructor(moonX: number, moonY: number, themeColors?: string[]) {
    this.moonX = moonX;
    this.moonY = moonY;
    if (themeColors) {
      this.colors = themeColors;
    }
  }
  
  /**
   * Activate particle effect
   */
  activate(): void {
    this.active = true;
    this.spawnParticles();
  }
  
  /**
   * Deactivate particle effect
   */
  deactivate(): void {
    this.active = false;
    this.particles = [];
  }
  
  /**
   * Update moon position
   */
  setPosition(x: number, y: number): void {
    this.moonX = x;
    this.moonY = y;
  }
  
  /**
   * Spawn initial particles
   */
  private spawnParticles(): void {
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 15 + Math.random() * 10;
      const speed = 10 + Math.random() * 20;
      
      this.particles.push({
        x: this.moonX + Math.cos(angle) * distance,
        y: this.moonY + Math.sin(angle) * distance,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        size: 1 + Math.random() * 2,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        angle,
        distance
      });
    }
  }
  
  /**
   * Update particles
   */
  update(deltaTime: number): void {
    if (!this.active) return;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position (rotate around moon)
      particle.angle += deltaTime * 2;
      particle.distance += deltaTime * 30;
      
      particle.x = this.moonX + Math.cos(particle.angle) * particle.distance;
      particle.y = this.moonY + Math.sin(particle.angle) * particle.distance;
      
      // Update life
      particle.life -= deltaTime * 0.5;
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        
        // Spawn new particle if effect is still active
        if (this.active && this.particles.length < 20) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 15 + Math.random() * 10;
          
          this.particles.push({
            x: this.moonX + Math.cos(angle) * distance,
            y: this.moonY + Math.sin(angle) * distance,
            vx: Math.cos(angle) * (10 + Math.random() * 20),
            vy: Math.sin(angle) * (10 + Math.random() * 20),
            life: 1.0,
            maxLife: 1.0,
            size: 1 + Math.random() * 2,
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            angle,
            distance
          });
        }
      }
    }
  }
  
  /**
   * Render particles
   */
  render(renderer: Renderer): void {
    if (!this.active || this.particles.length === 0) return;
    
    const ctx = renderer.getContext();
    
    for (const particle of this.particles) {
      const alpha = particle.life / particle.maxLife;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  
  /**
   * Check if effect is active
   */
  isActive(): boolean {
    return this.active && this.particles.length > 0;
  }
}

