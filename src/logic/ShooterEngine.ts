// Shooter Engine - orchestrates gameplay

import { Ship } from '@/entities/Ship';
import { BaseEntity } from '@/entities/BaseEntity';
import { CorrectObject } from '@/entities/CorrectObject';
import { DistractorObject } from '@/entities/DistractorObject';
import { Laser } from '@/entities/Laser';
import { Particle, createExplosion, createFloatingText } from '@/entities/Particle';
import { CollisionSystem } from '@/core/CollisionSystem';
import { sessionManager } from '@/infra/utils/SessionManager';
import { supabase } from '@/infra/supabase/client';
import type { Item } from '@/types/content.types';
import type { GameMode, Vector2, ContextEventData } from '@/types/game.types';
import type { ItemLearningState } from '@/types/progress.types';
import type { GameObject } from '@/types/game.types';
import type { ShipConfig } from '@/types/game.types';

// Game Event Type for batch logging
interface GameEvent {
  // Session & User Info
  sessionId: string;
  userId?: string;
  
  // Timestamps
  timestamp: string;
  spawnTimestamp: number;
  timeSinceSpawn: number;
  
  // Event Info
  eventType: 'correct_collected' | 'correct_shot' | 'distractor_shot' | 
             'distractor_hit_ship' | 'distractor_hit_base' | 
             'correct_reached_base' | 'distractor_reached_base';
  gameMode: GameMode;
  
  // Item Info
  itemId: string;
  roundUuid?: string;
  itemUuid?: string;
  itemLevel?: number;
  word?: string;
  objectType: 'correct' | 'distractor';
  
  // Content Info
  chapterId?: string;
  themeId?: string;
  universeId?: string;
  
  // Position & Movement
  positionX: number;
  positionY: number;
  velocityX: number;
  velocityY: number;
  speed: number;
  objectBaseSpeed: number;
  
  // Gameplay Settings
  objectSpeedMultiplier?: number;
  objectsPerSecond?: number;
  maxCorrect?: number;
  maxDistractors?: number;
  isZenMode?: boolean;
  gameBaseSpeed: number;
  laserSpeed: number;
  shipHealth: number;
  shipMaxHealth: number;
  
  // Game State
  scoreChange: number;
  sessionScore: number;
  roundScore: number;
  streak: number;
  reactionTime: number;
  
  // Context
  context?: string;
  points?: number;
}

export interface ShooterConfig {
  screenWidth: number;
  screenHeight: number;
  baseSpeed: number;
  shipConfig: ShipConfig;
  laserSpeed: number;
  laserColor: string;
  spawnRateMultiplier?: number;
  // New gameplay settings
  objectSpeedMultiplier?: number;  // Separate from animation speed
  objectsPerSecond?: number;        // Spawn rate (0 = instant)
  maxCorrect?: number;              // Max correct objects (1-10)
  maxDistractors?: number;          // Max distractor objects (1-10)
  isZenMode?: boolean;              // Zen mode: static objects
  userId?: string;                 // User UUID from Supabase (optional)
  // Content info for logging
  chapterId?: string;              // Current chapter ID
  themeId?: string;                 // Current theme ID
  universeId?: string;               // Current universe ID
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
  private gameOverTriggered: boolean = false;
  
  // New gameplay state
  private streak: number = 0;
  private levelEndFlying: boolean = false;
  private isLastRoundOfChapter: boolean = false;

  // Config
  private config: ShooterConfig;
  private userId?: string; // User UUID from Supabase
  
  // Context message settings
  private showFeedback: boolean = true;
  private showCorrectShot: boolean = true;           // ❌ Richtige abgeschossen (Fehler)
  private showDistractorCollision: boolean = true;   // 💥 Falsche eingesammelt (Fehler)
  private showCorrectCollect: boolean = false;       // ✅ Richtige eingesammelt (Erfolg)
  private showDistractorShot: boolean = false;       // 💚 Falsche abgeschossen (Erfolg)
  private pauseOnContextMessages: boolean = false;
  
  // Event logging buffer for batch uploads
  private eventBuffer: GameEvent[] = [];
  private flushInProgress: boolean = false;
  
  // Callbacks
  private onScoreChange?: (score: number) => void;
  private onContextShow?: (data: ContextEventData) => void;
  private onHealthChange?: (health: number) => void;
  private onRoundComplete?: (score: number, perfect: boolean) => void;
  private onGameOver?: () => void;
  private onPauseRequest?: () => void;

