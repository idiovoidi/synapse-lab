import * as THREE from 'three';
import { EmotionalFace } from './emotionalFace.js';
import { NEUROTRANSMITTER_TYPES } from './src/constants/neurotransmitterTypes.js';
import { Neurotransmitter } from './src/models/neurotransmitter.js';
import { StorageVesicle } from './src/models/storageVesicle.js';
import { NeuronSimulation } from './src/simulation/neuronSimulation.js';
import { SceneManager } from './src/render/sceneManager.js';
import { setupControls } from './src/ui/controls.js';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const sceneManager = new SceneManager();
        const simulation = new NeuronSimulation(sceneManager);
        setupControls(simulation);
        sceneManager.startAnimationLoop(() => simulation.update());
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 