import type { Vector2 } from '@/types/game.types';
import type { Renderer } from '@/core/Renderer';

export interface ParticleConfig {
  position: Vector2;
  velocity: Vector2;
  color: string;
  size: number;
  lifetime: number;
  fadeOut?: boolean;
  gravity?: boolean;
}

export class Particle {
  position: Vector2;
  velocity: Vector2;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
  fadeOut: boolean;
  gravity: boolean;
  isActive: boolean = true;

  constructor(config: ParticleConfig) {
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.color = config.color;
    this.size = config.size;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
    this.fadeOut = config.fadeOut ?? true;
    this.gravity = config.gravity ?? false;
  }

  update(deltaTime: number): void {
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Apply gravity if enabled
    if (this.gravity) {
      this.velocity.y += 300 * deltaTime;
    }

    // Update lifetime
    this.lifetime -= deltaTime;
    if (this.lifetime <= 0) {
      this.isActive = false;
    }
  }

  render(renderer: Renderer): void {
    const alpha = this.fadeOut 
      ? this.lifetime / this.maxLifetime 
      : 1;

    const colorWithAlpha = this.color.includes('rgba')
      ? this.color
      : this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);

    renderer.renderCircle(
      this.position,
      this.size,
      colorWithAlpha,
      undefined,
      alpha
    );
  }
}

// Explosion factory functions
export function createExplosion(
  position: Vector2,
  color: string,
  particleCount: number = 15,
  type: 'correct' | 'distractor' = 'correct',
  points: number = 100,
  damage: number = 1
): Particle[] {
  const particles: Particle[] = [];
  
  // Scale by points (50-300 range)
  const pointsScale = Math.min(Math.max((points - 50) / 250, 0), 1); // 0-1
  const damageMultiplier = type === 'distractor' ? damage : 1;
  
  // Helper function to check if color is in red-orange range
  const isRedOrangeColor = (hexColor: string): boolean => {
    if (!hexColor.startsWith('#')) return false;
    const num = parseInt(hexColor.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    
    // Check if it's in red-orange range: high red, medium-high green, low blue
    return r > 200 && g > 50 && g < 200 && b < 100;
  };
  
  // Check if this is a red-orange explosion (for distractor special parameters)
  const isRedOrangeExplosion = isRedOrangeColor(color);
  
  // More particles for higher points/damage
  // For red-orange (distractor): MORE particles, but smaller
  const finalParticleCount = type === 'distractor'
    ? Math.floor(particleCount * (1 + pointsScale * 2.5) * damageMultiplier * 1.5) // Much more particles
    : isRedOrangeExplosion
    ? Math.floor(particleCount * (1 + pointsScale * 1.5) * 1.8) // More particles for red-orange explosions
    : Math.floor(particleCount * (1 + pointsScale * 1.5) * damageMultiplier);
  
  const baseSpeed = type === 'distractor' 
    ? 180 + pointsScale * 250  // 180-430 (much faster!)
    : isRedOrangeExplosion
    ? 80 + pointsScale * 100    // 80-180 (slightly faster for bigger explosion)
    : 60 + pointsScale * 90;    // 60-150
  
  const baseSize = type === 'distractor'
    ? 6 + pointsScale * 10 * damageMultiplier  // 6-16 * damage (much bigger!)
    : isRedOrangeExplosion
    ? 1.5 + pointsScale * 2.5   // 1.5-4 (SMALLER particles for red-orange)
    : 2 + pointsScale * 4;                     // 2-6
  
  const baseLifetime = type === 'distractor'
    ? 0.8 + pointsScale * 1.0  // 0.8-1.8s (longer lasting)
    : isRedOrangeExplosion
    ? 0.6 + pointsScale * 0.9  // 0.6-1.5s (LONGER lasting for red-orange)
    : 0.3 + pointsScale * 0.5; // 0.3-0.8s
  
  // Color variations for more vibrant explosions
  // Determine color palette based on the main color, not just type
  const colors = [color];
  
  if (isRedOrangeColor(color)) {
    // Red-orange fiery colors palette
    colors.push(
      '#ff2200', // Deep red
      '#ff4400', // Bright red-orange
      '#ff6600', // Orange-red
      '#ff3300', // Red
      '#ff8800', // Bright orange
      '#ff5500', // Orange
      '#ff1100', // Dark red
      '#ff7700', // Light orange-red
      '#ff9900', // Yellow-orange
      '#ff0000'  // Pure red
    );
  } else {
    // Sparkly colors for green/gold/other colors (correct objects)
    colors.push('#ffffff', '#ffff88', '#aaffff');
  }
  
  for (let i = 0; i < finalParticleCount; i++) {
    // Distribute particles evenly in all directions (360 degrees)
    const baseAngle = (Math.PI * 2 * i) / finalParticleCount;
    const randomSpread = type === 'distractor' 
      ? (Math.random() - 0.5) * 1.2  // Even wider spread for distractors
      : isRedOrangeExplosion
      ? (Math.random() - 0.5) * 1.0  // Wider spread for red-orange explosions
      : (Math.random() - 0.5) * 0.8;
    const angle = baseAngle + randomSpread;
    const speedVariation = type === 'distractor'
      ? 0.5 + Math.random() * 1.8  // More extreme speed variation
      : isRedOrangeExplosion
      ? 0.5 + Math.random() * 1.5  // More variation for red-orange
      : 0.6 + Math.random() * 1.4;
    const speed = baseSpeed * speedVariation;
    
    const size = baseSize * (0.5 + Math.random() * 0.8);
    const lifetime = baseLifetime * (0.7 + Math.random() * 0.6);
    
    // Pick random color from palette
    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    particles.push(new Particle({
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      color: particleColor,
      size: size,
      lifetime: lifetime,
      fadeOut: true,
      gravity: type === 'distractor' // Distractors have gravity
    }));
  }
  
  return particles;
}

