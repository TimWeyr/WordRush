// Ship entity - player-controlled

import { GameObject } from './GameObject';
import type { Vector2, ShipConfig } from '@/types/game.types';
import type { Renderer } from '@/core/Renderer';

export class Ship extends GameObject {
  health: number;
  maxHealth: number;
  targetPosition: Vector2;
  smoothFactor: number;
  maxSpeed: number;
  lastShotTime: number;
  shotCooldown: number;
  damageBlink: number; // For visual feedback
  shipSkinPath?: string;
  sprites: { [key: string]: HTMLImageElement } = {};
  shipSkinLoaded: boolean = false;
  currentState: 'idle' | 'damage' | 'shield' | 'boost' = 'idle';
  
  shakeAmount: number = 0; // Screen shake intensity
  shakeTime: number = 0; // Shake duration
  sparks: Array<{x: number; y: number; vx: number; vy: number; life: number; maxLife: number}> = [];
  
  isShielded: boolean = false;
  isBoosting: boolean = false;

  constructor(position: Vector2, config: ShipConfig) {
    super(position, config.radius);
    this.health = config.health;
    this.maxHealth = config.health;
    this.targetPosition = { ...position };
    this.smoothFactor = config.smoothFactor;
    this.maxSpeed = config.maxSpeed;
    this.lastShotTime = 0;
    this.shotCooldown = config.shotCooldown;
    this.damageBlink = 0;
    this.shipSkinPath = config.shipSkin;
    
    // Load ship skins if provided, otherwise load default_ship
    if (this.shipSkinPath) {
      console.log(`🚀 [Ship] Loading ship skin from path: "${this.shipSkinPath}"`);
      this.loadShipSkins();
    } else {
      console.log(`⚠️ [Ship] No shipSkin provided, loading default_ship.svg`);
      this.shipSkinPath = '/assets/ships/default_ship.svg';
      this.loadShipSkins();
    }
  }

  private loadShipSkins(): void {
    if (!this.shipSkinPath) return;
    
    // Helper to load an image
    const loadImage = (state: string, suffix: string) => {
      const path = suffix === '' 
        ? this.shipSkinPath!
        : this.shipSkinPath!.replace('.svg', `.${suffix}.svg`);
        
      console.log(`📦 [Ship] Attempting to load ${state} sprite from: "${path}"`);
      
      const img = new Image();
      img.onload = () => {
        this.sprites[state] = img;
        console.log(`✅ [Ship] Successfully loaded ${state} sprite: "${path}"`);
        if (state === 'idle') {
          this.shipSkinLoaded = true;
          console.log(`✅ [Ship] Ship skin fully loaded and ready!`);
        }
      };
      img.onerror = () => {
        console.error(`❌ [Ship] Failed to load ${state} sprite from: "${path}"`);
        console.error(`   Full path attempted: ${window.location.origin}${path.startsWith('/') ? path : '/' + path}`);
        
        // If idle sprite failed and we're not already loading default_ship, try default_ship
        if (state === 'idle' && this.shipSkinPath !== '/assets/ships/default_ship.svg') {
          console.warn(`   ⚠️ Primary ship failed, attempting to load default_ship.svg`);
          this.shipSkinPath = '/assets/ships/default_ship.svg';
          this.loadShipSkins();
          return;
        }
        
        // Fallback to idle sprite if specialized sprite missing
        if (state !== 'idle' && this.sprites['idle']) {
          console.log(`   Using idle sprite as fallback for ${state}`);
          this.sprites[state] = this.sprites['idle'];
        } else if (state === 'idle') {
          console.warn(`   ⚠️ No idle sprite available - ship will use circle fallback rendering`);
        }
      };
      img.src = path;
    };

    // Load all states
    loadImage('idle', '');
    loadImage('damage', 'damage'); // e.g., english_ship.damage.svg
    loadImage('shield', 'shield');
    loadImage('boost', 'boost');
  }

  setTarget(target: Vector2): void {
    this.targetPosition = { ...target };
  }

  setShield(active: boolean): void {
    this.isShielded = active;
    this.updateState();
  }

  setBoost(active: boolean): void {
    this.isBoosting = active;
    this.updateState();
  }

  private updateState(): void {
    if (this.isBoosting) {
      this.currentState = 'boost';
    } else if (this.isShielded) {
      this.currentState = 'shield';
    } else if (this.health < 6 || this.damageBlink > 0) {
      // Show damage state if health is low (< 6 matches spark effect) OR actively taking damage
      this.currentState = 'damage';
    } else {
      this.currentState = 'idle';
    }
  }

