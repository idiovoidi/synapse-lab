/**
 * Neurotransmitter catalogue and the synapse "recipe" for each one.
 *
 * Following Dale's principle, choosing a transmitter chooses a synapse type:
 * the presynaptic neuron releases that transmitter, and the postsynaptic
 * membrane carries the receptor subtypes that recognise it.
 *
 * Kinetic values are in simulation units (seconds, scene units), stretched so
 * effects are visible at human timescales. Real synaptic events take
 * milliseconds; the relative differences are what matter.
 */

/**
 * @typedef {object} Neurotransmitter
 * @property {string} key
 * @property {string} name
 * @property {string} short       Compact label.
 * @property {string} color       CSS hex colour used in the scene and HUD.
 * @property {string} synapse     Name of the synapse type.
 * @property {string} role
 * @property {string} summary
 * @property {Array<[string, number]>} postsynaptic  Receptor subtype mix (fractions sum to 1).
 * @property {string} transporter Plasma-membrane transporter that clears it.
 * @property {string} clearance
 * @property {number} diffusion   Relative diffusion coefficient.
 * @property {number} reuptake    Transporter capture rate (1/s near a transporter).
 * @property {number} enzymatic   Extracellular enzyme rate (1/s near an enzyme); 0 = none.
 * @property {{happiness:number, arousal:number, anxiety:number}} mood
 *   Illustrative contribution to the mood display (not a clinical model).
 */

/** @type {Record<string, Neurotransmitter>} */
export const NEUROTRANSMITTERS = {
	GLUTAMATE: {
		key: "GLUTAMATE",
		name: "Glutamate",
		short: "Glu",
		color: "#5b8cff",
		synapse: "Glutamatergic",
		role: "Primary excitatory signal",
		summary:
			"The brain's main fast excitatory transmitter. AMPA receptors depolarise the cell within milliseconds; NMDA receptors join in only once it is already depolarised.",
		postsynaptic: [
			["AMPA", 0.6],
			["NMDA", 0.4],
		],
		transporter: "EAAT",
		clearance: "EAAT transporters, mostly on astrocytes",
		diffusion: 1.15,
		reuptake: 9,
		enzymatic: 0,
		mood: { happiness: 0, arousal: 0.4, anxiety: 0.1 },
	},
	GABA: {
		key: "GABA",
		name: "GABA",
		short: "GABA",
		color: "#3fd69a",
		synapse: "GABAergic",
		role: "Primary inhibitory signal",
		summary:
			"The brain's main fast inhibitory transmitter. GABA-A receptors open Cl⁻ channels that hold the membrane near −80 mV, making the cell harder to fire.",
		postsynaptic: [["GABA_A", 1]],
		transporter: "GAT",
		clearance: "GAT transporters on neurons and astrocytes",
		diffusion: 1,
		reuptake: 7,
		enzymatic: 0,
		mood: { happiness: 0.05, arousal: -0.5, anxiety: -0.5 },
	},
	DOPAMINE: {
		key: "DOPAMINE",
		name: "Dopamine",
		short: "DA",
		color: "#b07cff",
		synapse: "Dopaminergic",
		role: "Reward prediction, motivation, movement",
		summary:
			"A neuromodulator. It doesn't fire cells directly: excitatory D1 and inhibitory D2 receptors adjust excitability slowly through G-proteins.",
		postsynaptic: [
			["D1", 0.5],
			["D2", 0.5],
		],
		transporter: "DAT",
		clearance: "DAT reuptake; broken down by MAO (inside cells) and COMT",
		diffusion: 0.9,
		reuptake: 7,
		enzymatic: 0.7,
		mood: { happiness: 0.55, arousal: 0.3, anxiety: 0 },
	},
	SEROTONIN: {
		key: "SEROTONIN",
		name: "Serotonin",
		short: "5-HT",
		color: "#ffb347",
		synapse: "Serotonergic",
		role: "Mood regulation, impulse control, sleep",
		summary:
			"A neuromodulator acting mostly through GPCRs. Inhibitory 5-HT1A and excitatory 5-HT2A receptors pull in opposite directions. SSRIs block its transporter, SERT.",
		postsynaptic: [
			["HT1A", 0.5],
			["HT2A", 0.5],
		],
		transporter: "SERT",
		clearance: "SERT reuptake; broken down by MAO inside cells",
		diffusion: 0.85,
		reuptake: 6.5,
		enzymatic: 0.6,
		mood: { happiness: 0.2, arousal: -0.15, anxiety: -0.35 },
	},
	NOREPINEPHRINE: {
		key: "NOREPINEPHRINE",
		name: "Norepinephrine",
		short: "NE",
		color: "#ff6b81",
		synapse: "Noradrenergic",
		role: "Alertness, attention, stress response",
		summary:
			"A neuromodulator that raises vigilance. Excitatory α1 and β1 receptors dominate; inhibitory α2 receptors act as a brake.",
		postsynaptic: [
			["ALPHA1", 0.35],
			["BETA1", 0.4],
			["ALPHA2", 0.25],
		],
		transporter: "NET",
		clearance: "NET reuptake; broken down by MAO (inside cells) and COMT",
		diffusion: 1.05,
		reuptake: 6.5,
		enzymatic: 0.7,
		mood: { happiness: 0, arousal: 0.7, anxiety: 0.45 },
	},
};

/** Display order in the UI (also the 1–5 keyboard shortcuts). */
export const NT_ORDER = [
	"GLUTAMATE",
	"GABA",
	"DOPAMINE",
	"SEROTONIN",
	"NOREPINEPHRINE",
];
