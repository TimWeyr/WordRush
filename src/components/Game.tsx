// Main Game Component with Canvas, HUD, and Touch Controls

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/infra/auth/AuthContext';
import { GameLoop } from '@/core/GameLoop';
import { Renderer } from '@/core/Renderer';
import { ShooterEngine } from '@/logic/ShooterEngine';
import { LearningStateManager } from '@/logic/LearningStateManager';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { Starfield } from '@/effects/Starfield';
import { NebulaCloud } from '@/effects/NebulaCloud';
import { ObjectTrail } from '@/effects/ObjectTrail';
// Difficulty config now handled by gameplayPresets
// import { getDifficultyConfig } from '@/config/difficulty';
import { sortItems } from '@/utils/ItemSorter';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { GameMode, Vector2 } from '@/types/game.types';
import config from '@/config/config.json';
import './Game.css';

interface GameProps {
  universe: Universe;
  theme: Theme;
  chapterId: string;
  chapterIds?: string[]; // Optional: all chapter IDs for chaotic mode
  mode: GameMode;
  startItemId?: string; // Optional: start at specific item
  levelFilter?: number; // Optional: filter items by level
  onExit: () => void;
  onNextChapter?: () => void; // Optional: load next chapter
  currentChapterIndex?: number; // Optional: current chapter in sequence
  totalChapters?: number; // Optional: total chapters in sequence
  loadAllItems?: boolean; // Optional: load all items from all chapters (chaotic mode)
}


