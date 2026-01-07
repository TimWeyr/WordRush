/**
 * Galaxy Planet View Component
 * 
 * Renders a single planet with its moons:
 * - Planet centered on screen
 * - Moons orbit around planet
 * - Pan and zoom controls
 * - Click moon/level/item to start game
 * - Back button returns to Universe View
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameLoop } from '@/core/GameLoop';
import { Renderer } from '@/core/Renderer';
import { GalaxyCamera } from '@/logic/GalaxyCamera';
import { calculateMoonPositionsAdaptive, calculateItemPositions, calculateLevelRings, type PlanetLayout, type MoonLayout, type ItemLayout, type LevelRingLayout } from '@/logic/GalaxyLayout';
import { renderMoon, renderMoonLabel, renderItemParticle, renderLevelRing, renderConnectionLines, renderTooltip, type RenderContext } from './GalaxyRenderer';
import { MoonParticleEffect } from '@/effects/MoonParticleEffect';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { getChapterScore, calculateMaxPossibleScore, getItemScore, getLevelScore } from '@/utils/ScoreCalculator';
import { Settings } from './Settings';
import { GameStartScreen } from './GameStartScreen';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { GameMode } from '@/types/game.types';
import type { LearningState } from '@/types/progress.types';
import './GalaxyPlanetView.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const ITEM_VISIBILITY_ZOOM_THRESHOLD = 1.8;
const MOON_DIRECT_START_ZOOM_THRESHOLD = 1.8;
const MOON_LABEL_ZOOM_THRESHOLD = 0.8; // Show moon labels when zoom > 1.2 (when zoomed in enough to see details)
const ITEM_HITBOX_RADIUS = 10;
const LEVEL_RING_HITBOX_WIDTH = 5;
const MOON_HITBOX_MULTIPLIER = 2;
const PARTICLE_DELTA_TIME = 0.016;
const TOUCH_HOLD_HOVER_DELAY = 200; // milliseconds to wait before showing hover tooltip

// ============================================================================
// TYPES
// ============================================================================

interface GalaxyPlanetViewProps {
  universe: Universe;
  theme: Theme;
  mode: GameMode;
  onBack: () => void;
  onStart: (
    universe: Universe,
    theme: Theme,
    chapterIds: string | string[],
    mode: GameMode,
    itemId?: string,
    levelFilter?: number,
    loadAllItems?: boolean
  ) => void;
}

interface HoveredElement {
  type: 'moon' | 'item' | 'levelRing';
  id: string;
  level?: number;
  moonId?: string;
  x: number;
  y: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateTooltipText(
  name: string,
  score: { totalScore: number; maxScore: number; percentage: number }
): string {
  return `${name}\nScore: ${score.totalScore}/${score.maxScore} (${score.percentage.toFixed(1)}%)`;
}

function saveCameraStateHelper(
  universeId: string,
  camera: GalaxyCamera
): void {
  localProgressProvider.saveGalaxyCameraState(
    universeId,
    camera.x,
    camera.y,
    camera.zoom
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GalaxyPlanetView: React.FC<GalaxyPlanetViewProps> = ({
  universe,
  theme,
  mode,
  onBack,
  onStart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  // ============================================================================
  // CORE STATE
  // ============================================================================
  
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [camera, setCamera] = useState<GalaxyCamera | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [learningState, setLearningState] = useState<LearningState>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosedTrigger, setSettingsClosedTrigger] = useState(0);
  
  // ============================================================================
  // LAUNCH SCREEN STATE
  // ============================================================================
  
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [launchScreenData, setLaunchScreenData] = useState<{
    name: string;
    itemCount: number;
    freeTierItemCount?: number;
    colorPrimary: string;
    colorAccent: string;
    icon: string;
    chapterIds: string | string[];
    itemId?: string;
    levelFilter?: number;
    loadAllItems?: boolean;
  } | null>(null);
  
  // ============================================================================
  // LAYOUT STATE (Refs for performance)
  // ============================================================================
  
  const planetLayoutRef = useRef<PlanetLayout | null>(null);
  const moonLayoutsRef = useRef<MoonLayout[]>([]);
  const itemLayoutsRef = useRef<Map<string, ItemLayout[]>>(new Map());
  const levelRingsRef = useRef<Map<string, LevelRingLayout[]>>(new Map());
  const moonParticleEffectsRef = useRef<Map<string, MoonParticleEffect>>(new Map());
  
  // ============================================================================
  // INTERACTION STATE
  // ============================================================================
  
  const [hoveredElement, setHoveredElement] = useState<HoveredElement | null>(null);
  const [tooltipText, setTooltipText] = useState<string>('');
  
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const touchHoldTimer = useRef<number | null>(null);
  const hasMovedDuringTouch = useRef(false);
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadData();
  }, [universe.id, theme.id]);
  
  // ============================================================================
  // LAUNCH SCREEN HANDLERS
  // ============================================================================
  
  const showLaunchScreenForSelection = async (
    name: string,
    chapterIds: string | string[],
    itemId?: string,
    levelFilter?: number,
    loadAllItems?: boolean,
    icon: string = '🚀'
  ) => {
    // Calculate item count and freeTier count
    let itemCount = 0;
    let freeTierCount = 0;
    const chapterIdArray = Array.isArray(chapterIds) ? chapterIds : [chapterIds];
    
    for (const chapterId of chapterIdArray) {
      const chapterItems = allItems.filter(item => item.chapter === chapterId);
      
      if (itemId) {
        // Single item
        const singleItem = allItems.find(i => i.id === itemId);
        itemCount = 1;
        freeTierCount = singleItem?.freeTier ? 1 : 0;
      } else if (levelFilter !== undefined) {
        // Level filter
        const levelItems = chapterItems.filter(item => item.level === levelFilter);
        itemCount += levelItems.length;
        freeTierCount += levelItems.filter(item => item.freeTier).length;
      } else {
        // All items in chapter(s)
        itemCount += chapterItems.length;
        freeTierCount += chapterItems.filter(item => item.freeTier).length;
      }
    }
    
    // Set launch screen data
    setLaunchScreenData({
      name,
      itemCount,
      freeTierItemCount: freeTierCount,
      colorPrimary: theme.colorPrimary,
      colorAccent: theme.colorAccent,
      icon,
      chapterIds,
      itemId,
      levelFilter,
      loadAllItems
    });
    setShowLaunchScreen(true);
  };
  
  const handleLaunchConfirm = (gameMode: 'lernmodus' | 'shooter') => {
    if (!launchScreenData || !camera) return;
    
    saveCameraStateHelper(universe.id, camera);
    
    // Use the gameMode passed from GameStartScreen (already up-to-date)
    console.log('🚀 [PlanetView] Starting with game mode:', gameMode);
    
    onStart(
      universe,
      theme,
      launchScreenData.chapterIds,
      gameMode, // Use the passed gameMode instead of the stale 'mode' variable
      launchScreenData.itemId,
      launchScreenData.levelFilter,
      launchScreenData.loadAllItems
    );
    
    setShowLaunchScreen(false);
    setLaunchScreenData(null);
  };
  
  const handleLaunchCancel = () => {
    setShowLaunchScreen(false);
    setLaunchScreenData(null);
  };
  
  const loadData = async () => {
    console.log(`🌍 [PlanetView] Loading data for theme: ${theme.id}...`);
    console.time('⏱️ [PlanetView] Total load time');
    
    // Save selection for PDF export (theme selected, but no chapter)
    const selection = {
      universeId: universe.id,
      themeId: theme.id,
      chapterId: '', // Empty string = no chapter selected (export entire theme)
      mode: mode
    };
    localStorage.setItem('wordrush_lastSelection', JSON.stringify(selection));
    
    // Load learning state
    const loadedLearningState = await localProgressProvider.getLearningState();
    setLearningState(loadedLearningState);
    
    // Load items for all chapters (parallel, uses cache from background preload)
    console.time('⏱️ [PlanetView] Item loading');
    const chapterIds = Object.keys(theme.chapters);
    const chapterPromises = chapterIds.map(chapterId =>
      jsonLoader.loadChapter(universe.id, theme.id, chapterId)
        .catch(error => {
          console.warn(`⚠️ Failed to load chapter ${chapterId}:`, error);
          return [] as Item[];
        })
    );
    
    const chapterResults = await Promise.all(chapterPromises);
    const themeItems = chapterResults.flat();
    console.timeEnd('⏱️ [PlanetView] Item loading');
    
    console.log(`✅ [PlanetView] Loaded ${themeItems.length} items for ${chapterIds.length} chapters (cached: instant!)`);
    console.timeEnd('⏱️ [PlanetView] Total load time');
    setAllItems(themeItems);
  };
  
  // ============================================================================
  // CANVAS INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const newRenderer = new Renderer(canvas);
    setRenderer(newRenderer);
    
    const newCamera = new GalaxyCamera(canvas.width, canvas.height);
    setCamera(newCamera);
    
    console.log(`🎨 Planet View Canvas initialized: ${canvas.width}x${canvas.height}`);
  }, []);
  
  // ============================================================================
  // LAYOUT CALCULATION
  // ============================================================================
  
  const calculateLayouts = useCallback(() => {
    if (!renderer || !camera) return;
    
    const canvas = renderer.getContext().canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Planet at center (increased radius from 50 to 80 to be more dominant)
    planetLayoutRef.current = {
      id: theme.id,
      x: centerX,
      y: centerY,
      radius: 80,
      theme
    };
    
    // Group items by chapter
    const itemsByChapter = new Map<string, Item[]>();
    for (const item of allItems) {
      if (!itemsByChapter.has(item.chapter)) {
        itemsByChapter.set(item.chapter, []);
      }
      itemsByChapter.get(item.chapter)!.push(item);
    }
    
    // Calculate moon positions
    moonLayoutsRef.current = calculateMoonPositionsAdaptive(
      theme.chapters,
      centerX,
      centerY,
      itemsByChapter
    );
    
    // Calculate item positions and level rings for each moon
    itemLayoutsRef.current.clear();
    levelRingsRef.current.clear();
    moonParticleEffectsRef.current.clear();
    
    for (const moon of moonLayoutsRef.current) {
      const chapterItems = allItems.filter(item => item.chapter === moon.chapterId);
      
      const items = calculateItemPositions(chapterItems, moon.x, moon.y);
      itemLayoutsRef.current.set(moon.id, items);
      
      const rings = calculateLevelRings(chapterItems, moon.id, moon.chapterId);
      levelRingsRef.current.set(moon.id, rings);
      
      // Check if all items are 100% and create particle effect
      const allItems100 = chapterItems.length > 0 && chapterItems.every(item => {
        const itemState = learningState[item.id];
        if (!itemState) return false;
        const maxScore = calculateMaxPossibleScore(item);
        return itemState.totalScore >= maxScore;
      });
      
      if (allItems100 && chapterItems.length > 0) {
        const effect = new MoonParticleEffect(moon.x, moon.y, [theme.colorPrimary, theme.colorAccent]);
        effect.activate();
        moonParticleEffectsRef.current.set(moon.id, effect);
      }
    }
    
    // Center camera on planet with lower initial zoom to show all moons
    // Zoom 0.7 = zoomed out view (shows entire planet system)
    camera.setPositionImmediate(centerX, centerY, 0.7);
  }, [renderer, camera, theme, allItems, learningState]);
  
  useEffect(() => {
    if (allItems.length > 0) {
      calculateLayouts();
    }
  }, [calculateLayouts, allItems.length]);
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  const render = useCallback(() => {
    if (!renderer || !camera) return;
    
    renderer.clear();
    
    // Render background gradient
    const gradient = theme.backgroundGradient || universe.backgroundGradient;
    renderer.renderGradientBackground(gradient);
    
    const planet = planetLayoutRef.current;
    if (!planet) return;
    
    // Create render context
    const renderContext: RenderContext = {
      renderer,
      camera,
      hoveredElement: hoveredElement ? {
        type: hoveredElement.type as any,
        id: hoveredElement.id,
        level: hoveredElement.level,
        moonId: hoveredElement.moonId
      } : null,
      selectedElement: null,
      themeProgress: new Map(),
      allItems,
      learningState,
      universe,
      planetLayouts: [planet],
      moonLayouts: new Map([[planet.id, moonLayoutsRef.current]])
    };
    
    // Layer 1: Connection lines (behind everything)
    renderConnectionLines(planet, moonLayoutsRef.current, renderContext);
    
    // Layer 2: Moons and level rings (behind planet)
    for (const moon of moonLayoutsRef.current) {
      // Render level rings first (furthest back)
      const rings = levelRingsRef.current.get(moon.id) || [];
      const chapterItems = allItems.filter(item => item.chapter === moon.chapterId);
      for (const ring of rings) {
        renderLevelRing(ring, moon, chapterItems, renderContext);
      }
      
      // Then render moon (on top of rings)
      renderMoon(moon, renderContext);
      
      // Update and render moon particle effect
      const effect = moonParticleEffectsRef.current.get(moon.id);
      if (effect) {
        const moonScreenPos = camera.worldToScreen({ x: moon.x, y: moon.y });
        effect.setPosition(moonScreenPos.x, moonScreenPos.y);
        effect.update(PARTICLE_DELTA_TIME);
        effect.render(renderer);
      }
    }
    
    // Layer 3: Planet (centered, on top of everything except items/tooltip)
    const ctx = renderer.getContext();
    const screenPos = camera.worldToScreen({ x: planet.x, y: planet.y });
    ctx.save();
    ctx.fillStyle = theme.colorPrimary;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, planet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.icon || '🌍', screenPos.x, screenPos.y);
    ctx.restore();
    
    // Layer 4: Moon labels (show when zoomed in)
    // Show labels when zoom > MOON_LABEL_ZOOM_THRESHOLD (1.2)
    if (camera.zoom > MOON_LABEL_ZOOM_THRESHOLD) {
      for (const moon of moonLayoutsRef.current) {
        renderMoonLabel(moon, renderContext);
      }
    }
    
    // Layer 5: Items (only when deeply zoomed)
    if (camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const moon of moonLayoutsRef.current) {
        const items = itemLayoutsRef.current.get(moon.id) || [];
        for (const itemLayout of items) {
          const item = allItems.find(i => i.id === itemLayout.itemId);
          if (item) {
            renderItemParticle(itemLayout, item, renderContext);
          }
        }
      }
    }
    
    // Layer 6: Tooltip
    if (tooltipText && hoveredElement) {
      renderTooltip(tooltipText, { x: hoveredElement.x, y: hoveredElement.y }, renderContext);
    }
  }, [renderer, camera, theme, universe, allItems, learningState, hoveredElement, tooltipText]);
  
  // ============================================================================
  // UPDATE LOOP
  // ============================================================================
  
  const update = useCallback((deltaTime: number) => {
    if (!camera) return;
    
    camera.update(deltaTime);
    
    // Update moon particle effects
    for (const effect of moonParticleEffectsRef.current.values()) {
      effect.update(deltaTime);
    }
  }, [camera]);
  
  // ============================================================================
  // GAME LOOP
  // ============================================================================
  
  useEffect(() => {
    if (!renderer || !camera) return;
    
    const loop = new GameLoop(update, render);
    gameLoopRef.current = loop;
    loop.start();
    
    return () => {
      loop.stop();
      if (gameLoopRef.current === loop) {
        gameLoopRef.current = null;
      }
    };
  }, [renderer, camera, update, render]);
  
  // ============================================================================
  // HOVER DETECTION
  // ============================================================================
  
  const checkHover = useCallback((worldX: number, worldY: number, screenX: number, screenY: number) => {
    if (!camera) return;
    
    // Check planet first
    const planet = planetLayoutRef.current;
    if (planet) {
      const distance = Math.hypot(worldX - planet.x, worldY - planet.y);
      if (distance < planet.radius * MOON_HITBOX_MULTIPLIER) {
        const chapterCount = Object.keys(theme.chapters).length;
        const itemCount = allItems.length;
        setHoveredElement({ type: 'moon', id: planet.id, x: screenX, y: screenY });
        setTooltipText(`${theme.icon} ${theme.name}\n🎲 Chaotic Mode: Alle ${chapterCount} Chapters (${itemCount} Items)`);
        return;
      }
    }
    
    // Check level rings first
    for (const moon of moonLayoutsRef.current) {
      const rings = levelRingsRef.current.get(moon.id) || [];
      for (const ring of rings) {
        const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
        const distanceFromRing = Math.abs(distance - ring.radius);
        
        if (distanceFromRing < LEVEL_RING_HITBOX_WIDTH) {
          const chapterItems = allItems.filter(item => item.chapter === moon.chapterId);
          const levelScore = getLevelScore(moon.chapterId, ring.level, chapterItems, learningState);
          const tooltipText = generateTooltipText(`Level ${ring.level}`, levelScore);
          
          setHoveredElement({
            type: 'levelRing',
            id: `${moon.id}_level_${ring.level}`,
            level: ring.level,
            moonId: moon.id,
            x: screenX,
            y: screenY
          });
          setTooltipText(tooltipText);
          return;
        }
      }
    }
    
    // Check items (only if deeply zoomed)
    if (camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const moon of moonLayoutsRef.current) {
        const items = itemLayoutsRef.current.get(moon.id) || [];
        for (const itemLayout of items) {
          const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
          
          if (distance < ITEM_HITBOX_RADIUS) {
            const item = allItems.find(i => i.id === itemLayout.itemId);
            if (item) {
              const scoreData = getItemScore(item.id, item, learningState);
              const baseWord = item.base?.word || item.id;
              const tooltipText = generateTooltipText(baseWord, scoreData);
              
              setHoveredElement({ type: 'item', id: item.id, x: screenX, y: screenY });
              setTooltipText(tooltipText);
              return;
            }
          }
        }
      }
    }
    
    // Check moons
    for (const moon of moonLayoutsRef.current) {
      const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
      
      if (distance < moon.radius * MOON_HITBOX_MULTIPLIER) {
        const chapterItems = allItems.filter(item => item.chapter === moon.chapterId);
        const chapterScore = getChapterScore(moon.chapterId, chapterItems, learningState);
        const chapterTitle = moon.chapter?.title || moon.chapterId;
        const tooltipText = generateTooltipText(chapterTitle, chapterScore);
        
        setHoveredElement({ type: 'moon', id: moon.id, x: screenX, y: screenY });
        setTooltipText(tooltipText);
        return;
      }
    }
    
    // No hover
    setHoveredElement(null);
    setTooltipText('');
  }, [camera, allItems, learningState, theme]);
  
  // ============================================================================
  // CLICK HANDLING
  // ============================================================================
  
  const handleElementClick = useCallback((worldX: number, worldY: number) => {
    if (!camera) return;
    
    // Check planet first
    const planet = planetLayoutRef.current;
    if (planet) {
      const distance = Math.hypot(worldX - planet.x, worldY - planet.y);
      if (distance < planet.radius * MOON_HITBOX_MULTIPLIER) {
        // Click on planet = start CHAOTIC MODE (all chapters mixed)
        const chapterIds = Object.keys(theme.chapters);
        if (chapterIds.length > 0) {
          showLaunchScreenForSelection(
            `${theme.name} - Chaotic Mode`,
            chapterIds,
            undefined,
            undefined,
            true,
            '🌍'
          );
        }
        return;
      }
    }
    
    // Check level rings first
    for (const moon of moonLayoutsRef.current) {
      const rings = levelRingsRef.current.get(moon.id) || [];
      for (const ring of rings) {
        const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
        const distanceFromRing = Math.abs(distance - ring.radius);
        
        if (distanceFromRing < LEVEL_RING_HITBOX_WIDTH) {
          const chapterTitle = moon.chapter?.title || moon.chapterId;
          showLaunchScreenForSelection(
            `${chapterTitle} - Level ${ring.level}`,
            moon.chapterId,
            undefined,
            ring.level,
            undefined,
            '⭐'
          );
          return;
        }
      }
    }
    
    // Check items (only if deeply zoomed)
    if (camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const moon of moonLayoutsRef.current) {
        const items = itemLayoutsRef.current.get(moon.id) || [];
        for (const itemLayout of items) {
          const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
          
          if (distance < ITEM_HITBOX_RADIUS) {
            const item = allItems.find(i => i.id === itemLayout.itemId);
            if (item && item.chapter) {
              showLaunchScreenForSelection(
                item.base.word || item.id,
                item.chapter,
                item.id,
                undefined,
                undefined,
                '🎯'
              );
              return;
            }
          }
        }
      }
    }
    
    // Check moons
    for (const moon of moonLayoutsRef.current) {
      const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
      
      if (distance < moon.radius * MOON_HITBOX_MULTIPLIER) {
        if (camera.zoom >= MOON_DIRECT_START_ZOOM_THRESHOLD) {
          const chapterTitle = moon.chapter?.title || moon.chapterId;
          showLaunchScreenForSelection(
            chapterTitle,
            moon.chapterId,
            undefined,
            undefined,
            undefined,
            '🌙'
          );
        } else {
          // Zoom deeper to show items
          camera.zoomToElement(moon.x, moon.y, 2.0);
        }
        return;
      }
    }
  }, [camera, allItems, universe, theme, mode, onStart, onBack]);
  
  // ============================================================================
  // MOUSE INPUT
  // ============================================================================
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!camera || !renderer) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    if (isDragging.current && dragStart.current) {
      const deltaX = screenX - dragStart.current.x;
      const deltaY = screenY - dragStart.current.y;
      camera.pan(-deltaX, -deltaY);
      dragStart.current = { x: screenX, y: screenY };
      return;
    }
    
    // Check hover
    const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
    checkHover(worldPos.x, worldPos.y, screenX, screenY);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };
  
  const handleMouseUp = () => {
    isDragging.current = false;
    dragStart.current = null;
  };
  
  const handleMouseLeave = () => {
    isDragging.current = false;
    dragStart.current = null;
    setHoveredElement(null);
    setTooltipText('');
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    
    if (!camera) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
    
    handleElementClick(worldPos.x, worldPos.y);
  };
  
  // ============================================================================
  // WHEEL INPUT
  // ============================================================================
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = canvas.getBoundingClientRect();
      camera.zoomBy(zoomFactor, e.clientX - rect.left, e.clientY - rect.top);
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [camera]);
  
  // ============================================================================
  // TOUCH INPUT
  // ============================================================================
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      hasMovedDuringTouch.current = false;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        
        // Start touch-hold timer to show hover tooltip after delay
        touchHoldTimer.current = window.setTimeout(() => {
          if (!hasMovedDuringTouch.current && camera) {
            // User is holding still -> show hover tooltip
            const screenX = touch.clientX - rect.left;
            const screenY = touch.clientY - rect.top;
            const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
            checkHover(worldPos.x, worldPos.y, screenX, screenY);
          }
        }, TOUCH_HOLD_HOVER_DELAY);
      }
    } else if (e.touches.length === 2) {
      // Cancel hover timer on multi-touch (zoom gesture)
      if (touchHoldTimer.current) {
        clearTimeout(touchHoldTimer.current);
        touchHoldTimer.current = null;
      }
      setHoveredElement(null);
      setTooltipText('');
      
      isDragging.current = false;
      dragStart.current = null;
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      lastTouchDistance.current = distance;
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!camera) return;
    
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging.current && dragStart.current) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const deltaX = screenX - dragStart.current.x;
        const deltaY = screenY - dragStart.current.y;
        
        // Detect movement (cancel hover timer if user is dragging)
        const movementDistance = Math.hypot(deltaX, deltaY);
        if (movementDistance > 5) {
          hasMovedDuringTouch.current = true;
          
          // Cancel hover timer if still running
          if (touchHoldTimer.current) {
            clearTimeout(touchHoldTimer.current);
            touchHoldTimer.current = null;
          }
          
          // Clear any existing hover tooltip
          setHoveredElement(null);
          setTooltipText('');
        }
        
        camera.pan(-deltaX, -deltaY);
        dragStart.current = { x: screenX, y: screenY };
      }
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      const rawScale = distance / lastTouchDistance.current;
      const scaleDiff = Math.abs(rawScale - 1.0);
      
      if (scaleDiff > 0.01) {
        const smoothScale = 1.0 + (rawScale - 1.0) * 0.5;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const midX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const midY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
          camera.zoomBy(smoothScale, midX, midY);
        }
        lastTouchDistance.current = distance;
      }
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Cancel hover timer
    if (touchHoldTimer.current) {
      clearTimeout(touchHoldTimer.current);
      touchHoldTimer.current = null;
    }
    
    if (e.touches.length === 0) {
      const wasTap = isDragging.current && dragStart.current !== null && !hasMovedDuringTouch.current;
      
      if (wasTap) {
        // Clear hover tooltip before handling click
        setHoveredElement(null);
        setTooltipText('');
        
        const touch = e.changedTouches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && camera) {
          const screenX = touch.clientX - rect.left;
          const screenY = touch.clientY - rect.top;
          const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
          handleElementClick(worldPos.x, worldPos.y);
        }
      }
      
      isDragging.current = false;
      dragStart.current = null;
      lastTouchDistance.current = null;
      hasMovedDuringTouch.current = false;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        isDragging.current = true;
        hasMovedDuringTouch.current = false;
        dragStart.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      lastTouchDistance.current = null;
    }
  };
  
  // ============================================================================
  // RENDER UI
  // ============================================================================
  
  return (
    <div className="galaxy-planet-view">
      <button className="settings-icon-button" onClick={() => setSettingsOpen(true)} title="Settings">
        ⚙️
      </button>
      <Settings isOpen={settingsOpen} onClose={() => {
        setSettingsOpen(false);
        // Trigger reload in GameStartScreen
        setSettingsClosedTrigger(prev => prev + 1);
      }} />
      
      <div className="galaxy-planet-controls">
        <button onClick={onBack} className="back-button" title="Zurück zur Übersicht">
          ⬅️ Zurück
        </button>
        <span className="planet-title">{theme.icon} {theme.name}</span>
      </div>
      
      <canvas
        ref={canvasRef}
        className="galaxy-planet-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {showLaunchScreen && launchScreenData && (
        <GameStartScreen
          key={settingsClosedTrigger} // Force reload when settings close
          name={launchScreenData.name}
          itemCount={launchScreenData.itemCount}
          freeTierItemCount={launchScreenData.freeTierItemCount}
          colorPrimary={launchScreenData.colorPrimary}
          colorAccent={launchScreenData.colorAccent}
          onConfirm={handleLaunchConfirm}
          onCancel={handleLaunchCancel}
          onOpenSettings={() => setSettingsOpen(true)}
          icon={launchScreenData.icon}
        />
      )}
    </div>
  );
};