  constructor(config: ShooterConfig, gameMode: GameMode) {
    this.config = config;
    this.gameMode = gameMode;
    this.userId = config.userId; // Store user ID for logging
    
    // Calculate safe area offset for mobile devices (accounting for browser UI)
    const safeAreaBottom = 20; // Extra padding for mobile browser UI
    const baseYPosition = config.screenHeight - 50 - safeAreaBottom;
    const shipYPosition = config.screenHeight - 100 - safeAreaBottom;
    
    // Create ship
    this.ship = new Ship(
      { x: config.screenWidth / 2, y: shipYPosition },
      config.shipConfig
    );
    
    // Create base at bottom center with safe area offset
    this.base = new BaseEntity({ x: config.screenWidth / 2, y: baseYPosition });
    
    // Collision system
    this.collisionSystem = new CollisionSystem(0.9);
  }

  // Load a new round
  loadRound(item: Item, learningState: ItemLearningState, isLastRound: boolean = false): void {
    console.log('🎮 LOADING ROUND:', item.id, '| Last Round:', isLastRound);
    console.log('📊 Item Data:', item);
    console.log('🧠 Learning State:', learningState);
    
    this.currentItem = item;
    this.isLastRoundOfChapter = isLastRound;
    this.elapsedTime = 0;
    this.roundScore = 0;
    this.collectionOrderTracker = [];
    this.objects = [];
    this.lasers = [];
    this.roundCompleted = false; // Reset flag for new round
    this.gameOverTriggered = false; // Reset game over flag for new round
    this.levelEndFlying = false;
    this.ship.setBoost(false); // Reset boost for new round
    // Note: Streak and Shield are PERSISTENT across rounds in the same session!
    // Do NOT reset this.streak or this.ship.setShield(false) here.
    
    // Reset ship position ONLY if it flew away (out of bounds)
    const safeAreaBottom = 20;
    const defaultY = this.config.screenHeight - 100 - safeAreaBottom;
    const defaultX = this.config.screenWidth / 2;
    
    // Check if ship is off-screen (both X and Y axes)
    // This handles: level-end fly-out, screen resize, or any edge cases
    const isOffScreen = 
      this.ship.position.x < -50 || 
      this.ship.position.x > this.config.screenWidth + 50 ||
      this.ship.position.y < -50 || 
      this.ship.position.y > this.config.screenHeight + 50;
    
    if (isOffScreen) {
      // Ship is off-screen - reset to safe default position
      this.ship.position.x = defaultX;
      this.ship.position.y = defaultY;
      console.log('🔄 Ship was off-screen, reset to default position:', { x: defaultX, y: defaultY });
    }
    
    // Set target to CURRENT position (no automatic movement between rounds!)
    this.ship.setTarget({ x: this.ship.position.x, y: this.ship.position.y });
    
    // Set base
    this.base.setContent(item.base);
    
    // Build spawn queue
    this.buildSpawnQueue(item, learningState);
    
    console.log('📋 Spawn Queue:', this.spawnQueue.length, 'objects');
  }

