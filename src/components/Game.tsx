// Main Game Component with Canvas, HUD, and Touch Controls

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameLoop } from '@/core/GameLoop';
import { Renderer } from '@/core/Renderer';
import { ShooterEngine } from '@/logic/ShooterEngine';
import { LearningStateManager } from '@/logic/LearningStateManager';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { Starfield } from '@/effects/Starfield';
import { SpeedLines } from '@/effects/SpeedLines';
import { NebulaCloud } from '@/effects/NebulaCloud';
import { ObjectTrail } from '@/effects/ObjectTrail';
import { getDifficultyConfig } from '@/config/difficulty';
import { sortItems } from '@/utils/ItemSorter';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { GameMode, Vector2 } from '@/types/game.types';
import config from '@/config/config.json';
import './Game.css';

interface GameProps {
  universe: Universe;
  theme: Theme;
  chapterId: string;
  mode: GameMode;
  startItemId?: string; // Optional: start at specific item
  levelFilter?: number; // Optional: filter items by level
  onExit: () => void;
}

export const Game: React.FC<GameProps> = ({ universe, theme, chapterId, mode, startItemId, levelFilter, onExit }) => {
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
  
  // HUD state
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(10);
  const [healthBlink, setHealthBlink] = useState(false);
  const [contextText, setContextText] = useState('');
  const [contextVisible, setContextVisible] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [chapterComplete, setChapterComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  
  // Warning flash (3x blink for wrong shots)
  const [warningText, setWarningText] = useState('');
  const [warningBlinks, setWarningBlinks] = useState(0);
  
  // Input state - use refs to avoid re-creating game loop callbacks
  const mousePos = useRef<Vector2 | null>(null);
  const touchPos = useRef<Vector2 | null>(null);
  
  // Round transition
  const [roundTransition, setRoundTransition] = useState(false);
  const [roundMaxScore, setRoundMaxScore] = useState<number>(0);
  
  // Visual effects
  const starfield = useRef<Starfield | null>(null);
  const speedLines = useRef<SpeedLines | null>(null);
  const nebulaCloud = useRef<NebulaCloud | null>(null);
  const objectTrail = useRef<ObjectTrail | null>(null);
  
  // Background parallax offset
  const parallaxOffset = useRef(0);
  
  // Store difficulty config for background animations
  const difficultyConfigRef = useRef<{ speedMultiplier: number }>({ speedMultiplier: 1.0 });

  // Load chapter items
  useEffect(() => {
    loadChapter();
  }, []);

  const loadChapter = async () => {
    setLoading(true);
    await learningManager.load();
    let loadedItems = await jsonLoader.loadChapter(universe.id, theme.id, chapterId);
    
    // Filter items by level if levelFilter is provided
    if (levelFilter !== undefined) {
      loadedItems = loadedItems.filter(item => item.level === levelFilter);
      console.log(`🎯 Filtered items by level ${levelFilter}: ${loadedItems.length} items`);
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
  const showContext = useCallback((text: string) => {
    // Check if this is a warning/error message
    if (text.startsWith('Falsch!') || text.includes('⚠️')) {
      // Show as blinking warning in center (like Round Complete)
      setWarningText(text);
      setWarningBlinks(6); // 3 blinks = 6 state changes (on/off/on/off/on/off)
      
      // Clear after 3 blinks (1.8 seconds: 6 x 0.3s)
      setTimeout(() => {
        setWarningText('');
        setWarningBlinks(0);
      }, 1800);
    } else {
      // Normal context display (intro text, etc)
      setContextText(text);
      setContextVisible(true);
      setTimeout(() => setContextVisible(false), 3000);
    }
  }, []);

  const loadRound = useCallback((eng: ShooterEngine, index: number) => {
    console.log('🔄 loadRound called with index:', index, '/', items.length);
    
    if (index >= items.length) {
      // Chapter complete!
      console.log('✅ CHAPTER COMPLETE!');
      setFinalScore(eng.getSessionScore());
      setChapterComplete(true);
      return;
    }

    const item = items[index];
    console.log('📦 Loading item:', item.id);
    const learningState = learningManager.getState(item.id);
    eng.loadRound(item, learningState);
    setCurrentItemIndex(index);

    // Show intro text if present
    if (item.introText) {
      showContext(item.introText);
    }
  }, [items, learningManager, onExit, showContext]);

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
    
    console.log('🏁 ROUND COMPLETE!');
    console.log('📍 Current Index:', currentItemIndex, 'Total Items:', items.length);
    console.log('📊 Score Calculation:');
    console.log('  - Correct Points:', correctPoints, `(${item.correct.length} items)`);
    console.log('  - Distractor Points:', distractorPoints, `(${item.distractors.length} items)`);
    console.log('  - Has Collection Order:', hasCollectionOrder);
    if (hasCollectionOrder) {
      console.log('  - Max Score (with 2x bonus):', distractorPoints, '+', `(${correctPoints} × 2)`, '=', maxScore);
    } else {
      console.log('  - Max Score:', correctPoints, '+', distractorPoints, '=', maxScore);
    }
    console.log('  - Achieved Score:', roundScore);
    console.log('  - Percentage:', ((roundScore / maxScore) * 100).toFixed(1) + '%');
    console.log('  - Perfect:', perfect);
    
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
      console.log('⏭️ Loading next round...');
      setRoundTransition(false);
      if (engine) {
        loadRound(engine, nextIndex);
      }
    }, 1500); // 1.5s - shorter display time
  }, [currentItemIndex, items, theme.id, chapterId, engine, learningManager, loadRound]);

  const handleGameOver = useCallback(() => {
    console.log('💀 GAME OVER!');
    setFinalScore(score);
    setGameOver(true);
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

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current || items.length === 0) return;

    const initializeGame = async () => {
      // Load settings to get difficulty level
      const settings = await localProgressProvider.getUISettings();
      const difficultyConfig = getDifficultyConfig(settings.difficultyLevel || 'medium');
      
      // Store difficulty config for background animations
      difficultyConfigRef.current = { speedMultiplier: difficultyConfig.speedMultiplier };

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const rend = new Renderer(canvas);
      setRenderer(rend);

      // Initialize visual effects
      const themeColors = [
        theme.colorPrimary || '#4a90e2',
        theme.colorAccent || '#7bb3f0',
        '#8e44ad' // Purple as third color
      ];
      
      starfield.current = new Starfield(canvas.width, canvas.height, 150);
      speedLines.current = new SpeedLines(canvas.width, canvas.height, 3); // REDUCED: 30 → 3
      nebulaCloud.current = new NebulaCloud(canvas.width, canvas.height, 2, themeColors); // Reduced: 5 → 2 for fewer, more transparent clouds
      objectTrail.current = new ObjectTrail();

      const laserColor = theme.laserColor || universe.laserColor || '#4a90e2';
      const shipSkin = theme.shipSkin || universe.shipSkin;

      // Apply difficulty multipliers
      const adjustedBaseSpeed = config.gameplay.baseSpeed * difficultyConfig.speedMultiplier;
      const adjustedStartHealth = difficultyConfig.startHealth;

      const eng = new ShooterEngine(
        {
          screenWidth: canvas.width,
          screenHeight: canvas.height,
          baseSpeed: adjustedBaseSpeed,
          shipConfig: {
            health: adjustedStartHealth,
            radius: config.collision.shipRadius,
            smoothFactor: config.gameplay.shipSmoothFactor,
            maxSpeed: config.gameplay.shipSpeed,
            shotCooldown: config.gameplay.laserCooldown,
            shipSkin
          },
          laserSpeed: config.gameplay.laserSpeed,
          laserColor,
          spawnRateMultiplier: difficultyConfig.spawnRateMultiplier
        },
        mode
      );

      // Set up callbacks (basic ones)
      eng.setOnScoreChange(setScore);
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
  
  // Update callbacks when they change
  useEffect(() => {
    if (!engine) return;
    console.log('🔗 Updating engine callbacks');
    engine.setOnContextShow(showContext);
    engine.setOnRoundComplete(handleRoundComplete);
    engine.setOnGameOver(handleGameOver);
  }, [engine, showContext, handleRoundComplete, handleGameOver]);

  // Define game loop functions as useCallback to avoid stale closures
  const updateGame = useCallback((deltaTime: number) => {
    if (!engine) return;

    // Update game engine (but not during transition)
    if (!roundTransition) {
      const inputPos = touchPos.current || mousePos.current;
      engine.update(deltaTime, inputPos);
    } else {
      // During transition, still update particles so explosions continue animating
      engine.updateParticles(deltaTime);
    }
    
    // Update parallax (always, even during transition)
    // Apply difficulty multiplier to parallax speed
    parallaxOffset.current += deltaTime * 20 * difficultyConfigRef.current.speedMultiplier;
    
    // Update visual effects (always, even during transition)
    if (starfield.current) {
      const scoreMult = 1 + (score / 2000); // Faster stars at higher scores
      const difficultyMult = difficultyConfigRef.current.speedMultiplier;
      starfield.current.setSpeedMultiplier(scoreMult * difficultyMult);
      starfield.current.update(deltaTime);
    }
    
    if (speedLines.current) {
      const scoreIntensity = 1 + (score / 1000); // More lines at higher scores
      const difficultyMult = difficultyConfigRef.current.speedMultiplier;
      speedLines.current.setIntensity(scoreIntensity * difficultyMult);
      speedLines.current.update(deltaTime);
    }
    
    if (nebulaCloud.current) {
      const difficultyMult = difficultyConfigRef.current.speedMultiplier;
      nebulaCloud.current.setSpeedMultiplier(difficultyMult);
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
  }, [engine, roundTransition, score]);

  const renderGame = useCallback(() => {
    if (!renderer || !engine) return;

    // Get chapter config for background
    const chapterConfig = theme.chapters[chapterId];
    const backgroundGradient = chapterConfig.backgroundGradient;

    // Render background gradient
    renderer.renderGradientBackground(backgroundGradient);

    // Set background color for glow calculations (use first gradient color)
    const layer1Color = backgroundGradient[0] || '#0f1038';
    renderer.setBackgroundColor(layer1Color);

    // Render parallax layers (simple)
    const layer2Color = backgroundGradient[1] || '#272963';
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
    
    // === LAYER 3: Foreground Effects ===
    // Render speed lines (in front of everything for max effect)
    if (speedLines.current) {
      speedLines.current.render(renderer);
    }
  }, [renderer, engine, theme, chapterId]);

  // Start game loop
  useEffect(() => {
    if (!renderer || !engine) return;

    const loop = new GameLoop(updateGame, renderGame);

    loop.start();
    setGameLoop(loop);

    return () => loop.stop();
  }, [renderer, engine, updateGame, renderGame]);
  
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
    if (!rect) return;
    
    const touch = e.touches[0];
    touchPos.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    handleTouchMove(e);
    
    // If second finger, shoot
    if (e.touches.length > 1 && engine) {
      engine.shoot();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 0) {
      touchPos.current = null;
    }
  };

  if (loading) {
    return <div className="loading">Loading chapter...</div>;
  }

  return (
    <div className="game-container">
      {/* HUD */}
      <div className="hud">
        <div className="hud-left">
          <div className={`health-bar ${healthBlink ? 'health-blink' : ''}`}>
            <span>❤️</span>
            <div className="health-fill" style={{ width: `${(health / 10) * 100}%` }} />
            <span className="health-text">{health}/10</span>
          </div>
        </div>
        
        <div className="hud-center">
          <div className="level-info">
            {theme.name} - {chapterId}
          </div>
          <div className="item-progress">
            Item {currentItemIndex + 1}/{items.length}
          </div>
        </div>
        
        <div className="hud-right">
          <div className="score">
            Score: <span className="glow-text">{score}</span>
          </div>
          <div className="mode-badge">
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
      
      {/* Warning Flash (3x blink in center) */}
      {warningBlinks > 0 && (
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
          <div className="game-over-content">
            <h1>🎉 Chapter Complete!</h1>
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

      {/* Exit Button */}
      <button className="exit-button" onClick={() => {
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
  );
};

