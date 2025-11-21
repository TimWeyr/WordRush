// Base GameObject class

import type { Vector2, GameObject as IGameObject } from '@/types/game.types';
import type { Renderer } from '@/core/Renderer';

export abstract class GameObject implements IGameObject {
  id: string;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  active: boolean;
  spawnTime: number;

  constructor(position: Vector2, radius: number) {
    this.id = `obj_${Math.random().toString(36).substr(2, 9)}`;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
    this.radius = radius;
    this.active = true;
    this.spawnTime = performance.now();
  }

  abstract update(deltaTime: number): void;
  abstract render(renderer: Renderer): void;

  getReactionTime(): number {
    return (performance.now() - this.spawnTime) / 1000;
  }

  destroy(): void {
    this.active = false;
  }

  isOffScreen(screenWidth: number, screenHeight: number): boolean {
    return (
      this.position.x < -this.radius ||
      this.position.x > screenWidth + this.radius ||
      this.position.y < -this.radius ||
      this.position.y > screenHeight + this.radius
    );
  }
}