  private buildSpawnQueue(item: Item, learningState: ItemLearningState): void {
    this.spawnQueue = [];
    
    // Color-coded ONLY in Lernmodus
    const colorCoded = this.gameMode === 'lernmodus';
    
    // Use new objectSpeedMultiplier (separate from animation)
    const objectSpeedMultiplier = this.config.objectSpeedMultiplier ?? learningState.difficultyScaling.currentSpeedMultiplier;
    const objectsPerSecond = this.config.objectsPerSecond ?? 2.5; // Default: 2.5 obj/sec
    const isZenMode = this.config.isZenMode ?? false;
    
    // Limit objects based on settings
    const maxCorrect = this.config.maxCorrect ?? 10;
    const maxDistractors = this.config.maxDistractors ?? 10;
    
    // Slice arrays to respect limits
    const correctEntries = item.correct.slice(0, maxCorrect);
    const distractorEntries = item.distractors.slice(0, maxDistractors);
    
    const totalObjects = correctEntries.length + distractorEntries.length;
    
    console.log('🎨 Color Coding:', colorCoded, '| Mode:', this.gameMode);
    console.log('⚡ Object Speed Multiplier:', objectSpeedMultiplier);
    console.log('📊 Objects:', totalObjects, `(${correctEntries.length} correct, ${distractorEntries.length} distractors)`);
    console.log('🧘 Zen Mode:', isZenMode);
    
    if (isZenMode || objectsPerSecond === 0) {
      // ZEN MODE: Slightly staggered spawn with initial delay for ship positioning
      const zenInitialDelay = 1.0; // 1s initial delay for ship to reach position
      const zenSpawnDelay = 0.3; // 300ms between each subsequent spawn
      console.log('🧘 ZEN MODE: Staggered spawn activated (1s initial + 0.3s between objects)');
      
      let spawnIndex = 0;
      correctEntries.forEach(correct => {
        this.spawnQueue.push({
          type: 'correct',
          entry: { ...correct, colorCoded, speedMultiplier: objectSpeedMultiplier, isZenMode: true },
          spawnTime: zenInitialDelay + (spawnIndex * zenSpawnDelay),
          spawned: false
        });
        spawnIndex++;
      });
      
      distractorEntries.forEach(distractor => {
        this.spawnQueue.push({
          type: 'distractor',
          entry: { ...distractor, colorCoded, speedMultiplier: objectSpeedMultiplier, isZenMode: true },
          spawnTime: zenInitialDelay + (spawnIndex * zenSpawnDelay),
          spawned: false
        });
        spawnIndex++;
      });
    } else {
      // NORMAL MODE: Calculate spawn times based on objects per second
      const totalSpawnTime = totalObjects / objectsPerSecond;
      const timePerObject = totalSpawnTime / totalObjects;
      
      console.log('⏱️ Total Spawn Time:', totalSpawnTime.toFixed(2), 's');
      console.log('⏱️ Time per Object:', timePerObject.toFixed(2), 's');
      
      // Interleave correct and distractors for better gameplay
      const allEntries: Array<{ type: 'correct' | 'distractor'; entry: any }> = [
        ...correctEntries.map(e => ({ type: 'correct' as const, entry: e })),
        ...distractorEntries.map(e => ({ type: 'distractor' as const, entry: e }))
      ];
      
      // Shuffle for variety (optional - can be removed for predictable spawns)
      // allEntries.sort(() => Math.random() - 0.5);
      
      allEntries.forEach((entry, index) => {
        // Respect custom spawnDelay if provided
        const spawnTime = entry.entry.spawnDelay !== undefined
          ? entry.entry.spawnDelay
          : index * timePerObject;
        
        this.spawnQueue.push({
          type: entry.type,
          entry: { ...entry.entry, colorCoded, speedMultiplier: objectSpeedMultiplier, isZenMode: false },
          spawnTime,
          spawned: false
        });
      });
    }
    
    // Sort by spawn time
    this.spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
  }

  update(deltaTime: number, mousePos: Vector2 | null): void {
    if (!this.currentItem) return;
    
    // Update elapsed time
    this.elapsedTime += deltaTime;
    
    // Level End Animation (Fly out)
    if (this.levelEndFlying) {
      this.ship.position.y -= 800 * deltaTime; // Fly up fast
      
      // Add engine trail
      if (Math.random() < 0.8) {
         this.particles.push(new Particle({
           position: { x: this.ship.position.x + (Math.random()-0.5)*10, y: this.ship.position.y + 20 },
           velocity: { x: (Math.random()-0.5)*50, y: 100 + Math.random()*100 },
           color: '#44aaff',
           size: 3 + Math.random() * 4,
           lifetime: 0.5,
           fadeOut: true
         }));
      }

      // Check if out of screen
      if (this.ship.position.y < -100) {
        this.finishRoundTransition();
      }
      
      this.updateParticles(deltaTime);
      return; // Skip normal update
    }
    
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
    
    // Check game over FIRST (only once!)
    if (!this.gameOverTriggered && !this.ship.isAlive()) {
      this.gameOver();
      return; // Don't check round complete if game is over
    }
    
    // Check round complete (only once, and only if game is not over!)
    if (!this.roundCompleted && !this.gameOverTriggered && this.isRoundComplete()) {
      console.log('🔔 Round complete detected');
      
      if (this.isLastRoundOfChapter) {
        console.log('🚀 Last round: Starting fly-out sequence');
        this.startRoundEndSequence();
      } else {
        console.log('⏭️ Normal round: Finishing immediately');
        this.roundCompleted = true;
        // Small delay before next round for better feel? Or instant? 
        // Game.tsx handles the delay (10ms currently), let's just call finish directly
        this.finishRoundTransition();
      }
    }
  }
  
