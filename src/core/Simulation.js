import * as THREE from 'three';

export class Simulation {
  constructor({ eventSystem, timeManager, sceneManager }) {
    this.eventSystem = eventSystem;
    this.timeManager = timeManager;
    this.sceneManager = sceneManager;
    
    this.isRunning = false;
    this.lastTime = 0;
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);
  }
  
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
      console.log('Simulation started');
    }
  }
  
  stop() {
    this.isRunning = false;
    console.log('Simulation stopped');
  }
  
  animate() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;
    
    // Update time manager
    this.timeManager.update(deltaTime);
    
    // Update scene
    this.sceneManager.update(deltaTime);
    
    // Request next frame
    requestAnimationFrame(this.animate);
  }
  
  reset() {
    this.sceneManager.reset();
    this.timeManager.reset();
    console.log('Simulation reset');
  }
} 