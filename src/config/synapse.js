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

/** Presynaptic autoreceptors ring the active zone. */
export const AUTORECEPTORS = {
	r: 1.9,
	n: 8,
	/** Maximum fractional cut in release probability when all are active. */
	brake: 0.75,
};

export const TRANSPORTERS = {
	/** Neuronal transporters on the presynaptic membrane (DAT, SERT, NET, EAAT, GAT). */
	pre: { r: 2.15, n: 9, x: -1 },
	/** Postsynaptic neuronal transporters (amino-acid synapses only). */
	post: { r: 2.3, n: 7, x: 1 },
	/** Astrocyte transporters around the cleft rim (EAAT1/2, GAT-3). */
	glia: { r: 2.85, n: 9, arc: Math.PI * 0.85 },
	captureRadius: 0.6,
};

/** Extracellular COMT on the glial / postsynaptic side of the rim. */
export const ENZYMES = {
	count: 9,
	captureRadius: 0.55,
};

/** Astrocyte process wrapping the back of the cleft (shared with the renderer). */
export const ASTROCYTE = {
	radius: 3.05,
	arc: Math.PI * 1.0,
};

/** Probabilistic vesicle release. */
export const RELEASE = {
	/** Docking sites at the active zone (readily releasable pool). */
	sites: 8,
	/** Default per-vesicle fusion probability per action potential. */
	probability: 0.35,
};

/**
 * Presynaptic cytosolic transmitter: replenished by synthesis and reuptake,
 * drained by vesicle filling (VMAT/VGLUT/VGAT) and, for monoamines, by
 * mitochondrial MAO.
 */
export const CYTOSOL = {
	synthesis: 8,
	capacity: 150,
	/** MAO breakdown rate (1/s) for monoamines. */
	mao: 0.15,
	/** Exponent linking cytosolic level to vesicle fill. */
	fillExponent: 0.6,
	minFill: 3,
	maxFill: 20,
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
};

export const MEMBRANE = {
	rest: -70,
	threshold: -50,
	peak: 30,
	reset: -75,
	/** Membrane time constant (s). */
	tau: 0.22,
	/** Conductance per bound ionotropic receptor at gain 1. */
	conductance: 0.3,
	excitatoryReversal: 0,
	inhibitoryReversal: -80,
	/** GIRK K⁺ channels opened by Gi-coupled receptors. */
	potassiumReversal: -90,
	refractory: 0.18,
};

/**
 * Second-messenger pools driven by GPCRs. Each pool rises and falls slowly,
 * so metabotropic effects lag binding, as real G-protein cascades do.
 */
export const MESSENGER = {
	rise: 0.5,
	decay: 2,
	/** Conductance per unit of messenger (one fully bound receptor). */
	conductance: 0.05,
};

/** Smoothing time constant for the postsynaptic firing-rate estimate (s). */
export const FIRING_RATE_TAU = 3;

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
