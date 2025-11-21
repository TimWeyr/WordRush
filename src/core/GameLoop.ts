// Main Game Loop with requestAnimationFrame

export class GameLoop {
  private running: boolean = false;
  private lastTime: number = 0;
  private rafId: number | null = null;
  private updateCallback: (deltaTime: number) => void;
  private renderCallback: () => void;

  constructor(
    updateCallback: (deltaTime: number) => void,
    renderCallback: () => void
  ) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
  }

  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;

    // Calculate delta time in seconds
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = currentTime;

    // Update game state
    this.updateCallback(deltaTime);

    // Render frame
    this.renderCallback();

    // Continue loop
    this.rafId = requestAnimationFrame(this.loop);
  };

  isRunning(): boolean {
    return this.running;
  }
}