export const Game: React.FC<GameProps> = ({ universe, theme, chapterId, chapterIds, mode, startItemId, levelFilter, onExit, onNextChapter, currentChapterIndex = 0, totalChapters = 1, loadAllItems = false }) => {
  const { user, isVerified } = useAuth();
  
  // Save current selection when component mounts
  useEffect(() => {
    const lastSelection = {
      universeId: universe.id,
      themeId: theme.id,
      chapterId: chapterId,
      mode: mode
    };
    localStorage.setItem('wordrush_lastSelection', JSON.stringify(lastSelection));
    console.log('💾 Saved current selection:', lastSelection);
  }, [universe.id, theme.id, chapterId, mode]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [engine, setEngine] = useState<ShooterEngine | null>(null);
  const [gameLoop, setGameLoop] = useState<GameLoop | null>(null);
  const [learningManager] = useState(() => new LearningStateManager(localProgressProvider));
  
  const [items, setItems] = useState<Item[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Cache for theme names and chapter titles (for chaotic mode)
  const [themeNamesCache, setThemeNamesCache] = useState<Map<string, string>>(new Map());
  const [chapterTitlesCache, setChapterTitlesCache] = useState<Map<string, string>>(new Map());
  
  // HUD state
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0); // Track score without triggering re-renders in callbacks
  const [health, setHealth] = useState(10);
  const [healthBlink, setHealthBlink] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState<'none' | 'gain' | 'loss'>('none');
  const [contextText, setContextText] = useState('');
  const [contextVisible, setContextVisible] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false); // Track if game over was already triggered
  const [chapterComplete, setChapterComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  
  // Warning flash (3x blink for wrong shots)
  const [warningText, setWarningText] = useState('');
  const [warningBlinks, setWarningBlinks] = useState(0);
  
  // Touch controls
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const fireButtonPressed = useRef(false);
  
  // Pause state
  const [isPaused, setIsPaused] = useState(false);
  const [isPausedByContext, setIsPausedByContext] = useState(false); // Pause caused by context message
  
  // Context message timers
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Input state - use refs to avoid re-creating game loop callbacks
  const mousePos = useRef<Vector2 | null>(null);
  const touchPos = useRef<Vector2 | null>(null);
  const touchOffset = useRef<Vector2 | null>(null); // Offset between finger and ship on touch
  
  // Round transition
  const [roundTransition, setRoundTransition] = useState(false);
  const [roundMaxScore, setRoundMaxScore] = useState<number>(0);
  
  // Visual effects
  const starfield = useRef<Starfield | null>(null);
  const nebulaCloud = useRef<NebulaCloud | null>(null);
  const objectTrail = useRef<ObjectTrail | null>(null);
  
  // Background parallax offset
  const parallaxOffset = useRef(0);
  
  // Store difficulty config for background animations (now separated!)
  const difficultyConfigRef = useRef<{ speedMultiplier: number }>({ speedMultiplier: 1.0 });
  const animationSpeedMultiplier = useRef<number>(1.0); // Separate from object speed!

  // Detect touch device
  useEffect(() => {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouchScreen);
  }, []);

  // Load chapter items (reload when chapterId changes)
  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  const loadChapter = async () => {
    setLoading(true);
    await learningManager.load();
    
    let loadedItems: Item[];
    
    // CHAOTIC MODE: Load ALL items from ALL chapters
    if (loadAllItems && chapterIds && chapterIds.length > 0) {
      console.log('🎲 CHAOTIC MODE: Loading all items from all chapters!');
      
      // Check if chapter IDs contain theme prefix (format: "themeId:chapterId")
      const hasThemePrefix = chapterIds.some(id => id.includes(':'));
      
      if (hasThemePrefix) {
        // UNIVERSE MODE: Load items from multiple themes
        console.log('🌟 UNIVERSE MODE: Loading items from multiple themes!');
        
        const itemPromises = chapterIds.map(async (fullId) => {
          const [themeId, chapterId] = fullId.split(':');
          try {
            // Load theme and chapter info for cache
            const themeObj = await jsonLoader.loadTheme(universe.id, themeId);
            if (themeObj) {
              setThemeNamesCache(prev => new Map(prev).set(themeId, themeObj.name));
              const chapterConfig = themeObj.chapters[chapterId];
              if (chapterConfig?.title) {
                setChapterTitlesCache(prev => new Map(prev).set(chapterId, chapterConfig.title!));
              }
            }
            return await jsonLoader.loadChapter(universe.id, themeId, chapterId);
          } catch (error) {
            console.warn(`Failed to load chapter ${fullId}:`, error);
            return [];
          }
        });
        const itemArrays = await Promise.all(itemPromises);
        loadedItems = itemArrays.flat();
        console.log(`✅ UNIVERSE MODE: Loaded ${loadedItems.length} items from ${chapterIds.length} chapters`);
      } else {
        // THEME MODE: Load items from single theme
        loadedItems = await jsonLoader.loadAllThemeItems(universe.id, theme.id, chapterIds);
      }
    } else {
      // NORMAL MODE: Load single chapter
      loadedItems = await jsonLoader.loadChapter(universe.id, theme.id, chapterId);
    }
    
    // Filter items by level if levelFilter is provided
    if (levelFilter !== undefined) {
      loadedItems = loadedItems.filter(item => item.level === levelFilter);
      console.log(`🎯 Filtered items by level ${levelFilter}: ${loadedItems.length} items`);
    }
    
    // Filter by freeTier for guests (not logged in)
    if (!user) {
      const beforeCount = loadedItems.length;
      loadedItems = loadedItems.filter(item => item.freeTier === true);
      console.log(`🔓 Guest user: Filtered to freeTier items (${loadedItems.length} / ${beforeCount})`);
    } else if (!isVerified) {
      // Logged in but not verified: Can play freeTier + all items (per requirements)
      console.log(`📧 User not verified: Full access to all items (verify email for Editor access)`);
    } else {
      // Verified user: Full access
      console.log(`✅ Verified user: Full access to all items`);
    }
    
    // Apply item ordering from settings
    const settings = await localProgressProvider.getUISettings();
    const itemOrder = settings.itemOrder || 'default';
    const learningState = await localProgressProvider.getLearningState();
    loadedItems = sortItems(loadedItems, itemOrder, learningState);
    console.log(`📋 Applied item order: ${itemOrder}`);
    
    setItems(loadedItems);
    
    // Find start index if startItemId is provided
    if (startItemId) {
      const startIndex = loadedItems.findIndex(item => item.id === startItemId);
      if (startIndex !== -1) {
        setCurrentItemIndex(startIndex);
        console.log('🎯 Starting at item:', startItemId, 'index:', startIndex);
      } else {
        console.warn('⚠️ Start item not found:', startItemId);
        setCurrentItemIndex(0);
      }
    } else {
      setCurrentItemIndex(0);
    }
    
    setLoading(false);
  };

  // Define callbacks BEFORE useEffects that use them
  const showContext = useCallback(async (text: string) => {
    // Clear any existing timers
    if (contextTimerRef.current) {
      clearTimeout(contextTimerRef.current);
      contextTimerRef.current = null;
    }
    
    // Load gameplay settings to check if pause is enabled
    const settings = await localProgressProvider.getUISettings();
    const pauseOnContext = settings.gameplaySettings?.pauseOnContextMessages ?? false;
    
    // Check if this is a warning/error message
    if (text.startsWith('Falsch!') || text.includes('⚠️') || text.includes('💥')) {
      // Show as warning in center
      setWarningText(text);
      
      if (pauseOnContext) {
        // Pause game - message stays until clicked (NO BLINKING)
        setWarningBlinks(0); // No blink animation during pause
        setIsPausedByContext(true);
        console.log('🛑 Context-Pause activated');
        // Don't auto-clear - wait for user click
      } else {
        // Blink animation for non-pause mode
        setWarningBlinks(6); // 3 blinks = 6 state changes
        // Auto-clear after 3 blinks (1.8 seconds: 6 x 0.3s)
        contextTimerRef.current = setTimeout(() => {
          setWarningText('');
          setWarningBlinks(0);
          contextTimerRef.current = null;
        }, 1800);
      }
    } else {
      // Normal context display (intro text, etc)
      setContextText(text);
      setContextVisible(true);
      
      if (pauseOnContext) {
        // Pause game - message stays until clicked
        setIsPausedByContext(true);
        console.log('🛑 Context-Pause activated (text)');
      } else {
        contextTimerRef.current = setTimeout(() => {
          setContextVisible(false);
          contextTimerRef.current = null;
        }, 3000);
      }
    }
  }, []);

  const loadRound = useCallback((eng: ShooterEngine, index: number) => {
    console.log('🔄 loadRound called with index:', index, '/', items.length);
    
    if (index >= items.length) {
      // Chapter complete!
      console.log('✅ CHAPTER COMPLETE!');
      console.log(`📍 Chapter ${currentChapterIndex + 1}/${totalChapters} finished`);
      setFinalScore(eng.getSessionScore());
      setChapterComplete(true);
      return;
    }

    const item = items[index];
    console.log('📦 Loading item:', item.id, 'chapter:', item.chapter, 'theme:', item.theme);
    
    const learningState = learningManager.getState(item.id);
    const isLastRound = index === items.length - 1;
    eng.loadRound(item, learningState, isLastRound);
    setCurrentItemIndex(index);

    // Show intro text if present
    if (item.introText) {
      showContext(item.introText);
    }
  }, [items, learningManager, showContext, currentChapterIndex, totalChapters, theme, universe]);

  const handleRoundComplete = useCallback((roundScore: number, perfect: boolean) => {
    if (!engine) return;
    
    const item = items[currentItemIndex];
    
    // Calculate max score with detailed breakdown
    const correctPoints = item.correct.reduce((sum, entry) => sum + entry.points, 0);
    const distractorPoints = item.distractors.reduce((sum, entry) => sum + entry.points, 0);
    const hasCollectionOrder = item.correct.some(entry => entry.collectionOrder !== undefined);
    
    let maxScore = correctPoints + distractorPoints;
    if (hasCollectionOrder) {
      maxScore = distractorPoints + (correctPoints * 2);
    }
    
    const maxScoreFormula = hasCollectionOrder 
      ? `${distractorPoints} + (${correctPoints} × 2) = ${maxScore}`
      : `${correctPoints} + ${distractorPoints} = ${maxScore}`;
    
    console.log('🏁 ROUND COMPLETE!', {
      currentIndex: currentItemIndex,
      totalItems: items.length,
      scoreCalculation: {
        correctPoints: `${correctPoints} (${item.correct.length} items)`,
        distractorPoints: `${distractorPoints} (${item.distractors.length} items)`,
        hasCollectionOrder,
        maxScore: hasCollectionOrder ? `with 2x bonus: ${maxScoreFormula}` : maxScoreFormula,
        achievedScore: roundScore,
        percentage: `${((roundScore / maxScore) * 100).toFixed(1)}%`,
        perfect
      }
    });
    
    // Validate item exists and has correct ID
    if (!item || !item.id) {
      console.error(`❌ Invalid item at index ${currentItemIndex}:`, item);
      return;
    }
    
    // Debug: Log which item is being scored
    console.log(`💾 Saving score for item ${item.id} (${item.base?.word}): roundScore=${roundScore}, currentIndex=${currentItemIndex}, maxScore=${maxScore}`);
    
    // Get state before saving to compare
    const stateBefore = learningManager.getState(item.id);
    
    learningManager.recordAttempt(item.id, perfect);
    
    // Save item score (bestScore and totalScore)
    learningManager.recordItemScore(item.id, roundScore);
    
    // Debug: Verify the score was saved correctly
    const savedState = learningManager.getState(item.id);
    const bestScoreChanged = savedState.bestScore !== stateBefore.bestScore;
    const totalScoreChanged = savedState.totalScore !== stateBefore.totalScore;
    
    console.log(`✅ Saved state for ${item.id}: bestScore=${savedState.bestScore} ${bestScoreChanged ? '(UPDATED)' : ''}, totalScore=${savedState.totalScore} ${totalScoreChanged ? '(UPDATED)' : ''}, attempts=${savedState.attempts}`);
    
    // Verify the correct item ID was used
    if (savedState.bestScore !== roundScore && roundScore > stateBefore.bestScore) {
      console.warn(`⚠️ Warning: bestScore (${savedState.bestScore}) doesn't match roundScore (${roundScore}) for item ${item.id}`);
    }
    
    // Store max score for display
    setRoundMaxScore(maxScore);
    
    // Save progress
    localProgressProvider.updateChapterProgress(theme.id, chapterId, {
      levelsPlayed: currentItemIndex + 1,
      levelsTotal: items.length,
      score: engine.getSessionScore()
    });

    // Calculate next index BEFORE the timeout
    const nextIndex = currentItemIndex + 1;
    console.log('➡️ Next round will be index:', nextIndex);

    // Transition to next round
    setRoundTransition(true);
    setTimeout(() => {
      // Check if game is over before loading next round
      if (gameOverRef.current) {
        console.log('⚠️ Game is over, not loading next round');
        setRoundTransition(false);
        return;
      }
      
      console.log('⏭️ Loading next round...');
      setRoundTransition(false);
      if (engine) {
        loadRound(engine, nextIndex);
      }
    }, 10); // 1.5s - shorter display time
  }, [currentItemIndex, items, theme.id, chapterId, engine, learningManager, loadRound]);

  const handleGameOver = useCallback(() => {
    // Prevent multiple game over calls
    if (gameOverRef.current) {
      console.log('⚠️ GAME OVER already triggered, ignoring duplicate call');
      return;
    }
    
    gameOverRef.current = true;
    console.log('💀 GAME OVER!');
    setFinalScore(scoreRef.current);
    setGameOver(true);
  }, []); // No dependencies - uses refs only
  
  // Keep scoreRef in sync with score state
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  
  // Health change with blink effect
  const handleHealthChange = useCallback((newHealth: number) => {
    const oldHealth = health;
    setHealth(newHealth);
    
    // Trigger blink if health decreased
    if (newHealth < oldHealth) {
      setHealthBlink(true);
      setTimeout(() => setHealthBlink(false), 500);
    }
  }, [health]);

  // Set CSS custom property for actual viewport height (mobile fix)
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;

    const initializeGame = async () => {
      // Reset game over flag on initialization
      gameOverRef.current = false;
      
      // Load settings to get gameplay settings
      const settings = await localProgressProvider.getUISettings();
      const gameplaySettings = settings.gameplaySettings || {
        preset: 'medium',
        objectSpeed: 50,
        spawnRate: 50,
        maxCorrect: 5,
        maxDistractors: 5,
        animationIntensity: 7,
        showContextMessages: true,
        pauseOnContextMessages: false
      };
      
      // Import mappers
      const { mapObjectSpeed, mapSpawnRate, mapAnimationIntensity, getHealthForPreset } = await import('@/config/gameplayPresets');
      
      // Calculate game parameters from settings
      const objectSpeedMultiplier = mapObjectSpeed(gameplaySettings.objectSpeed);
      const objectsPerSecond = mapSpawnRate(gameplaySettings.spawnRate);
      const animIntensity = mapAnimationIntensity(gameplaySettings.animationIntensity);
      const isZenMode = gameplaySettings.preset === 'zen';
      const health = getHealthForPreset(gameplaySettings.preset);
      
      // Store for background animations (separate from object speed!)
      difficultyConfigRef.current = { speedMultiplier: 1.0 }; // Not used anymore, kept for compatibility
      animationSpeedMultiplier.current = animIntensity;
      
      console.log('🎮 Gameplay Settings:', {
        preset: gameplaySettings.preset,
        objectSpeedMultiplier,
        objectsPerSecond,
        animIntensity,
        isZenMode,
        health
      });

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      
      // Use window.innerHeight instead of 100vh for mobile compatibility
      const actualHeight = window.innerHeight;
      canvas.width = rect.width;
      canvas.height = actualHeight;

      const rend = new Renderer(canvas);
      setRenderer(rend);

      // Initialize visual effects
      const themeColors = [
        theme.colorPrimary || '#4a90e2',
        theme.colorAccent || '#7bb3f0',
        '#8e44ad' // Purple as third color
      ];
      
      starfield.current = new Starfield(canvas.width, canvas.height, 150);
      nebulaCloud.current = new NebulaCloud(canvas.width, canvas.height, 2, themeColors); // Reduced: 5 → 2 for fewer, more transparent clouds
      objectTrail.current = new ObjectTrail();

      const laserColor = theme.laserColor || universe.laserColor || '#4a90e2';
      let shipSkin = theme.shipSkin || universe.shipSkin;
      
      // Normalize shipSkin path: if it's just a name (e.g., "foerderung" or "foerderung_ship"), 
      // convert it to full path "/assets/ships/{name}_ship.svg"
      if (shipSkin && !shipSkin.startsWith('/') && !shipSkin.startsWith('http')) {
        // If it doesn't end with _ship, add it
        const shipName = shipSkin.endsWith('_ship') ? shipSkin : `${shipSkin}_ship`;
        shipSkin = `/assets/ships/${shipName}.svg`;
        console.log(`🔧 [Game] Normalized shipSkin: "${theme.shipSkin || universe.shipSkin}" → "${shipSkin}"`);
      }

      // Apply difficulty multipliers (base speed now separate from object speed!)
      const adjustedBaseSpeed = config.gameplay.baseSpeed;
      const adjustedStartHealth = health; // From gameplay settings

      const eng = new ShooterEngine(
        {
          screenWidth: canvas.width,
          screenHeight: canvas.height,
          baseSpeed: adjustedBaseSpeed,
          shipConfig: {
            health: adjustedStartHealth,
            maxHealth: adjustedStartHealth, // Add maxHealth
            radius: config.collision.shipRadius,
            smoothFactor: config.gameplay.shipSmoothFactor,
            maxSpeed: config.gameplay.shipSpeed,
            shotCooldown: config.gameplay.laserCooldown,
            shipSkin
          },
          laserSpeed: config.gameplay.laserSpeed,
          laserColor,
          // NEW gameplay parameters
          objectSpeedMultiplier,
          objectsPerSecond,
          maxCorrect: gameplaySettings.maxCorrect,
          maxDistractors: gameplaySettings.maxDistractors,
          isZenMode,
          userId: user?.id, // User UUID from Supabase
          // Content info for logging
          chapterId: chapterId,
          themeId: theme.id,
          universeId: universe.id
        },
        mode
      );

      // Set up callbacks (basic ones)
      eng.setOnScoreChange((newScore) => {
        const oldScore = scoreRef.current;
        setScore(newScore);
        
        if (newScore > oldScore) {
          setScoreAnimation('gain');
        } else if (newScore < oldScore) {
          setScoreAnimation('loss');
        }
        
        // Reset animation
        setTimeout(() => setScoreAnimation('none'), 300);
      });
      eng.setOnHealthChange(handleHealthChange);

      setEngine(eng);
      setHealth(adjustedStartHealth);

      // Load first round (or start at specific item if provided)
      const startIndex = startItemId ? items.findIndex(item => item.id === startItemId) : 0;
      loadRound(eng, startIndex >= 0 ? startIndex : 0);
    };

    initializeGame();

    return () => {
      if (gameLoop) {
        gameLoop.stop();
      }
    };
  }, [items, loadRound]);
  
  // Flush events when paused
  useEffect(() => {
    if (isPaused && engine) {
      console.log('⏸️ [Game] Paused - flushing events...');
      engine.flushEventsPublic().catch(error => {
        console.warn('⚠️ [Game] Failed to flush events on pause:', error);
      });
    }
  }, [isPaused, engine]);

  // Update callbacks when they change
  useEffect(() => {
    if (!engine) return;
    console.log('🔗 Updating engine callbacks');
    engine.setOnContextShow(showContext);
    engine.setOnRoundComplete(handleRoundComplete);
    engine.setOnGameOver(handleGameOver);
    // Context pause should NOT trigger normal pause
    engine.setOnPauseRequest(() => {
      // This is called by ShooterEngine when pauseOnContextMessages is true
      // showContext already handles setting isPausedByContext, so nothing needed here
    });
    
    // Set context message settings from gameplay settings
    const loadContextSettings = async () => {
      const settings = await localProgressProvider.getUISettings();
      const gameplaySettings = settings.gameplaySettings;
      if (gameplaySettings) {
        engine.setContextMessageSettings(
          gameplaySettings.showContextMessages,
          gameplaySettings.pauseOnContextMessages
        );
      }
    };
    loadContextSettings();
  }, [engine, showContext, handleRoundComplete, handleGameOver]);

  // Define game loop functions as useCallback to avoid stale closures
  const updateGame = useCallback((deltaTime: number) => {
    if (!engine) return;

    // Don't update game when paused
    if (isPaused || isPausedByContext) return;

    // Update game engine (but not during transition)
    if (!roundTransition) {
      const inputPos = touchPos.current || mousePos.current;
      engine.update(deltaTime, inputPos);
      
      // Auto-fire when fire button is pressed (continuous fire)
      if (fireButtonPressed.current) {
        engine.shoot();
      }
    } else {
      // During transition, still update particles so explosions continue animating
      engine.updateParticles(deltaTime);
    }
    
    // Update parallax (always, even during transition)
    // Apply animation multiplier to parallax speed (not object speed!)
    parallaxOffset.current += deltaTime * 20 * animationSpeedMultiplier.current;
    
    // Update visual effects (always, even during transition)
    // Use animationSpeedMultiplier (separate from object speed!)
    const animMult = animationSpeedMultiplier.current;
    
    if (starfield.current && animMult > 0) {
      const scoreMult = 1 + (score / 2000); // Faster stars at higher scores
      starfield.current.setSpeedMultiplier(scoreMult * animMult);
      starfield.current.update(deltaTime);
    }
    
    if (nebulaCloud.current && animMult > 0) {
      nebulaCloud.current.setSpeedMultiplier(animMult);
      nebulaCloud.current.update(deltaTime);
    }
    
    if (objectTrail.current) {
      objectTrail.current.update(deltaTime);
      
      // Spawn trails for moving objects (only if not in transition)
      if (!roundTransition) {
        for (const obj of engine.getObjects()) {
          if (!obj.active) continue;
          
          const velocity = obj.velocity;
          const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
          
          // Only spawn trail if object is moving
          if (speed > 10) {
            // Same color and effect for both correct and distractor
            const color = '#ffaa44'; // Unified color
            const type = 'sparkle'; // Same type
            
            // Estimate word width based on object properties
            let word = '';
            let fontSize = 18;
            
            // Get word and fontSize from object
            if ('word' in obj) {
              word = obj.word;
            }
            
            // Get fontSize from entry visual settings
            if ('entry' in obj && obj.entry) {
              const entry = obj.entry as any;
              if (entry.visual && entry.visual.fontSize) {
                fontSize = 18 * entry.visual.fontSize;
              }
              // Try to get word from nested entry structure
              if (entry.entry && entry.entry.word) {
                word = entry.entry.word;
              }
            }
            
            // Handle collection order prefix in Lernmodus
            if ('collectionOrder' in obj && obj.collectionOrder && 'isLernmodus' in obj && obj.isLernmodus) {
              word = `${obj.collectionOrder}. ${word}`;
            }
            
            // Handle redirect text for distractors
            if ('redirect' in obj && obj.isRedirected) {
              word = obj.redirect || word;
            }
            
            // Estimate word width: bold Arial ~0.65 * fontSize per character (more accurate)
            const wordLength = word.length || 5; // Fallback to 5 if empty
            const estimatedWidth = Math.max(30, wordLength * fontSize * 0.65);
            
            objectTrail.current.spawnTrail(obj.position, velocity, color, type, estimatedWidth);
          }
        }
      }
    }
  }, [engine, roundTransition, score, isPaused, isPausedByContext]);

  const renderGame = useCallback(() => {
    if (!renderer || !engine) return;

    // Get background gradient from chapter config
    const actualChapterId = chapterId.includes(':') ? chapterId.split(':')[1] : chapterId;
    const chapterConfig = theme.chapters[actualChapterId];
    const backgroundGradient = chapterConfig?.backgroundGradient || theme.backgroundGradient || universe.backgroundGradient;

    // Render background gradient
    renderer.renderGradientBackground(backgroundGradient);

    // Set background color for glow calculations (use first gradient color)
    const layer1Color = backgroundGradient[0] || '#0f1038';
    renderer.setBackgroundColor(layer1Color);

    // Render parallax layers (simple) - use colors from current gradient
    const layer2Color = backgroundGradient[1] || backgroundGradient[0] || '#272963';
    renderer.renderParallaxLayer(parallaxOffset.current * 1.5, layer1Color, 0.3);
    renderer.renderParallaxLayer(parallaxOffset.current, layer2Color, 0.2);
    
    // === LAYER 1: Background Effects ===
    // Render nebula clouds (behind everything)
    if (nebulaCloud.current) {
      nebulaCloud.current.render(renderer);
    }
    
    // Render starfield
    if (starfield.current) {
      starfield.current.render(renderer);
    }

    // === LAYER 2: Game Objects ===
    // Render base
    engine.getBase().render(renderer);
    
    // Render object trails (behind objects)
    if (objectTrail.current) {
      objectTrail.current.render(renderer);
    }

    // Render objects
    for (const obj of engine.getObjects()) {
      obj.render(renderer);
    }

    // Render lasers
    for (const laser of engine.getLasers()) {
      laser.render(renderer);
    }

    // Render particles (explosions)
    for (const particle of engine.getParticles()) {
      particle.render(renderer);
    }

    // Render ship
    engine.getShip().render(renderer);
  }, [renderer, engine, theme, chapterId, loadAllItems, chapterIds, universe]);

  // Start game loop
  useEffect(() => {
    if (!renderer || !engine) return;

    const loop = new GameLoop(updateGame, renderGame);

    loop.start();
    setGameLoop(loop);

    return () => loop.stop();
  }, [renderer, engine, updateGame, renderGame]);
  
  // Stop game loop on game over or chapter complete
  useEffect(() => {
    if ((gameOver || chapterComplete) && gameLoop) {
      console.log('🛑 Stopping game loop (gameOver:', gameOver, ', chapterComplete:', chapterComplete, ')');
      gameLoop.stop();
    }
  }, [gameOver, chapterComplete, gameLoop]);
  
  // Warning blink animation
  useEffect(() => {
    if (warningBlinks <= 0) return;
    
    const timer = setTimeout(() => {
      setWarningBlinks(prev => Math.max(0, prev - 1));
    }, 300); // 0.3s per blink state change (slower for better visibility)
    
    return () => clearTimeout(timer);
  }, [warningBlinks]);

  // Mouse input
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mousePos.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = () => {
    if (!engine) return;
    engine.shoot();
  };

  // Touch input
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !engine) return;
    
    const touch = e.touches[0];
    const fingerPos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    // Apply offset to maintain relative position between finger and ship
    if (touchOffset.current) {
      touchPos.current = {
        x: fingerPos.x + touchOffset.current.x,
        y: fingerPos.y + touchOffset.current.y
      };
    } else {
      touchPos.current = fingerPos;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !engine) return;
    
    const touch = e.touches[0];
    const fingerPos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    // Calculate offset between finger and ship position
    const shipPos = engine.getShip().position;
    touchOffset.current = {
      x: shipPos.x - fingerPos.x,
      y: shipPos.y - fingerPos.y
    };
    
    // Set initial touch position with offset
    touchPos.current = {
      x: fingerPos.x + touchOffset.current.x,
      y: fingerPos.y + touchOffset.current.y
    };
    
    // If second finger, shoot
    if (e.touches.length > 1 && engine) {
      engine.shoot();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      touchPos.current = null;
      touchOffset.current = null; // Reset offset when touch ends
    }
  };

  // Fire button handlers
  const handleFireButtonDown = (e: React.TouchEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    fireButtonPressed.current = true;
  };

  const handleFireButtonUp = (e: React.TouchEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    fireButtonPressed.current = false;
  };

  if (loading) {
    return <div className="loading">Loading chapter...</div>;
  }

  return (
    <div className="game-container">
      {/* HUD */}
      <div className="hud">
        <div className="hud-left">
          {/* Circular Health Indicator */}
          <div className={`health-circle ${healthBlink ? 'health-blink' : ''}`}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              {/* Background circle */}
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="rgba(0, 0, 0, 0.5)"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="2"
              />
              
              {/* Health arc */}
              <circle
                cx="30"
                cy="30"
                r="24"
                fill="none"
                stroke={
                  health <= 0 ? '#000000' :
                  health / (engine?.getShip().maxHealth || 10) <= 0.25 ? '#ff3333' :
                  health / (engine?.getShip().maxHealth || 10) <= 0.5 ? '#ff9933' :
                  '#00ff88'
                }
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - health / (engine?.getShip().maxHealth || 10))}`}
                strokeLinecap="round"
                transform="rotate(-90 30 30)"
                style={{
                  filter: health > 0 ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                  transition: 'stroke 0.3s, stroke-dashoffset 0.3s'
                }}
              />
              
              {/* Health text */}
              <text
                x="30"
                y="35"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="16"
                fontWeight="bold"
                style={{ textShadow: '0 0 4px #000' }}
              >
                {health}
              </text>
            </svg>
          </div>
        </div>
        
        <div className="hud-center">
          <div className="level-info">
            <span className="desktop-only">
              {(() => {
                const currentItem = items[currentItemIndex];
                if (!currentItem) return `${theme.name}`;
                
                // Use item's theme and chapter for display
                const itemTheme = currentItem.theme || theme.id;
                const itemChapter = currentItem.chapter || chapterId;
                
                // In Universe Chaotic Mode: Show theme + chapter
                if (loadAllItems && itemTheme !== theme.id) {
                  const themeName = themeNamesCache.get(itemTheme) || itemTheme;
                  const chapterTitle = chapterTitlesCache.get(itemChapter) || itemChapter;
                  return `${themeName} - ${chapterTitle}`;
                }
                
                // Normal mode: Show theme + chapter title
                return `${theme.name} - ${theme.chapters[itemChapter]?.title || itemChapter}`;
              })()}
            </span>
          </div>
          <div className="item-progress">
            Runde {currentItemIndex + 1}/{items.length}
          </div>
        </div>
        
        <div className="hud-right">
          <div className={`score ${scoreAnimation === 'gain' ? 'score-gain' : scoreAnimation === 'loss' ? 'score-loss' : ''}`}>
            <span className="desktop-only">Score: </span><span className="glow-text">{score}</span>
          </div>
          <div className="mode-badge desktop-only">
            {mode === 'lernmodus' ? '🎓 Lern' : '🎯 Shooter'}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      />

      {/* Context Display */}
      {contextVisible && (
        <div className="context-display">
          {contextText}
        </div>
      )}

      {/* Round Transition */}
      {roundTransition && (
        <div className="round-transition">
          <div>Round Complete!</div>
          <div className="score-display">
            {(engine?.getRoundScore() ?? 0) >= 0 ? '+' : ''}{engine?.getRoundScore()} / {roundMaxScore}
          </div>
        </div>
      )}
      
      {/* Warning Flash (3x blink in center) - Hidden during context pause */}
      {warningBlinks > 0 && !isPausedByContext && (
        <div className={`warning-overlay ${warningBlinks % 2 === 0 ? 'visible' : 'hidden'}`}>
          <div className="warning-content">
             {warningText} 
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h1>💀 Game Over!</h1>
            <div className="final-score">Final Score: {finalScore}</div>
            <button className="restart-button" onClick={() => {
              // Save selection before exiting
              const lastSelection = {
                universeId: universe.id,
                themeId: theme.id,
                chapterId: chapterId,
                mode: mode
              };
              localStorage.setItem('wordrush_lastSelection', JSON.stringify(lastSelection));
              onExit();
            }}>
              ← Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* Chapter Complete Overlay */}
      {chapterComplete && (
        <div className="game-over-overlay chapter-complete">
          <div className="game-over-content mobile-optimized">
            <h1>🎉 {loadAllItems ? 'Theme Complete!' : 'Chapter Complete!'}</h1>
            {!loadAllItems && totalChapters > 1 && (
              <div className="chapter-progress">
                Chapter {currentChapterIndex + 1} / {totalChapters}
              </div>
            )}
            <div className="final-score">Final Score: {finalScore}</div>
            <div className="chapter-complete-buttons">
              {onNextChapter && !loadAllItems && (
                <button className="restart-button next-chapter-button" onClick={() => {
                  setChapterComplete(false);
                  setCurrentItemIndex(0);
                  onNextChapter();
                }}>
                  Next Chapter →
                </button>
              )}
              <button className="restart-button" onClick={() => {
                // Save selection before exiting
                const lastSelection = {
                  universeId: universe.id,
                  themeId: theme.id,
                  chapterId: chapterId,
                  mode: mode
                };
                localStorage.setItem('wordrush_lastSelection', JSON.stringify(lastSelection));
                onExit();
              }}>
                ← Back to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context-Pause Overlay - Shows message, dismissible by click */}
      {isPausedByContext && !gameOver && !chapterComplete && (
        <div 
          className="context-pause-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Clear any pending timers
            if (contextTimerRef.current) {
              clearTimeout(contextTimerRef.current);
              contextTimerRef.current = null;
            }
            // Resume game
            setIsPausedByContext(false);
            setIsPaused(false); // Ensure normal pause is also cleared
            setWarningText('');
            setWarningBlinks(0);
            setContextVisible(false);
            console.log('✅ Context-Pause dismissed - Game resuming');
          }}
        >
          <div 
            className="context-pause-message"
            onClick={(e) => {
              // Also handle click on message itself
              e.preventDefault();
              e.stopPropagation();
              // Clear any pending timers
              if (contextTimerRef.current) {
                clearTimeout(contextTimerRef.current);
                contextTimerRef.current = null;
              }
              // Resume game
              setIsPausedByContext(false);
              setIsPaused(false); // Ensure normal pause is also cleared
              setWarningText('');
              setWarningBlinks(0);
              setContextVisible(false);
              console.log('✅ Context-Pause dismissed (message click) - Game resuming');
            }}
          >
            {warningText || contextText}
            <div className="context-pause-hint">
              👆 Klicken zum Fortfahren
            </div>
          </div>
        </div>
      )}

      {/* Normal Pause Overlay - Shows menu */}
      {isPaused && !isPausedByContext && !gameOver && !chapterComplete && (
        <div className="game-over-overlay pause-overlay">
          <div className="game-over-content mobile-optimized">
            <h1>⏸️ Paused</h1>
            <div className="pause-info">
              <div className="pause-stat">
                <span className="pause-label">Score:</span>
                <span className="pause-value">{score}</span>
              </div>
              <div className="pause-stat">
                <span className="pause-label">Runde:</span>
                <span className="pause-value">{currentItemIndex + 1}/{items.length}</span>
              </div>
              <div className="pause-stat">
                <span className="pause-label">Health:</span>
                <span className="pause-value">{health}/{engine?.getShip().maxHealth || 10}</span>
              </div>
            </div>
            <div className="pause-buttons">
              <button className="restart-button" onClick={() => setIsPaused(false)}>
                ▶ Resume
              </button>
              <button className="restart-button secondary" onClick={() => {
                // Save selection before exiting
                const lastSelection = {
                  universeId: universe.id,
                  themeId: theme.id,
                  chapterId: chapterId,
                  mode: mode
                };
                localStorage.setItem('wordrush_lastSelection', JSON.stringify(lastSelection));
                onExit();
              }}>
                ← Exit 
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Button - Hidden during context-pause */}
      {!isPausedByContext && (
        <button 
          className="pause-button" 
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? "Resume" : "Pause"}
        >
          <img src="/assets/ui/pause.svg" alt="Pause" />
        </button>
      )}

      {/* Fire Button (Touch Devices Only) */}
      {isTouchDevice && (
        <button
          className="fire-button"
          onTouchStart={handleFireButtonDown}
          onTouchEnd={handleFireButtonUp}
          onMouseDown={handleFireButtonDown}
          onMouseUp={handleFireButtonUp}
          onMouseLeave={() => { fireButtonPressed.current = false; }}
        >
          🔥
        </button>
      )}
    </div>
  );
};

