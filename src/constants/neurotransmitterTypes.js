// Neurotransmitter type definitions for the simulation
// Exported as a named export for use in other modules

export const NEUROTRANSMITTER_TYPES = {
    DOPAMINE: {
        name: 'Dopamine',
        color: 0x9933ff, // Purple
        speed: 0.08,
        size: 0.3,
        description: 'Reward and pleasure signaling',
        polarity: 'EXCITATORY',
        moodWeights: { happiness: 0.3, arousal: 0.2, anxiety: 0 },
        reuptakeRate: 0.8,
        maoSensitive: true,
        degradationRate: 0.6
    },
    SEROTONIN: {
        name: 'Serotonin',
        color: 0xff9933, // Orange
        speed: 0.07,
        size: 0.28,
        description: 'Mood and emotional regulation',
        polarity: 'INHIBITORY',
        moodWeights: { happiness: 0.2, arousal: 0, anxiety: -0.3 },
        reuptakeRate: 0.7,
        maoSensitive: true,
        degradationRate: 0.7
    },
    GLUTAMATE: {
        name: 'Glutamate',
        color: 0x4444ff, // Blue
        speed: 0.1,
        size: 0.25,
        description: 'Primary excitatory neurotransmitter',
        polarity: 'EXCITATORY',
        moodWeights: { happiness: 0, arousal: 0.2, anxiety: 0.05 },
        reuptakeRate: 0.9,
        maoSensitive: false,
        degradationRate: 0.3
    },
    GABA: {
        name: 'GABA',
        color: 0x44ff44, // Green
        speed: 0.06,
        size: 0.27,
        description: 'Primary inhibitory neurotransmitter',
        polarity: 'INHIBITORY',
        moodWeights: { happiness: 0, arousal: -0.2, anxiety: -0.2 },
        reuptakeRate: 0.6,
        maoSensitive: false,
        degradationRate: 0.3
    },
    NOREPINEPHRINE: {
        name: 'Norepinephrine',
        color: 0xff4444, // Red
        speed: 0.09,
        size: 0.26,
        description: 'Arousal and attention',
        polarity: 'EXCITATORY',
        moodWeights: { happiness: 0, arousal: 0.3, anxiety: 0.2 },
        reuptakeRate: 0.75,
        maoSensitive: true,
        degradationRate: 0.65
    }
}; 