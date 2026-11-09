/**
 * Shared geometry and physiology parameters.
 * The synapse axis runs along +X: presynaptic terminal on the left,
 * postsynaptic spine on the right, cleft centred on the origin.
 */

export const CLEFT = {
	/** Presynaptic membrane (active zone) plane. */
	xPre: -1,
	/** Postsynaptic membrane (PSD) plane. */
	xPost: 1,
	/** Radius of the apposed membranes; particles past `escapeRadius` are lost. */
	radius: 2.6,
	escapeRadius: 3.6,
};

export const PARTICLE = {
	radius: 0.085,
	/** Base diffusion coefficient (units²/s), scaled per transmitter. */
	diffusion: 0.55,
	/** Gentle bias toward the postsynaptic side (units/s) so bursts read clearly. */
	drift: 0.55,
	maxCount: 600,
};

export const RECEPTORS = {
	rings: [
		{ r: 0, n: 1 },
		{ r: 0.55, n: 6 },
		{ r: 1.1, n: 10 },
		{ r: 1.65, n: 13 },
	],
	captureRadius: 0.32,
	/** Receptor recovery time after a transmitter leaves (s). */
	refractory: 0.25,
	/** Fraction of receptors occupied by the antagonist when enabled. */
	antagonistFraction: 0.7,
};

export const TRANSPORTERS = {
	pre: { r: 2.15, n: 9, x: -1 },
	post: { r: 2.3, n: 7, x: 1 },
	captureRadius: 0.6,
};

export const ENZYMES = {
	count: 9,
	captureRadius: 0.5,
};

export const VESICLES = {
	count: 26,
	radius: 0.3,
	transmittersPerVesicle: 11,
	dockTime: 0.2,
	fuseTime: 0.15,
	/** Time an emptied vesicle takes to be recycled and refilled (s). */
	refillTime: 3.2,
};

export const ACTION_POTENTIAL = {
	/** Axon conduction time shown on screen (s). */
	travelTime: 0.45,
	/** Delay between AP arrival and fusion (Ca²⁺ entry). */
	calciumDelay: 0.08,
	defaultVesicles: 3,
};

export const MEMBRANE = {
	rest: -70,
	threshold: -50,
	peak: 30,
	reset: -75,
	/** Membrane time constant (s). */
	tau: 0.22,
	/** Conductance per bound receptor at efficacy 1. */
	conductance: 0.3,
	excitatoryReversal: 0,
	inhibitoryReversal: -80,
	refractory: 0.18,
};

export const TONE = {
	/** Time constant of the slow per-transmitter "tone" integrator (s). */
	tau: 4,
	/** Bound receptors that correspond to full tone. */
	saturation: 9,
};

export const HISTORY = {
	sampleInterval: 0.05,
	length: 400, // 20 s window
};
