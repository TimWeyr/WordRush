/**
 * Galaxy Universe View Component
 * 
 * Renders a rotational horizontal scroll view of planets orbiting a sun:
 * - Sun fixed at bottom-left (25% visible)
 * - Planets on circular orbit
 * - Horizontal scroll rotates the orbit
 * - Inertia and snapping to nearest planet
 * - Focused planet highlighted with glow
 * - Click planet to enter Planet View
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameLoop } from '@/core/GameLoop';
import { Renderer } from '@/core/Renderer';
import { calculatePlanetPositionsOnOrbit, findFocusedPlanet, calculateRotationAngleForPlanet, type PlanetLayout } from '@/logic/GalaxyLayout';
import { renderUniverseBackground, renderSun, renderPlanetOrbit, renderUniversePlanet, renderPlanetNameLabel, type RenderContext } from './GalaxyRenderer';
import { jsonLoader } from '@/infra/utils/JSONLoader';
import { Settings } from './Settings';
import { GameStartScreen } from './GameStartScreen';
import type { Universe, Theme, Item } from '@/types/content.types';
import type { GameMode } from '@/types/game.types';
import './GalaxyUniverseView.css';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Orbit radius factor (relative to screen diagonal) */
const ORBIT_RADIUS_FACTOR = 0.55; // 55% of screen diagonal

// ============================================================================
// TEMPORARY DIAGNOSTIC MODE: Touch inputs treated exactly like mouse inputs
// This is a diagnostic step to isolate whether instability comes from
// touch-specific logic or from snap/layout logic.
// ============================================================================

// INERTIA DISABLED: These constants are not used anymore
// const INERTIA_DECAY = 0.92;
// const MIN_INERTIA_VELOCITY = 0.003;

/** Snapping animation duration (ms) */
const SNAP_DURATION = 400;

/** Drag sensitivity (radians per pixel) - used for both mouse AND touch */
const DRAG_SENSITIVITY = 0.002;

/** Wheel sensitivity (radians per delta) - reduced for better control */
const WHEEL_SENSITIVITY = 0.001;

/** Planet hitbox radius multiplier */
const PLANET_HITBOX_MULTIPLIER = 1.5;

/** Sun hitbox radius (25% visible, full size 400px → radius 200px) */
const SUN_HITBOX_RADIUS = 200;

// ============================================================================
// TYPES
// ============================================================================

