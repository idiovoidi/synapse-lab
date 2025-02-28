import * as THREE from 'three';
import { NEUROTRANSMITTER_TYPES } from '../constants/config';
import { createParticleEffect } from '../utils/animationUtils';
import { randomInRange } from '../utils/mathUtils';

export class Neurotransmitter {
    constructor(type, position, scene) {
        this.type = type;
        this.scene = scene;
        this.bound = false;
        this.beingReuptaken = false;
        this.mesh = this.createMesh();
        this.mesh.position.copy(position);
        
        this.velocity = new THREE.Vector3();
        this.diffusionSpeed = NEUROTRANSMITTER_TYPES[type].diffusionSpeed;
        this.reuptakeRate = NEUROTRANSMITTER_TYPES[type].reuptakeRate;
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshPhongMaterial({
            color: NEUROTRANSMITTER_TYPES[this.type].color,
            transparent: true,
            opacity: 0.8
        });
        
        return new THREE.Mesh(geometry, material);
    }

    update(deltaTime) {
        if (!this.bound && !this.beingReuptaken) {
            // Apply random diffusion movement
            this.velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ));
            
            // Dampen velocity
            this.velocity.multiplyScalar(0.95);
            
            // Apply velocity to position
            this.mesh.position.add(
                this.velocity.clone().multiplyScalar(deltaTime * this.diffusionSpeed)
            );
        }
    }

    bind(receptor) {
        this.bound = true;
        this.boundReceptor = receptor;
        
        // Create binding effect
        const effect = createParticleEffect(this.scene, {
            position: this.mesh.position,
            color: NEUROTRANSMITTER_TYPES[this.type].color,
            count: 5,
            size: 0.05,
            speed: 0.5,
            duration: 500
        });
        
        return effect;
    }

    unbind() {
        this.bound = false;
        this.boundReceptor = null;
        this.velocity.set(
            randomInRange(-0.1, 0.1),
            randomInRange(-0.1, 0.1),
            randomInRange(-0.1, 0.1)
        );
    }

    startReuptake(transporter) {
        this.beingReuptaken = true;
        this.targetTransporter = transporter;
        
        // Create reuptake effect
        const effect = createParticleEffect(this.scene, {
            position: this.mesh.position,
            color: 0x3498db,
            count: 8,
            size: 0.03,
            speed: 0.3,
            duration: 800
        });
        
        return effect;
    }

    dispose() {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
} 