  private startRoundEndSequence(): void {
    this.roundCompleted = true;
    this.levelEndFlying = true;
    this.ship.setBoost(true);
    this.ship.setShield(false); // Disable shield for cinematic exit
  }
  
  private finishRoundTransition(): void {
     console.log('🏁 Round Complete | Round Score:', this.roundScore);

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
        
        // Visual feedback for bonus
        const centerPos = { x: this.config.screenWidth/2, y: this.config.screenHeight/2 };
        this.particles.push(createFloatingText(centerPos, "PERFECT ORDER! x2", "#FFD700", 40));
      }
    }
    
    const perfect = this.ship.health === this.ship.maxHealth;
    
    // Flush events before round completion callback
    this.flushEvents();
    
    this.onRoundComplete?.(this.roundScore, perfect);
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
    const isZenMode = data.isZenMode ?? false;
    
    let spawnX: number;
    let spawnY: number;
    
    if (isZenMode) {
      // ZEN MODE: Random position in upper 2/3 of screen
      // X: Use spawnPosition as base, with spread (clamped to screen bounds)
      const objectRadius = 30; // Approximate object radius for safety margin
      const minX = objectRadius;
      const maxX = this.config.screenWidth - objectRadius;
      
      spawnX = this.config.screenWidth * data.spawnPosition +
        (Math.random() - 0.5) * this.config.screenWidth * data.spawnSpread;
      
      // Clamp X to screen bounds
      spawnX = Math.max(minX, Math.min(maxX, spawnX));
      
      // Y: Random in upper 2/3 (between 50px and 2/3 * screenHeight)
      const upperBound = 50 + objectRadius; // Top padding + safety margin
      const lowerBound = this.config.screenHeight * (2/3) - objectRadius;
      spawnY = upperBound + Math.random() * (lowerBound - upperBound);
      
      // Ensure even distribution (optional grid-like adjustment)
      // This prevents clustering - objects spread out nicely
      const gridCols = 5;
      const gridRows = 4;
      const objectIndex = this.objects.length;
      const col = objectIndex % gridCols;
      const row = Math.floor(objectIndex / gridCols) % gridRows;
      
      // Add grid bias while keeping randomness
      const gridX = (col / gridCols) * this.config.screenWidth;
      const gridY = upperBound + (row / gridRows) * (lowerBound - upperBound);
      
      // Blend grid position (40%) with random position (60%)
      spawnX = spawnX * 0.6 + gridX * 0.4;
      spawnY = spawnY * 0.6 + gridY * 0.4;
      
      // Final clamp to ensure nothing spawns off-screen
      spawnX = Math.max(minX, Math.min(maxX, spawnX));
      spawnY = Math.max(upperBound, Math.min(lowerBound, spawnY));
      
      console.log('🧘 Zen spawn:', type, 'at', { x: Math.round(spawnX), y: Math.round(spawnY) });
    } else {
      // NORMAL MODE: Top of screen, random X within spread
      spawnX = this.config.screenWidth * data.spawnPosition +
        (Math.random() - 0.5) * this.config.screenWidth * data.spawnSpread;
      spawnY = -50; // Above screen
    }
    
    const position: Vector2 = { x: spawnX, y: spawnY };
    
    if (type === 'correct') {
      const obj = new CorrectObject(position, data, colorCoded, speedMultiplier, this.config.baseSpeed, isLernmodus, isZenMode);
      this.objects.push(obj);
      console.log('✅ Spawned CORRECT:', data.entry.word, 'at', position, '| Zen:', isZenMode);
    } else {
      const obj = new DistractorObject(position, data, colorCoded, speedMultiplier, this.config.baseSpeed, isLernmodus, isZenMode);
      this.objects.push(obj);
      console.log('❌ Spawned DISTRACTOR:', data.entry.word, 'at', position, '| Zen:', isZenMode);
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
    
    const finalPoints = Math.floor(points);
    this.addScore(finalPoints);
    
    // Log event
    this.logGameEvent('correct_collected', correct, finalPoints);
    
    // Floating Text
    this.particles.push(createFloatingText(correct.position, `+${finalPoints}`, '#00ff88', 24));

    // Streak Logic
    this.streak++;
    console.log(`🔥 Streak: ${this.streak}/5 | Shielded: ${this.ship.isShielded}`);
    
    if (this.streak >= 5 && !this.ship.isShielded) {
        console.log('🛡️ STREAK REACHED! Activating Shield!');
        this.ship.setShield(true);
        this.particles.push(createFloatingText(this.ship.position, "SHIELD READY!", "#44ff44", 30));
        // Maybe play sound?
        this.streak = 0; 
    }
    
    // Track collection order
    if (correct.collectionOrder !== undefined) {
      this.collectionOrderTracker.push(correct.collectionOrder);
    }
    
    // Spawn positive explosion (green/gold) - FIREWORKS STYLE
    const explosionColor = this.gameMode === 'lernmodus' ? '#00ff88' : (correct.entry.visual.color || '#F39C12');
    // Use 'collection' type for gravity and confetti effects
    const explosion = createExplosion(correct.position, explosionColor, 25, 'collection', correct.points, 1);
    this.particles.push(...explosion);
    
    // Show feedback for correct collection if enabled
    if (this.showFeedback && this.showCorrectCollect) {
      this.onContextShow?.({
        type: 'correct_collected' as any,
        word: correct.word,
        context: correct.context,
        pointsChange: finalPoints,
        position: { x: correct.position.x, y: correct.position.y },
        streakBroken: false
      });
      if (this.pauseOnContextMessages) {
        this.onPauseRequest?.();
      }
    }
    
    correct.destroy();
  }

  private handleCorrectShot(correct: CorrectObject): void {
    // Penalty for shooting correct
    const penalty = -correct.points;
    this.addScore(penalty);
    
    // Log event
    this.logGameEvent('correct_shot', correct, penalty);
    
    // Store previous streak before resetting
    const previousStreak = this.streak;
    this.streak = 0; // Reset streak
    
    // Invalidate collection order bonus
    this.collectionOrderTracker = [-1];
    
    // Floating Text (Negative)
    this.particles.push(createFloatingText(correct.position, `${penalty}`, '#ff4444', 24));
    
    // Show context for correct shot (error) if enabled
    if (this.showFeedback && this.showCorrectShot) {
      this.onContextShow?.({
        type: 'correct_shot',
        word: correct.word,
        context: correct.context,
        pointsChange: penalty,
        position: { x: correct.position.x, y: correct.position.y },
        streakBroken: previousStreak > 0,
        previousStreak: previousStreak > 0 ? previousStreak : undefined
      });
      if (this.pauseOnContextMessages) {
        this.onPauseRequest?.();
      }
    }
    
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
      const finalPoints = Math.floor(points);
      this.addScore(finalPoints);
      
      // Log event
      this.logGameEvent('distractor_shot', distractor, finalPoints);
      
      this.particles.push(createFloatingText(distractor.position, `+${finalPoints}`, '#00ff88', 24));
      
      // Show feedback for distractor shot (success) if enabled
      if (this.showFeedback && this.showDistractorShot) {
        this.onContextShow?.({
          type: 'distractor_shot' as any,
          word: distractor.word,
          context: distractor.context,
          pointsChange: finalPoints,
          position: { x: distractor.position.x, y: distractor.position.y },
          streakBroken: false
        });
        if (this.pauseOnContextMessages) {
          this.onPauseRequest?.();
        }
      }
      
      // Spawn explosion with red-orange colors - bigger, more particles, smaller particles, longer lasting
      const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600'; // Vibrant red-orange
      const explosion = createExplosion(distractor.position, explosionColor, 20, 'correct', distractor.points, 1); // More particles: 20 (was 12), type 'correct' for red-orange detection
      this.particles.push(...explosion);
    }
  }

  private handleDistractorHitShip(distractor: DistractorObject): void {
    // Shield Logic - shield absorbs hit but distractor still explodes
    if (this.ship.isShielded) {
        this.ship.setShield(false);
        this.particles.push(createFloatingText(this.ship.position, "SHIELD BROKEN!", "#ffffff", 28));
        
        // Spawn explosion at distractor position (same as when shot)
        const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600';
        const explosion = createExplosion(distractor.position, explosionColor, 20, 'correct', Math.abs(distractor.points), 1);
        this.particles.push(...explosion);
        
        distractor.destroy(); // Destroy distractor on shield impact
        return;
    }

    // Ship takes damage (no shield)
    this.ship.takeDamage(distractor.damage);
    this.onHealthChange?.(this.ship.health);
    
    // Store previous streak before resetting
    const previousStreak = this.streak;
    this.streak = 0;
    
    // Penalty (distractor.points is negative in DB, so negate to get penalty)
    const penalty = -distractor.points;
    this.addScore(penalty);
    
    // Floating Text - use absolute value to ensure correct display (DB value is negative)
    const penaltyDisplay = Math.abs(distractor.points);
    this.particles.push(createFloatingText(this.ship.position, `-${penaltyDisplay}`, '#ff0000', 30));

    // Trigger distractor collision effects (flash)
    distractor.triggerCollisionEffect();
    
    // Trigger ship shake and sparks (if health < 6)
    if (this.ship.health < 6) {
      this.ship.triggerDamageEffects(this.ship.health);
    }
    
    // Spawn explosion at distractor position (same as when shot)
    const explosionColor = this.gameMode === 'lernmodus' ? '#ff4400' : '#ff6600';
    const explosion = createExplosion(distractor.position, explosionColor, 20, 'correct', Math.abs(distractor.points), 1);
    this.particles.push(...explosion);
    
    // Destroy distractor after explosion
    distractor.destroy();
    
    // Log event
    this.logGameEvent('distractor_hit_ship', distractor, penalty);
    
    // Show context for distractor collision (error) if enabled
    if (this.showFeedback && this.showDistractorCollision) {
      this.onContextShow?.({
        type: 'distractor_collision',
        word: distractor.word,
        context: distractor.context,
        pointsChange: penalty,
        position: { x: distractor.position.x, y: distractor.position.y },
        streakBroken: previousStreak > 0,
        previousStreak: previousStreak > 0 ? previousStreak : undefined
      });
      if (this.pauseOnContextMessages) {
        this.onPauseRequest?.();
      }
    }
  }

  private handleDistractorHitBase(distractor: DistractorObject): void {
    // Base blinks/flickers when hit by distractor
    this.base.triggerBlink();
    
    // Penalty
    const penalty = -distractor.points;
    this.addScore(penalty);
    
    // Log event
    this.logGameEvent('distractor_hit_base', distractor, penalty);
    
    // Show context for distractor reaching base (error) if enabled
    if (this.showFeedback && this.showDistractorCollision) {
      this.onContextShow?.({
        type: 'distractor_reached_base',
        word: distractor.word,
        context: distractor.context,
        pointsChange: penalty,
        position: { x: distractor.position.x, y: distractor.position.y },
        streakBroken: false // Base hits don't break streak (only ship collisions)
      });
      if (this.pauseOnContextMessages) {
        this.onPauseRequest?.();
      }
    }
    
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
      
      // Log event
      this.logGameEvent('correct_reached_base', obj, obj.points);
    } else if (obj instanceof DistractorObject) {
      // Ignore redirected distractors (they fly back up)
      if (obj.isRedirected) return;
      
      // Distractor reached base = bad (lose points, blink base, and explode)
      const penalty = -obj.points;
      this.addScore(penalty);
      
      // Log event
      this.logGameEvent('distractor_reached_base', obj, penalty);
      this.base.triggerBlink();
      if (this.showFeedback && this.showDistractorCollision) {
        this.onContextShow?.({
          type: 'distractor_reached_base',
          word: obj.word,
          context: obj.context,
          pointsChange: penalty,
          position: { x: obj.position.x, y: obj.position.y },
          streakBroken: false
        });
        if (this.pauseOnContextMessages) {
          this.onPauseRequest?.();
        }
      }
      
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

  // Rudimentäre Logging-Funktion für Statistiken
  private logGameEvent(
    eventType: 'correct_collected' | 'correct_shot' | 'distractor_shot' | 
              'distractor_hit_ship' | 'distractor_hit_base' | 
              'correct_reached_base' | 'distractor_reached_base',
    obj: CorrectObject | DistractorObject,
    scoreChange: number
  ): void {
    const now = performance.now();
    const timestamp = new Date().toISOString();
    const spawnTimestamp = obj.spawnTime;
    const timeSinceSpawn = now - spawnTimestamp; // Millisekunden seit Spawn
    
    // Calculate speed from velocity
    const currentSpeed = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
    
    // Get user ID and session ID
    const userId = this.userId || undefined; // User UUID from Supabase
    const sessionId = this.getSessionId(); // Session ID from SessionManager
    
    // Get reaction time (Sekunden)
    const reactionTime = obj.getReactionTime();
    
    // Get item ID and UUIDs
    const itemId = this.currentItem?.id || 'unknown';
    const roundUuid = this.currentItem?.roundUuid || undefined;
    const itemUuid = obj instanceof CorrectObject 
      ? obj.entry.uuid || undefined
      : obj.entry.uuid || undefined;
    
    // Get item level
    const itemLevel = this.currentItem?.level || undefined;
    
    const logData = {
      // Session & User Info
      sessionId,                     // Session ID (links to session_info table)
      userId,                        // User UUID from Supabase (if logged in)
      
      // Timestamps
      timestamp,                     // ISO String mit Millisekunden
      spawnTimestamp,               // performance.now() beim Spawnen (Millisekunden)
      timeSinceSpawn,                // Millisekunden seit Spawn
      
      // Event Info
      eventType,
      gameMode: this.gameMode,
      
      // Item Info
      itemId,                        // Round ID (z.B. "BC_001")
      roundUuid,                     // Round UUID from database (if available)
      itemUuid,                      // Item UUID from database (if available)
      itemLevel,                     // Item level (1-6)
      word: obj.word,
      objectType: (obj instanceof CorrectObject ? 'correct' : 'distractor') as 'correct' | 'distractor',
      
      // Content Info
      chapterId: this.config.chapterId,
      themeId: this.config.themeId,
      universeId: this.config.universeId,
      
      // Position & Movement (separate columns for database)
      positionX: Math.round(obj.position.x),
      positionY: Math.round(obj.position.y),
      velocityX: Math.round(obj.velocity.x * 100) / 100,
      velocityY: Math.round(obj.velocity.y * 100) / 100,
      speed: Math.round(currentSpeed * 100) / 100,  // Aktuelle Geschwindigkeit
      objectBaseSpeed: obj.speed,   // Basis-Speed aus Entry
      
      // Gameplay Settings (from config - available without loading)
      objectSpeedMultiplier: this.config.objectSpeedMultiplier,
      objectsPerSecond: this.config.objectsPerSecond,
      maxCorrect: this.config.maxCorrect,
      maxDistractors: this.config.maxDistractors,
      isZenMode: this.config.isZenMode,
      // screenWidth/screenHeight removed - available in session_info table
      gameBaseSpeed: this.config.baseSpeed,  // Base speed from game config
      laserSpeed: this.config.laserSpeed,
      shipHealth: this.ship.health,
      shipMaxHealth: this.ship.maxHealth,
      
      // Game State
      scoreChange,                   // + oder - Punkte
      sessionScore: this.sessionScore,
      roundScore: this.roundScore,
      streak: this.streak,
      reactionTime: Math.round(reactionTime * 1000) / 1000, // Sekunden, gerundet auf 3 Dezimalen
      
      // Context (optional)
      context: obj.context,
      points: obj.points
    };
    
    // Push to event buffer instead of console.log
    this.eventBuffer.push(logData);
    
    // Debug: Still log to console in development
    if (import.meta.env.DEV) {
      console.log(`📊 [STATS] ${eventType}:`, JSON.stringify(logData, null, 2));
    }
  }
  
  /**
   * Flush event buffer to Supabase database
   * Called at round end, game over, and pause
   */
  async flushEvents(): Promise<void> {
    // Early return if buffer is empty or flush already in progress
    if (this.eventBuffer.length === 0 || this.flushInProgress) {
      return;
    }
    
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.debug('ℹ️ [ShooterEngine] Supabase not configured, clearing event buffer');
      this.eventBuffer = [];
      return;
    }
    
    this.flushInProgress = true;
    const eventsToFlush = [...this.eventBuffer]; // Copy buffer
    const eventCount = eventsToFlush.length;
    
    try {
      console.log(`💾 [ShooterEngine] Flushing ${eventCount} events to database...`);
      
      // Map events to database schema
      const dbEvents = eventsToFlush.map(event => ({
        session_id: event.sessionId,
        user_id: event.userId || null,
        timestamp: event.timestamp,
        spawn_timestamp: event.spawnTimestamp,
        time_since_spawn: event.timeSinceSpawn,
        event_type: event.eventType,
        game_mode: event.gameMode,
        item_id: event.itemId,
        round_uuid: event.roundUuid || null,
        item_uuid: event.itemUuid || null,
        item_level: event.itemLevel || null,
        word: event.word || null,
        object_type: event.objectType,
        chapter_id: event.chapterId || null,
        theme_id: event.themeId || null,
        universe_id: event.universeId || null,
        position_x: event.positionX,
        position_y: event.positionY,
        velocity_x: event.velocityX,
        velocity_y: event.velocityY,
        speed: event.speed,
        object_base_speed: event.objectBaseSpeed,
        object_speed_multiplier: event.objectSpeedMultiplier || null,
        objects_per_second: event.objectsPerSecond || null,
        max_correct: event.maxCorrect || null,
        max_distractors: event.maxDistractors || null,
        is_zen_mode: event.isZenMode || false,
        game_base_speed: event.gameBaseSpeed,
        laser_speed: event.laserSpeed,
        ship_health: event.shipHealth,
        ship_max_health: event.shipMaxHealth,
        score_change: event.scoreChange,
        session_score: event.sessionScore,
        round_score: event.roundScore,
        streak: event.streak,
        reaction_time: event.reactionTime,
        context: event.context || null,
        points: event.points || null
      }));
      
      const { error } = await supabase
        .from('game_events')
        .insert(dbEvents);
      
      if (error) {
        console.error('❌ [ShooterEngine] Failed to flush events:', error.message);
        console.error('   Error details:', error);
        // Keep events in buffer for retry (don't clear on error)
        this.flushInProgress = false;
        return;
      }
      
      // Success: Clear buffer
      this.eventBuffer = [];
      this.flushInProgress = false;
      console.log(`✅ [ShooterEngine] Successfully flushed ${eventCount} events to database`);
      
    } catch (error) {
      console.error('❌ [ShooterEngine] Exception flushing events:', error);
      // Keep events in buffer for retry
      this.flushInProgress = false;
    }
  }
  
  /**
   * Get session ID from SessionManager
   * Returns empty string if SessionManager is not available
   */
  private getSessionId(): string {
    try {
      return sessionManager.getSessionId();
    } catch (error) {
      console.warn('⚠️ [ShooterEngine] Could not get session ID:', error);
      return '';
    }
  }
  
  /**
   * Public method to flush events (called from Game.tsx on pause)
   */
  public async flushEventsPublic(): Promise<void> {
    await this.flushEvents();
  }

  private addScore(points: number): void {
    console.log('💰 Adding score:', points, '| Round:', this.roundScore, '→', this.roundScore + points, '| Session:', this.sessionScore, '→', this.sessionScore + points);
    this.roundScore += points;
    this.sessionScore += points;
    this.onScoreChange?.(this.sessionScore);
  }

  private isRoundComplete(): boolean {
    const allSpawned = this.spawnQueue.every(entry => entry.spawned);
    
    // ZEN MODE: Round is complete when all objects are collected/destroyed
    // (they won't go off-screen because they're static)
    if (this.config.isZenMode) {
      return allSpawned && this.objects.length === 0;
    }
    
    // NORMAL MODE: Round is complete when all spawned and all off-screen/destroyed
    return allSpawned && this.objects.length === 0;
  }


  private gameOver(): void {
    this.gameOverTriggered = true;
    console.log('💀 ShooterEngine: Game Over triggered (will only be called once)');
    
    // Flush all remaining events before game over
    this.flushEvents();
    
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

  setOnContextShow(callback: (data: ContextEventData) => void): void {
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

  setOnPauseRequest(callback: () => void): void {
    this.onPauseRequest = callback;
  }

  setContextMessageSettings(
    showFeedback: boolean,
    showCorrectShot: boolean,
    showDistractorCollision: boolean,
    showCorrectCollect: boolean,
    showDistractorShot: boolean,
    pauseOnMessages: boolean
  ): void {
    this.showFeedback = showFeedback;
    this.showCorrectShot = showCorrectShot;
    this.showDistractorCollision = showDistractorCollision;
    this.showCorrectCollect = showCorrectCollect;
    this.showDistractorShot = showDistractorShot;
    this.pauseOnContextMessages = pauseOnMessages;
  }
}

