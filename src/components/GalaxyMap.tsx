// Galaxy Map Component
// Interactive 2D galaxy map with planets (themes) and moons (chapters)

import React, { useRef, useEffect, useState, useCallback } from 'react';
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

interface GalaxyMapProps {
  onStart: (
    universe: Universe,
    theme: Theme,
    chapterId: string,
    mode: GameMode,
    itemId?: string,
    levelFilter?: number
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

export const GalaxyMap: React.FC<GalaxyMapProps> = ({ onStart, initialFocus, onInitialFocusConsumed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [camera, setCamera] = useState<GalaxyCamera | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  // Data
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [learningState, setLearningState] = useState<LearningState>({});
  const [themeProgress, setThemeProgress] = useState<Map<string, number>>(new Map());
  
  // Layouts
const VIEW_STATE_KEY = 'wordrush_galaxy_view';

type SavedViewState = {
  universeId: string;
  zoomState: 'overview' | 'zoomed';
  zoomedPlanetId?: string | null;
};

function loadViewState(): SavedViewState | null {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedViewState;
  } catch (error) {
    console.warn('Failed to load galaxy view state:', error);
    return null;
  }
}

function saveViewState(state: SavedViewState): void {
  try {
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save galaxy view state:', error);
  }
}

const planetLayoutsRef = useRef<PlanetLayout[]>([]);
  const moonLayoutsRef = useRef<Map<string, MoonLayout[]>>(new Map());
  const itemLayoutsRef = useRef<Map<string, ItemLayout[]>>(new Map());
  const levelRingsRef = useRef<Map<string, LevelRingLayout[]>>(new Map());
  const moonParticleEffectsRef = useRef<Map<string, MoonParticleEffect>>(new Map());
  
  // Interaction
  const [hoveredElement, setHoveredElement] = useState<HoveredElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: 'planet' | 'moon' | 'item'; id: string } | null>(null);
  const [tooltipText, setTooltipText] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<GameMode>('lernmodus');
  const [zoomState, setZoomState] = useState<'overview' | 'zoomed'>('overview');
  const zoomStateRef = useRef<'overview' | 'zoomed'>(zoomState);
  const [zoomedPlanetId, setZoomedPlanetId] = useState<string | null>(null);
  const viewStateRestoredRef = useRef(false);
  const initialFocusAppliedRef = useRef(false);
  const pendingFocusThemeIdRef = useRef<string | null>(null);
  
  // Input state
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
      console.log('🎮 URL Param: Set mode to', initialMode);
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
       console.log('⚙️ URL Param: Applied gameplay preset', initialPreset);
    }

    // If URL has universe, try to load it
    if (initialUniverseId) {
      const universe = loadedUniverses.find(u => u.id === initialUniverseId);
      if (universe) {
        console.log('🔗 URL Param: Selecting universe', universe.id, initialThemeId ? `theme: ${initialThemeId}` : '');
        await selectUniverse(universe.id, initialThemeId || undefined, initialMode || undefined);
        return; // Skip localStorage logic
      }
    }
    
