import * as THREE from 'three';

class Neurotransmitter {
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
        const targetX = 4;
        const directionX = targetX - position.x;
        const spread = 0.3;

        this.velocity = new THREE.Vector3(
            ntProperties.speed + Math.random() * 0.05,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
        );
    }

    update() {
        if (!this.bound && !this.reuptaking) {
            // Update position based on velocity
            this.mesh.position.add(this.velocity);

            // Add some random movement
            this.velocity.y += (Math.random() - 0.5) * 0.01;
            this.velocity.z += (Math.random() - 0.5) * 0.01;

            // Add slight attraction toward receptors
            const targetX = 4;
            const directionX = targetX - this.mesh.position.x;
            this.velocity.x += directionX * 0.001;

            // Add slight downward force to keep particles in view
            if (Math.abs(this.mesh.position.y) > 3) {
                this.velocity.y *= -0.5;
            }
            if (Math.abs(this.mesh.position.z) > 3) {
                this.velocity.z *= -0.5;
            }

            // Damping
            this.velocity.multiplyScalar(0.99);
        }
    }
}

const NEUROTRANSMITTER_TYPES = {
    DOPAMINE: {
        name: 'Dopamine',
        color: 0x9933ff, // Purple
        speed: 0.12,
        size: 0.25,
        description: 'Reward and pleasure signaling',
        reuptakeRate: 0.8,
        maoSensitive: true,
        degradationRate: 0.6,
        synergies: {
            NOREPINEPHRINE: {
                effect: 'reward_enhancement',
                multiplier: 1.5
            }
        },
        antagonists: ['GABA']
    },
    SEROTONIN: {
        name: 'Serotonin',
        color: 0xff9933, // Orange
        speed: 0.1,
        size: 0.22,
        description: 'Mood and emotional regulation',
        reuptakeRate: 0.7,
        maoSensitive: true,
        degradationRate: 0.7,
        synergies: {
            GABA: {
                effect: 'anxiety_reduction',
                multiplier: 1.3
            }
        },
        antagonists: ['NOREPINEPHRINE']
    },
    GLUTAMATE: {
        name: 'Glutamate',
        color: 0x4444ff, // Blue
        speed: 0.15,
        size: 0.2,
        description: 'Primary excitatory neurotransmitter',
        reuptakeRate: 0.9,
        maoSensitive: false,
        degradationRate: 0.3
    },
    GABA: {
        name: 'GABA',
        color: 0x44ff44, // Green
        speed: 0.08,
        size: 0.23,
        description: 'Primary inhibitory neurotransmitter',
        reuptakeRate: 0.6,
        maoSensitive: false,
        degradationRate: 0.3
    },
    NOREPINEPHRINE: {
        name: 'Norepinephrine',
        color: 0xff4444, // Red
        speed: 0.13,
        size: 0.21,
        description: 'Arousal and attention',
        reuptakeRate: 0.75,
        maoSensitive: true,
        degradationRate: 0.65
    }
};

export { Neurotransmitter, NEUROTRANSMITTER_TYPES }; 