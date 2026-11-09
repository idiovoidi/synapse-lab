/**
 * Neurotransmitter catalogue.
 *
 * Kinetic values are in simulation units (seconds, scene units) and are tuned
 * so that effects are visible at human timescales. Real synaptic events happen
 * in milliseconds; relative differences between transmitters are what matter.
 */

/** @typedef {"excitatory" | "inhibitory"} Polarity */

/**
 * @typedef {object} Neurotransmitter
 * @property {string} key
 * @property {string} name
 * @property {string} short       Three-letter label used in compact UI.
 * @property {string} color       CSS hex colour used in the scene and HUD.
 * @property {Polarity} polarity
 * @property {"ionotropic" | "metabotropic"} action
 * @property {string} role
 * @property {string} summary
 * @property {string} receptors
 * @property {string} clearance
 * @property {number} diffusion   Relative diffusion coefficient.
 * @property {number} affinity    Probability of binding per receptor contact.
 * @property {number} dwell       Mean time bound to a receptor (s).
 * @property {number} reuptake    Transporter capture rate (1/s near a transporter).
 * @property {number} enzymatic   Enzyme degradation rate (1/s near an enzyme); 0 = immune.
 * @property {number} efficacy    Postsynaptic conductance per bound receptor (relative).
 * @property {{happiness:number, arousal:number, anxiety:number}} mood
 * @property {number} heart       Heart-rate change (BPM) at full tone.
 */

/** @type {Record<string, Neurotransmitter>} */
export const NEUROTRANSMITTERS = {
	GLUTAMATE: {
		key: "GLUTAMATE",
		name: "Glutamate",
		short: "Glu",
		color: "#5b8cff",
		polarity: "excitatory",
		action: "ionotropic",
		role: "Primary excitatory signal",
		summary:
			"The brain's main 'go' signal. Opens AMPA/NMDA channels, letting Na⁺ rush in and depolarise the cell. Central to learning and memory.",
		receptors: "AMPA · NMDA · mGluR",
		clearance: "EAAT transporters on neurons and astrocytes",
		diffusion: 1.15,
		affinity: 0.85,
		dwell: 0.9,
		reuptake: 9,
		enzymatic: 0,
		efficacy: 1,
		mood: { happiness: 0, arousal: 0.45, anxiety: 0.15 },
		heart: 4,
	},
	GABA: {
		key: "GABA",
		name: "GABA",
		short: "GABA",
		color: "#3fd69a",
		polarity: "inhibitory",
		action: "ionotropic",
		role: "Primary inhibitory signal",
		summary:
			"The brain's main brake. GABA-A receptors open Cl⁻ channels that pull the membrane toward −80 mV, making the cell harder to fire.",
		receptors: "GABA-A · GABA-B",
		clearance: "GAT transporters on neurons and astrocytes",
		diffusion: 1,
		affinity: 0.8,
		dwell: 1.1,
		reuptake: 7,
		enzymatic: 0,
		efficacy: 1,
		mood: { happiness: 0.1, arousal: -0.5, anxiety: -0.55 },
		heart: -8,
	},
	DOPAMINE: {
		key: "DOPAMINE",
		name: "Dopamine",
		short: "DA",
		color: "#b07cff",
		polarity: "excitatory",
		action: "metabotropic",
		role: "Reward, motivation, movement",
		summary:
			"A neuromodulator that signals reward prediction and drives motivation. Acts mostly through slower G-protein-coupled D1–D5 receptors.",
		receptors: "D1–D5 (GPCR)",
		clearance: "DAT reuptake; MAO and COMT breakdown",
		diffusion: 0.9,
		affinity: 0.7,
		dwell: 1.6,
		reuptake: 7,
		enzymatic: 0.7,
		efficacy: 0.12,
		mood: { happiness: 0.75, arousal: 0.35, anxiety: -0.05 },
		heart: 7,
	},
	SEROTONIN: {
		key: "SEROTONIN",
		name: "Serotonin",
		short: "5-HT",
		color: "#ffb347",
		polarity: "inhibitory",
		action: "metabotropic",
		role: "Mood, satiety, sleep",
		summary:
			"A neuromodulator that stabilises mood and impulse control. Many 5-HT receptors are inhibitory GPCRs. SSRIs block its reuptake.",
		receptors: "5-HT1 to 5-HT7 (mostly GPCR)",
		clearance: "SERT reuptake; MAO breakdown",
		diffusion: 0.85,
		affinity: 0.7,
		dwell: 1.8,
		reuptake: 6.5,
		enzymatic: 0.6,
		efficacy: 0.2,
		mood: { happiness: 0.5, arousal: -0.1, anxiety: -0.6 },
		heart: -3,
	},
	NOREPINEPHRINE: {
		key: "NOREPINEPHRINE",
		name: "Norepinephrine",
		short: "NE",
		color: "#ff6b81",
		polarity: "excitatory",
		action: "metabotropic",
		role: "Alertness, fight-or-flight",
		summary:
			"Raises vigilance and readies the body for action. Drives sympathetic arousal: faster heart rate, sharper attention, and higher anxiety.",
		receptors: "α1 · α2 · β1–β3 (GPCR)",
		clearance: "NET reuptake; MAO and COMT breakdown",
		diffusion: 1.05,
		affinity: 0.72,
		dwell: 1.3,
		reuptake: 6.5,
		enzymatic: 0.7,
		efficacy: 0.15,
		mood: { happiness: 0, arousal: 0.8, anxiety: 0.55 },
		heart: 26,
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
