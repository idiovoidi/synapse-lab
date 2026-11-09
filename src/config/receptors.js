/**
 * Receptor subtypes.
 *
 * Each subtype recognises exactly one ligand. Ionotropic receptors are ion
 * channels that change the membrane potential directly and quickly.
 * Metabotropic (GPCR) receptors act through G-proteins: their effect builds
 * and fades slowly via a second-messenger pool (see `MESSENGER` in
 * synapse.js).
 *
 * Effectors:
 *  - "cation"   Na⁺/K⁺ (and Ca²⁺) channel, reverses near 0 mV → excitatory
 *  - "chloride" Cl⁻ channel, reverses near −80 mV → inhibitory
 *  - "Gs"/"Gq"  stimulatory G-protein cascades → slow depolarisation
 *  - "Gi"       inhibitory G-protein → opens GIRK K⁺ channels (−90 mV)
 */

/** @typedef {"cation" | "chloride" | "Gs" | "Gq" | "Gi"} Effector */

/**
 * @typedef {object} ReceptorType
 * @property {string} key
 * @property {string} name
 * @property {string} ligand    Neurotransmitter key this receptor binds.
 * @property {"ionotropic" | "metabotropic"} kind
 * @property {Effector} effector
 * @property {number} affinity  Probability of binding per contact.
 * @property {number} dwell     Mean bound time (s, simulation time).
 * @property {number} gain      Relative conductance (ionotropic) or messenger drive (GPCR).
 * @property {boolean} [mgBlock] Voltage-dependent Mg²⁺ block (NMDA).
 * @property {string} note
 */

/** @type {Record<string, ReceptorType>} */
export const RECEPTOR_TYPES = {
	AMPA: {
		key: "AMPA",
		name: "AMPA",
		ligand: "GLUTAMATE",
		kind: "ionotropic",
		effector: "cation",
		affinity: 0.85,
		dwell: 0.6,
		gain: 1.5,
		note: "Fast Na⁺ channel; carries most excitatory current.",
	},
	NMDA: {
		key: "NMDA",
		name: "NMDA",
		ligand: "GLUTAMATE",
		kind: "ionotropic",
		effector: "cation",
		affinity: 0.9,
		dwell: 2,
		gain: 4,
		mgBlock: true,
		note: "Plugged by Mg²⁺ at rest; opens only when the cell is already depolarised (coincidence detector).",
	},
	GABA_A: {
		key: "GABA_A",
		name: "GABA-A",
		ligand: "GABA",
		kind: "ionotropic",
		effector: "chloride",
		affinity: 0.8,
		dwell: 1,
		gain: 1,
		note: "Cl⁻ channel; target of benzodiazepines.",
	},
	GABA_B: {
		key: "GABA_B",
		name: "GABA-B",
		ligand: "GABA",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.7,
		dwell: 1.4,
		gain: 1,
		note: "Gi-coupled; presynaptically it reduces release.",
	},
	MGLUR2: {
		key: "MGLUR2",
		name: "mGluR2/3",
		ligand: "GLUTAMATE",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.7,
		dwell: 1.4,
		gain: 1,
		note: "Presynaptic Gi autoreceptor that throttles glutamate release.",
	},
	D1: {
		key: "D1",
		name: "D1",
		ligand: "DOPAMINE",
		kind: "metabotropic",
		effector: "Gs",
		affinity: 0.6,
		dwell: 1.6,
		gain: 1,
		note: "Gs-coupled: raises cAMP and excitability.",
	},
	D2: {
		key: "D2",
		name: "D2",
		ligand: "DOPAMINE",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.75,
		dwell: 1.6,
		gain: 1,
		note: "Gi-coupled: opens GIRK K⁺ channels. Main antipsychotic target; also a presynaptic autoreceptor.",
	},
	HT1A: {
		key: "HT1A",
		name: "5-HT1A",
		ligand: "SEROTONIN",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.75,
		dwell: 1.8,
		gain: 1,
		note: "Gi-coupled and inhibitory. Somatodendritic 5-HT1A autoreceptors slow raphe firing.",
	},
	HT1B: {
		key: "HT1B",
		name: "5-HT1B",
		ligand: "SEROTONIN",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.7,
		dwell: 1.6,
		gain: 1,
		note: "Terminal autoreceptor that reduces serotonin release.",
	},
	HT2A: {
		key: "HT2A",
		name: "5-HT2A",
		ligand: "SEROTONIN",
		kind: "metabotropic",
		effector: "Gq",
		affinity: 0.65,
		dwell: 1.6,
		gain: 1,
		note: "Gq-coupled and excitatory. Blocked by atypical antipsychotics; target of psychedelics.",
	},
	ALPHA1: {
		key: "ALPHA1",
		name: "α1",
		ligand: "NOREPINEPHRINE",
		kind: "metabotropic",
		effector: "Gq",
		affinity: 0.65,
		dwell: 1.4,
		gain: 1,
		note: "Gq-coupled; excitatory.",
	},
	ALPHA2: {
		key: "ALPHA2",
		name: "α2",
		ligand: "NOREPINEPHRINE",
		kind: "metabotropic",
		effector: "Gi",
		affinity: 0.75,
		dwell: 1.4,
		gain: 1,
		note: "Gi-coupled; the main noradrenergic autoreceptor.",
	},
	BETA1: {
		key: "BETA1",
		name: "β1",
		ligand: "NOREPINEPHRINE",
		kind: "metabotropic",
		effector: "Gs",
		affinity: 0.65,
		dwell: 1.4,
		gain: 1,
		note: "Gs-coupled; excitatory.",
	},
};

/** True when the receptor's net action depolarises the cell. */
export function isExcitatory(type) {
	return (
		type.effector === "cation" ||
		type.effector === "Gs" ||
		type.effector === "Gq"
	);
}

/**
 * Fraction of NMDA channels not blocked by Mg²⁺ (Jahr & Stevens 1990,
 * [Mg²⁺]o = 1 mM).
 * @param {number} v Membrane potential (mV).
 */
export function nmdaUnblocked(v) {
	return 1 / (1 + Math.exp(-0.062 * v) / 3.57);
}
