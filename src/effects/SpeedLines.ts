// Speed Lines Effect
// Creates motion lines that radiate from center, scaled by game speed/score

import type { Renderer } from '@/core/Renderer';

interface SpeedLine {
  angle: number;
  distance: number;
  length: number;
  speed: number;
  opacity: number;
}

export class SpeedLines {
  private lines: SpeedLine[] = [];
  private screenWidth: number;
  private screenHeight: number;
  private centerX: number;
  private centerY: number;
  private intensity: number = 1;

  constructor(screenWidth: number, screenHeight: number, lineCount: number = 3) { // REDUCED: 30 → 3
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.centerX = screenWidth / 2;
    this.centerY = screenHeight / 2;
    this.initLines(lineCount);
  }

  private initLines(count: number): void {
    for (let i = 0; i < count; i++) {
      this.lines.push(this.createLine());
    }
  }

  private createLine(): SpeedLine {
    return {
      angle: Math.random() * Math.PI * 2,
      distance: 100 + Math.random() * 200,
      length: 30 + Math.random() * 70,
      speed: (100 + Math.random() * 500) / 5, // REDUCED: Speed / 5
      opacity: 0.1 + Math.random() * 0.5
    };
  }

  // Scale intensity based on score (1.0 = normal, 2.0 = double)
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0.5, Math.min(3, intensity));
    
    // Add more lines at higher intensity
    const targetCount = Math.floor(10 * this.intensity);
    while (this.lines.length < targetCount) {
      this.lines.push(this.createLine());
    }
  }

  update(deltaTime: number): void {
    for (const line of this.lines) {
      // Move outward from center
      line.distance += line.speed * this.intensity * deltaTime;

      // Respawn if too far
      const maxDist = Math.max(this.screenWidth, this.screenHeight);
      if (line.distance > maxDist) {
        line.distance = 100;
        line.angle = Math.random() * Math.PI * 2;
        line.length = 30 + Math.random() * 70;
        line.speed = 300 + Math.random() * 500;
      }
    }
  }

  render(renderer: Renderer): void {
    const ctx = renderer.getContext();
    
    for (const line of this.lines) {
      const startX = this.centerX + Math.cos(line.angle) * line.distance;
      const startY = this.centerY + Math.sin(line.angle) * line.distance;
      const endX = startX + Math.cos(line.angle) * line.length;
      const endY = startY + Math.sin(line.angle) * line.length;

      // Only draw if within screen bounds (roughly)
      if (startX < -50 || startX > this.screenWidth + 50 ||
          startY < -50 || startY > this.screenHeight + 50) {
        continue;
      }

      // Gradient line (fade out at end)
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${line.opacity * 0.8})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1.5 * this.intensity;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }
  }
}

