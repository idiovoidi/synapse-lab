# Next Steps - Immediate Action Plan

## 🎯 This Week (5-10 hours)

### 1. Fix Memory Leaks (CRITICAL)
**Priority**: 🔴 Critical
**Time**: 2-3 hours

**What to do**:
```javascript
// Add to neuronSimulation.js
cleanup() {
  // Dispose geometries
  this.degradationParticleGeometry.dispose();
  
  // Dispose materials
  this.degradationParticleMaterial.dispose();
  
  // Remove neurotransmitters
  this.neurotransmitters.forEach(nt => {
    nt.mesh.geometry.dispose();
    nt.mesh.material.dispose();
    this.scene.remove(nt.mesh);
  });
  
  // Unsubscribe events
  if (this.eventBus) {
    this.eventBus.off('nt:released');
    this.eventBus.off('nt:bound');
  }
}
```

**Files to modify**:
- `src/simulation/neuronSimulation.js`
- `src/render/vesicleView.js`
- `emotionalFace.js`

---

### 2. Add Simple Tutorial
**Priority**: 🟡 High
**Time**: 3-4 hours

**Create**: `src/tutorial/simpleTutorial.js`

```javascript
export class SimpleTutorial {
  constructor(simulation, eventBus) {
    this.simulation = simulation;
    this.currentStep = 0;
    this.steps = [
      {
        title: 'Welcome!',
        text: 'This is a neurotransmitter simulation. Let\'s learn how neurons communicate.',
        highlight: null,
        action: null
      },
      {
        title: 'Presynaptic Neuron',
        text: 'This neuron sends signals by releasing neurotransmitters.',
        highlight: 'preSoma',
        action: null
      },
      {
        title: 'Release Neurotransmitters',
        text: 'Click the Release button to send a signal.',
        highlight: 'releaseBtn',
        action: 'waitForRelease'
      },
      {
        title: 'Watch Them Move',
        text: 'Neurotransmitters drift across the synaptic cleft.',
        highlight: null,
        action: 'waitForBinding'
      },
      {
        title: 'Receptor Binding',
        text: 'When they reach receptors, they bind and trigger a response!',
        highlight: 'receptors',
        action: null
      }
    ];
  }
  
  start() {
    this.showStep(0);
  }
  
  showStep(index) {
    const step = this.steps[index];
    // Show overlay with step info
    this.showOverlay(step);
  }
  
  next() {
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.showStep(this.currentStep);
    } else {
      this.complete();
    }
  }
}
```

**Add to HTML**:
```html
<button id="tutorial-btn" style="position: absolute; top: 10px; right: 10px;">
  📚 Tutorial
</button>

<div id="tutorial-overlay" style="display: none;">
  <div class="tutorial-content">
    <h2 id="tutorial-title"></h2>
    <p id="tutorial-text"></p>
    <button id="tutorial-next">Next</button>
  </div>
</div>
```

---

### 3. Add Basic Scenario
**Priority**: 🟡 High
**Time**: 2-3 hours

**Create**: `src/scenarios/basicScenarios.js`

```javascript
export const BASIC_SCENARIOS = {
  DEPRESSION_DEMO: {
    name: 'Depression & SSRIs',
    description: 'See how antidepressants work',
    steps: [
      {
        time: 0,
        action: () => {
          showMessage('Low serotonin is associated with depression');
        }
      },
      {
        time: 2000,
        action: (sim) => {
          sim.releaseNeurotransmitters('SEROTONIN');
          showMessage('Releasing serotonin...');
        }
      },
      {
        time: 5000,
        action: () => {
          showMessage('Notice how quickly it\'s reabsorbed');
        }
      },
      {
        time: 8000,
        action: (sim) => {
          sim.toggleReuptakeInhibition();
          showMessage('💊 SSRI administered - blocking reuptake');
        }
      },
      {
        time: 10000,
        action: (sim) => {
          sim.releaseNeurotransmitters('SEROTONIN');
          showMessage('Releasing serotonin again...');
        }
      },
      {
        time: 13000,
        action: () => {
          showMessage('✨ Serotonin stays in the synapse longer!');
        }
      }
    ]
  }
};

function showMessage(text) {
  const msgEl = document.getElementById('scenario-message');
  msgEl.textContent = text;
  msgEl.style.display = 'block';
  setTimeout(() => msgEl.style.display = 'none', 3000);
}
```

