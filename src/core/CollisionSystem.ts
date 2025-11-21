// Simple circle-based collision detection

import type { GameObject } from '@/types/game.types';

export interface CollisionPair {
  objA: GameObject;
  objB: GameObject;
}

export class CollisionSystem {
  private overlapTolerance: number;

  constructor(overlapTolerance: number = 0.9) {
    this.overlapTolerance = overlapTolerance;
  }

  // Check all collisions between objects
  checkCollisions(objects: GameObject[]): CollisionPair[] {
    const pairs: CollisionPair[] = [];
    const active = objects.filter(obj => obj.active);

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (this.isColliding(active[i], active[j])) {
          pairs.push({ objA: active[i], objB: active[j] });
        }
      }
    }

    return pairs;
  }

  // Circle-circle collision with overlap tolerance
  private isColliding(a: GameObject, b: GameObject): boolean {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (a.radius + b.radius) * this.overlapTolerance;
    
    return distance < minDistance;
  }
}

