// Shooter Engine - orchestrates gameplay

import { Ship } from '@/entities/Ship';
import { BaseEntity } from '@/entities/BaseEntity';
import { CorrectObject } from '@/entities/CorrectObject';
import { DistractorObject } from '@/entities/DistractorObject';
import { Laser } from '@/entities/Laser';
import { Particle, createExplosion } from '@/entities/Particle';
import { CollisionSystem } from '@/core/CollisionSystem';
import type { Item } from '@/types/content.types';
import type { GameMode, Vector2 } from '@/types/game.types';
import type { ItemLearningState } from '@/types/progress.types';
import type { GameObject } from '@/types/game.types';

import type { ShipConfig } from '@/types/game.types';

export interface ShooterConfig {
  screenWidth: number;
  screenHeight: number;
  baseSpeed: number;
  shipConfig: ShipConfig;
  laserSpeed: number;
  laserColor: string;
  spawnRateMultiplier?: number;
}

export interface SpawnEntry {
  type: 'correct' | 'distractor';
  entry: any;
  spawnTime: number;
  spawned: boolean;
}

export class ShooterEngine {
  // Entities
  private ship: Ship;
  private base: BaseEntity;
  private objects: (CorrectObject | DistractorObject)[] = [];
  private lasers: Laser[] = [];
  private particles: Particle[] = [];
  
  // Systems
  private collisionSystem: CollisionSystem;
  
  // State
  private currentItem: Item | null = null;
  private spawnQueue: SpawnEntry[] = [];
  private elapsedTime: number = 0;
  private roundScore: number = 0;
  private sessionScore: number = 0;
  private gameMode: GameMode;
  private collectionOrderTracker: number[] = [];
  private roundCompleted: boolean = false;
  
  // Config
  private config: ShooterConfig;
  
  // Callbacks
  private onScoreChange?: (score: number) => void;
  private onContextShow?: (text: string) => void;
  private onHealthChange?: (health: number) => void;
  private onRoundComplete?: (score: number, perfect: boolean) => void;
  private onGameOver?: () => void;

  constructor(config: ShooterConfig, gameMode: GameMode) {
    this.config = config;
    this.gameMode = gameMode;
    
    // Create ship
    this.ship = new Ship(
      { x: config.screenWidth / 2, y: config.screenHeight - 100 },
      config.shipConfig
    );
    
    // Create base at bottom center
    this.base = new BaseEntity({ x: config.screenWidth / 2, y: config.screenHeight - 50 });
    
    // Collision system
    this.collisionSystem = new CollisionSystem(0.9);
  }

  // Load a new round
  loadRound(item: Item, learningState: ItemLearningState): void {
    console.log('🎮 LOADING ROUND:', item.id);
    console.log('📊 Item Data:', item);
    console.log('🧠 Learning State:', learningState);
    
    this.currentItem = item;
    this.elapsedTime = 0;
    this.roundScore = 0;
    this.collectionOrderTracker = [];
    this.objects = [];
    this.lasers = [];
    this.roundCompleted = false; // Reset flag for new round
    
    // Set base
    this.base.setContent(item.base);
    
    // Build spawn queue
    this.buildSpawnQueue(item, learningState);
    
    console.log('📋 Spawn Queue:', this.spawnQueue.length, 'objects');
  }

