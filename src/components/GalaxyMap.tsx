/**
 * Galaxy Map Component
 * 
 * Interactive 2D galaxy map visualizing the learning universe:
 * - Planets represent Themes
 * - Moons represent Chapters (orbiting planets)
 * - Level Rings show progress within chapters
 * - Item particles appear when zoomed in deeply
 * 
 * Navigation:
 * - Overview: Horizontal S-curve (Mäander) layout showing all planets
 * - Zoomed: Focus on single planet with its moons and level rings
 * - Click planet → zoom to planet
 * - Click moon → start chapter
 * - Click level ring → start specific level
 * - Click item → start specific item
 * 
 * State Persistence:
 * - View state (zoom level, focused planet) saved to localStorage
 * - Camera position saved per universe
 * - Last selection (universe/theme/mode) restored on reload
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
// import { useAuth } from '@/infra/auth/AuthContext'; // Reserved for future auth features
import { GameLoop } from '@/core/GameLoop';
import { Renderer } from '@/core/Renderer';
import { GalaxyCamera } from '@/logic/GalaxyCamera';
import { calculatePlanetPositionsHorizontalMaeander, calculateMoonPositionsAdaptive, calculateItemPositions, calculateLevelRings, type PlanetLayout, type MoonLayout, type ItemLayout, type LevelRingLayout } from '@/logic/GalaxyLayout';
import { renderPlanet, renderMoon, renderItemParticle, renderLevelRing, renderConnectionLines, renderTooltip, type RenderContext } from './GalaxyRenderer';
import { MoonParticleEffect } from '@/effects/MoonParticleEffect';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { localProgressProvider } from '@/infra/providers/LocalProgressProvider';
import { getThemeScore, getChapterScore, calculateMaxPossibleScore, getItemScore, getLevelScore } from '@/utils/ScoreCalculator';
import { Settings } from './Settings';
import { GAMEPLAY_PRESETS, DEFAULT_GAMEPLAY_SETTINGS } from '@/config/gameplayPresets';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { GameMode } from '@/types/game.types';
import type { LearningState, GameplayPreset } from '@/types/progress.types';
import './GalaxyMap.css';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Zoom threshold for showing items (needs deep zoom) */
const ITEM_VISIBILITY_ZOOM_THRESHOLD = 1.8;

/** Zoom threshold for starting game directly from moon click */
const MOON_DIRECT_START_ZOOM_THRESHOLD = 1.8;

/** Hitbox radius for item hover/click detection (world units) */
const ITEM_HITBOX_RADIUS = 10;

/** Hitbox width for level ring hover/click detection (world units) */
const LEVEL_RING_HITBOX_WIDTH = 5;

/** Moon hitbox multiplier (relative to moon radius) */
const MOON_HITBOX_MULTIPLIER = 2;

/** Planet hitbox multiplier (relative to planet radius) */
const PLANET_HITBOX_MULTIPLIER = 2;

/** Camera save throttle interval (ms) - avoid excessive localStorage writes */
const CAMERA_SAVE_THROTTLE_MS = 500;

/** Assumed frame time for particle effects (60 FPS) */
const PARTICLE_DELTA_TIME = 0.016;

/** Pan speed for keyboard navigation (world units per keypress) */
const KEYBOARD_PAN_SPEED = 50;

/** Pan speed for mouse wheel in overview mode (screen units) */
const WHEEL_PAN_SPEED = 30;

/** Zoom factor for wheel zoom in */
const WHEEL_ZOOM_IN_FACTOR = 1.1;

/** Zoom factor for wheel zoom out */
const WHEEL_ZOOM_OUT_FACTOR = 0.9;

/** Zoom factor for spacebar toggle */
const SPACEBAR_ZOOM_OUT_FACTOR = 0.8;
const SPACEBAR_ZOOM_IN_FACTOR = 1.25;

/** Padding around planets when focusing (world units) */
const PLANET_FOCUS_PADDING = 40;

/** Padding when showing all planets in overview */
const OVERVIEW_PADDING = 60;

/** Touch gesture: minimum pinch scale change to register zoom */
const TOUCH_ZOOM_THRESHOLD = 0.01;

// ============================================================================
// TYPES
// ============================================================================

interface GalaxyMapProps {
  onStart: (
    universe: Universe,
    theme: Theme,
    chapterId: string | string[],
    mode: GameMode,
    itemId?: string,
    levelFilter?: number,
    loadAllItems?: boolean
  ) => void;
  initialFocus?: { universeId: string; planetId: string } | null;
  onInitialFocusConsumed?: () => void;
}

interface HoveredElement {
  type: 'planet' | 'moon' | 'item' | 'levelRing';
  id: string;
  level?: number;
  moonId?: string;
  x: number;
  y: number;
}