interface GalaxyUniverseViewProps {
  onPlanetSelect: (universe: Universe, theme: Theme) => void;
  onUniverseStart?: (universe: Universe, themes: Theme[], mode: GameMode) => void;
  initialFocusedPlanetId?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GalaxyUniverseView: React.FC<GalaxyUniverseViewProps> = ({ 
  onPlanetSelect,
  onUniverseStart,
  initialFocusedPlanetId 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  // ============================================================================
  // CORE STATE
  // ============================================================================
  
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [universes, setUniverses] = useState<Array<{ id: string; name: string; icon: string; available: boolean }>>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sunImage, setSunImage] = useState<HTMLImageElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // ============================================================================
  // UNIVERSE CHAOTIC MODE CONFIRMATION
  // ============================================================================
  
  const [showUniverseConfirmation, setShowUniverseConfirmation] = useState(false);
  const [universeStats, setUniverseStats] = useState<{ themes: number; chapters: number; items: number; freeTierItems: number } | null>(null);
  const [hoveredSun, setHoveredSun] = useState(false);
  const [settingsClosedTrigger, setSettingsClosedTrigger] = useState(0);
  
  // ============================================================================
  // ROTATION STATE
  // ============================================================================
  
  // IMPORTANT: rotationAngleRef and focusedPlanetIdRef are imperative game state, NOT React state.
  // This prevents async state commits and micro-oscillations during continuous rotation.
  // The GameLoop (update/render) is the sole source of truth for rotation and focus.
  // DO NOT convert back to React state - this separation is intentional.
  // React state updates inside GameLoop paths cause feedback loops and jitter.
  const rotationAngleRef = useRef(0);
  const focusedPlanetIdRef = useRef<string | null>(null);
  const velocityRef = useRef(0); // Angular velocity for inertia
  const isSnappingRef = useRef(false);
  const snapStartTimeRef = useRef(0);
  const snapStartAngleRef = useRef(0);
  const snapTargetAngleRef = useRef(0);
  const snapPlanetIdRef = useRef<string | null>(null); // Frozen snap target planet ID
  
  // ============================================================================
  // INPUT STATE
  // ============================================================================
  
  // TEMPORARY: All touch-specific refs removed for diagnostic mode
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartAngleRef = useRef(0);
  const lastDragXRef = useRef(0);
  const lastDragYRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const wheelActiveRef = useRef(false);
  
  // Layout cache
  const planetLayoutsRef = useRef<PlanetLayout[]>([]);
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    loadData();
  }, []);
  
  // React to initialFocusedPlanetId changes (e.g., when returning from PlanetView)
  useEffect(() => {
    if (initialFocusedPlanetId && themes.length > 0 && selectedUniverse) {
      // Get screen dimensions for accurate centering
      const canvas = renderer?.getContext().canvas;
      if (!canvas) return;
      
      const screenWidth = canvas.width;
      const screenHeight = canvas.height;
      
      // Check if we have a saved focused planet from localStorage
      try {
        const savedFocus = localStorage.getItem('wordrush_focusedPlanet');
        if (savedFocus) {
          const { universeId, planetId, angle } = JSON.parse(savedFocus);
          
          // If it matches current context, use saved angle
          if (universeId === selectedUniverse.id && planetId === initialFocusedPlanetId) {
            // Stop any ongoing snap animation
            isSnappingRef.current = false;
            snapPlanetIdRef.current = null;
            velocityRef.current = 0;
            
            // Set rotation immediately to saved angle
            rotationAngleRef.current = angle;
            focusedPlanetIdRef.current = planetId;
            console.log(`🎯 [Back Navigation] Restored focus on planet: ${planetId} (angle: ${angle.toFixed(4)} from localStorage)`);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to restore focused planet from localStorage:', error);
      }
      
      // Fallback: calculate angle from themes with screen dimensions
      const planetExists = themes.some(t => t.id === initialFocusedPlanetId);
      if (planetExists) {
        const targetAngle = calculateRotationAngleForPlanet(themes, initialFocusedPlanetId, screenWidth, screenHeight);
        
        // Stop any ongoing snap animation
        isSnappingRef.current = false;
        snapPlanetIdRef.current = null;
        velocityRef.current = 0;
        
        // Set rotation immediately
        rotationAngleRef.current = targetAngle;
        focusedPlanetIdRef.current = initialFocusedPlanetId;
        console.log(`🎯 [Back Navigation] Focused on planet: ${initialFocusedPlanetId} (angle: ${targetAngle.toFixed(4)}, calculated for screen ${screenWidth}x${screenHeight})`);
      } else {
        console.warn(`⚠️ Planet ${initialFocusedPlanetId} not found in current themes`);
      }
    }
  }, [initialFocusedPlanetId, themes, selectedUniverse]);
  
  const loadData = async () => {
    // 🚀 OPTIMIZED: Load only universe metadata (no theme data!)
    console.log('📋 Loading universe list...');
    const loadedUniverses = await jsonLoader.loadUniversesList();
    setUniverses(loadedUniverses);
    
    // Restore last selection or use first universe
    const lastSelectionStr = localStorage.getItem('wordrush_lastSelection');
    let initialUniverseId: string | null = null;
    
    if (lastSelectionStr) {
      try {
        const lastSelection = JSON.parse(lastSelectionStr);
        initialUniverseId = lastSelection.universeId;
      } catch (error) {
        console.warn('Failed to restore last selection:', error);
      }
    }
    
    // Select universe (this will load themes + chapters)
    if (initialUniverseId && loadedUniverses.find(u => u.id === initialUniverseId)) {
      await selectUniverse(initialUniverseId);
    } else if (loadedUniverses.length > 0) {
      await selectUniverse(loadedUniverses[0].id);
    }
  };
  
  const selectUniverse = async (universeId: string) => {
    // 🚀 OPTIMIZED: Load full universe object (needed for rendering colors)
    console.log(`📦 Loading universe ${universeId}...`);
    const fullUniverse = await jsonLoader.loadUniverse(universeId);
    if (!fullUniverse) {
      console.error(`Universe not found: ${universeId}`);
      return;
    }
    
    setSelectedUniverse(fullUniverse);
    
    // 🚀 ULTRA-OPTIMIZED: Load themes + chapters in 2 queries (instead of 1 + N)
    console.log(`📦 Loading themes + chapters for universe ${fullUniverse.name}...`);
    console.time('⏱️ Load themes + chapters');
    const loadedThemes = await jsonLoader.loadAllThemesForUniverse(universeId);
    console.timeEnd('⏱️ Load themes + chapters');
    setThemes(loadedThemes);
    
    // Load sun image
    loadSunImage(universeId);
    
    // Rotate to focus planet (or first planet if no focus specified)
    if (renderer && loadedThemes.length > 0) {
      const canvas = renderer.getContext().canvas;
      const planetToFocus = initialFocusedPlanetId || loadedThemes[0].id;
      const targetAngle = calculateRotationAngleForPlanet(loadedThemes, planetToFocus, canvas.width, canvas.height);
      rotationAngleRef.current = targetAngle;
      focusedPlanetIdRef.current = planetToFocus;
      
      if (initialFocusedPlanetId) {
        console.log(`🎯 [Initial Load] Focused on planet: ${planetToFocus} (angle: ${targetAngle.toFixed(4)} for screen ${canvas.width}x${canvas.height})`);
      } else {
        console.log(`🎯 [Initial Load] Centered first planet: ${planetToFocus} (angle: ${targetAngle.toFixed(4)} for screen ${canvas.width}x${canvas.height})`);
      }
      
      // Save focused planet to localStorage so it persists across re-mounts
      localStorage.setItem('wordrush_focusedPlanet', JSON.stringify({
        universeId: fullUniverse.id,
        planetId: planetToFocus,
        angle: targetAngle
      }));
    }
    
    // Save selection
    const selection = {
      universeId: fullUniverse.id,
      themeId: '',
      chapterId: '',
      mode: 'lernmodus'
    };
    localStorage.setItem('wordrush_lastSelection', JSON.stringify(selection));
    
    // 🚀 BACKGROUND PRELOAD: Cache all theme items for instant Planet View
    // This runs async without blocking UI
    preloadThemeItems(universeId, loadedThemes);
  };
  
  /**
   * Preload all items for all themes in background
   * This caches the data so Planet View is instant
   */
  const preloadThemeItems = async (universeId: string, themes: Theme[]) => {
    console.log(`🔄 [Preload] Starting background preload for ${themes.length} themes...`);
    console.time('⏱️ Background preload');
    
    const preloadPromises = themes.map(async (theme) => {
      try {
        const items: Item[] = [];
        for (const chapterId of Object.keys(theme.chapters)) {
          const chapterItems = await jsonLoader.loadChapter(universeId, theme.id, chapterId);
          items.push(...chapterItems);
        }
        console.log(`✅ [Preload] Cached ${items.length} items for theme ${theme.id}`);
        return { themeId: theme.id, items };
      } catch (error) {
        console.warn(`⚠️ [Preload] Failed to cache theme ${theme.id}:`, error);
        return { themeId: theme.id, items: [] };
      }
    });
    
    // Wait for all preloads (but don't block UI)
    await Promise.all(preloadPromises);
    console.timeEnd('⏱️ Background preload');
    console.log(`🎉 [Preload] All themes cached! Planet View will be instant.`);
  };
  
  const loadSunImage = (universeId: string) => {
    const img = new Image();
    
    // Try universe-specific sun first
    img.src = `/assets/sun/${universeId}_sun.svg`;
    
    img.onload = () => {
      setSunImage(img);
    };
    
    img.onerror = () => {
      // Fallback to default sun
      const fallbackImg = new Image();
      fallbackImg.src = '/assets/sun/default_sun.svg';
      fallbackImg.onload = () => setSunImage(fallbackImg);
      fallbackImg.onerror = () => {
        console.warn('Failed to load sun image (fallback)');
        setSunImage(null);
      };
    };
  };
  
  // ============================================================================
  // SUN CLICK HANDLER (Universe Chaotic Mode)
  // ============================================================================
  
  const handleSunClick = async () => {
    if (!selectedUniverse || themes.length === 0) return;
    
    // Calculate stats: count all chapters and items
    console.log('🌟 Sun clicked! Calculating universe stats...');
    
    let totalChapters = 0;
    let totalItems = 0;
    let totalFreeTierItems = 0;
    
    for (const theme of themes) {
      const chapterIds = Object.keys(theme.chapters);
      totalChapters += chapterIds.length;
      
      // Load items for each chapter to count them
      for (const chapterId of chapterIds) {
        try {
          const items = await jsonLoader.loadChapter(selectedUniverse.id, theme.id, chapterId);
          totalItems += items.length;
          totalFreeTierItems += items.filter(item => item.freeTier).length;
        } catch (error) {
          console.warn(`Failed to load chapter ${chapterId}:`, error);
        }
      }
    }
    
    console.log(`📊 Universe stats: ${themes.length} themes, ${totalChapters} chapters, ${totalItems} items (${totalFreeTierItems} freeTier)`);
    
    // Show confirmation dialog
    setUniverseStats({
      themes: themes.length,
      chapters: totalChapters,
      items: totalItems,
      freeTierItems: totalFreeTierItems
    });
    setShowUniverseConfirmation(true);
  };
  
  const handleUniverseConfirm = async (gameMode: 'lernmodus' | 'shooter') => {
    if (!selectedUniverse || !onUniverseStart) {
      console.warn('⚠️ Cannot start universe mode: missing universe or callback');
      return;
    }
    
    // Use the gameMode passed from GameStartScreen (already up-to-date)
    const mode: GameMode = gameMode;
    
    console.log('🚀 Starting Universe Chaotic Mode with mode:', mode);
    setShowUniverseConfirmation(false);
    
    // Call the callback with all themes
    onUniverseStart(selectedUniverse, themes, mode);
  };
  
  const handleUniverseCancel = () => {
    setShowUniverseConfirmation(false);
    setUniverseStats(null);
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
    
    console.log(`🎨 Universe View Canvas initialized: ${canvas.width}x${canvas.height}`);
  }, []);
  
  // ============================================================================
  // LAYOUT CALCULATION
  // ============================================================================
  
  const calculateLayouts = useCallback(() => {
    if (!renderer || themes.length === 0) return;
    
    const canvas = renderer.getContext().canvas;
    
    // Sun/orbit center at bottom-left corner (EXACT corner)
    const centerX = 0;
    const centerY = canvas.height;
    
    // Calculate dynamic orbit radius based on screen size
    // Use diagonal to ensure orbit fits on all screen sizes
    const screenDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    const orbitRadius = screenDiagonal * ORBIT_RADIUS_FACTOR;
    
    planetLayoutsRef.current = calculatePlanetPositionsOnOrbit(
      themes,
      rotationAngleRef.current,
      centerX,
      centerY,
      orbitRadius
    );
    
    // Update focused planet (find closest planet to screen center)
    // IMPORTANT: Direct ref assignment, NO React setState in GameLoop path
    // During snap, use frozen snap target planet ID to prevent focus switching
    if (isSnappingRef.current && snapPlanetIdRef.current) {
      focusedPlanetIdRef.current = snapPlanetIdRef.current;
    } else {
      const screenCenterX = canvas.width / 2;
      const screenCenterY = canvas.height / 2;
      const focused = findFocusedPlanet(planetLayoutsRef.current, screenCenterX, screenCenterY);
      focusedPlanetIdRef.current = focused;
    }
    
    // TEMPORARY DIAGNOSTIC MODE: Auto-snap disabled
    // "Ensure at least one planet is visible" block commented out.
    // Snap only happens via explicit input ends (MouseUp/TouchEnd/Wheel).
    // This helps isolate whether instability comes from auto-snap logic.
    /*
    // Ensure at least one planet is visible on screen
    // Check if focused planet is within screen bounds
    if (focused) {
      const focusedPlanet = planetLayoutsRef.current.find(p => p.id === focused);
      if (focusedPlanet) {
        const isVisible = 
          focusedPlanet.x >= -100 && 
          focusedPlanet.x <= canvas.width + 100 &&
          focusedPlanet.y >= -100 && 
          focusedPlanet.y <= canvas.height + 100;
        
        // If focused planet is not visible, trigger snap to nearest visible planet
        // TEMPORARY: Touch-specific grace period removed for diagnostic mode
        if (!isVisible && !isSnappingRef.current && !isDraggingRef.current) {
          // Find nearest planet that IS visible
          let nearestVisiblePlanet: PlanetLayout | null = null;
          let smallestDistance = Infinity;
          
          for (const planet of planetLayoutsRef.current) {
            const isInBounds = 
              planet.x >= -100 && 
              planet.x <= canvas.width + 100 &&
              planet.y >= -100 && 
              planet.y <= canvas.height + 100;
            
            if (isInBounds) {
              const distance = Math.hypot(planet.x - screenCenterX, planet.y - screenCenterY);
              if (distance < smallestDistance) {
                smallestDistance = distance;
                nearestVisiblePlanet = planet;
              }
            }
          }
          
          // If we found a visible planet, snap to it
          if (nearestVisiblePlanet) {
            const planetIndex = themes.findIndex(t => t.id === nearestVisiblePlanet!.id);
            if (planetIndex !== -1) {
              const angleStep = (Math.PI * 2) / themes.length;
              const targetAngle = planetIndex * angleStep;
              
              // Snap immediately if no planet visible
              isSnappingRef.current = true;
              snapStartTimeRef.current = performance.now();
              snapStartAngleRef.current = rotationAngleRef.current;
              snapTargetAngleRef.current = targetAngle;
              velocityRef.current = 0;
            }
          }
        }
      }
    }
    */
  }, [renderer, themes]);
  
  // NOTE: calculateLayouts is now called ONLY inside the GameLoop render() function.
  // This ensures no React state updates happen in GameLoop paths, preventing feedback loops.
  // The duplicate useEffect that called calculateLayouts() has been removed.
  
  // ============================================================================
  // RENDERING
  // ============================================================================
  
  const render = useCallback(() => {
    if (!renderer || !selectedUniverse) return;
    
    // IMPORTANT: Calculate layouts on every frame to read current rotationAngleRef.current
    // This ensures layouts are always in sync with the game state.
    calculateLayouts();
    
    renderer.clear();
    
    const ctx = renderer.getContext();
    const canvas = ctx.canvas;
    
    // Create render context
    const renderContext: RenderContext = {
      renderer,
      camera: null as any, // Not used in universe view
      hoveredElement: null,
      selectedElement: null,
      themeProgress: new Map(),
      allItems: [],
      learningState: {},
      universe: selectedUniverse,
      planetLayouts: planetLayoutsRef.current,
      moonLayouts: new Map()
    };
    
    // Layer 1: Background gradient
    renderUniverseBackground(selectedUniverse, renderContext);
    
    // Layer 2: Sun (fixed at bottom-left, no rotation needed as orbit center is at sun)
    renderSun(sunImage, renderContext);
    
    // Layer 3: Planet orbit (centered at bottom-left)
    // Calculate orbit radius (same as in calculateLayouts)
    const screenDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
    const orbitRadius = screenDiagonal * ORBIT_RADIUS_FACTOR;
    renderPlanetOrbit(orbitRadius, 0, canvas.height, renderContext);
    
    // Layer 4: Planets
    // IMPORTANT: Use focusedPlanetIdRef.current (not React state) to avoid feedback loops
    for (const planet of planetLayoutsRef.current) {
      const isFocused = planet.id === focusedPlanetIdRef.current;
      renderUniversePlanet(planet, isFocused, renderContext);
    }
    
    // Layer 5: Planet name label (if focused)
    if (focusedPlanetIdRef.current) {
      const focusedPlanet = planetLayoutsRef.current.find(p => p.id === focusedPlanetIdRef.current);
      if (focusedPlanet) {
        renderPlanetNameLabel(focusedPlanet.theme.name, selectedUniverse, renderContext);
      }
    }
  }, [renderer, selectedUniverse, sunImage]);
  
  // ============================================================================
  // UPDATE LOOP (Inertia & Snapping)
  // ============================================================================
  
  const update = useCallback((_deltaTime: number) => {
    if (isSnappingRef.current) {
      // Snapping animation
      const elapsed = performance.now() - snapStartTimeRef.current;
      const progress = Math.min(1, elapsed / SNAP_DURATION);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const angleDelta = snapTargetAngleRef.current - snapStartAngleRef.current;
      const newAngle = snapStartAngleRef.current + angleDelta * eased;
      
      // Direct mutation of game state (no React state update)
      rotationAngleRef.current = newAngle;
      
      if (progress >= 1) {
        // [SNAP end] - Log when snap finishes
        console.log('[SNAP end]', {
          finalAngle: rotationAngleRef.current.toFixed(4),
          planetId: snapPlanetIdRef.current
        });
        
        isSnappingRef.current = false;
        velocityRef.current = 0;
        snapPlanetIdRef.current = null; // Clear frozen snap target
      }
    }
    // INERTIA DISABLED: No after-scroll effects, immediate snap only
    // else if (!isDraggingRef.current && Math.abs(velocityRef.current) > MIN_INERTIA_VELOCITY) {
    //   setRotationAngle(prev => prev + velocityRef.current * deltaTime * 60);
    //   velocityRef.current *= INERTIA_DECAY;
    // }
  }, []);
  
  // ============================================================================
  // GAME LOOP
  // ============================================================================
  
  useEffect(() => {
    if (!renderer) return;
    
    const loop = new GameLoop(update, render);
    gameLoopRef.current = loop;
    loop.start();
    
    return () => {
      loop.stop();
      if (gameLoopRef.current === loop) {
        gameLoopRef.current = null;
      }
    };
  }, [renderer, update, render]);
  
  // ============================================================================
  // SNAPPING LOGIC
  // ============================================================================
  
  const snapToNearestPlanet = useCallback(() => {
    // Prevent starting a new snap while one is already running (prevents oscillation)
    if (isSnappingRef.current) return;
    
    // [SNAP start] - Log before angle-based snap calculation
    console.log('[SNAP start]', {
      rotation: rotationAngleRef.current,
      isSnapping: isSnappingRef.current
    });
    
    if (themes.length === 0) return;
    
    // PURE ANGLE-BASED SNAP: No distance, visibility, or screen position used
    const angleStep = (Math.PI * 2) / themes.length;
    const current = rotationAngleRef.current;
    
    // Snap threshold: 35% of angle step (prevents snap-back on small movements)
    const SNAP_THRESHOLD = angleStep * 1;
    
    // Find nearest planet index by angle (works for any rotation value, positive or negative)
    const nearestIndex = Math.round(current / angleStep);
    const nearestAngle = nearestIndex * angleStep;
    
    // Skip snap if movement is too small (prevents immediate snap-back)
    if (Math.abs(current - nearestAngle) < SNAP_THRESHOLD) {
      console.log('[SNAP skipped: below threshold]', {
        current: current.toFixed(4),
        nearestAngle: nearestAngle.toFixed(4),
        diff: Math.abs(current - nearestAngle).toFixed(4),
        threshold: SNAP_THRESHOLD.toFixed(4)
      });
      return;
    }
    
    const baseAngle = nearestAngle;
    
    // Snap to nearest equivalent angle (prevents visible jumps across full rotations)
    const k = Math.round((current - baseAngle) / (Math.PI * 2));
    const targetAngle = baseAngle + k * (Math.PI * 2);
    
    // Get planet ID from index (handle negative indices with modulo)
    const safeIndex = ((nearestIndex % themes.length) + themes.length) % themes.length;
    snapPlanetIdRef.current = themes[safeIndex].id;
    
    // [SNAP target] - Log angle-based snap target
    console.log('[SNAP target]', {
      planetId: snapPlanetIdRef.current,
      baseAngle: baseAngle.toFixed(4),
      targetAngle: targetAngle.toFixed(4),
      current: rotationAngleRef.current.toFixed(4),
      nearestIndex: nearestIndex,
      safeIndex: safeIndex
    });
    
    // Start snapping animation
    isSnappingRef.current = true;
    snapStartTimeRef.current = performance.now();
    snapStartAngleRef.current = rotationAngleRef.current;
    snapTargetAngleRef.current = targetAngle;
    velocityRef.current = 0;
  }, [themes, renderer]);
  
  // ============================================================================
  // MOUSE INPUT
  // ============================================================================
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // TEMPORARY: Touch/mouse distinction removed - all inputs treated equally
    isDraggingRef.current = true;
    isSnappingRef.current = false;
    snapPlanetIdRef.current = null; // Clear frozen snap target when drag starts
    velocityRef.current = 0;
    
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = rotationAngleRef.current;
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = performance.now();
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check for sun hover (even when not dragging)
    if (!isDraggingRef.current && renderer) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const canvas = renderer.getContext().canvas;
        
        // Sun position: bottom-left corner at (0, canvas.height)
        const sunCenterX = 0;
        const sunCenterY = canvas.height;
        const distanceToSun = Math.hypot(mouseX - sunCenterX, mouseY - sunCenterY);
        
        setHoveredSun(distanceToSun < SUN_HITBOX_RADIUS);
      }
    }
    
    if (!isDraggingRef.current) return;
    
    const deltaX = e.clientX - dragStartXRef.current;
    const newAngle = dragStartAngleRef.current + deltaX * DRAG_SENSITIVITY;
    // Direct mutation of game state (no React state update)
    rotationAngleRef.current = newAngle;
    
    // Calculate velocity for inertia
    const now = performance.now();
    const timeDelta = now - lastDragTimeRef.current;
    if (timeDelta > 0) {
      const xDelta = e.clientX - lastDragXRef.current;
      velocityRef.current = (xDelta * DRAG_SENSITIVITY) / (timeDelta / 16.67); // Normalize to 60fps
    }
    
    lastDragXRef.current = e.clientX;
    lastDragTimeRef.current = now;
  };
  
  const handleMouseUp = () => {
    // TEMPORARY: Touch/mouse distinction removed
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      velocityRef.current = 0; // Clear velocity (inertia disabled)
      
      // INERTIA DISABLED: Always snap immediately, no after-scroll
      snapToNearestPlanet();
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredSun(false); // Clear sun hover on mouse leave
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // TEMPORARY: Touch/mouse distinction removed
    if (!renderer || !selectedUniverse) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const canvas = renderer.getContext().canvas;
    
    // Check if clicked on sun (bottom-left corner at 0, canvas.height)
    const sunCenterX = 0;
    const sunCenterY = canvas.height;
    const distanceToSun = Math.hypot(clickX - sunCenterX, clickY - sunCenterY);
    
    if (distanceToSun < SUN_HITBOX_RADIUS) {
      // Sun clicked! Show confirmation dialog
      handleSunClick();
      return;
    }
    
    // Check if clicked on a planet
    for (const planet of planetLayoutsRef.current) {
      const distance = Math.hypot(clickX - planet.x, clickY - planet.y);
      
      if (distance < planet.radius * PLANET_HITBOX_MULTIPLIER) {
        // Planet clicked! selectedUniverse is already the full Universe object
        onPlanetSelect(selectedUniverse, planet.theme);
        return;
      }
    }
  };
  
  // ============================================================================
  // WHEEL INPUT
  // ============================================================================
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let wheelTimeout: NodeJS.Timeout | null = null;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Track wheel gesture as continuous
      lastWheelTimeRef.current = performance.now();
      wheelActiveRef.current = true;
      
      // If user is still scrolling during snap, cancel snap and take control
      if (isSnappingRef.current) {
        isSnappingRef.current = false;
        snapPlanetIdRef.current = null;
      }
      
      // TEMPORARY: Touch/mouse distinction removed
      const delta = e.deltaY * WHEEL_SENSITIVITY;
      // Direct mutation of game state (no React state update)
      rotationAngleRef.current -= delta;
      velocityRef.current = 0; // INERTIA DISABLED: No velocity accumulation
      
      // Clear previous timeout
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
      
      // Snap only once after >=200ms of wheel silence (prevents repeated snap cycles)
      wheelTimeout = setTimeout(() => {
        const quietMs = performance.now() - lastWheelTimeRef.current;
        if (quietMs >= 200 && !isDraggingRef.current) {
          wheelActiveRef.current = false;
          snapToNearestPlanet();
        }
      }, 220);
    };
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (wheelTimeout) {
        clearTimeout(wheelTimeout);
      }
    };
  }, [snapToNearestPlanet]);
  
  // ============================================================================
  // TOUCH INPUT - TEMPORARY DIAGNOSTIC MODE
  // ============================================================================
  // Touch inputs are now treated EXACTLY like mouse inputs for diagnostic purposes.
  // This helps isolate whether instability comes from touch-specific logic
  // or from the underlying snap/layout system.
  // ============================================================================
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      // TEMPORARY: Touch uses exact same logic as mouse
      isDraggingRef.current = true;
      isSnappingRef.current = false;
      snapPlanetIdRef.current = null; // Clear frozen snap target when drag starts
      velocityRef.current = 0;
      
      dragStartXRef.current = e.touches[0].clientX;
      dragStartYRef.current = e.touches[0].clientY;
      dragStartAngleRef.current = rotationAngleRef.current;
      lastDragXRef.current = e.touches[0].clientX;
      lastDragYRef.current = e.touches[0].clientY;
      lastDragTimeRef.current = performance.now();
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      e.preventDefault();
      
      // Support both horizontal and vertical swiping
      // Use dominant direction (prefer horizontal if equal)
      const deltaX = e.touches[0].clientX - dragStartXRef.current;
      const deltaY = e.touches[0].clientY - dragStartYRef.current;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Use dominant direction for rotation (horizontal preferred if equal)
      const dominantDelta = absDeltaX >= absDeltaY ? deltaX : deltaY;
      const newAngle = dragStartAngleRef.current + dominantDelta * DRAG_SENSITIVITY;
      
      // Direct mutation of game state (no React state update)
      rotationAngleRef.current = newAngle;
      
      // Calculate velocity (same as mouse, no capping)
      const now = performance.now();
      const timeDelta = now - lastDragTimeRef.current;
      if (timeDelta > 0) {
        const lastDeltaX = e.touches[0].clientX - lastDragXRef.current;
        const lastDeltaY = e.touches[0].clientY - lastDragYRef.current;
        const lastAbsDeltaX = Math.abs(lastDeltaX);
        const lastAbsDeltaY = Math.abs(lastDeltaY);
        const lastDominantDelta = lastAbsDeltaX >= lastAbsDeltaY ? lastDeltaX : lastDeltaY;
        velocityRef.current = (lastDominantDelta * DRAG_SENSITIVITY) / (timeDelta / 16.67); // Normalize to 60fps
      }
      
      lastDragXRef.current = e.touches[0].clientX;
      lastDragYRef.current = e.touches[0].clientY;
      lastDragTimeRef.current = now;
    }
  };
  
  const handleTouchEnd = () => {
    // TEMPORARY: Touch uses exact same logic as mouse
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      velocityRef.current = 0; // Clear velocity (inertia disabled)
      
      // INERTIA DISABLED: Always snap immediately, no after-scroll
      snapToNearestPlanet();
    }
  };
  
  // ============================================================================
  // RENDER UI
  // ============================================================================
  
  return (
    <div className="galaxy-universe-view">
      <button className="settings-icon-button" onClick={() => setSettingsOpen(true)} title="Settings">
        ⚙️
      </button>
      <Settings isOpen={settingsOpen} onClose={() => {
        setSettingsOpen(false);
        // Trigger reload in GameStartScreen
        setSettingsClosedTrigger(prev => prev + 1);
      }} />
      
      <div className="galaxy-universe-controls">
        <select
          value={selectedUniverse?.id || ''}
          onChange={(e) => selectUniverse(e.target.value)}
          className="universe-select"
        >
          {universes.map(u => (
            <option key={u.id} value={u.id}>
              {u.icon} {u.name}
            </option>
          ))}
        </select>
      </div>
      
      <canvas
        ref={canvasRef}
        className="galaxy-universe-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      
      {/* Sun Hover Tooltip */}
      {hoveredSun && selectedUniverse && (
        <div className="sun-tooltip">
          <div className="sun-tooltip-content">
            <div className="sun-tooltip-title">🌟 {selectedUniverse.name}</div>
            <div className="sun-tooltip-subtitle">Universe Chaotic Mode</div>
            <div className="sun-tooltip-hint">Klicken um alle Themes zu spielen</div>
          </div>
        </div>
      )}
      
      {/* Universe Chaotic Mode Confirmation Dialog */}
      {showUniverseConfirmation && universeStats && selectedUniverse && (
        <GameStartScreen
          key={settingsClosedTrigger} // Force reload when settings close
          name={selectedUniverse.name}
          itemCount={universeStats.items}
          freeTierItemCount={universeStats.freeTierItems}
          colorPrimary={selectedUniverse.colorPrimary}
          colorAccent={selectedUniverse.colorAccent}
          onConfirm={handleUniverseConfirm}
          onCancel={handleUniverseCancel}
          onOpenSettings={() => setSettingsOpen(true)}
          icon="🌟"
          additionalStats={[
            { value: universeStats.themes, label: 'Themes' },
            { value: universeStats.chapters, label: 'Chapters' }
          ]}
        />
      )}
    </div>
  );
};

