import { NEUROTRANSMITTER_TYPES } from "../constants/neurotransmitterTypes.js";

export function computeMoodSummary(neurotransmitters) {
	const mood = { happiness: 0, arousal: 0, anxiety: 0 };
	if (!Array.isArray(neurotransmitters)) return mood;

	for (const nt of neurotransmitters) {
		if (!nt?.type) continue;
		const weights = NEUROTRANSMITTER_TYPES[nt.type]?.moodWeights;
		if (!weights) continue;
		mood.happiness += weights.happiness || 0;
		mood.arousal += weights.arousal || 0;
		mood.anxiety += weights.anxiety || 0;
	}

	// Normalize to reasonable range (-1 to 1) based on typical NT count
	// With ~5-10 NTs active, we want noticeable expression changes
	const scaleFactor = 0.15; // Adjust this to tune sensitivity
	mood.happiness = Math.max(-1, Math.min(1, mood.happiness * scaleFactor));
	mood.arousal = Math.max(-1, Math.min(1, mood.arousal * scaleFactor));
	mood.anxiety = Math.max(-1, Math.min(1, mood.anxiety * scaleFactor));

	return mood;
}
