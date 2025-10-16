import * as THREE from 'three';
import { NEUROTRANSMITTER_TYPES } from '../constants/neurotransmitterTypes.js';
import * as CONST from '../constants/simulationConstants.js';

export class Neurotransmitter {
    constructor(position, type) {
        const ntProperties = NEUROTRANSMITTER_TYPES[type];
        const geometry = new THREE.SphereGeometry(ntProperties.size, 20, 20);
        const material = new THREE.MeshStandardMaterial({
            color: ntProperties.color,
            roughness: 0.3,
            metalness: 0.4,
            emissive: ntProperties.color,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.95
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.type = type;
        this.properties = ntProperties;
        this.bound = false;
        this.reuptaking = false;

        // Create more directed movement toward receptors (positive X direction toward postsynaptic side)
        const spread = 0.2;

        this.velocity = new THREE.Vector3(
            ntProperties.speed + Math.random() * 0.03, // Move toward receptors (positive X)
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
    }

    update() {
        if (!this.bound && !this.reuptaking) {
            // Add slight wavering motion while maintaining forward direction
            this.velocity.y += (Math.random() - 0.5) * 0.008;
            this.velocity.z += (Math.random() - 0.5) * 0.008;
            
            // Clamp vertical and depth movement to maintain focused path
            this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -0.04, 0.04);
            this.velocity.z = THREE.MathUtils.clamp(this.velocity.z, -0.04, 0.04);
            
            // Add slight attraction toward receptor plane (x=4)
            const targetX = 4;
            const distanceToTarget = targetX - this.mesh.position.x;
            if (distanceToTarget > 0) {
                this.velocity.x += distanceToTarget * 0.001; // Gentle acceleration toward receptors
            }
            
            this.mesh.position.add(this.velocity);
            
            // Enforce boundaries (keep in synaptic cleft)
            this.mesh.position.y = THREE.MathUtils.clamp(
                this.mesh.position.y,
                CONST.BOUNDARY_LIMITS.y.min,
                CONST.BOUNDARY_LIMITS.y.max
            );
            this.mesh.position.z = THREE.MathUtils.clamp(
                this.mesh.position.z,
                CONST.BOUNDARY_LIMITS.z.min,
                CONST.BOUNDARY_LIMITS.z.max
            );
            
            // Bounce back if going too far past receptors
            if (this.mesh.position.x > CONST.BOUNDARY_LIMITS.xMax) {
                this.velocity.x *= -0.5;
                this.mesh.position.x = CONST.BOUNDARY_LIMITS.xMax;
            }
            
            // Add pulsing glow effect
            const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 0.2;
            this.mesh.material.emissiveIntensity = pulse;
        }
    }
} 