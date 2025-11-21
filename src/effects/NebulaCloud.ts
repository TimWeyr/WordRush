// Nebula Cloud Effect
// Creates animated, rotating gradient clouds for space atmosphere

import type { Renderer } from '@/core/Renderer';

interface Cloud {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  pulsePhase: number;
  pulseSpeed: number;
  colors: string[];
  alpha: number;
  driftX: number;
  driftY: number;
}

export class NebulaCloud {
  private clouds: Cloud[] = [];
  private screenWidth: number;
  private screenHeight: number;
  private speedMultiplier: number = 1.0;

  constructor(
    screenWidth: number,
    screenHeight: number,
    cloudCount: number = 2, // Reduced from 5 to 2 for fewer particles
    colors: string[] = ['#4a90e2', '#7bb3f0', '#8e44ad']
  ) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.initClouds(cloudCount, colors);
  }

  private initClouds(count: number, colors: string[]): void {
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        radius: 150 + Math.random() * 200,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.1 + Math.random() * 0.2,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.5 + Math.random() * 0.5,
        colors: this.shuffleColors(colors),
        alpha: 0.03 + Math.random() * 0.05, // Much more transparent: 0.03-0.08
        driftX: (Math.random() - 0.5) * 15, // Slightly less horizontal drift
        driftY: 25 + Math.random() * 35 // Slightly faster downward drift for stronger flight effect
      });
    }
  }

  private shuffleColors(colors: string[]): string[] {
    const shuffled = [...colors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  update(deltaTime: number): void {
    for (const cloud of this.clouds) {
      // Rotate
      cloud.rotation += cloud.rotationSpeed * this.speedMultiplier * deltaTime;

      // Pulse (size variation)
      cloud.pulsePhase += cloud.pulseSpeed * this.speedMultiplier * deltaTime;

      // Drift
      cloud.x += cloud.driftX * this.speedMultiplier * deltaTime;
      cloud.y += cloud.driftY * this.speedMultiplier * deltaTime;

      // Wrap around
      if (cloud.y > this.screenHeight + cloud.radius) {
        cloud.y = -cloud.radius;
        cloud.x = Math.random() * this.screenWidth;
      }
      if (cloud.x < -cloud.radius) {
        cloud.x = this.screenWidth + cloud.radius;
      } else if (cloud.x > this.screenWidth + cloud.radius) {
        cloud.x = -cloud.radius;
      }
    }
  }

  render(renderer: Renderer): void {
    const ctx = renderer.getContext();

    for (const cloud of this.clouds) {
      ctx.save();

      // Pulsing size
      const pulse = 1 + Math.sin(cloud.pulsePhase) * 0.15;
      const currentRadius = cloud.radius * pulse;

      // Create radial gradient with theme colors
      const gradient = ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, currentRadius
      );

      // Multi-color gradient stops
      const stopCount = cloud.colors.length;
      cloud.colors.forEach((color, index) => {
        const stop = index / (stopCount - 1);
        gradient.addColorStop(stop, this.hexToRgba(color, cloud.alpha));
      });
      gradient.addColorStop(1, 'transparent');

      // Apply rotation
      ctx.translate(cloud.x, cloud.y);
      ctx.rotate(cloud.rotation);
      ctx.translate(-cloud.x, -cloud.y);

      // Draw cloud (ellipse for more interesting shape)
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        cloud.x,
        cloud.y,
        currentRadius,
        currentRadius * 0.7,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

