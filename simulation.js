// Bootstrap script: initializes scene, simulation, controls, and face presentation
import { NeuronSimulation } from './src/simulation/neuronSimulation.js';
import { SceneManager } from './src/render/sceneManager.js';
import { setupControls } from './src/ui/controls.js';
import { createEventBus } from './src/utils/eventBus.js';
import { EmotionalFace } from './emotionalFace.js';
import { VesicleView } from './src/render/vesicleView.js';
import { SynapticCleftStructure } from './src/render/synapticCleftStructure.js';
import { TutorialManager } from './src/tutorial/tutorialManager.js';
import { HeartSimulation } from './src/physiology/heartSimulation.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const sceneManager = new SceneManager();
        const eventBus = createEventBus();
        
        // Create realistic synaptic cleft structure
        const cleftStructure = new SynapticCleftStructure(sceneManager.scene);
        
        const simulation = new NeuronSimulation(sceneManager, eventBus, cleftStructure);
        
        // Create vesicle view for inside perspective
        const vesicleView = new VesicleView(sceneManager.scene);
        
        setupControls(simulation, eventBus, sceneManager, vesicleView);

        // Presentation: emotional face subscribes to mood updates
        const face = new EmotionalFace();
        eventBus.on('sim:moodUpdated', (mood) => {
            try { face.updateExpression(mood); } catch (e) { console.error(e); }
        });
        
        // Initialize tutorial system
        const tutorial = new TutorialManager(simulation, eventBus, sceneManager);
        
        // Initialize heart simulation
        const heart = new HeartSimulation(sceneManager.scene, eventBus);
        
        sceneManager.startAnimationLoop(() => {
            simulation.update();
            vesicleView.update();
            heart.update(); // Update heart animation
        });
        
        console.log('Initialization complete - Heart simulation active');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 