**Add to HTML**:
```html
<div class="scenario-panel">
  <h3>Scenarios</h3>
  <button id="scenario-depression">Depression & SSRIs</button>
  <button id="scenario-parkinsons">Parkinson's Disease</button>
</div>

<div id="scenario-message" style="display: none;"></div>
```

---

## 📊 This Month (20-30 hours)

### 4. Add Data Visualization
**Priority**: 🟢 Medium
**Time**: 6-8 hours

**Install Chart.js**:
```bash
npm install chart.js
```

**Create**: `src/analytics/chartManager.js`

```javascript
import { Chart } from 'chart.js/auto';

export class ChartManager {
  constructor() {
    this.ntChart = this.createNTChart();
    this.moodChart = this.createMoodChart();
    this.data = {
      time: [],
      ntCounts: [],
      mood: []
    };
  }
  
  createNTChart() {
    const ctx = document.getElementById('nt-chart').getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Active Neurotransmitters',
          data: [],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        animation: false
      }
    });
  }
  
  update(ntCount, mood) {
    const now = Date.now();
    this.data.time.push(now);
    this.data.ntCounts.push(ntCount);
    this.data.mood.push(mood);
    
    // Keep last 100 points
    if (this.data.time.length > 100) {
      this.data.time.shift();
      this.data.ntCounts.shift();
      this.data.mood.shift();
    }
    
    this.ntChart.data.labels = this.data.time;
    this.ntChart.data.datasets[0].data = this.data.ntCounts;
    this.ntChart.update('none'); // No animation for performance
  }
}
```

---

### 5. Implement Drug Effects
**Priority**: 🟢 Medium
**Time**: 8-10 hours

**Create**: `src/pharmacology/drugSystem.js`

```javascript
export class DrugSystem {
  constructor(simulation, eventBus) {
    this.simulation = simulation;
    this.eventBus = eventBus;
    this.activeDrugs = [];
  }
  
  administer(drugName) {
    const drug = DRUGS[drugName];
    if (!drug) return;
    
    const activeDrug = {
      ...drug,
      administeredAt: Date.now(),
      expiresAt: Date.now() + drug.duration
    };
    
    this.activeDrugs.push(activeDrug);
    this.applyEffects(drug);
    
    // Show notification
    this.showDrugNotification(drug);
    
    // Schedule removal
    setTimeout(() => {
      this.removeDrug(activeDrug);
    }, drug.duration);
  }
  
  applyEffects(drug) {
    if (drug.effects.reuptakeInhibition) {
      Object.entries(drug.effects.reuptakeInhibition).forEach(([nt, strength]) => {
        this.simulation.setReuptakeInhibition(nt, strength);
      });
    }
    
    if (drug.effects.receptorBlock) {
      Object.entries(drug.effects.receptorBlock).forEach(([nt, strength]) => {
        this.simulation.blockReceptors(nt, strength);
      });
    }
  }
}

export const DRUGS = {
  FLUOXETINE: {
    name: 'Fluoxetine (Prozac)',
    class: 'SSRI',
    description: 'Selective Serotonin Reuptake Inhibitor',
    effects: {
      reuptakeInhibition: { SEROTONIN: 0.9 }
    },
    duration: 30000,
    color: 0x00ff00
  },
  METHYLPHENIDATE: {
    name: 'Methylphenidate (Ritalin)',
    class: 'Stimulant',
    description: 'Blocks dopamine and norepinephrine reuptake',
    effects: {
      reuptakeInhibition: { 
        DOPAMINE: 0.7,
        NOREPINEPHRINE: 0.6
      }
    },
    duration: 20000,
    color: 0xff6600
  },
  DIAZEPAM: {
    name: 'Diazepam (Valium)',
    class: 'Benzodiazepine',
    description: 'Enhances GABA effects',
    effects: {
      receptorEnhancement: { GABA: 1.5 }
    },
    duration: 25000,
    color: 0x0066ff
  }
};
```