    // Restore last selection or load first universe by default
    const lastSelectionStr = localStorage.getItem('wordrush_lastSelection');
    if (lastSelectionStr && loadedUniverses.length > 0) {
      try {
        const lastSelection = JSON.parse(lastSelectionStr);
        console.log('📌 Restoring last selection in GalaxyMap:', lastSelection);
        
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
        console.warn('Failed to restore last selection:', error);
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
    
    // Load themes for this universe
    const loadedThemes: Theme[] = [];
    const loadedItems: Item[] = [];
    
    console.log(`🌌 Loading universe: ${universe.name} with ${universe.themes.length} themes`);
    
    for (const themeId of universe.themes) {
      try {
        const theme = await jsonLoader.loadTheme(universeId, themeId);
        if (theme) {
          loadedThemes.push(theme);
          
          // Load items for each chapter
          for (const chapterId of Object.keys(theme.chapters)) {
            try {
              const items = await jsonLoader.loadChapter(universeId, themeId, chapterId);
              loadedItems.push(...items);
             // console.log(`    📄 Loaded chapter: ${chapterId} with ${items.length} items`);
            } catch (error) {
              console.warn(`Failed to load chapter ${chapterId}:`, error);
            }
          }
          
        }
      } catch (error) {
        console.warn(`Failed to load theme ${themeId}:`, error);
      }
      
    }
    
    console.log(`✅ Loaded ${loadedThemes.length} themes and ${loadedItems.length} items total`);
    
    setThemes(loadedThemes);
    setAllItems(loadedItems);
    
    // Calculate theme progress
    const progressMap = new Map<string, number>();
    for (const theme of loadedThemes) {
      const themeScore = getThemeScore(theme.id, theme, loadedItems, learningState);
      progressMap.set(theme.id, themeScore.percentage / 100);
    }
    setThemeProgress(progressMap);
    
    // Recalculate layouts
    if (renderer && camera) {
      calculateLayouts(loadedThemes, loadedItems);
    }
  };
  
  const calculateLayouts = (themesToLayout: Theme[], itemsToLayout: Item[]) => {
    if (!renderer || !camera) return;
    
    const canvas = renderer.getContext().canvas;
    const screenWidth = canvas.width;
    const screenHeight = canvas.height;
    
    // Calculate planet positions on horizontal S-curve
    planetLayoutsRef.current = calculatePlanetPositionsHorizontalMaeander(themesToLayout, screenWidth, screenHeight);
    
    // Calculate moon positions for each planet
    moonLayoutsRef.current.clear();
    itemLayoutsRef.current.clear();
    levelRingsRef.current.clear();
    moonParticleEffectsRef.current.clear();
    
    // Group items by theme and chapter for moon calculation
    const itemsByThemeAndChapter = new Map<string, Map<string, Item[]>>();
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
    
    for (const planet of planetLayoutsRef.current) {
      const theme = planet.theme;
      const chapterItemsMap = itemsByThemeAndChapter.get(theme.id) || new Map();
      
      // Calculate adaptive moon positions
      const moons = calculateMoonPositionsAdaptive(theme.chapters, planet.x, planet.y, chapterItemsMap);
      moonLayoutsRef.current.set(planet.id, moons);
      
      // Calculate item positions and level rings for each moon
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
    }
  };
  
  // Initialize canvas and camera
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const rend = new Renderer(canvas);
    setRenderer(rend);
    
    const cam = new GalaxyCamera(canvas.width, canvas.height);
    setCamera(cam);
    
    // Register wheel event directly on canvas with passive: false to allow preventDefault
    const handleWheelNative = (e: WheelEvent) => {
      if (!cam) return;
      
      // Determine current zoom state via ref to avoid re-registering listener
      const currentZoomState = zoomStateRef.current;
      
      if (currentZoomState === 'overview') {
        // Vertical scrolling in overview
        e.preventDefault();
        const panSpeed = 30;
        cam.pan(0, e.deltaY > 0 ? panSpeed : -panSpeed);
      } else {
        // Normal zoom in zoomed mode
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const rect = canvas.getBoundingClientRect();
        cam.zoomBy(delta, e.clientX - rect.left, e.clientY - rect.top);
      }
    };
    
    canvas.addEventListener('wheel', handleWheelNative, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelNative);
    };
  }, []);
  
  // Keep zoomState ref updated
  useEffect(() => {
    zoomStateRef.current = zoomState;
  }, [zoomState]);
  
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
  
  const focusAllPlanets = useCallback((padding: number = 60): number | null => {
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
    
    const padding = 40;
    const requiredSize = maxDistance * 2 + padding * 2;
    const zoomX = screenWidth / requiredSize;
    const zoomY = screenHeight / requiredSize;
    const zoomLevel = Math.max(camera.minZoom, Math.min(zoomX, zoomY, camera.maxZoom));
    
    camera.setPositionImmediate(planet.x, planet.y, zoomLevel);
    return zoomLevel;
  }, [renderer, camera]);
  
  // Recalculate layouts when themes/items change
  useEffect(() => {
    if (renderer && camera && themes.length > 0) {
      calculateLayouts(themes, allItems);
      
      // Don't reset camera if we're restoring a saved position or if we're zoomed in
      // Only frame overview when we're already in overview mode
      if (zoomStateRef.current === 'overview' && viewStateRestoredRef.current) {
        focusAllPlanets();
      }
    }
  }, [themes, allItems, renderer, camera, focusAllPlanets]);
  
  useEffect(() => {
    if (viewStateRestoredRef.current) return;
    if (!selectedUniverse || !renderer || !camera) return;
    if (planetLayoutsRef.current.length === 0) return;
    
    // If we have a pending focus from game exit, let that handle the zoom
    if (pendingFocusThemeIdRef.current) return;
    
    const saved = loadViewState();
    
    if (initialFocus && initialFocus.universeId === selectedUniverse.id) {
      // Initial focus will handle zooming; skip saved view state this time
      viewStateRestoredRef.current = true;
      return;
    }
    if (!saved || saved.universeId !== selectedUniverse.id) {
      focusAllPlanets();
      viewStateRestoredRef.current = true;
      return;
    }
    
    if (saved.zoomState === 'zoomed' && saved.zoomedPlanetId) {
      const targetPlanet = planetLayoutsRef.current.find(p => p.id === saved.zoomedPlanetId);
      if (targetPlanet) {
        focusPlanet(targetPlanet);
        if (zoomState !== 'zoomed') {
          setZoomState('zoomed');
        }
        if (zoomedPlanetId !== saved.zoomedPlanetId) {
          setZoomedPlanetId(saved.zoomedPlanetId);
        }
        viewStateRestoredRef.current = true;
        return;
      }
      viewStateRestoredRef.current = true;
      return;
    }
    
    // Saved state indicates overview or no zoomed planet – show full S curve
    focusAllPlanets();
    if (zoomState !== 'overview') {
      setZoomState('overview');
    }
    if (zoomedPlanetId !== null) {
      setZoomedPlanetId(null);
    }
    viewStateRestoredRef.current = true;
  }, [selectedUniverse, renderer, camera, zoomState, zoomedPlanetId, focusPlanet, focusAllPlanets, themes.length, initialFocus]);
  
  useEffect(() => {
    if (!initialFocus || initialFocusAppliedRef.current) return;
    if (!selectedUniverse || selectedUniverse.id !== initialFocus.universeId) return;
    if (!renderer || !camera) return;
    if (planetLayoutsRef.current.length === 0) return;
    
    const targetPlanet = planetLayoutsRef.current.find(p => p.id === initialFocus.planetId);
    if (!targetPlanet) return;
    
    focusPlanet(targetPlanet);
    if (zoomState !== 'zoomed') {
      setZoomState('zoomed');
    }
    if (zoomedPlanetId !== targetPlanet.id) {
      setZoomedPlanetId(targetPlanet.id);
    }
    
    initialFocusAppliedRef.current = true;
    onInitialFocusConsumed?.();
  }, [initialFocus, selectedUniverse, renderer, camera, focusPlanet, zoomState, zoomedPlanetId, onInitialFocusConsumed]);
  
  // Handle pending focus from game exit
  useEffect(() => {
    if (!pendingFocusThemeIdRef.current) return;
    if (!selectedUniverse || !renderer || !camera) return;
    if (planetLayoutsRef.current.length === 0) return;
    
    const themeId = pendingFocusThemeIdRef.current;
    const targetPlanet = planetLayoutsRef.current.find(p => p.id === themeId);
    
    if (targetPlanet) {
      focusPlanet(targetPlanet);
      setZoomState('zoomed');
      setZoomedPlanetId(themeId);
      
      // Save view state
      const viewState: SavedViewState = {
        universeId: selectedUniverse.id,
        zoomState: 'zoomed',
        zoomedPlanetId: themeId
      };
      saveViewState(viewState);
      
      // Mark view state as restored so the other useEffect doesn't override
      viewStateRestoredRef.current = true;
    }
    
    // Clear pending focus
    pendingFocusThemeIdRef.current = null;
  }, [selectedUniverse, renderer, camera, focusPlanet, themes.length]);
  
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
  
  // Render function
  const render = useCallback(() => {
    if (!renderer || !camera) return;
    
    renderer.clear();
    
    // Debug: Log camera position when zoomed (only once per render cycle)
    // Removed to prevent infinite loop - camera position should be set correctly before render
    
    // Render background gradient
    if (selectedUniverse) {
      const gradient = selectedUniverse.backgroundGradient;
      renderer.renderGradientBackground(gradient);
    } else {
      renderer.renderGradientBackground(['#0f1038', '#272963']);
    }
    
    // Create render context
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
    
    // Render connection lines (only if zoomed in)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          renderConnectionLines(planet, moons, renderContext);
        }
      }
    }
    
    // Render planets
    for (const planet of planetLayoutsRef.current) {
      renderPlanet(planet, renderContext);
    }
    
    // Render moons (only if zoomed in)
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
            
            // Update and render moon particle effect
            const effect = moonParticleEffectsRef.current.get(moon.id);
            if (effect) {
              const screenPos = camera.worldToScreen({ x: moon.x, y: moon.y });
              effect.setPosition(screenPos.x, screenPos.y);
              effect.update(0.016); // Assume 60fps
              effect.render(renderer);
            }
          }
        }
      }
    }
    
    // Render items (only if zoomed in more)
    if (zoomState === 'zoomed' && camera.zoom > 1.8) {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const items = itemLayoutsRef.current.get(moon.id) || [];
            if (moon.chapterId === 'mixed' && planet.id === 'punk') {
              console.log(`🎨 Rendering items for moon ${moon.id} (chapter: ${moon.chapterId}): ${items.length} items, zoom: ${camera.zoom.toFixed(2)}`);
            }
            for (const itemLayout of items) {
              const item = allItems.find(i => i.id === itemLayout.itemId);
              if (item) {
                renderItemParticle(itemLayout, item, renderContext);
              } else if (moon.chapterId === 'mixed' && planet.id === 'punk') {
                console.warn(`⚠️ Item not found in allItems: ${itemLayout.itemId}`);
              }
            }
          }
        }
      }
    }
    
    // Render tooltip
    if (tooltipText && hoveredElement) {
      renderTooltip(tooltipText, { x: hoveredElement.x, y: hoveredElement.y }, renderContext);
    }
  }, [renderer, camera, hoveredElement, selectedElement, themeProgress, allItems, learningState, tooltipText, selectedUniverse, zoomState, zoomedPlanetId]);
  
  // Update function
  const update = useCallback((deltaTime: number) => {
    if (!camera || !selectedUniverse) return;
    
    camera.update(deltaTime);
    
    // Save camera position periodically (throttled - every ~500ms)
    const now = performance.now();
    if (now - lastCameraSaveTime.current > 500) {
      localProgressProvider.saveGalaxyCameraState(
        selectedUniverse.id,
        camera.x,
        camera.y,
        camera.zoom
      );
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
  
  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!camera) return;
    
    if (e.touches.length === 1) {
      isDragging.current = true;
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        dragStart.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
    } else if (e.touches.length === 2) {
      // Pinch zoom
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
        camera.pan(-deltaX, -deltaY);
        dragStart.current = { x: screenX, y: screenY };
      }
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / lastTouchDistance.current;
      camera.zoomBy(scale);
      lastTouchDistance.current = distance;
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      isDragging.current = false;
      dragStart.current = null;
      lastTouchDistance.current = null;
    } else if (e.touches.length === 1) {
      // Single touch - check for click
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && camera) {
        const screenX = touch.clientX - rect.left;
        const screenY = touch.clientY - rect.top;
        const worldPos = camera.screenToWorld({ x: screenX, y: screenY });
        handleElementClick(worldPos.x, worldPos.y);
      }
    }
  };
  
  // Check what element is hovered
  const checkHover = (worldX: number, worldY: number, screenX: number, screenY: number) => {
    if (!camera) return;
    
    // Check level rings (only in zoomed view)
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        const moons = moonLayoutsRef.current.get(planet.id) || [];
        for (const moon of moons) {
          const rings = levelRingsRef.current.get(moon.id) || [];
          for (const ring of rings) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            // Check if mouse is within ring hitbox (ringRadius ± 5px) - increased for better interaction
            const ringRadius = ring.radius;
            const distanceFromRing = Math.abs(distance - ringRadius);
            if (distanceFromRing < 5) {
              const chapterItems = allItems.filter(item => 
                item.theme === planet.id && item.chapter === moon.chapterId
              );
              const levelScore = getLevelScore(moon.chapterId, ring.level, chapterItems, learningState);
              setHoveredElement({ 
                type: 'levelRing', 
                id: `${moon.id}_level_${ring.level}`,
                level: ring.level,
                moonId: moon.id,
                x: screenX, 
                y: screenY 
              });
              setTooltipText(`Level ${ring.level}\nScore: ${levelScore.totalScore}/${levelScore.maxScore} (${levelScore.percentage.toFixed(1)}%)`);
              return;
            }
          }
        }
      }
    }
    
    // Check items first (smallest, top layer) - only in zoomed view
    if (zoomState === 'zoomed' && camera.zoom > 1.8) {
      for (const planet of planetLayoutsRef.current) {
        const moons = moonLayoutsRef.current.get(planet.id) || [];
        for (const moon of moons) {
          const items = itemLayoutsRef.current.get(moon.id) || [];
          for (const itemLayout of items) {
            const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
            if (distance < 10) {
              const item = allItems.find(i => i.id === itemLayout.itemId);
              if (item) {
                const scoreData = getItemScore(item.id, item, learningState);
                const baseWord = item.base?.word || item.id;
                setHoveredElement({ type: 'item', id: item.id, x: screenX, y: screenY });
                setTooltipText(`${baseWord}\nScore: ${scoreData.totalScore}/${scoreData.maxScore} (${scoreData.percentage.toFixed(1)}%)`);
                return;
              }
            }
          }
        }
      }
    }
    
    // Check moons - only in zoomed view
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            if (distance < moon.radius * 2) {
              const chapterItems = allItems.filter(item => 
                item.theme === planet.id && item.chapter === moon.chapterId
              );
              const chapterScore = getChapterScore(moon.chapterId, chapterItems, learningState);
              setHoveredElement({ type: 'moon', id: moon.id, x: screenX, y: screenY });
              setTooltipText(`${moon.chapterId}\nScore: ${chapterScore.totalScore}/${chapterScore.maxScore} (${chapterScore.percentage.toFixed(1)}%)`);
              return;
            }
          }
        }
      }
    }
    
    // Check planets
    for (const planet of planetLayoutsRef.current) {
      const distance = Math.hypot(worldX - planet.x, worldY - planet.y);
      if (distance < planet.radius * 2) {
        // If in overview, show tooltip only (no hover interaction for items)
        if (zoomState === 'overview') {
          const themeScore = getThemeScore(planet.id, planet.theme, allItems, learningState);
          setHoveredElement({ type: 'planet', id: planet.id, x: screenX, y: screenY });
          setTooltipText(`${planet.theme.name}\nScore: ${themeScore.totalScore}/${themeScore.maxScore} (${themeScore.percentage.toFixed(1)}%)`);
          return;
        }
        
        // If already zoomed, show tooltip
        const themeScore = getThemeScore(planet.id, planet.theme, allItems, learningState);
        setHoveredElement({ type: 'planet', id: planet.id, x: screenX, y: screenY });
        setTooltipText(`${planet.theme.name}\nScore: ${themeScore.totalScore}/${themeScore.maxScore} (${themeScore.percentage.toFixed(1)}%)`);
        return;
      }
    }
    
    // No hover
    setHoveredElement(null);
    setTooltipText('');
  };
  
  // Handle element click
  const handleElementClick = (worldX: number, worldY: number) => {
    if (!selectedUniverse || !camera) return;
    
    // Check level rings first (before items) - only in zoomed view
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const rings = levelRingsRef.current.get(moon.id) || [];
            for (const ring of rings) {
              const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
              // Check if click is within ring hitbox (ringRadius ± 5px) - increased for better interaction
              const ringRadius = ring.radius;
              const distanceFromRing = Math.abs(distance - ringRadius);
              if (distanceFromRing < 5) {
                const theme = themes.find(t => t.id === planet.id);
                if (theme) {
                  // Save camera position before starting game
                  localProgressProvider.saveGalaxyCameraState(
                    selectedUniverse.id,
                    camera.x,
                    camera.y,
                    camera.zoom
                  );
                  // Start game with level filter
                  onStart(selectedUniverse, theme, moon.chapterId, mode, undefined, ring.level);
                }
                return;
              }
            }
          }
        }
      }
    }
    
    // Check items - only in zoomed view
    if (zoomState === 'zoomed' && camera.zoom > 1.8) {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const items = itemLayoutsRef.current.get(moon.id) || [];
            for (const itemLayout of items) {
              const distance = Math.hypot(worldX - itemLayout.x, worldY - itemLayout.y);
              if (distance < 10) {
                const item = allItems.find(i => i.id === itemLayout.itemId);
                if (item) {
                  // Start game with specific item
                  const theme = themes.find(t => t.id === item.theme);
                  if (theme && camera) {
                    // Save camera position before starting game
                    localProgressProvider.saveGalaxyCameraState(
                      selectedUniverse.id,
                      camera.x,
                      camera.y,
                      camera.zoom
                    );
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
    
    // Check moons - only in zoomed view
    if (zoomState === 'zoomed') {
      for (const planet of planetLayoutsRef.current) {
        if (planet.id === zoomedPlanetId) {
          const moons = moonLayoutsRef.current.get(planet.id) || [];
          for (const moon of moons) {
            const distance = Math.hypot(worldX - moon.x, worldY - moon.y);
            if (distance < moon.radius * 2) {
              const theme = themes.find(t => t.id === planet.id);
              if (theme) {
                setSelectedElement({ type: 'moon', id: moon.id });
                
                // If items are already visible (zoomed in), start game
                if (camera.zoom >= 1.8) {
                  // Start game immediately
                  // Save camera position before starting game
                  localProgressProvider.saveGalaxyCameraState(
                    selectedUniverse.id,
                    camera.x,
                    camera.y,
                    camera.zoom
                  );
                  onStart(selectedUniverse, theme, moon.chapterId, mode);
                } else {
                  // Zoom to moon to show items
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
      if (distance < planet.radius * 2) {
        const theme = themes.find(t => t.id === planet.id);
        if (theme) {
          setSelectedElement({ type: 'planet', id: planet.id });
          
          const shouldFocus = zoomState === 'overview' || zoomedPlanetId !== planet.id;
          if (shouldFocus) {
            const zoomLevel = focusPlanet(planet);
            if (zoomLevel !== null) {
              setZoomState('zoomed');
              setZoomedPlanetId(planet.id);
              
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
            // Already zoomed on this planet - start a random chapter game
            const chapters = Object.keys(theme.chapters);
            if (chapters.length > 0) {
              const randomChapter = chapters[Math.floor(Math.random() * chapters.length)];
              localProgressProvider.saveGalaxyCameraState(
                selectedUniverse.id,
                camera.x,
                camera.y,
                camera.zoom
              );
              onStart(selectedUniverse, theme, randomChapter, mode);
            }
          }
        }
        return;
      }
    }
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!camera) return;
      
      const panSpeed = 50 / camera.zoom;
      
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
          camera.zoomBy(camera.zoom > 1.5 ? 0.8 : 1.25);
          break;
        case '+':
        case '=':
          camera.zoomBy(1.1);
          break;
        case '-':
        case '_':
          camera.zoomBy(0.9);
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
          if (selectedElement) {
            handleElementClick(0, 0); // Will use selected element
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, selectedElement, zoomState, renderer]);
  
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