  private buildSpawnQueue(item: Item, learningState: ItemLearningState): void {
    this.spawnQueue = [];
    const waveDuration = item.waveDuration || 8;
    // Color-coded ONLY in Lernmodus (ignore learningState)
    const colorCoded = this.gameMode === 'lernmodus';
    const speedMultiplier = learningState.difficultyScaling.currentSpeedMultiplier;
    const spawnRateMultiplier = this.config.spawnRateMultiplier || 1.0;
    
    console.log('🎨 Color Coding:', colorCoded, '| Mode:', this.gameMode, '| Trained:', learningState.trained);
    console.log('⚡ Spawn Rate Multiplier:', spawnRateMultiplier);
    
    // Add correct objects
    item.correct.forEach((correct, index) => {
      const baseSpawnTime = correct.spawnDelay !== undefined
        ? correct.spawnDelay
        : (index / item.correct.length) * waveDuration;
      const spawnTime = baseSpawnTime / spawnRateMultiplier; // Faster spawn = divide time
      
      this.spawnQueue.push({
        type: 'correct',
        entry: { ...correct, colorCoded, speedMultiplier },
        spawnTime,
        spawned: false
      });
    });
    
    // Add distractors
    item.distractors.forEach((distractor, index) => {
      const baseSpawnTime = distractor.spawnDelay !== undefined
        ? distractor.spawnDelay
        : ((index + 0.5) / item.distractors.length) * waveDuration;
      const spawnTime = baseSpawnTime / spawnRateMultiplier; // Faster spawn = divide time
      
      this.spawnQueue.push({
        type: 'distractor',
        entry: { ...distractor, colorCoded, speedMultiplier },
        spawnTime,
        spawned: false
      });
    });
    
    // Sort by spawn time
    this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
  }

  update(deltaTime: number, mousePos: Vector2 | null): void {
    if (!this.currentItem) return;
    
    // Update elapsed time
    this.elapsedTime += deltaTime;
    
    // Spawn objects
    this.updateSpawning();
    
    // Update ship
    if (mousePos) {
      // Clamp to screen bounds
      const x = Math.max(this.ship.radius, Math.min(this.config.screenWidth - this.ship.radius, mousePos.x));
      const y = Math.max(this.ship.radius, Math.min(this.config.screenHeight - this.ship.radius, mousePos.y));
      this.ship.setTarget({ x, y });
    }
    this.ship.update(deltaTime);
    
    // Update base
    this.base.update(deltaTime);
    
    // Update objects
    for (const obj of this.objects) {
      obj.update(deltaTime);
      
      // Remove if off-screen (below base)
      if (obj.position.y > this.config.screenHeight + obj.radius) {
        this.handleObjectReachedBase(obj);
        obj.destroy();
      }
    }
    
    // Update lasers
    for (const laser of this.lasers) {
      laser.update(deltaTime);
    }
    
    // Update particles
    this.updateParticles(deltaTime);
    
    // Check collisions
    this.handleCollisions();
    
    // Clean up destroyed objects
    this.objects = this.objects.filter(obj => obj.active);
    this.lasers = this.lasers.filter(laser => laser.active);
    // Particles cleanup is handled in updateParticles()
    
    // Check round complete (only once!)
    if (!this.roundCompleted && this.isRoundComplete()) {
      console.log('🔔 Round complete detected - calling completeRound()');
      this.completeRound();
    }
    
    // Check game over
    if (!this.ship.isAlive()) {
      this.gameOver();
    }
  }

  private updateSpawning(): void {
    for (const entry of this.spawnQueue) {
      if (!entry.spawned && this.elapsedTime >= entry.spawnTime) {
        this.spawnObject(entry);
        entry.spawned = true;
      }
    }
  }

  private spawnObject(entry: SpawnEntry): void {
    const { type, entry: data } = entry;
    const colorCoded = data.colorCoded;
    const speedMultiplier = data.speedMultiplier;
    const isLernmodus = this.gameMode === 'lernmodus';
    
    // Calculate spawn position (top of screen, random X within spread)
    const spawnX = this.config.screenWidth * data.spawnPosition +
      (Math.random() - 0.5) * this.config.screenWidth * data.spawnSpread;
    const spawnY = -50; // Above screen
    
    const position: Vector2 = { x: spawnX, y: spawnY };
    
    if (type === 'correct') {
      const obj = new CorrectObject(position, data, colorCoded, speedMultiplier, this.config.baseSpeed, isLernmodus);
      this.objects.push(obj);
      console.log('✅ Spawned CORRECT:', data.entry.word, 'at', position, '| visual.color:', data.visual.color, '| isLernmodus:', isLernmodus);
    } else {
      const obj = new DistractorObject(position, data, colorCoded, speedMultiplier, this.config.baseSpeed, isLernmodus);
      this.objects.push(obj);
      console.log('❌ Spawned DISTRACTOR:', data.entry.word, 'at', position, '| visual.color:', data.visual.color, '| isLernmodus:', isLernmodus);
    }
  }