---

### 6. Add Challenge Mode
**Priority**: 🟢 Medium
**Time**: 6-8 hours

**Create**: `src/game/challenges.js`

```javascript
export class ChallengeManager {
  constructor(simulation, eventBus) {
    this.simulation = simulation;
    this.eventBus = eventBus;
    this.currentChallenge = null;
    this.completed = new Set();
  }
  
  startChallenge(challengeId) {
    const challenge = CHALLENGES[challengeId];
    if (!challenge) return;
    
    this.currentChallenge = {
      ...challenge,
      startTime: Date.now(),
      progress: 0
    };
    
    this.showChallengeUI(challenge);
    this.startMonitoring();
  }
  
  startMonitoring() {
    this.monitorInterval = setInterval(() => {
      if (!this.currentChallenge) return;
      
      const result = this.currentChallenge.check(this.simulation);
      
      if (result.success) {
        this.completeChallenge();
      } else {
        this.updateProgress(result.progress);
      }
    }, 100);
  }
  
  completeChallenge() {
    clearInterval(this.monitorInterval);
    this.completed.add(this.currentChallenge.id);
    this.showSuccess(this.currentChallenge);
    this.currentChallenge = null;
  }
}

export const CHALLENGES = {
  BINDING_MASTER: {
    id: 'binding-master',
    title: 'Binding Master',
    description: 'Achieve 80% receptor occupancy',
    difficulty: 'Easy',
    check: (sim) => {
      const occupancy = sim.getReceptorOccupancy();
      return {
        success: occupancy >= 0.8,
        progress: occupancy
      };
    },
    reward: '⭐ Gold Star',
    hint: 'Release multiple bursts of neurotransmitters'
  },
  
  MOOD_STABILIZER: {
    id: 'mood-stabilizer',
    title: 'Mood Stabilizer',
    description: 'Keep happiness above 0.5 for 30 seconds',
    difficulty: 'Medium',
    check: (sim) => {
      const mood = sim.getMoodSummary();
      const duration = sim.getHighMoodDuration();
      return {
        success: mood.happiness > 0.5 && duration > 30000,
        progress: duration / 30000
      };
    },
    reward: '🏆 Platinum Trophy'
  },
  
  PHARMACOLOGIST: {
    id: 'pharmacologist',
    title: 'Pharmacologist',
    description: 'Successfully demonstrate SSRI effects',
    difficulty: 'Hard',
    check: (sim) => {
      // Check if reuptake inhibited and serotonin levels high
      const inhibited = sim.isReuptakeInhibited();
      const serotoninCount = sim.getNeurotransmitterCount('SEROTONIN');
      return {
        success: inhibited && serotoninCount > 5,
        progress: serotoninCount / 5
      };
    },
    reward: '💊 Master Pharmacologist Badge'
  }
};
```

---

## 🚀 Quick Wins (1-2 hours each)

### 7. Add Keyboard Shortcuts
```javascript
// src/ui/keyboardShortcuts.js
document.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'r':
      simulation.releaseNeurotransmitters();
      break;
    case 'i':
      simulation.toggleReuptakeInhibition();
      break;
    case 'c':
      simulation.reset();
      break;
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
      const types = ['DOPAMINE', 'SEROTONIN', 'GLUTAMATE', 'GABA', 'NOREPINEPHRINE'];
      simulation.releaseNeurotransmitters(types[parseInt(e.key) - 1]);
      break;
  }
});
```

