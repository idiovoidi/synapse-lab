import { TimeManager } from '../TimeManager';

describe('TimeManager', () => {
  it('should initialize with default values', () => {
    const tm = new TimeManager();
    expect(tm.simulationTime).toBe(0);
    expect(tm.timeScale).toBe(1.0);
    expect(tm.paused).toBe(false);
  });

  it('should update simulation time when not paused', () => {
    const tm = new TimeManager();
    tm.update(2);
    expect(tm.simulationTime).toBe(2);
  });

  it('should not update simulation time when paused', () => {
    const tm = new TimeManager();
    tm.pause();
    tm.update(2);
    expect(tm.simulationTime).toBe(0);
  });

  it('should reset to default values', () => {
    const tm = new TimeManager();
    tm.update(2);
    tm.pause();
    tm.reset();
    expect(tm.simulationTime).toBe(0);
    expect(tm.timeScale).toBe(1.0);
    expect(tm.paused).toBe(false);
  });
}); 