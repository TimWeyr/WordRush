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
import type { Universe, Theme, Item } from '@/types/content.types';
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

// ============================================================================
// TYPES
// ============================================================================

interface GalaxyUniverseViewProps {
  onPlanetSelect: (universe: Universe, theme: Theme) => void;
  initialFocusedPlanetId?: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const GalaxyUniverseView: React.FC<GalaxyUniverseViewProps> = ({ 
  onPlanetSelect,
  initialFocusedPlanetId 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);
  
  // ============================================================================
  // CORE STATE
  // ============================================================================
  
  const [renderer, setRenderer] = useState<Renderer | null>(null);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<Universe | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sunImage, setSunImage] = useState<HTMLImageElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
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
  const dragStartAngleRef = useRef(0);
  const lastDragXRef = useRef(0);
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
  
  const loadData = async () => {
    const loadedUniverses = await jsonLoader.loadUniverses();
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
    
    // Select universe
    if (initialUniverseId && loadedUniverses.find(u => u.id === initialUniverseId)) {
      await selectUniverse(initialUniverseId);
    } else if (loadedUniverses.length > 0) {
      await selectUniverse(loadedUniverses[0].id);
    }
  };
  
  const selectUniverse = async (universeId: string) => {
    const universe = universes.find(u => u.id === universeId) || await jsonLoader.loadUniverse(universeId);
    if (!universe) {
      console.error(`Failed to load universe: ${universeId}`);
      return;
    }
    
    setSelectedUniverse(universe);
    
    // Load themes for this universe (fast: basic theme data only)
    console.log(`📦 Loading themes for universe ${universe.name}...`);
    console.time('⏱️ Load themes');
    const loadedThemes = await jsonLoader.loadAllThemesForUniverse(universeId);
    console.timeEnd('⏱️ Load themes');
    setThemes(loadedThemes);
    
    // Load sun image
    loadSunImage(universeId);
    
    // If we have an initial focused planet, rotate to it
    if (initialFocusedPlanetId) {
      const targetAngle = calculateRotationAngleForPlanet(loadedThemes, initialFocusedPlanetId);
      rotationAngleRef.current = targetAngle;
      focusedPlanetIdRef.current = initialFocusedPlanetId;
    }
    
    // Save selection
    const selection = {
      universeId: universe.id,
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
    
    // [SNAP start] - Log before selecting nearestVisiblePlanet
    console.log('[SNAP start]', {
      rotation: rotationAngleRef.current,
      isSnapping: isSnappingRef.current
    });
    
    if (themes.length === 0 || !renderer) return;
    
    const canvas = renderer.getContext().canvas;
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    
    // Find nearest VISIBLE planet (within screen bounds)
    let nearestVisiblePlanet: PlanetLayout | null = null;
    let smallestDistance = Infinity;
    
    for (const planet of planetLayoutsRef.current) {
      // Check if planet is visible (within screen bounds + margin)
      const isVisible = 
        planet.x >= -100 && 
        planet.x <= canvas.width + 100 &&
        planet.y >= -100 && 
        planet.y <= canvas.height + 100;
      
      if (isVisible) {
        const distance = Math.hypot(planet.x - screenCenterX, planet.y - screenCenterY);
        
        // [SNAP candidate] - Log each visible planet candidate
        console.log('[SNAP candidate]', {
          planetId: planet.id,
          distance: distance.toFixed(2),
          x: planet.x.toFixed(1),
          y: planet.y.toFixed(1)
        });
        
        if (distance < smallestDistance) {
          smallestDistance = distance;
          nearestVisiblePlanet = planet;
        }
      }
    }
    
    // If we found a visible planet, snap to it
    if (nearestVisiblePlanet) {
      // Freeze snap target planet ID to prevent focus switching during snap
      snapPlanetIdRef.current = nearestVisiblePlanet.id;
      
      const planetIndex = themes.findIndex(t => t.id === nearestVisiblePlanet!.id);
      if (planetIndex !== -1) {
        const angleStep = (Math.PI * 2) / themes.length;
        const baseAngle = planetIndex * angleStep;
        const current = rotationAngleRef.current;
        
        // Snap to nearest equivalent angle (prevents visible jumps)
        // Find how many full rotations we need to add/subtract
        const k = Math.round((current - baseAngle) / (Math.PI * 2));
        const targetAngle = baseAngle + k * (Math.PI * 2);
        
        // [SNAP target] - Log when snap target is chosen
        console.log('[SNAP target]', {
          planetId: nearestVisiblePlanet.id,
          baseAngle: baseAngle.toFixed(4),
          targetAngle: targetAngle.toFixed(4),
          current: rotationAngleRef.current.toFixed(4)
        });
        
        // Start snapping animation
        isSnappingRef.current = true;
        snapStartTimeRef.current = performance.now();
        snapStartAngleRef.current = rotationAngleRef.current;
        snapTargetAngleRef.current = targetAngle;
        velocityRef.current = 0;
      }
    } else {
      // Fallback: If no planet is visible, snap to nearest by angle
      const angleStep = (Math.PI * 2) / themes.length;
      const normalizedAngle = ((rotationAngleRef.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const nearestPlanetIndex = Math.round(normalizedAngle / angleStep);
      const baseAngle = nearestPlanetIndex * angleStep;
      const current = rotationAngleRef.current;
      
      // Snap to nearest equivalent angle (prevents visible jumps)
      const k = Math.round((current - baseAngle) / (Math.PI * 2));
      const targetAngle = baseAngle + k * (Math.PI * 2);
      
      // For fallback, find the planet ID from the index
      if (nearestPlanetIndex >= 0 && nearestPlanetIndex < themes.length) {
        snapPlanetIdRef.current = themes[nearestPlanetIndex].id;
      } else {
        snapPlanetIdRef.current = null;
      }
      
      // [SNAP target] - Log fallback snap target
      console.log('[SNAP target]', {
        planetId: snapPlanetIdRef.current,
        baseAngle: baseAngle.toFixed(4),
        targetAngle: targetAngle.toFixed(4),
        current: rotationAngleRef.current.toFixed(4),
        fallback: true
      });
      
      isSnappingRef.current = true;
      snapStartTimeRef.current = performance.now();
      snapStartAngleRef.current = rotationAngleRef.current;
      snapTargetAngleRef.current = targetAngle;
      velocityRef.current = 0;
    }
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
    
    // Check if clicked on a planet
    for (const planet of planetLayoutsRef.current) {
      const distance = Math.hypot(clickX - planet.x, clickY - planet.y);
      
      if (distance < planet.radius * PLANET_HITBOX_MULTIPLIER) {
        // Planet clicked!
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
      dragStartAngleRef.current = rotationAngleRef.current;
      lastDragXRef.current = e.touches[0].clientX;
      lastDragTimeRef.current = performance.now();
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      e.preventDefault();
      
      // TEMPORARY: Touch uses exact same sensitivity and logic as mouse
      const deltaX = e.touches[0].clientX - dragStartXRef.current;
      const newAngle = dragStartAngleRef.current + deltaX * DRAG_SENSITIVITY;
      // Direct mutation of game state (no React state update)
      rotationAngleRef.current = newAngle;
      
      // Calculate velocity (same as mouse, no capping)
      const now = performance.now();
      const timeDelta = now - lastDragTimeRef.current;
      if (timeDelta > 0) {
        const xDelta = e.touches[0].clientX - lastDragXRef.current;
        velocityRef.current = (xDelta * DRAG_SENSITIVITY) / (timeDelta / 16.67); // Normalize to 60fps
      }
      
      lastDragXRef.current = e.touches[0].clientX;
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
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
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
    </div>
  );
};