### 8. Add FPS Counter
```javascript
// src/utils/fpsCounter.js
export class FPSCounter {
  constructor() {
    this.fps = 60;
    this.frames = 0;
    this.lastTime = performance.now();
    
    this.element = document.createElement('div');
    this.element.style.cssText = 'position:absolute;top:10px;left:10px;color:#0f0;font-family:monospace;';
    document.body.appendChild(this.element);
  }
  
  update() {
    this.frames++;
    const now = performance.now();
    
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.element.textContent = `FPS: ${this.fps}`;
      this.frames = 0;
      this.lastTime = now;
    }
  }
}
```

### 9. Add Screenshot Feature
```javascript
// src/utils/screenshot.js
export function takeScreenshot(renderer) {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.download = `synapse-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
}

// Add button
document.getElementById('screenshot-btn').addEventListener('click', () => {
  takeScreenshot(sceneManager.renderer);
});
```

### 10. Add Preset Configurations
```javascript
// src/config/presets.js
export const PRESETS = {
  REALISTIC: {
    name: 'Realistic',
    description: 'Biologically accurate parameters',
    constants: {
      BINDING_DISTANCE: 0.6,
      UNBINDING_PROBABILITY: 0.0005,
      NT_BURST_COUNT: 8
    }
  },
  DEMO: {
    name: 'Demo Mode',
    description: 'Exaggerated for demonstrations',
    constants: {
      BINDING_DISTANCE: 1.0,
      UNBINDING_PROBABILITY: 0.002,
      NT_BURST_COUNT: 15
    }
  },
  FAST: {
    name: 'Fast Mode',
    description: 'Quick interactions for testing',
    constants: {
      BINDING_DISTANCE: 0.8,
      UNBINDING_PROBABILITY: 0.001,
      NT_BURST_COUNT: 5
    }
  }
};
```

---

## 📋 Checklist

### This Week
- [ ] Fix memory leaks in neuronSimulation.js
- [ ] Fix memory leaks in vesicleView.js
- [ ] Fix memory leaks in emotionalFace.js
- [ ] Add simple tutorial (5 steps)
- [ ] Create depression scenario
- [ ] Test on different browsers

### This Month
- [ ] Install Chart.js
- [ ] Add NT concentration chart
- [ ] Add mood state chart
- [ ] Implement drug system
- [ ] Add 3-5 common drugs
- [ ] Create challenge system
- [ ] Design 5-10 challenges
- [ ] Add keyboard shortcuts
- [ ] Add FPS counter
- [ ] Add screenshot feature

### Nice to Have
- [ ] Add preset configurations
- [ ] Add export data feature
- [ ] Add mobile touch controls
- [ ] Add dark/light theme toggle
- [ ] Add sound effects
- [ ] Add particle effects for binding

---

## 🎯 Success Criteria

### Week 1
- ✅ No memory leaks (test with 30+ min session)
- ✅ Tutorial works end-to-end
- ✅ One scenario runs successfully

### Month 1
- ✅ Charts update in real-time
- ✅ 3+ drugs implemented and working
- ✅ 5+ challenges completable
- ✅ 60 FPS maintained with 50+ NTs

---

## 💡 Pro Tips

1. **Test incrementally** - Don't build everything then test
2. **Use feature flags** - Easy to enable/disable new features
3. **Profile performance** - Use Chrome DevTools Performance tab
4. **Get feedback early** - Share with users after each feature
5. **Document as you go** - Update docs with each change

---

## 🆘 If You Get Stuck

1. **Memory leaks**: Use Chrome DevTools Memory profiler
2. **Performance**: Check spatial grid stats, reduce particle count
3. **Bugs**: Add console.logs, use debugger
4. **Design**: Look at similar educational simulations
5. **Ask for help**: Share specific error messages

---

**Start with memory leaks - it's critical for user experience!**

Good luck! 🚀
