export const NEUROTRANSMITTER_TYPES = {
    DOPAMINE: {
        name: 'DOPAMINE',
        color: 0x9b59b6,
        releaseRate: 0.8,
        reuptakeRate: 0.6,
        diffusionSpeed: 0.5
    },
    SEROTONIN: {
        name: 'SEROTONIN',
        color: 0x3498db,
        releaseRate: 0.6,
        reuptakeRate: 0.7,
        diffusionSpeed: 0.4
    },
    GLUTAMATE: {
        name: 'GLUTAMATE',
        color: 0xe74c3c,
        releaseRate: 1.0,
        reuptakeRate: 0.8,
        diffusionSpeed: 0.6
    },
    GABA: {
        name: 'GABA',
        color: 0x2ecc71,
        releaseRate: 0.7,
        reuptakeRate: 0.7,
        diffusionSpeed: 0.4
    },
    NOREPINEPHRINE: {
        name: 'NOREPINEPHRINE',
        color: 0xf1c40f,
        releaseRate: 0.9,
        reuptakeRate: 0.5,
        diffusionSpeed: 0.5
    }
};

export const RECEPTOR_TYPES = {
    AMPA: {
        name: 'AMPA',
        color: 0x3498db,
        size: 0.2,
        sensitivity: 0.8
    },
    NMDA: {
        name: 'NMDA',
        color: 0xe74c3c,
        size: 0.25,
        sensitivity: 0.7
    }
};

export const GEOMETRY_CONSTANTS = {
    SYNAPTIC_CLEFT: {
        WIDTH: 4,
        HEIGHT: 0.04,  // 40nm spacing
        DEPTH: 3
    },
    VESICLE: {
        RADIUS: 0.2,
        SEGMENTS: 16
    },
    TERMINAL: {
        BULB_RADIUS: 3,
        NECK_WIDTH: 1.2
    }
};

export const MATERIAL_PROPERTIES = {
    MEMBRANE: {
        color: 0xe8d5b7,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    },
    VESICLE: {
        color: 0x98fb98,
        transparent: true,
        opacity: 0.8
    },
    CALCIUM_CHANNEL: {
        color: 0x4499ff,
        transparent: true,
        opacity: 0.9
    }
};

export const ANIMATION_SETTINGS = {
    RELEASE_DURATION: 1000,
    REUPTAKE_DURATION: 800,
    DEGRADATION_DURATION: 600,
    ACTION_POTENTIAL_DURATION: 1500
};

export const SIMULATION_DEFAULTS = {
    CAMERA_POSITION: { x: 10, y: 5, z: 15 },
    LIGHT_INTENSITY: 1.0,
    AMBIENT_LIGHT_INTENSITY: 0.4,
    UPDATE_INTERVAL: 16  // ~60fps
}; 