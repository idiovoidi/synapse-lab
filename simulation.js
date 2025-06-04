import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EmotionalFace } from './emotionalFace.js';
import { Neurotransmitter } from './biological/Neurotransmitters/Neurotransmitter.js';
import { StorageVesicle } from './storageVesicle.js';
import { NeuronModels } from './neuronModels.js';
import { SceneManager } from './visualization/SceneManager.js';
import { AnimationManager } from './utils/animationUtils.js';
import { SynapticStructure } from './models/SynapticStructure.js';
import { Receptor } from './models/Receptor.js';
import { NEUROTRANSMITTER_TYPES, ANIMATION_SETTINGS } from './constants/config.js';

class NeuronSimulation {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.sceneManager = new SceneManager(this.container);
        this.animationManager = new AnimationManager();
        
        this.synapticStructure = new SynapticStructure(this.sceneManager.scene);
        this.emotionalFace = new EmotionalFace();
        this.sceneManager.scene.add(this.emotionalFace.getObject());
        
        this.neurotransmitters = new Set();
        this.receptors = new Set();
        
        this.setupControls();
        this.sceneManager.setAnimationCallback(this.animate.bind(this));
        this.sceneManager.start();
    }

    setupControls() {
        const releaseBtn = document.getElementById('releaseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const ntSelect = document.getElementById('ntType');

        releaseBtn.addEventListener('click', () => {
            const type = ntSelect.value;
            this.releaseNeurotransmitters(type);
        });

        resetBtn.addEventListener('click', () => this.reset());
    }

    releaseNeurotransmitters(type) {
        const pattern = this.determineReleasePattern(type);
        switch(pattern) {
            case 'burst':
                this.burstRelease(type);
                break;
            case 'continuous':
                this.startContinuousRelease(type);
                break;
            default:
                this.singleVesicleRelease(type);
        }
    }

    determineReleasePattern(type) {
        const ntConfig = NEUROTRANSMITTER_TYPES[type];
        if (ntConfig.releaseRate > 0.8) return 'burst';
        if (ntConfig.releaseRate > 0.6) return 'continuous';
        return 'single';
    }

    burstRelease(type) {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.singleVesicleRelease(type, 1.0);
            }, i * 100);
        }
    }

    startContinuousRelease(type) {
        const continuousRelease = () => {
            if (Math.random() < NEUROTRANSMITTER_TYPES[type].releaseRate) {
                this.singleVesicleRelease(type, 0.5);
            }
            setTimeout(continuousRelease, 500);
        };
        continuousRelease();
    }

    singleVesicleRelease(type, amount = 1.0) {
        // Find an available vesicle near an active zone
        const vesicles = Array.from(this.synapticStructure.vesicles);
        const vesicle = vesicles.find(v => v.position.y < 0);
        
        if (vesicle) {
            const position = vesicle.position.clone();
            this.createNeurotransmitterBurst(position, type, amount);
            
            // Animate vesicle disappearance
            const fadeOut = (progress) => {
                vesicle.material.opacity = 1 - progress;
                if (progress >= 1) {
                    this.synapticStructure.vesicles.delete(vesicle);
                    vesicle.parent.remove(vesicle);
                }
            };
            
            this.animationManager.addAnimation('vesicle-fade-' + Date.now(), {
                duration: 500,
                onUpdate: fadeOut
            });
        }
    }

    createNeurotransmitterBurst(position, type, amount = 1.0) {
        const count = Math.floor(10 * amount);
        for (let i = 0; i < count; i++) {
            const nt = new Neurotransmitter(type, position, this.sceneManager.scene);
            this.neurotransmitters.add(nt);
            
            // Add initial velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.2;
            nt.velocity.set(
                Math.cos(angle) * speed,
                -speed,
                Math.sin(angle) * speed
            );
        }
    }

    reset() {
        // Clear neurotransmitters
        this.neurotransmitters.forEach(nt => {
            nt.dispose();
        });
        this.neurotransmitters.clear();

        // Reset receptors
        this.receptors.forEach(receptor => {
            receptor.updateSensitivity(1.0);
        });

        // Reset emotional face
        this.emotionalFace.setEmotion('neutral');
    }

    animate() {
        const deltaTime = 16; // ~60fps

        // Update neurotransmitters
        this.neurotransmitters.forEach(nt => {
            nt.update(deltaTime);
        });

        // Check for binding
        this.checkBinding();

        // Check for reuptake
        this.checkReuptake();

        // Update animations
        this.animationManager.update();

        // Update effects
        this.updateEffects();
    }

    checkBinding() {
        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.beingReuptaken) {
                this.receptors.forEach(receptor => {
                    if (!receptor.bound) {
                        const distance = nt.mesh.position.distanceTo(receptor.group.position);
                        if (distance < 0.3) {
                            nt.bind(receptor);
                            receptor.bind(nt);
                        }
                    }
                });
            }
        });
    }

    checkReuptake() {
        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.beingReuptaken && Math.random() < nt.reuptakeRate) {
                const effect = nt.startReuptake();
                if (effect) {
                    this.animationManager.addAnimation('reuptake-' + Date.now(), effect);
                }
            }
        });
    }

    updateEffects() {
        // Count active neurotransmitters by type
        const activeNTs = {};
        this.neurotransmitters.forEach(nt => {
            if (nt.bound) {
                activeNTs[nt.type] = (activeNTs[nt.type] || 0) + 1;
            }
        });

        // Update emotional face
        this.emotionalFace.updateFromNeurotransmitters(Array.from(this.neurotransmitters));

        // Update visual effects
        this.updateVisualEffects(activeNTs);
    }

    updateVisualEffects(activeNTs) {
        // Adjust scene lighting based on activity
        const totalActive = Object.values(activeNTs).reduce((sum, count) => sum + count, 0);
        const intensity = 0.5 + Math.min(totalActive * 0.1, 0.5);
        this.sceneManager.lights.main.intensity = intensity;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const simulation = new NeuronSimulation();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 