  private handleCollisions(): void {
    const allObjects: GameObject[] = [this.ship, this.base, ...this.objects, ...this.lasers];
    const pairs = this.collisionSystem.checkCollisions(allObjects);
    
    // Track which distractors have already hit base to avoid double-processing
    const processedDistractors = new Set<DistractorObject>();
    
    for (const { objA, objB } of pairs) {
      // Ship + Correct
      if ((objA === this.ship && objB instanceof CorrectObject) ||
          (objB === this.ship && objA instanceof CorrectObject)) {
        const correct = (objA instanceof CorrectObject ? objA : objB) as CorrectObject;
        this.handleCorrectCollected(correct);
      }
      
      // Ship + Distractor (only if not redirected and hasn't hit ship yet)
      if ((objA === this.ship && objB instanceof DistractorObject) ||
          (objB === this.ship && objA instanceof DistractorObject)) {
        const distractor = (objA instanceof DistractorObject ? objA : objB) as DistractorObject;
        if (!distractor.isRedirected && !distractor.hasHitShip) {
          this.handleDistractorHitShip(distractor);
        }
      }
      
      // Laser + Correct
      if ((objA instanceof Laser && objB instanceof CorrectObject) ||
          (objB instanceof Laser && objA instanceof CorrectObject)) {
        const laser = (objA instanceof Laser ? objA : objB) as Laser;
        const correct = (objA instanceof CorrectObject ? objA : objB) as CorrectObject;
        this.handleCorrectShot(correct);
        laser.destroy();
      }
      
      // Laser + Distractor (only if not redirected)
      if ((objA instanceof Laser && objB instanceof DistractorObject) ||
          (objB instanceof Laser && objA instanceof DistractorObject)) {
        const laser = (objA instanceof Laser ? objA : objB) as Laser;
        const distractor = (objA instanceof DistractorObject ? objA : objB) as DistractorObject;
        if (!distractor.isRedirected) {
          this.handleDistractorShot(distractor);
          laser.destroy();
        }
      }
    }
    
    // Check all distractors for base platform collision (separate from radius-based collision)
    for (const obj of this.objects) {
      if (obj instanceof DistractorObject && !obj.isRedirected && !processedDistractors.has(obj)) {
        if (this.isDistractorHittingBasePlatform(obj)) {
          processedDistractors.add(obj);
          this.handleDistractorHitBase(obj);
        }
      }
    }
  }

  private handleCorrectCollected(correct: CorrectObject): void {
    // Calculate points (10% in Lernmodus or if colorCoded)
    const multiplier = (this.gameMode === 'lernmodus' || correct.colorCoded) ? 0.1 : 1.0;
    let points = correct.points * multiplier;
    
    // Reaction time bonus (only in normal mode)
    if (multiplier === 1.0) {
      const reactionTime = correct.getReactionTime();
      const bonusFactor = Math.max(0, 1 - reactionTime / 5);
      points *= (1 + bonusFactor * 0.5);
    }
    
    this.addScore(Math.floor(points));
    
    // Track collection order
    if (correct.collectionOrder !== undefined) {
      this.collectionOrderTracker.push(correct.collectionOrder);
    }
    
    // Spawn positive explosion (green/gold)
    const explosionColor = this.gameMode === 'lernmodus' ? '#00ff88' : (correct.entry.visual.color || '#F39C12');
    const explosion = createExplosion(correct.position, explosionColor, 12, 'correct', correct.points, 1);
    this.particles.push(...explosion);
    
    correct.destroy();
  }

