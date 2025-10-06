// Bootstrap script: initializes scene, simulation, controls, and face presentation
import { NeuronSimulation } from './src/simulation/neuronSimulation.js';
import { SceneManager } from './src/render/sceneManager.js';
import { setupControls } from './src/ui/controls.js';
import { createEventBus } from './src/utils/eventBus.js';
import { EmotionalFace } from './emotionalFace.js';
import { VesicleView } from './src/render/vesicleView.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const sceneManager = new SceneManager();
        const eventBus = createEventBus();
        const simulation = new NeuronSimulation(sceneManager, eventBus);
        
        // Create vesicle view for inside perspective
        const vesicleView = new VesicleView(sceneManager.scene);
        
        setupControls(simulation, eventBus, sceneManager, vesicleView);

        // Presentation: emotional face subscribes to mood updates
        const face = new EmotionalFace();
        eventBus.on('sim:moodUpdated', (mood) => {
            try { face.updateExpression(mood); } catch (e) { console.error(e); }
        });
        
        sceneManager.startAnimationLoop(() => {
            simulation.update();
            vesicleView.update();
        });
        
        console.log('Initialization complete - Starting inside vesicle view');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 