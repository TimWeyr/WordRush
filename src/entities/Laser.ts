// Laser projectile fired by Ship

import { GameObject } from './GameObject';
import type { Vector2 } from '@/types/game.types';
import type { Renderer } from '@/core/Renderer';

export class Laser extends GameObject {
  direction: Vector2;
  speed: number;
  lifetime: number;
  age: number;
  color: string;

  constructor(position: Vector2, direction: Vector2, speed: number, color: string = '#4a90e2') {
    super(position, 5); // Small radius for laser
    
    this.direction = { ...direction };
    this.speed = speed;
    this.lifetime = 3; // 3 seconds max lifetime
    this.age = 0;
    this.color = color;
    
    // Normalize direction and set velocity
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length > 0) {
      this.velocity.x = (direction.x / length) * speed;
      this.velocity.y = (direction.y / length) * speed;
    }
  }

  update(deltaTime: number): void {
    // Move laser
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    
    // Update age
    this.age += deltaTime;
    
    // Destroy if too old
    if (this.age >= this.lifetime) {
      this.destroy();
    }
  }

  render(renderer: Renderer): void {
    // Calculate start point (a bit behind current position for trail effect)
    const trailLength = 20;
    const startX = this.position.x - (this.velocity.x / this.speed) * trailLength;
    const startY = this.position.y - (this.velocity.y / this.speed) * trailLength;
    
    // Render laser as a line
    renderer.renderLine(
      { x: startX, y: startY },
      this.position,
      this.color,
      4
    );
    
    // Bright tip
    renderer.renderCircle(
      this.position,
      this.radius,
      '#ffffff',
      undefined
    );
  }
}