  private handleCorrectShot(correct: CorrectObject): void {
    // Penalty for shooting correct
    const penalty = -correct.points;
    this.addScore(penalty);
    
    // Invalidate collection order bonus
    this.collectionOrderTracker = [-1];
    
    // Show context (as learning feedback)
    this.onContextShow?.(`⚠️${correct.context}⚠️`);
    
    // Spawn sad explosion (gray/white - small)
    const explosion = createExplosion(correct.position, '#aaaaaa', 8, 'correct', correct.points * 0.5, 1);
    this.particles.push(...explosion);
    
    correct.destroy();
  }

  private handleDistractorShot(distractor: DistractorObject): void {
    const wasRedirected = distractor.isRedirected;
    distractor.takeDamage(1);
    const isNowRedirected = distractor.isRedirected;
    const wasDestroyed = !distractor.active;
    
    // Explosion should trigger if distractor was destroyed OR if it was just redirected
    if (wasDestroyed || (isNowRedirected && !wasRedirected)) {
      // Calculate points
      const multiplier = (this.gameMode === 'lernmodus' || distractor.colorCoded) ? 0.1 : 1.0;
      const points = distractor.points * multiplier;
      this.addScore(Math.floor(points));
      
      // Spawn explosion with red-orange colors - bigger, more particles, smaller particles, longer lasting
      const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600'; // Vibrant red-orange
      const explosion = createExplosion(distractor.position, explosionColor, 20, 'correct', distractor.points, 1); // More particles: 20 (was 12), type 'correct' for red-orange detection
      this.particles.push(...explosion);
    }
  }

  private handleDistractorHitShip(distractor: DistractorObject): void {
    // Ship takes damage
    this.ship.takeDamage(distractor.damage);
    this.onHealthChange?.(this.ship.health);
    
    // Trigger distractor collision effects (flash + redirect text)
    distractor.triggerCollisionEffect();
    
    // Trigger ship shake and sparks (if health < 6)
    if (this.ship.health < 6) {
      this.ship.triggerDamageEffects(this.ship.health);
    }
    
    // Penalty
    const penalty = -distractor.points;
    this.addScore(penalty);
    
    // Show context
    this.onContextShow?.(`💥 ${distractor.context}`);
    
    // Distractor continues moving (doesn't destroy)
  }

  private handleDistractorHitBase(distractor: DistractorObject): void {
    // Base blinks/flickers when hit by distractor
    this.base.triggerBlink();
    
    // Penalty
    const penalty = -distractor.points;
    this.addScore(penalty);
    
    // Show context
    this.onContextShow?.(`⚠️ ${distractor.context}`);
    
    // Spawn explosion when distractor hits base - SAME as distractor shot explosion
    const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600'; // Vibrant red-orange
    const explosion = createExplosion(distractor.position, explosionColor, 20, 'correct', distractor.points, 1); // Identical to handleDistractorShot
    this.particles.push(...explosion);
    
    // Destroy distractor after hitting base
    distractor.destroy();
  }

  private handleObjectReachedBase(obj: CorrectObject | DistractorObject): void {
    if (obj instanceof CorrectObject) {
      // Correct reached base = good (collect points)
      this.addScore(obj.points);
    } else if (obj instanceof DistractorObject) {
      // Ignore redirected distractors (they fly back up)
      if (obj.isRedirected) return;
      
      // Distractor reached base = bad (lose points, blink base, and explode)
      this.addScore(-obj.points);
      this.base.triggerBlink();
      this.onContextShow?.(`⚠️ ${obj.context}`);
      
      // Spawn explosion when distractor reaches base - SAME as distractor shot explosion
      const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600';
      const explosion = createExplosion(obj.position, explosionColor, 20, 'correct', obj.points, 1);
      this.particles.push(...explosion);
    }
  }

