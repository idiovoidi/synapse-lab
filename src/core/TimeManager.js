export class TimeManager {
  constructor() {
    this.simulationTime = 0;
    this.timeScale = 1.0;
    this.paused = false;
  }
  
  update(deltaTime) {
    if (!this.paused) {
      this.simulationTime += deltaTime * this.timeScale;
    }
  }
  
  setTimeScale(scale) {
    this.timeScale = Math.max(0, scale);
  }
  
  pause() {
    this.paused = true;
  }
  
  resume() {
    this.paused = false;
  }
  
  reset() {
    this.simulationTime = 0;
    this.timeScale = 1.0;
    this.paused = false;
  }
  
  getSimulationTime() {
    return this.simulationTime;
  }
  
  isPaused() {
    return this.paused;
  }
} 