type SavedViewState = {
  universeId: string;
  zoomState: 'overview' | 'zoomed';
  zoomedPlanetId?: string | null;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Removed unused hasFreeTierItems function

/** Load saved view state from localStorage */
function loadViewState(): SavedViewState | null {
  try {
    const raw = localStorage.getItem('wordrush_galaxy_view');
    if (!raw) return null;
    return JSON.parse(raw) as SavedViewState;
  } catch (error) {
    console.warn('⚠️ Failed to load galaxy view state:', error);
    return null;
  }
}

/** Save view state to localStorage */
function saveViewState(state: SavedViewState): void {
  try {
    localStorage.setItem('wordrush_galaxy_view', JSON.stringify(state));
  } catch (error) {
    console.warn('⚠️ Failed to save galaxy view state:', error);
  }
}

/** 
 * Save camera position to localStorage (helper to reduce duplication)
 * Used before starting game to preserve map position
 */
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

/**
 * Generate tooltip text for an element
 * Reduces duplication across hover handlers
 */
function generateTooltipText(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _elementType: 'planet' | 'moon' | 'item' | 'levelRing',
  name: string,
  score: { totalScore: number; maxScore: number; percentage: number }
): string {
  return `${name}\nScore: ${score.totalScore}/${score.maxScore} (${score.percentage.toFixed(1)}%)`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const GalaxyMap: React.FC<GalaxyMapProps> = ({ onStart, initialFocus, onInitialFocusConsumed }) => {
  // const { user } = useAuth(); // Currently unused, reserved for future auth features
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // ============================================================================
  // CORE STATE
  // ============================================================================
  
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [camera, setCamera] = useState<GalaxyCamera | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  // ============================================================================
  // DATA STATE
  // ============================================================================
  
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [learningState, setLearningState] = useState<LearningState>({});
  const [themeProgress, setThemeProgress] = useState<Map<string, number>>(new Map());
  
  // ============================================================================
  // LAYOUT STATE (Refs for performance - updated frequently, no re-render needed)
  // ============================================================================
  
  const planetLayoutsRef = useRef<PlanetLayout[]>([]);
  const moonLayoutsRef = useRef<Map<string, MoonLayout[]>>(new Map());
  const itemLayoutsRef = useRef<Map<string, ItemLayout[]>>(new Map());
  const levelRingsRef = useRef<Map<string, LevelRingLayout[]>>(new Map());
  const moonParticleEffectsRef = useRef<Map<string, MoonParticleEffect>>(new Map());
  
  // ============================================================================
  // INTERACTION STATE
  // ============================================================================
  
  const [hoveredElement, setHoveredElement] = useState<HoveredElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: 'planet' | 'moon' | 'item'; id: string } | null>(null);
  const [tooltipText, setTooltipText] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('lernmodus');
  
  // ============================================================================
  // VIEW STATE (zoom level and focused planet)
  // ============================================================================
  
  const [zoomState, setZoomState] = useState<'overview' | 'zoomed'>('overview');
  const [zoomedPlanetId, setZoomedPlanetId] = useState<string | null>(null);
  
  // View state restoration flags
  const viewStateRestoredRef = useRef(false);
  const initialFocusAppliedRef = useRef(false);
  const pendingFocusThemeIdRef = useRef<string | null>(null);
  
  // ============================================================================
  // INPUT STATE (Refs for performance - updated in event handlers)
  // ============================================================================
  
  const isDragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastCameraSaveTime = useRef<number>(0);
  
  // Load data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const loadedUniverses = await jsonLoader.loadUniverses();
    setUniverses(loadedUniverses);
    
    const loadedLearningState = await localProgressProvider.getLearningState();
    setLearningState(loadedLearningState);
    
    // Check URL params for initial selection FIRST
    let initialUniverseId: string | null = null;
    let initialThemeId: string | null = null;
    let initialMode: GameMode | null = null;
    let initialPreset: GameplayPreset | null = null;
    
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      initialUniverseId = params.get('universe');
      initialThemeId = params.get('theme');
      
      // Check for mode parameter
      const modeParam = params.get('mode');
      if (modeParam === 'lernmodus' || modeParam === 'shooter') {
        initialMode = modeParam;
      }
      
      // Check for preset parameter
      const presetParam = params.get('preset');
      if (presetParam && presetParam in GAMEPLAY_PRESETS) {
        initialPreset = presetParam as GameplayPreset;
      }
    }

    // Apply Mode from URL if present
    if (initialMode) {
      setMode(initialMode);
    }

    // Apply Gameplay Preset from URL if present
    if (initialPreset) {
       const currentSettings = await localProgressProvider.getUISettings();
       const newGameplaySettings = {
          ...currentSettings.gameplaySettings || DEFAULT_GAMEPLAY_SETTINGS,
          ...GAMEPLAY_PRESETS[initialPreset],
          preset: initialPreset
       };
       const newSettings = {
          ...currentSettings,
          gameplaySettings: newGameplaySettings
       };
       await localProgressProvider.saveUISettings(newSettings);
    }

    // Log initialization summary
    console.log(`🌌 GalaxyMap Init: ${loadedUniverses.length} universes | URL: ${initialUniverseId || 'none'}${initialThemeId ? `/${initialThemeId}` : ''} | Mode: ${initialMode || 'default'} | Preset: ${initialPreset || 'none'}`);

    // If URL has universe, try to load it
    if (initialUniverseId) {
      const universe = loadedUniverses.find(u => u.id === initialUniverseId);
      if (universe) {
        await selectUniverse(universe.id, initialThemeId || undefined, initialMode || undefined);
        return; // Skip localStorage logic
      }
    }
    
    // Restore last selection or load first universe by default
    const lastSelectionStr = localStorage.getItem('wordrush_lastSelection');
    if (lastSelectionStr && loadedUniverses.length > 0) {
      try {
        const lastSelection = JSON.parse(lastSelectionStr);
        
        // Restore mode
        if (lastSelection.mode === 'lernmodus' || lastSelection.mode === 'shooter') {
          setMode(lastSelection.mode);
        }
        
        // Find and select the universe from last selection
        const universe = loadedUniverses.find(u => u.id === lastSelection.universeId);
        if (universe) {
          await selectUniverse(universe.id, lastSelection.themeId, lastSelection.mode);
        } else {
          // Fallback to first universe if saved universe not found
          await selectUniverse(loadedUniverses[0].id);
        }
      } catch (error) {
        console.warn('⚠️ Failed to restore last selection:', error);
        // Fallback to first universe
        if (loadedUniverses.length > 0) {
          await selectUniverse(loadedUniverses[0].id);
        }
      }
    } else {
      // Load first universe by default if no saved selection
      if (loadedUniverses.length > 0) {
        await selectUniverse(loadedUniverses[0].id);
      }
    }
  };
  
  const selectUniverse = async (universeId: string, focusThemeId?: string, modeOverride?: GameMode) => {
    // If focusThemeId is provided, mark it for focusing IMMEDIATELY
    if (focusThemeId) {
      pendingFocusThemeIdRef.current = focusThemeId;
    }
    
    // Load universe directly if not in state yet
    let universe: Universe | null = universes.find(u => u.id === universeId) ?? null;
    if (!universe) {
      const loadedUniverse = await jsonLoader.loadUniverse(universeId);
      if (!loadedUniverse) {
        console.error(`Failed to load universe: ${universeId}`);
        return;
      }
      universe = loadedUniverse;
    }
    
    setSelectedUniverse(universe);
    
    // Determine mode to save (use override if provided, otherwise current state)
    const currentMode = modeOverride || mode;
    
    // Save selection when universe is selected (even without theme/chapter)
    const selection = {
      universeId: universe.id,
      themeId: focusThemeId || '',
      chapterId: '',
      mode: currentMode
    };
    localStorage.setItem('wordrush_lastSelection', JSON.stringify(selection));
    
    // Don't restore camera position if we want to focus on a specific theme
    // Otherwise restore camera position if saved, or reset
    if (camera && renderer && !focusThemeId) {
      const savedCamera = localProgressProvider.getGalaxyCameraState(universeId);
      const canvas = renderer.getContext().canvas;
      
      if (savedCamera) {
        // Restore saved position immediately (without animation)
        camera.setPositionImmediate(savedCamera.x, savedCamera.y, savedCamera.zoom);
      } else {
        // Reset camera to show all planets
        camera.resetZoom(canvas.width, canvas.height);
      }
    }
    
    // 🚀 PERFORMANCE: Batch load ALL themes for this universe (avoids N+1 queries!)
    console.log(`📦 [GalaxyMap] Loading themes for universe ${universe.name}...`);
    console.time('⏱️ Theme loading time');
    
    const loadedThemes = await jsonLoader.loadAllThemesForUniverse(universeId);
    
    console.timeEnd('⏱️ Theme loading time');
    console.log(`✅ [GalaxyMap] Loaded ${loadedThemes.length} themes (items NOT loaded yet - lazy loading!)`);
    
    setThemes(loadedThemes);
    setAllItems([]); // No items loaded initially!
    
    // Don't calculate theme progress yet (no items loaded!)
    setThemeProgress(new Map());
    
    // Recalculate layouts WITHOUT items (initial)
    if (renderer && camera) {
      calculateLayouts(loadedThemes, []);
    }
    
    // 🚀 BACKGROUND: Load level stats for better moon positioning (non-blocking!)
    loadLevelStatsInBackground(universeId, loadedThemes);
  };
  
  /**
   * 🚀 ULTRA-PERFORMANCE: Load only level stats (not full items!) in background
   * This allows us to calculate proper moon distances without loading all item data
   */
  const loadLevelStatsInBackground = async (universeId: string, loadedThemes: Theme[]) => {
    try {
      console.log(`📊 [GalaxyMap] Loading level stats in background...`);
      console.time('⏱️ Level stats loading');
      
      const levelStats = await jsonLoader.loadChapterLevelStats(universeId);
      
      console.timeEnd('⏱️ Level stats loading');
      
      if (levelStats.size === 0) {
        console.log(`📊 [GalaxyMap] No level stats available (JSON mode or no data)`);
        return;
      }
      
      console.log(`✅ [GalaxyMap] Got level stats for ${levelStats.size} chapters`);
      
      // Create minimal "fake items" just for layout calculation
      // These contain only id, theme, chapter, and level - enough for moon positioning!
      const layoutItems: Item[] = [];
      
      for (const theme of loadedThemes) {
        for (const chapterId of Object.keys(theme.chapters)) {
          const stats = levelStats.get(chapterId);
          if (!stats) continue;
          
          // Create one fake item per level (for ring calculation)
          for (let level = 1; level <= stats.maxLevel; level++) {
            layoutItems.push({
              id: `_layout_${theme.id}_${chapterId}_${level}`,
              theme: theme.id,
              chapter: chapterId,
              level: level,
              published: true,
              freeTier: false,
              base: { word: '', type: 'term', visual: { color: '#000', variant: 'hexagon' } },
              correct: [],
              distractors: [],
              meta: { source: 'layout', tags: [], related: [], difficultyScaling: { speedMultiplierPerReplay: 1, colorContrastFade: false } }
            });
          }
        }
      }
      
      console.log(`📊 [GalaxyMap] Created ${layoutItems.length} layout items from level stats`);
      
      // Update layouts with proper moon distances (without triggering full item load)
      if (renderer && camera && loadedThemes.length > 0) {
        // Store layout items separately (don't mix with real items!)
        setAllItems(prev => {
          // If we already have real items, don't overwrite with layout items
          if (prev.some(item => !item.id.startsWith('_layout_'))) {
            return prev;
          }
          return layoutItems;
        });
      }
    } catch (error) {
      console.warn(`⚠️ [GalaxyMap] Failed to load level stats in background:`, error);
      // Non-critical - layout will work without proper moon distances
    }
  };
  
  /**
   * 🚀 Lazy load items for a specific theme when planet is clicked/focused
   */
  const loadThemeItems = async (universeId: string, themeId: string) => {
    if (!selectedUniverse) return;
    
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;
    
    console.log(`🌍 [GalaxyMap] Lazy loading items for theme: ${themeId}...`);
    console.time(`⏱️ Load items for ${themeId}`);
    
    const themeItems: Item[] = [];
    
    // Load items for each chapter in this theme
    for (const chapterId of Object.keys(theme.chapters)) {
      try {
        const items = await jsonLoader.loadChapter(universeId, themeId, chapterId);
        themeItems.push(...items);
      } catch (error) {
        console.warn(`⚠️ Failed to load chapter ${universeId}/${themeId}/${chapterId}:`, error);
      }
    }
    
    console.timeEnd(`⏱️ Load items for ${themeId}`);
    console.log(`✅ [GalaxyMap] Loaded ${themeItems.length} items for theme ${themeId}`);
    
    // Merge with existing items:
    // 1. Remove layout items for this theme (they were just for positioning)
    // 2. Remove any old real items for this theme
    // 3. Add new real items
    const updatedItems = allItems
      .filter(item => item.theme !== themeId) // Remove old items for this theme
      .filter(item => !item.id.startsWith('_layout_') || item.theme !== themeId) // Remove layout items for this theme
      .concat(themeItems);
    setAllItems(updatedItems);
    
    // Recalculate layouts with new items
    if (renderer && camera) {
      calculateLayouts(themes, updatedItems);
    }
    
    // Calculate theme progress
    const themeScore = getThemeScore(themeId, theme, themeItems, learningState);
    setThemeProgress(prev => new Map(prev).set(themeId, themeScore.percentage / 100));
  };
  
  const calculateLayouts = (themesToLayout: Theme[], itemsToLayout: Item[]) => {
    if (!renderer || !camera) return;
    
    const canvas = renderer.getContext().canvas;
    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    
    console.log(`📐 [GalaxyMap] Calculating layouts for ${themesToLayout.length} themes (${itemsToLayout.length} items)`);
    
    // Calculate planet positions on horizontal S-curve
    planetLayoutsRef.current = calculatePlanetPositionsHorizontalMaeander(themesToLayout, screenWidth, screenHeight);
    
    // Calculate moon positions for each planet
    moonLayoutsRef.current.clear();
    itemLayoutsRef.current.clear();
    levelRingsRef.current.clear();
    moonParticleEffectsRef.current.clear();
    
    // Group items by theme and chapter for moon calculation (if items are loaded)
    const itemsByThemeAndChapter = new Map<string, Map<string, Item[]>>();
    if (itemsToLayout.length > 0) {
      for (const item of itemsToLayout) {
        if (!itemsByThemeAndChapter.has(item.theme)) {
          itemsByThemeAndChapter.set(item.theme, new Map());
        }
        const chapterMap = itemsByThemeAndChapter.get(item.theme)!;
        if (!chapterMap.has(item.chapter)) {
          chapterMap.set(item.chapter, []);
        }
        chapterMap.get(item.chapter)!.push(item);
      }
    }
    
    for (const planet of planetLayoutsRef.current) {
      const theme = planet.theme;
      const chapterItemsMap = itemsByThemeAndChapter.get(theme.id) || new Map();
      
      // Calculate adaptive moon positions (uses empty map if no items loaded)
      const moons = calculateMoonPositionsAdaptive(theme.chapters, planet.x, planet.y, chapterItemsMap);
      moonLayoutsRef.current.set(planet.id, moons);
      
      // Only calculate item positions and level rings if items are loaded
      if (itemsToLayout.length > 0) {
        for (const moon of moons) {
          const chapterItems = itemsToLayout.filter(item => 
            item.theme === theme.id && item.chapter === moon.chapterId
          );
          
          const items = calculateItemPositions(chapterItems, moon.x, moon.y);
          itemLayoutsRef.current.set(moon.id, items);
          
          // Calculate level rings for this moon
          const rings = calculateLevelRings(chapterItems, moon.id, moon.chapterId);
          levelRingsRef.current.set(moon.id, rings);
          
          // Check if all items are 100% and create particle effect
          const allItems100 = chapterItems.length > 0 && chapterItems.every(item => {
            const itemState = learningState[item.id];
            if (!itemState) return false;
            // Use ScoreCalculator to get max score
            const maxScore = calculateMaxPossibleScore(item);
            return itemState.totalScore >= maxScore;
          });
          
          if (allItems100 && chapterItems.length > 0) {
            const effect = new MoonParticleEffect(moon.x, moon.y, [theme.colorPrimary, theme.colorAccent]);
            effect.activate();
            moonParticleEffectsRef.current.set(moon.id, effect);
          }
        }
      } else {
        console.log(`⏭️ [GalaxyMap] Skipping item/ring calculation (no items loaded yet)`);
      }
    }
  };
  
  // ============================================================================
  // INITIALIZE CANVAS & CAMERA
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
    
    console.log(`🎨 Canvas initialized: ${canvas.width}x${canvas.height}`);
  }, []);
  
  // ============================================================================
  // WHEEL EVENT HANDLER (registered directly on canvas for preventDefault)
  // ============================================================================
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera) return;
    
    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      
      if (zoomState === 'overview') {
        // Vertical panning in overview mode
        camera.pan(0, e.deltaY > 0 ? WHEEL_PAN_SPEED : -WHEEL_PAN_SPEED);
      } else {
        // Zoom in/out in zoomed mode
        const zoomFactor = e.deltaY > 0 ? WHEEL_ZOOM_OUT_FACTOR : WHEEL_ZOOM_IN_FACTOR;
        const rect = canvas.getBoundingClientRect();
        camera.zoomBy(zoomFactor, e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelNative);
    };
  }, [camera, zoomState]); // Re-register when zoomState changes (fixes the ref issue)
  
  useEffect(() => {
    viewStateRestoredRef.current = false;
  }, [selectedUniverse?.id]);
  
  useEffect(() => {
    initialFocusAppliedRef.current = false;
  }, [initialFocus?.planetId, initialFocus?.universeId]);
  
  const saveCurrentViewState = useCallback(() => {
    if (!selectedUniverse) return;
    const viewState: SavedViewState = {
      universeId: selectedUniverse.id,
      zoomState,
      zoomedPlanetId: zoomState === 'zoomed' ? zoomedPlanetId : null
    };
    saveViewState(viewState);
  }, [selectedUniverse, zoomState, zoomedPlanetId]);
  
  useEffect(() => {
    saveCurrentViewState();
  }, [saveCurrentViewState]);
  
  /**
   * Focus camera to show all planets in overview
   * @param padding - Optional padding around planets (default: OVERVIEW_PADDING)
   * @returns The calculated zoom level, or null if failed
   */
  const focusAllPlanets = useCallback((padding: number = OVERVIEW_PADDING): number | null => {
    if (!renderer || !camera) return null;
    const planets = planetLayoutsRef.current;
    if (planets.length === 0) return null;
    
    const canvas = renderer.getContext().canvas;
    camera.setScreenSize(canvas.width, canvas.height);
    
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    
    for (const planet of planets) {
      minX = Math.min(minX, planet.x - planet.radius);
      maxX = Math.max(maxX, planet.x + planet.radius);
      minY = Math.min(minY, planet.y - planet.radius);
      maxY = Math.max(maxY, planet.y + planet.radius);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const targetWidth = width + padding * 2;
    const targetHeight = height + padding * 2;
    
    const zoomX = canvas.width / targetWidth;
    const zoomY = canvas.height / targetHeight;
    const zoomLevel = Math.max(camera.minZoom, Math.min(zoomX, zoomY, camera.maxZoom));
    
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    
    camera.setPositionImmediate(centerX, centerY, zoomLevel);
    return zoomLevel;
  }, [renderer, camera]);
  
  /**
   * Focus camera on a specific planet and its moons
   * @param planet - Planet to focus on
   * @returns The calculated zoom level, or null if failed
   */
  const focusPlanet = useCallback((planet: PlanetLayout): number | null => {
    if (!renderer || !camera) return null;
    
    const canvas = renderer.getContext().canvas;
    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    
    camera.setScreenSize(screenWidth, screenHeight);
    
    const moons = moonLayoutsRef.current.get(planet.id) || [];
    let maxDistance = planet.radius;
    
    for (const moon of moons) {
      const rings = levelRingsRef.current.get(moon.id) || [];
      let maxRingRadius = 0;
      for (const ring of rings) {
        maxRingRadius = Math.max(maxRingRadius, ring.radius);
      }
      const moonDistance = Math.hypot(moon.x - planet.x, moon.y - planet.y);
      const totalDistance = moonDistance + maxRingRadius;
      maxDistance = Math.max(maxDistance, totalDistance);
    }
    
    const requiredSize = maxDistance * 2 + PLANET_FOCUS_PADDING * 2;
    const zoomX = screenWidth / requiredSize;
    const zoomY = screenHeight / requiredSize;
    const zoomLevel = Math.max(camera.minZoom, Math.min(zoomX, zoomY, camera.maxZoom));
    
    camera.setPositionImmediate(planet.x, planet.y, zoomLevel);
    return zoomLevel;
  }, [renderer, camera]);
  
  // ============================================================================
  // LAYOUT CALCULATION (recalculate when themes/items change)
  // ============================================================================
  
  useEffect(() => {
    if (renderer && camera && themes.length > 0) {
      calculateLayouts(themes, allItems);
      
      // Don't reset camera if we're restoring a saved position or if we're zoomed in
      // Only frame overview when we're already in overview mode AND view state has been restored
      if (zoomState === 'overview' && viewStateRestoredRef.current) {
        focusAllPlanets();
      }
    }
  }, [themes, allItems, renderer, camera, zoomState, focusAllPlanets]);
  
  // ============================================================================
  // VIEW STATE RESTORATION (consolidated to avoid race conditions)
  // Priority: pendingFocus > initialFocus > savedViewState > default
  // ============================================================================
  
  useEffect(() => {
    // Guard: Only run once per universe
    if (viewStateRestoredRef.current) return;
    if (!selectedUniverse || !renderer || !camera) return;
    if (planetLayoutsRef.current.length === 0) return;
    
    // PRIORITY 1: Pending focus from game exit (highest priority)
    if (pendingFocusThemeIdRef.current) {
      const themeId = pendingFocusThemeIdRef.current;
      const targetPlanet = planetLayoutsRef.current.find(p => p.id === themeId);
      
      if (targetPlanet) {
        focusPlanet(targetPlanet);
        setZoomState('zoomed');
        setZoomedPlanetId(themeId);
        
        const viewState: SavedViewState = {
          universeId: selectedUniverse.id,
          zoomState: 'zoomed',
          zoomedPlanetId: themeId
        };
        saveViewState(viewState);
        
        viewStateRestoredRef.current = true;
        pendingFocusThemeIdRef.current = null; // Clear pending focus
        
        console.log(`🎯 View restored: Game exit focus → ${themeId}`);
      }
      return;
    }
    
    // PRIORITY 2: Initial focus from props (e.g., from URL or app state)
    if (initialFocus && initialFocus.universeId === selectedUniverse.id && !initialFocusAppliedRef.current) {
      const targetPlanet = planetLayoutsRef.current.find(p => p.id === initialFocus.planetId);
      
      if (targetPlanet) {
        focusPlanet(targetPlanet);
        setZoomState('zoomed');
        setZoomedPlanetId(targetPlanet.id);
        
        viewStateRestoredRef.current = true;
        initialFocusAppliedRef.current = true;
        onInitialFocusConsumed?.();
        
        console.log(`🎯 View restored: Initial focus → ${initialFocus.planetId}`);
      }
      return;
    }
    
    // PRIORITY 3: Saved view state from localStorage
    const saved = loadViewState();
    
    if (saved && saved.universeId === selectedUniverse.id && saved.zoomState === 'zoomed' && saved.zoomedPlanetId) {
      const targetPlanet = planetLayoutsRef.current.find(p => p.id === saved.zoomedPlanetId);
      
      if (targetPlanet) {
        focusPlanet(targetPlanet);
        setZoomState('zoomed');
        setZoomedPlanetId(saved.zoomedPlanetId);
        
        viewStateRestoredRef.current = true;
        
        console.log(`🎯 View restored: Saved state → ${saved.zoomedPlanetId}`);
        return;
      }
    }
    
    // PRIORITY 4: Default - show all planets in overview
    focusAllPlanets();
    setZoomState('overview');
    setZoomedPlanetId(null);
    viewStateRestoredRef.current = true;
    
    console.log(`🎯 View restored: Default overview (${planetLayoutsRef.current.length} planets)`);
  }, [selectedUniverse, renderer, camera, focusPlanet, focusAllPlanets, initialFocus, onInitialFocusConsumed, themes.length]);
  
  // Handle back button click
  const handleBackClick = () => {
    if (camera && renderer && zoomState === 'zoomed') {
      const canvas = renderer.getContext().canvas;
      camera.resetZoom(canvas.width, canvas.height);
      setZoomState('overview');
      setZoomedPlanetId(null);
      setSelectedElement(null);
    }
  };
  
  /**
   * Render function called every frame by game loop
   * Renders background, planets, moons, level rings, items, and tooltips
   */
  const render = useCallback(() => {
    if (!renderer || !camera) return;
    
    renderer.clear();
    
    // Render background gradient
    if (selectedUniverse) {
      const gradient = selectedUniverse.backgroundGradient;
      renderer.renderGradientBackground(gradient);
    } else {
      // Fallback gradient if no universe selected
      renderer.renderGradientBackground(['#0f1038', '#272963']);
    }
    
    // Create render context for all rendering functions
    const renderContext: RenderContext = {
      renderer,
      camera,
      hoveredElement: hoveredElement ? { 
        type: hoveredElement.type, 
        id: hoveredElement.id,
        level: hoveredElement.level,
        moonId: hoveredElement.moonId
      } : null,
      selectedElement,
      themeProgress,
      allItems,
      learningState,
      universe: selectedUniverse,
      planetLayouts: planetLayoutsRef.current,
      moonLayouts: moonLayoutsRef.current
    };
    
    // Layer 1: Connection lines (only in zoomed view, behind everything)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          renderConnectionLines(planet, moons, renderContext);
        }
      }
    }
    
    // Layer 2: Planets (always visible)
    for (const planet of planetLayoutsRef.current) {
      renderPlanet(planet, renderContext);
    }
    
    // Layer 3: Moons and level rings (only in zoomed view)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            renderMoon(moon, renderContext);
            
            // Render level rings for this moon
            const rings = levelRingsRef.current.get(moon.id) || [];
            const chapterItems = allItems.filter(item => 
              item.theme === planet.id && item.chapter === moon.chapterId
            );
            for (const ring of rings) {
              renderLevelRing(ring, moon, chapterItems, renderContext);
            }
            
            // Update and render moon particle effect (if moon is 100% complete)
            const effect = moonParticleEffectsRef.current.get(moon.id);
            if (effect) {
              const screenPos = camera.worldToScreen({ x: moon.x, y: moon.y });
              effect.setPosition(screenPos.x, screenPos.y);
              effect.update(PARTICLE_DELTA_TIME);
              effect.render(renderer);
            }
          }
        }
      }
    }
    
    // Layer 4: Items (only when deeply zoomed in)
    if (zoomState === 'zoomed' && camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const items = itemLayoutsRef.current.get(moon.id) || [];
            for (const itemLayout of items) {
              const item = allItems.find(i => i.id === itemLayout.itemId);
              if (item) {
                renderItemParticle(itemLayout, item, renderContext);
              }
            }
          }
        }
      }
    }
    
    // Layer 5: Tooltip (top layer, always visible if hovering)
    if (tooltipText && hoveredElement) {
      renderTooltip(tooltipText, { x: hoveredElement.x, y: hoveredElement.y }, renderContext);
    }
  }, [renderer, camera, hoveredElement, selectedElement, themeProgress, allItems, learningState, tooltipText, selectedUniverse, zoomState, zoomedPlanetId]);
  
  // ============================================================================
  // GAME LOOP - UPDATE & RENDER
  // ============================================================================
  
  /**
   * Update function called every frame by game loop
   * Updates camera, saves camera position periodically, and updates particle effects
   */
  const update = useCallback((deltaTime: number) => {
    if (!camera || !selectedUniverse) return;
    
    camera.update(deltaTime);
    
    // Save camera position periodically (throttled to reduce localStorage writes)
    const now = performance.now();
    if (now - lastCameraSaveTime.current > CAMERA_SAVE_THROTTLE_MS) {
      saveCameraStateHelper(selectedUniverse.id, camera);
      lastCameraSaveTime.current = now;
    }
    
    // Update moon particle effects
    for (const effect of moonParticleEffectsRef.current.values()) {
      effect.update(deltaTime);
    }
  }, [camera, selectedUniverse]);
  
  // Start game loop
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
  
  // Mouse input handlers
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
    if (!camera) return;
    
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
    
    if (!camera || !selectedUniverse) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
    
    handleElementClick(worldPos.x, worldPos.y);
  };
  
  // ============================================================================
  // TOUCH HANDLERS (improved for smoother gestures)
  // ============================================================================
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!camera) return;
    
    if (e.touches.length === 1) {
      // Single touch - start dragging
      isDragging.current = true;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
    } else if (e.touches.length === 2) {
      // Two-finger pinch zoom - stop dragging, record initial distance
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
      // Single touch drag (pan)
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const deltaX = screenX - dragStart.current.x;
        const deltaY = screenY - dragStart.current.y;
        camera.pan(-deltaX, -deltaY);
        dragStart.current = { x: screenX, y: screenY };
      }
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Two-finger pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      
      // Calculate scale with threshold to avoid jitter
      const rawScale = distance / lastTouchDistance.current;
      const scaleDiff = Math.abs(rawScale - 1.0);
      
      if (scaleDiff > TOUCH_ZOOM_THRESHOLD) {
        // Smooth the scale change for better feel
        const smoothScale = 1.0 + (rawScale - 1.0) * 0.5;
        
        // Zoom towards the midpoint between fingers
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const midX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const midY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
          camera.zoomBy(smoothScale, midX, midY);
        } else {
          camera.zoomBy(smoothScale);
        }
        
        lastTouchDistance.current = distance;
      }
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      // All touches released - check if it was a tap (no drag)
      const wasTap = isDragging.current && dragStart.current !== null;
      
      if (wasTap) {
        const touch = e.changedTouches[0];
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect && camera) {
          const screenX = touch.clientX - rect.left;
          const screenY = touch.clientY - rect.top;
          const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
          handleElementClick(worldPos.x, worldPos.y);
        }
      }
      
      // Reset all touch state
      isDragging.current = false;
      dragStart.current = null;
      lastTouchDistance.current = null;
    } else if (e.touches.length === 1) {
      // One finger remains - switch back to drag mode
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        isDragging.current = true;
        dragStart.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      lastTouchDistance.current = null;
    }
  };
  
  /**
   * Check what element is hovered at given world coordinates
   * Updates hoveredElement and tooltipText state
   */
  const checkHover = useCallback((worldX: number, worldY: number, screenX: number, screenY: number) => {
    if (!camera) return;
    
    // Check level rings (only in zoomed view, highest priority)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        const moons = moonLayoutsRef.current.get(planet.id) || [];
        for (const moon of moons) {
          const rings = levelRingsRef.current.get(moon.id) || [];
          for (const ring of rings) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            const distanceFromRing = Math.abs(distance - ring.radius);
            
            if (distanceFromRing < LEVEL_RING_HITBOX_WIDTH) {
              const chapterItems = allItems.filter(item => 
                item.theme === planet.id && item.chapter === moon.chapterId
              );
              const levelScore = getLevelScore(moon.chapterId, ring.level, chapterItems, learningState);
              const tooltipText = generateTooltipText('levelRing', `Level ${ring.level}`, levelScore);
              
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
      }
    }
    
    // Check items (only in deeply zoomed view, second priority)
    if (zoomState === 'zoomed' && camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const planet of planetLayoutsRef.current) {
        const moons = moonLayoutsRef.current.get(planet.id) || [];
        for (const moon of moons) {
          const items = itemLayoutsRef.current.get(moon.id) || [];
          for (const itemLayout of items) {
            const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
            
            if (distance < ITEM_HITBOX_RADIUS) {
              const item = allItems.find(i => i.id === itemLayout.itemId);
              if (item) {
                const scoreData = getItemScore(item.id, item, learningState);
                const baseWord = item.base?.word || item.id;
                const tooltipText = generateTooltipText('item', baseWord, scoreData);
                
                setHoveredElement({ type: 'item', id: item.id, x: screenX, y: screenY });
                setTooltipText(tooltipText);
                return;
              }
            }
          }
        }
      }
    }
    
    // Check moons (only in zoomed view, third priority)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            
            if (distance < moon.radius * MOON_HITBOX_MULTIPLIER) {
              const chapterItems = allItems.filter(item => 
                item.theme === planet.id && item.chapter === moon.chapterId
              );
              const chapterScore = getChapterScore(moon.chapterId, chapterItems, learningState);
              // Use chapter title if available, fallback to chapterId
              const chapterTitle = moon.chapter?.title || moon.chapterId;
              const tooltipText = generateTooltipText('moon', chapterTitle, chapterScore);
              
              setHoveredElement({ type: 'moon', id: moon.id, x: screenX, y: screenY });
              setTooltipText(tooltipText);
              return;
            }
          }
        }
      }
    }
    
    // Check planets (lowest priority, always visible)
    for (const planet of planetLayoutsRef.current) {
      const distance = Math.hypot(worldX - planet.x, worldY - planet.y);
      
      if (distance < planet.radius * PLANET_HITBOX_MULTIPLIER) {
        const themeScore = getThemeScore(planet.id, planet.theme, allItems, learningState);
        const tooltipText = generateTooltipText('planet', planet.theme.name, themeScore);
        
        setHoveredElement({ type: 'planet', id: planet.id, x: screenX, y: screenY });
        setTooltipText(tooltipText);
        return;
      }
    }
    
    // No hover
    setHoveredElement(null);
    setTooltipText('');
  }, [camera, zoomState, zoomedPlanetId, allItems, learningState]);
  
  /**
   * Handle element click at given world coordinates
   * Hierarchical checking: level rings → items → moons → planets
   */
  const handleElementClick = useCallback((worldX: number, worldY: number) => {
    if (!selectedUniverse || !camera) return;
    
    // Check level rings first (highest priority for clicks)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const rings = levelRingsRef.current.get(moon.id) || [];
            for (const ring of rings) {
              const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
              const distanceFromRing = Math.abs(distance - ring.radius);
              
              if (distanceFromRing < LEVEL_RING_HITBOX_WIDTH) {
                const theme = themes.find(t => t.id === planet.id);
                if (theme) {
                  saveCameraStateHelper(selectedUniverse.id, camera);
                  onStart(selectedUniverse, theme, moon.chapterId, mode, undefined, ring.level);
                }
                return;
              }
            }
          }
        }
      }
    }
    
    // Check items (only in deeply zoomed view)
    if (zoomState === 'zoomed' && camera.zoom > ITEM_VISIBILITY_ZOOM_THRESHOLD) {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const items = itemLayoutsRef.current.get(moon.id) || [];
            for (const itemLayout of items) {
              const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
              
              if (distance < ITEM_HITBOX_RADIUS) {
                const item = allItems.find(i => i.id === itemLayout.itemId);
                if (item) {
                  const theme = themes.find(t => t.id === item.theme);
                  if (theme) {
                    saveCameraStateHelper(selectedUniverse.id, camera);
                    onStart(selectedUniverse, theme, item.chapter, mode, item.id);
                  }
                  return;
                }
              }
            }
          }
        }
      }
    }
    
    // Check moons
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            
            if (distance < moon.radius * MOON_HITBOX_MULTIPLIER) {
              const theme = themes.find(t => t.id === planet.id);
              if (theme) {
                setSelectedElement({ type: 'moon', id: moon.id });
                
                // If already zoomed enough to see items, start game immediately
                if (camera.zoom >= MOON_DIRECT_START_ZOOM_THRESHOLD) {
                  saveCameraStateHelper(selectedUniverse.id, camera);
                  onStart(selectedUniverse, theme, moon.chapterId, mode);
                } else {
                  // Zoom deeper to show items
                  camera.zoomToElement(moon.x, moon.y, 2.0);
                }
              }
              return;
            }
          }
        }
      }
    }
    
    // Check planets
    for (const planet of planetLayoutsRef.current) {
      const distance = Math.hypot(worldX - planet.x, worldY - planet.y);
      
      if (distance < planet.radius * PLANET_HITBOX_MULTIPLIER) {
        const theme = themes.find(t => t.id === planet.id);
        if (theme) {
          setSelectedElement({ type: 'planet', id: planet.id });
          
          const shouldFocus = zoomState === 'overview' || zoomedPlanetId !== planet.id;
          if (shouldFocus) {
            // Zoom to planet
            const zoomLevel = focusPlanet(planet);
            if (zoomLevel !== null) {
              setZoomState('zoomed');
              setZoomedPlanetId(planet.id);
              
              // 🚀 LAZY LOAD: Load items for this theme when planet is clicked
              loadThemeItems(selectedUniverse.id, planet.id);
              
              // Save selection when planet is focused
              const selection = {
                universeId: selectedUniverse.id,
                themeId: planet.id,
                chapterId: '',
                mode: mode
              };
              localStorage.setItem('wordrush_lastSelection', JSON.stringify(selection));
            }
          } else {
            // Already zoomed on this planet - start CHAOTIC MODE (all chapters mixed)
            const chapters = Object.keys(theme.chapters);
            if (chapters.length > 0) {
              saveCameraStateHelper(selectedUniverse.id, camera);
              // Pass ALL chapter IDs and enable loadAllItems flag for chaotic mode
              onStart(selectedUniverse, theme, chapters, mode, undefined, undefined, true);
            }
          }
        }
        return;
      }
    }
  }, [selectedUniverse, camera, zoomState, zoomedPlanetId, themes, allItems, mode, onStart, focusPlanet]);
  
  // ============================================================================
  // KEYBOARD SHORTCUTS
  // ============================================================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!camera) return;
      
      const panSpeed = KEYBOARD_PAN_SPEED / camera.zoom;
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          camera.pan(0, panSpeed);
          break;
        case 's':
        case 'arrowdown':
          camera.pan(0, -panSpeed);
          break;
        case 'a':
        case 'arrowleft':
          camera.pan(panSpeed, 0);
          break;
        case 'd':
        case 'arrowright':
          camera.pan(-panSpeed, 0);
          break;
        case ' ':
          e.preventDefault();
          // Toggle zoom in/out
          camera.zoomBy(camera.zoom > 1.5 ? SPACEBAR_ZOOM_OUT_FACTOR : SPACEBAR_ZOOM_IN_FACTOR);
          break;
        case '+':
        case '=':
          camera.zoomBy(WHEEL_ZOOM_IN_FACTOR);
          break;
        case '-':
        case '_':
          camera.zoomBy(WHEEL_ZOOM_OUT_FACTOR);
          break;
        case 'escape':
          if (zoomState === 'zoomed') {
            // Return to overview
            const canvas = renderer?.getContext().canvas;
            if (canvas) {
              camera.resetZoom(canvas.width, canvas.height);
              setZoomState('overview');
              setZoomedPlanetId(null);
              setSelectedElement(null);
            }
          } else {
            camera.resetZoom(window.innerWidth, window.innerHeight);
            setSelectedElement(null);
          }
          break;
        case 'enter':
          // Activate selected element (if any)
          if (selectedElement) {
            // Find the element's world coordinates
            if (selectedElement.type === 'planet') {
              const planet = planetLayoutsRef.current.find(p => p.id === selectedElement.id);
              if (planet) {
                handleElementClick(planet.x, planet.y);
              }
            } else if (selectedElement.type === 'moon') {
              for (const moons of moonLayoutsRef.current.values()) {
                const moon = moons.find(m => m.id === selectedElement.id);
                if (moon) {
                  handleElementClick(moon.x, moon.y);
                  break;
                }
              }
            } else if (selectedElement.type === 'item') {
              for (const items of itemLayoutsRef.current.values()) {
                const itemLayout = items.find(i => i.itemId === selectedElement.id);
                if (itemLayout) {
                  handleElementClick(itemLayout.x, itemLayout.y);
                  break;
                }
              }
            }
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, selectedElement, zoomState, renderer, handleElementClick]);
  
  return (
    <div className="galaxy-map-container">
      <button className="settings-icon-button" onClick={() => setSettingsOpen(true)} title="Settings">
        ⚙️
      </button>
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <div className="galaxy-map-controls">
        <select
          value={selectedUniverse?.id || ''}
          onChange={(e) => {
            // Clear ALL states and storage BEFORE selecting universe
            localStorage.removeItem('wordrush_galaxy_view');
            pendingFocusThemeIdRef.current = null;
            viewStateRestoredRef.current = false;
            // Reset zoom state to overview
            setZoomState('overview');
            setZoomedPlanetId(null);
            selectUniverse(e.target.value);
            
            // Save new universe selection for PDF export
            const newSelection = {
              universeId: e.target.value,
              themeId: '',
              chapterId: '',
              mode: mode
            };
            localStorage.setItem('wordrush_lastSelection', JSON.stringify(newSelection));
            console.log('💾 Updated universe selection for PDF export:', newSelection);
          }}
          className="universe-select compact"
        >
          {universes.map(u => (
            <option key={u.id} value={u.id}>
              {u.icon} {u.name}
            </option>
          ))}
        </select>
        
        {/* Toggle Button for Mode */}
        <button
          className={`mode-toggle-button ${mode === 'lernmodus' ? 'learn-mode' : 'shooter-mode'}`}
          onClick={() => {
            const newMode = mode === 'lernmodus' ? 'shooter' : 'lernmodus';
            setMode(newMode);
            // Save mode change
            const lastSelectionStr = localStorage.getItem('wordrush_lastSelection');
            try {
              if (lastSelectionStr) {
                const lastSelection = JSON.parse(lastSelectionStr);
                lastSelection.mode = newMode;
                localStorage.setItem('wordrush_lastSelection', JSON.stringify(lastSelection));
              } else if (selectedUniverse) {
                // Create new selection if none exists
                const newSelection = {
                  universeId: selectedUniverse.id,
                  themeId: '',
                  chapterId: '',
                  mode: newMode
                };
                localStorage.setItem('wordrush_lastSelection', JSON.stringify(newSelection));
              }
            } catch (error) {
              console.warn('Failed to save mode change:', error);
            }
          }}
        >
          <span className="mode-icon">{mode === 'lernmodus' ? '🎓' : '🎯'}</span>
          <span className="mode-text">{mode === 'lernmodus' ? 'Lern' : 'Shooter'}</span>
        </button>
        
        {zoomState === 'zoomed' && (
          <>
            <button
              onClick={handleBackClick}
              className="back-button"
              title="Zurück zur Übersicht"
            >
              ⬅️
            </button>
          </>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        className="galaxy-map-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
};
