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
  friction?: number; // 0-1 (1 = no friction, 0.9 = slows down)
  text?: string; // If set, renders text instead of circle
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
  friction: number;
  text?: string;
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
    this.friction = config.friction ?? 1;
    this.text = config.text;
  }

  update(deltaTime: number): void {
    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Apply gravity if enabled
    if (this.gravity) {
      this.velocity.y += 1000 * deltaTime; // Increased from 300 for visible drop
    }
    
    // Apply friction
    if (this.friction < 1) {
      this.velocity.x *= Math.pow(this.friction, deltaTime * 60); // Frame-rate independent friction
      this.velocity.y *= Math.pow(this.friction, deltaTime * 60);
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
      : this.color.startsWith('#') 
        ? this.hexToRgba(this.color, alpha)
        : this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);

    if (this.text) {
      // Render floating text
      renderer.renderText(
        this.text,
        this.position,
        {
          color: colorWithAlpha,
          fontSize: this.size,
          outline: true,
          outlineColor: `rgba(0,0,0,${alpha * 0.5})`, // Fading outline
          bold: true,
          glow: true,
          glowColor: colorWithAlpha,
          glowSize: 0.5
        }
      );
    } else {
      // Render particle circle
      renderer.renderCircle(
        this.position,
        this.size,
        colorWithAlpha,
        undefined,
        alpha
      );
    }
  }
  
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

// Floating Text factory
export function createFloatingText(
  position: Vector2,
  text: string,
  color: string,
  size: number = 24
): Particle {
  return new Particle({
    position: { ...position },
    velocity: { x: 0, y: -50 }, // Float up
    color,
    size,
    lifetime: 1.5, // Lasts 1.5 seconds
    fadeOut: true,
    gravity: false,
    friction: 0.98, // Slows down slightly
    text
  });
}

// Explosion factory functions
export function createExplosion(
  position: Vector2,
  color: string,
  particleCount: number = 15,
  type: 'correct' | 'distractor' | 'collection' = 'correct',
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
    return r > 200 && g > 50 && g < 200 && b < 100;
  };
  
  // Removed unused isRedOrangeExplosion variable
  
  // Particle Count Calculation
  let finalParticleCount = particleCount;
  
  if (type === 'distractor') {
     finalParticleCount = Math.floor(particleCount * (1 + pointsScale * 2.5) * damageMultiplier * 1.5);
  } else if (type === 'collection') {
     // VIEL MEHR PARTIKEL FÜR COLLECTION (Feuerwerk!)
     finalParticleCount = Math.floor(particleCount * 2.5 * (1 + pointsScale)); 
  } else {
     // Normal correct shot (sad/small)
     finalParticleCount = Math.floor(particleCount * (1 + pointsScale * 1.5) * damageMultiplier);
  }

  const baseSpeed = type === 'distractor' 
    ? 180 + pointsScale * 250
    : type === 'collection'
    ? 150 + pointsScale * 150 // Fast explosion for collection
    : 60 + pointsScale * 90;
  
  const baseSize = type === 'distractor'
    ? 6 + pointsScale * 10 * damageMultiplier
    : type === 'collection'
    ? 3 + pointsScale * 3 // Medium size but many
    : 2 + pointsScale * 4;
  
  const baseLifetime = type === 'distractor'
    ? 0.8 + pointsScale * 1.0
    : type === 'collection'
    ? 1.0 + pointsScale * 0.8 // Longer life to see them fall
    : 0.3 + pointsScale * 0.5;

  // Color variations
  const colors = [color];
  
  if (isRedOrangeColor(color) && type !== 'collection') {
    // Red-orange fiery colors palette
    colors.push('#ff2200', '#ff4400', '#ff6600', '#ff3300', '#ff8800', '#ff5500');
  } else if (type === 'collection') {
    // RAINBOW / CONFETTI MODE for Collection
    // Add gold, silver, and brightness variations
    colors.push(
      '#ffffff', // Sparkle
      '#ffff00', // Gold
      '#aaffff', // Cyan tint
      '#ffcc00', // Deep Gold
      color,     // Base color
      color      // Base color again (weighted)
    );
    
    // Add specific "Happy" colors mixed in
    colors.push('#00ff88', '#00ffff', '#ff00ff'); 
  } else {
    colors.push('#ffffff', '#ffff88', '#aaffff');
  }
  
  for (let i = 0; i < finalParticleCount; i++) {
    const baseAngle = (Math.PI * 2 * i) / finalParticleCount;
    const randomSpread = (Math.random() - 0.5) * 0.5;
    const angle = baseAngle + randomSpread;
    
    // Speed variation
    const speedVariation = 0.5 + Math.random() * 1.0;
    const speed = baseSpeed * speedVariation;
    
    const size = baseSize * (0.5 + Math.random() * 0.8);
    const lifetime = baseLifetime * (0.7 + Math.random() * 0.6);
    
    // Pick random color
    const particleColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Gravity setting
    // Distractor: YES
    // Collection: YES (We want them to fall down like fireworks)
    // Correct (Shot): NO (Just poof away)
    const useGravity = type === 'distractor' || type === 'collection';

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
      gravity: useGravity,
      friction: 0.96 // Add bit more air resistance for confetti feel
    }));
  }
  
  return particles;
}

