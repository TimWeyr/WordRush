// Galaxy Camera System
// Handles pan, zoom, and smooth camera animations

import type { Vector2 } from '@/types/game.types';

export class GalaxyCamera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1.0;
  minZoom: number = 0.5;
  maxZoom: number = 5.0;
  
  // Screen dimensions (canvas dimensions)
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  
  // Animation state
  targetX: number = 0;
  targetY: number = 0;
  targetZoom: number = 1.0;
  animating: boolean = false; // Made public for debugging
  animationDuration: number = 500; // ms
  private animationStartTime: number = 0;
  
  constructor(screenWidth: number, screenHeight: number) {
    // Center camera initially
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.x = screenWidth / 2;
    this.y = screenHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }
  
  /**
   * Update screen dimensions (called when canvas is resized)
   */
  setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }
  
  /**
   * Pan camera by delta amount
   */
  pan(deltaX: number, deltaY: number): void {
    // Update both target and current position immediately to prevent oscillation
    this.targetX += deltaX / this.zoom;
    this.targetY += deltaY / this.zoom;
    this.x = this.targetX;
    this.y = this.targetY;
  }
  
  /**
   * Zoom to a specific level, optionally at a target position
   */
  zoomTo(level: number, targetX?: number, targetY?: number): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.targetZoom = clampedZoom;
    
    if (targetX !== undefined && targetY !== undefined) {
      this.targetX = targetX;
      this.targetY = targetY;
    }
    
    this.startAnimation();
  }
  
  /**
   * Zoom in/out by a factor
   */
  zoomBy(factor: number, centerX?: number, centerY?: number): void {
    const newZoom = this.targetZoom * factor;
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    
    if (centerX !== undefined && centerY !== undefined) {
      // Zoom towards the center point
      const worldX = this.screenToWorld({ x: centerX, y: centerY }).x;
      const worldY = this.screenToWorld({ x: centerX, y: centerY }).y;
      
      this.targetX = worldX;
      this.targetY = worldY;
    }
    
    this.targetZoom = clampedZoom;
    this.startAnimation();
  }
  
  /**
   * Smoothly zoom to an element
   * Centers the camera on the element and zooms to the specified level
   */
  zoomToElement(elementX: number, elementY: number, zoomLevel: number = 2.0, duration: number = 500): void {
    // Set target position and zoom
    this.targetX = elementX;
    this.targetY = elementY;
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
    
    // If duration is 0 or very short, set immediately
    if (duration <= 0) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.zoom = this.targetZoom;
      this.animating = false;
    } else {
      this.animationDuration = duration;
      this.startAnimation();
    }
  }
  
  /**
   * Animate only zoom level without changing camera position
   * Useful when position is already set and only zoom needs to animate
   */
  zoomToLevel(zoomLevel: number, duration: number = 500): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoomLevel));
    
    // CRITICAL: Lock target position to current position BEFORE setting zoom
    // This ensures position stays completely fixed during zoom animation
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetZoom = clampedZoom;
    
    // If duration is 0 or very short, set immediately
    if (duration <= 0) {
      this.zoom = this.targetZoom;
      this.animating = false;
    } else {
      this.animationDuration = duration;
      this.startAnimation();
    }
  }
  
  /**
   * Set camera position and zoom immediately without animation
   */
  setPositionImmediate(x: number, y: number, zoom: number): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    
    // Set all position and zoom values immediately
    this.x = x;
    this.y = y;
    this.zoom = clampedZoom;
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = clampedZoom;
    
    // Stop any ongoing animation
    this.animating = false;
    
    // Ensure positions are synced (in case update() was called between setting values)
    this.x = this.targetX;
    this.y = this.targetY;
    this.zoom = this.targetZoom;
  }

  /**
   * Reset zoom to show all planets
   */
  resetZoom(screenWidth: number, screenHeight: number): void {
    this.setScreenSize(screenWidth, screenHeight);
    this.targetX = screenWidth / 2;
    this.targetY = screenHeight / 2;
    this.targetZoom = 1.0;
    this.startAnimation();
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldPos: Vector2): Vector2 {
    return {
      x: (worldPos.x - this.x) * this.zoom + (this.screenWidth / 2),
      y: (worldPos.y - this.y) * this.zoom + (this.screenHeight / 2)
    };
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenPos: Vector2): Vector2 {
    return {
      x: (screenPos.x - this.screenWidth / 2) / this.zoom + this.x,
      y: (screenPos.y - this.screenHeight / 2) / this.zoom + this.y
    };
  }
  
  /**
   * Update camera animation
   */
  update(_deltaTime: number): void {
    if (this.animating) {
      const elapsed = performance.now() - this.animationStartTime;
      const progress = Math.min(1, elapsed / this.animationDuration);
      
      // Easing function (ease-in-out)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Check if position should be animated (only if target differs significantly)
      const deltaX = this.targetX - this.x;
      const deltaY = this.targetY - this.y;
      const deltaZoom = this.targetZoom - this.zoom;
      
      // CRITICAL: Only animate position if there's a meaningful change (more than 0.5)
      // This prevents ANY position drift when only zoom should animate
      // If position difference is small, lock it immediately to prevent drift
      if (Math.abs(deltaX) > 0.5) {
        this.x += deltaX * eased;
      } else {
        // Lock position to target immediately if difference is small
        // This ensures position stays completely fixed during zoom-only animations
        this.x = this.targetX;
      }
      
      if (Math.abs(deltaY) > 0.5) {
        this.y += deltaY * eased;
      } else {
        // Lock position to target immediately if difference is small
        // This ensures position stays completely fixed during zoom-only animations
        this.y = this.targetY;
      }
      
      // Always animate zoom
      this.zoom += deltaZoom * eased;
      
      if (progress >= 1) {
        this.animating = false;
        this.x = this.targetX;
        this.y = this.targetY;
        this.zoom = this.targetZoom;
      }
    } else {
      // Ensure positions are always synced when not animating
      // BUT: Don't overwrite if position was just set via setPositionImmediate
      // Only sync if there's a meaningful difference (more than 0.01)
      if (Math.abs(this.targetX - this.x) > 0.01) {
        this.x = this.targetX;
      } else {
        this.targetX = this.x; // Sync target to current if very close
      }
      
      if (Math.abs(this.targetY - this.y) > 0.01) {
        this.y = this.targetY;
      } else {
        this.targetY = this.y; // Sync target to current if very close
      }
      
      if (Math.abs(this.targetZoom - this.zoom) > 0.01) {
        this.zoom = this.targetZoom;
      } else {
        this.targetZoom = this.zoom; // Sync target to current if very close
      }
    }
  }
  
  startAnimation(): void {
    this.animating = true;
    this.animationStartTime = performance.now();
  }
  
  isAnimating(): boolean {
    return this.animating;
  }
}