  update(deltaTime: number): void {
    // Smooth follow toward target
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    
    this.position.x += dx * this.smoothFactor;
    this.position.y += dy * this.smoothFactor;

    // Update damage blink
    if (this.damageBlink > 0) {
      this.damageBlink -= deltaTime;
      this.updateState(); // Re-evaluate state after blink ends
    }
    
    // Update shake
    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      if (this.shakeTime <= 0) {
        this.shakeAmount = 0;
      }
    }
    
    this.updateState(); // Check health-based state

    // Continuous sparks when health < 6
    if (this.health < 6 && this.health > 0) {
      // Spawn rate increases with lower health
      const spawnRate = (6 - this.health) * 3; // More sparks at lower HP
      const spawnChance = spawnRate * deltaTime;
      
      if (Math.random() < spawnChance) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 50;
        this.sparks.push({
          x: this.position.x + (Math.random() - 0.5) * this.radius,
          y: this.position.y + (Math.random() - 0.5) * this.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          life: 0.3 + Math.random() * 0.4,
          maxLife: 0.3 + Math.random() * 0.4
        });
      }
    }
    
    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.x += spark.vx * deltaTime;
      spark.y += spark.vy * deltaTime;
      spark.vy += 200 * deltaTime; // Gravity
      spark.life -= deltaTime;
      
      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  render(renderer: Renderer): void {
    // Blink effect when damaged
    const isBlinking = this.damageBlink > 0 && Math.floor(this.damageBlink * 10) % 2 === 0;
    
    if (isBlinking) return; // Don't render when blinking
    
    // Apply shake offset
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.shakeTime > 0) {
      shakeOffsetX = (Math.random() - 0.5) * this.shakeAmount;
      shakeOffsetY = (Math.random() - 0.5) * this.shakeAmount;
    }
    
    const renderPos = {
      x: this.position.x + shakeOffsetX,
      y: this.position.y + shakeOffsetY
    };
    
    // Get current sprite based on state, fallback to idle, then fallback to undefined
    const currentSprite = this.sprites[this.currentState] || this.sprites['idle'];

    // Render ship skin if loaded
    if (this.shipSkinLoaded && currentSprite) {
      const size = this.radius * 2; // Size based on collision radius
      renderer.renderImage(
        currentSprite,
        renderPos,
        { width: size, height: size }
      );
    } else {
      // Fallback: Try to load default_ship if not already loading
      if (!this.shipSkinPath || (this.shipSkinPath !== '/assets/ships/default_ship.svg' && !this.shipSkinLoaded)) {
        console.warn(`⚠️ [Ship] Ship skin not loaded, attempting to load default_ship.svg`);
        const defaultPath = '/assets/ships/default_ship.svg';
        if (this.shipSkinPath !== defaultPath) {
          this.shipSkinPath = defaultPath;
          this.loadShipSkins();
        }
      }
      
      // Temporary fallback: render simple circle ship while loading
      const color = this.currentState === 'damage' ? '#ff4444' : 
                    this.currentState === 'shield' ? '#44ff44' : 
                    '#4a90e2'; // Dynamic color for fallback

      renderer.renderCircle(
        renderPos,
        this.radius,
        color,
        { color: '#2d5a8a', width: 3 }
      );
      
      // Center dot
      renderer.renderCircle(
        renderPos,
        this.radius * 0.3,
        '#ffffff',
        undefined
      );
    }
    
    // Render sparks
    for (const spark of this.sparks) {
      const alpha = spark.life / spark.maxLife;
      const sparkColor = `rgba(255, ${200 + Math.floor(55 * alpha)}, 100, ${alpha})`;
      renderer.renderCircle(
        { x: spark.x, y: spark.y },
        2,
        sparkColor,
        undefined
      );
    }
  }

  canShoot(): boolean {
    const now = performance.now() / 1000;
    return (now - this.lastShotTime) >= this.shotCooldown;
  }

  shoot(): void {
    this.lastShotTime = performance.now() / 1000;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.damageBlink = 0.5; // Blink for 0.5 seconds
  }
  
  triggerDamageEffects(currentHealth: number): void {
    // Shake effect (more intense at lower health)
    this.shakeAmount = 10 + (6 - currentHealth) * 2; // More shake at lower HP
    this.shakeTime = 0.3; // Shake for 300ms
    
    // Burst of sparks on collision (more sparks at lower health)
    const sparkCount = Math.floor(8 + (6 - currentHealth) * 3);
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.sparks.push({
        x: this.position.x,
        y: this.position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // Slight upward bias
        life: 0.5 + Math.random() * 0.5,
        maxLife: 0.5 + Math.random() * 0.5
      });
    }
  }

  isAlive(): boolean {
    return this.health > 0;
  }
}

