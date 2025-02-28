import * as THREE from 'three';
import { RECEPTOR_TYPES } from '../constants/config';
import { createPulseAnimation } from '../utils/animationUtils';

export class Receptor {
    constructor(type, position, scene) {
        this.type = type;
        this.scene = scene;
        this.bound = false;
        this.sensitivity = RECEPTOR_TYPES[type].sensitivity;
        this.group = this.createReceptorGroup();
        this.group.position.copy(position);
    }

    createReceptorGroup() {
        const group = new THREE.Group();
        
        // Create receptor body
        const bodyGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: RECEPTOR_TYPES[this.type].color,
            transparent: true,
            opacity: 0.9
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(this.body);

        // Add binding site
        const bindingSiteGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const bindingSiteMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.6
        });
        this.bindingSite = new THREE.Mesh(bindingSiteGeometry, bindingSiteMaterial);
        this.bindingSite.position.y = 0.2;
        group.add(this.bindingSite);

        // Add transmembrane domains
        const domainCount = 7;
        const domainGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
        const domainMaterial = new THREE.MeshPhongMaterial({
            color: RECEPTOR_TYPES[this.type].color,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < domainCount; i++) {
            const domain = new THREE.Mesh(domainGeometry, domainMaterial);
            domain.position.set(
                ((i - (domainCount - 1) / 2) * 0.06),
                -0.2,
                0
            );
            group.add(domain);
        }

        return group;
    }

    bind(neurotransmitter) {
        this.bound = true;
        this.boundNeurotransmitter = neurotransmitter;
        
        // Create binding animation
        const animation = createPulseAnimation(this.bindingSite, {
            minScale: 0.8,
            maxScale: 1.2,
            duration: 500
        });
        
        // Change binding site color
        this.bindingSite.material.color.setHex(
            RECEPTOR_TYPES[this.type].color
        );
        
        return animation;
    }

    unbind() {
        this.bound = false;
        this.boundNeurotransmitter = null;
        
        // Reset binding site color
        this.bindingSite.material.color.setHex(0xffffff);
        
        // Create unbinding animation
        return createPulseAnimation(this.bindingSite, {
            minScale: 1.2,
            maxScale: 0.8,
            duration: 500
        });
    }

    updateSensitivity(value) {
        this.sensitivity = Math.max(0.1, Math.min(1.0, value));
        
        // Update visualization
        this.body.material.opacity = 0.5 + (this.sensitivity * 0.4);
    }

    dispose() {
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }
        
        this.group.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                child.material.dispose();
            }
        });
    }
} 