  // Check if distractor is hitting the base platform (not just the center point)
  private isDistractorHittingBasePlatform(distractor: DistractorObject): boolean {
    // Base platform dimensions: 80% of screen width, 70px height
    const platformWidth = this.config.screenWidth * 0.8;
    const platformHeight = 70;
    const platformX = this.base.position.x - platformWidth / 2;
    const platformY = this.base.position.y - platformHeight / 2;
    
    // Check if distractor is within platform bounds (with some tolerance)
    const tolerance = distractor.radius;
    return (
      distractor.position.x >= platformX - tolerance &&
      distractor.position.x <= platformX + platformWidth + tolerance &&
      distractor.position.y >= platformY - tolerance &&
      distractor.position.y <= platformY + platformHeight + tolerance
    );
  }

  private addScore(points: number): void {
    console.log('💰 Adding score:', points, '| Round:', this.roundScore, '→', this.roundScore + points, '| Session:', this.sessionScore, '→', this.sessionScore + points);
    this.roundScore += points;
    this.sessionScore += points;
    this.onScoreChange?.(this.sessionScore);
  }

  private isRoundComplete(): boolean {
    return this.spawnQueue.every(entry => entry.spawned) && this.objects.length === 0;
  }

  private completeRound(): void {
    console.log('🏁 Round Complete | Round Score:', this.roundScore);
    
    // Set flag to prevent multiple calls
    this.roundCompleted = true;
    
    // Check collection order bonus
    let bonus = 0;
    if (this.collectionOrderTracker.length > 0 && this.collectionOrderTracker[0] !== -1) {
      const isOrdered = this.collectionOrderTracker.every((val, idx) => val === idx + 1);
      if (isOrdered) {
        bonus = this.roundScore; // Double score
        console.log('🎯 Collection Order Bonus:', bonus);
        // Add bonus only to session score (roundScore is already included)
        this.sessionScore += bonus;
        this.onScoreChange?.(this.sessionScore);
        this.onContextShow?.('🎯 Reihenfolge perfekt! x2 Score!');
      }
    }
    
    const perfect = this.ship.health === this.ship.maxHealth;
    console.log('📊 Final Round Score:', this.roundScore, '| Bonus:', bonus, '| Perfect:', perfect);
    console.log('✅ Round completed flag set - will not be called again');
    this.onRoundComplete?.(this.roundScore, perfect);
  }

  private gameOver(): void {
    this.onGameOver?.();
  }

  // Shooting
  shoot(): void {
    if (!this.ship.canShoot()) return;
    
    // Laser flies ONLY vertically upward (toward where objects come from)
    const direction: Vector2 = {
      x: 0,
      y: -1  // Always straight up
    };
    
    const laser = new Laser(
      { ...this.ship.position },
      direction,
      this.config.laserSpeed,
      this.config.laserColor
    );
    
    this.lasers.push(laser);
    this.ship.shoot();
  }

  // Getters
  getShip(): Ship {
    return this.ship;
  }

  getBase(): BaseEntity {
    return this.base;
  }

  getObjects(): (CorrectObject | DistractorObject)[] {
    return this.objects;
  }

  getLasers(): Laser[] {
    return this.lasers;
  }

  // Update particles separately (can be called during transitions)
  updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      particle.update(deltaTime);
    }
    // Clean up inactive particles
    this.particles = this.particles.filter(p => p.isActive);
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getSessionScore(): number {
    return this.sessionScore;
  }

  getRoundScore(): number {
    return this.roundScore;
  }

  // Event handlers
  setOnScoreChange(callback: (score: number) => void): void {
    this.onScoreChange = callback;
  }

  setOnContextShow(callback: (text: string) => void): void {
    this.onContextShow = callback;
  }

  setOnHealthChange(callback: (health: number) => void): void {
    this.onHealthChange = callback;
  }

  setOnRoundComplete(callback: (score: number, perfect: boolean) => void): void {
    this.onRoundComplete = callback;
  }

  setOnGameOver(callback: () => void): void {
    this.onGameOver = callback;
  }
}

