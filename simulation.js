// Bootstrap script: initializes scene, simulation, controls, and face presentation
import { NeuronSimulation } from './src/simulation/neuronSimulation.js';
import { SceneManager } from './src/render/sceneManager.js';
import { setupControls } from './src/ui/controls.js';
import { createEventBus } from './src/utils/eventBus.js';
import { EmotionalFace } from './emotionalFace.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const sceneManager = new SceneManager();
        const eventBus = createEventBus();
        const simulation = new NeuronSimulation(sceneManager, eventBus);
        setupControls(simulation, eventBus);

        // Presentation: emotional face subscribes to mood updates
        const face = new EmotionalFace();
        eventBus.on('sim:moodUpdated', (mood) => {
            try { face.updateExpression(mood); } catch (e) { console.error(e); }
        });
        sceneManager.startAnimationLoop(() => simulation.update());
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 