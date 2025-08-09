import * as THREE from 'three';
import { NEUROTRANSMITTER_TYPES } from '../constants/neurotransmitterTypes.js';

export class Neurotransmitter {
    constructor(position, type) {
        const ntProperties = NEUROTRANSMITTER_TYPES[type];
        const geometry = new THREE.SphereGeometry(ntProperties.size, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: ntProperties.color,
            shininess: 100,
            emissive: ntProperties.color,
            emissiveIntensity: 0.2
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.type = type;
        this.properties = ntProperties;
        this.bound = false;
        this.reuptaking = false;

        // Create more directed movement toward receptors
        const spread = 0.3;

        this.velocity = new THREE.Vector3(
            ntProperties.speed + Math.random() * 0.05,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
    }

    update() {
        if (!this.bound && !this.reuptaking) {
            // Add slight wavering motion while maintaining forward direction
            this.velocity.y += (Math.random() - 0.5) * 0.01;
            this.velocity.z += (Math.random() - 0.5) * 0.01;
            
            // Clamp vertical and depth movement to maintain focused path
            this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -0.05, 0.05);
            this.velocity.z = THREE.MathUtils.clamp(this.velocity.z, -0.05, 0.05);
            
            this.mesh.position.add(this.velocity);
        }
    }
} 