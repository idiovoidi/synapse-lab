import { NEUROTRANSMITTER_TYPES } from '../constants/neurotransmitterTypes.js';

export function computeMoodSummary(neurotransmitters) {
    const mood = { happiness: 0, arousal: 0, anxiety: 0 };
    if (!Array.isArray(neurotransmitters)) return mood;
    for (const nt of neurotransmitters) {
        if (!nt || !nt.type) continue;
        const weights = NEUROTRANSMITTER_TYPES[nt.type]?.moodWeights;
        if (!weights) continue;
        mood.happiness += weights.happiness || 0;
        mood.arousal += weights.arousal || 0;
        mood.anxiety += weights.anxiety || 0;
    }
    return mood;
}


