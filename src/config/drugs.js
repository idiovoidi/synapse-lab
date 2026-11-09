/**
 * Drug catalogue.
 *
 * Each drug lists molecular targets and what it does to them. Dose is a
 * relative concentration; occupancy of each target follows the law of mass
 * action with a Hill coefficient of 1:
 *
 *     occupancy = dose / (dose + Ki)
 *
 * Ki values are relative (the primary target of each drug is 1), chosen to
 * preserve real selectivity ratios approximately rather than absolute nM
 * values.
 *
 * Target keys:
 *  - transporters: "SERT", "DAT", "NET", "EAAT", "GAT"
 *  - receptors: any key from RECEPTOR_TYPES (e.g. "D2", "HT2A", "GABA_A")
 *  - "MAO" (mitochondrial monoamine oxidase), "VMAT" (vesicular transporter)
 *
 * Actions:
 *  - "transporterBlock"   stops reuptake
 *  - "transporterReverse" substrate that reverses the transporter (efflux)
 *  - "vmatDisrupt"        empties vesicles into the cytosol
 *  - "antagonist"         competitive receptor blocker (binds, never activates)
 *  - "pam"                positive allosteric modulator (boosts the natural ligand)
 *  - "channelBlock"       plugs an ion-channel pore
 *  - "enzymeInhibit"      stops an enzyme
 */

/**
 * @typedef {object} DrugTarget
 * @property {string} target
 * @property {"transporterBlock"|"transporterReverse"|"vmatDisrupt"|"antagonist"|"pam"|"channelBlock"|"enzymeInhibit"} action
 * @property {number} ki
 */

/**
 * @typedef {object} Drug
 * @property {string} key
 * @property {string} name
 * @property {string} brand
 * @property {string} drugClass
 * @property {DrugTarget[]} targets
 * @property {number} defaultDose
 * @property {string} mechanism
 * @property {string} watch     What to look for in the simulation.
 * @property {string} [caveat]  What the simulation leaves out.
 * @property {{activeMoiety: string, conversionTau: number}} [prodrug]
 *   Inactive until converted. `targets` are those of the active moiety, and
 *   the active level rises as 1 − exp(−t / conversionTau) after the drug
 *   is started (simulation seconds).
 */

/** @type {Record<string, Drug>} */
export const DRUGS = {
	FLUOXETINE: {
		key: "FLUOXETINE",
		name: "Fluoxetine",
		brand: "Prozac",
		drugClass: "SSRI antidepressant",
		targets: [
			{ target: "SERT", action: "transporterBlock", ki: 1 },
			{ target: "NET", action: "transporterBlock", ki: 60 },
			{ target: "DAT", action: "transporterBlock", ki: 400 },
		],
		defaultDose: 4,
		mechanism: "Selectively blocks the serotonin transporter, SERT.",
		watch:
			"At a serotonergic synapse, 5-HT lingers and receptors stay busy. At other synapses it does almost nothing.",
		caveat:
			"Autoreceptors blunt the early rise. Clinical benefit takes weeks of adaptation, which this second-scale model does not show.",
	},
	SERTRALINE: {
		key: "SERTRALINE",
		name: "Sertraline",
		brand: "Zoloft",
		drugClass: "SSRI antidepressant",
		targets: [
			{ target: "SERT", action: "transporterBlock", ki: 1 },
			{ target: "DAT", action: "transporterBlock", ki: 80 },
		],
		defaultDose: 4,
		mechanism:
			"Blocks SERT; unusually for an SSRI it also has weak affinity for DAT.",
		watch:
			"Like fluoxetine at serotonergic synapses. At very high doses it slightly slows dopamine clearance.",
	},
	COCAINE: {
		key: "COCAINE",
		name: "Cocaine",
		brand: "",
		drugClass: "Stimulant · reuptake blocker",
		targets: [
			{ target: "DAT", action: "transporterBlock", ki: 1 },
			{ target: "SERT", action: "transporterBlock", ki: 1.3 },
			{ target: "NET", action: "transporterBlock", ki: 1.6 },
		],
		defaultDose: 4,
		mechanism:
			"Blocks DAT, SERT and NET non-selectively, so released monoamines are not cleared.",
		watch:
			"Dopamine floods the cleft after each spike. Compare with fluoxetine at the same synapse.",
	},
	METHYLPHENIDATE: {
		key: "METHYLPHENIDATE",
		name: "Methylphenidate",
		brand: "Ritalin",
		drugClass: "Stimulant · ADHD treatment",
		targets: [
			{ target: "DAT", action: "transporterBlock", ki: 1 },
			{ target: "NET", action: "transporterBlock", ki: 2.5 },
			{ target: "SERT", action: "transporterBlock", ki: 500 },
		],
		defaultDose: 3,
		mechanism:
			"Blocks DAT and NET (like cocaine) but spares SERT, and enters the brain more slowly.",
		watch:
			"Dopamine and norepinephrine synapses clear slowly; serotonin synapses are unaffected.",
	},
	AMPHETAMINE: {
		key: "AMPHETAMINE",
		name: "Amphetamine",
		brand: "Adderall",
		drugClass: "Stimulant · releaser (d/l mixed salts)",
		targets: [
			{ target: "DAT", action: "transporterReverse", ki: 1 },
			{ target: "NET", action: "transporterReverse", ki: 0.6 },
			{ target: "VMAT", action: "vmatDisrupt", ki: 2 },
		],
		defaultDose: 3,
		mechanism:
			"Enters through DAT/NET, empties vesicles into the cytosol via VMAT2, then drives the transporters backwards.",
		watch:
			"Dopamine pours out of the transporters with no action potentials at all, and vesicles shrink.",
	},
	DEXAMPHETAMINE: {
		key: "DEXAMPHETAMINE",
		name: "Dexamphetamine",
		brand: "Dexedrine",
		drugClass: "Stimulant · releaser (d-isomer)",
		targets: [
			{ target: "DAT", action: "transporterReverse", ki: 0.75 },
			{ target: "NET", action: "transporterReverse", ki: 0.6 },
			{ target: "VMAT", action: "vmatDisrupt", ki: 2 },
		],
		defaultDose: 3,
		mechanism:
			"The d-isomer of amphetamine. It reverses DAT and NET and empties vesicles via VMAT2, with stronger dopamine action than the d/l mixture.",
		watch:
			"Like amphetamine but more dopamine efflux at the same dose. Release starts at once, with no spikes needed.",
	},
	LISDEXAMFETAMINE: {
		key: "LISDEXAMFETAMINE",
		name: "Lisdexamfetamine",
		brand: "Vyvanse",
		drugClass: "Stimulant · prodrug of dexamphetamine",
		prodrug: { activeMoiety: "DEXAMPHETAMINE", conversionTau: 10 },
		targets: [
			{ target: "DAT", action: "transporterReverse", ki: 0.75 },
			{ target: "NET", action: "transporterReverse", ki: 0.6 },
			{ target: "VMAT", action: "vmatDisrupt", ki: 2 },
		],
		defaultDose: 3,
		mechanism:
			"Inactive on its own: d-amphetamine bound to lysine. Enzymes in red blood cells cleave it gradually, so active drug builds up slowly and evenly.",
		watch:
			"At a dopamine synapse, efflux starts as a trickle and builds over about 10 s (standing in for roughly an hour), unlike dexamphetamine's immediate hit.",
		caveat:
			"The slow, rate-limited conversion is why it is harder to misuse (snorting or injecting doesn't speed it up). There's no elimination here, so once converted the level stays steady.",
	},
	HALOPERIDOL: {
		key: "HALOPERIDOL",
		name: "Haloperidol",
		brand: "Haldol",
		drugClass: "Typical antipsychotic",
		targets: [{ target: "D2", action: "antagonist", ki: 1 }],
		defaultDose: 2.5,
		mechanism:
			"Competitive D2 antagonist. About 65–80% D2 occupancy is the clinical window.",
		watch:
			"Grey caps sit on D2 receptors, including presynaptic autoreceptors, so release goes up. D1 receptors are untouched.",
	},
	RISPERIDONE: {
		key: "RISPERIDONE",
		name: "Risperidone",
		brand: "Risperdal",
		drugClass: "Atypical antipsychotic",
		targets: [
			{ target: "HT2A", action: "antagonist", ki: 0.2 },
			{ target: "D2", action: "antagonist", ki: 1.5 },
		],
		defaultDose: 2.5,
		mechanism:
			"Blocks 5-HT2A receptors strongly and D2 receptors moderately, the classic 'atypical' profile.",
		watch:
			"At a serotonergic synapse the excitatory 5-HT2A receptors are capped, leaving inhibitory 5-HT1A signalling.",
	},
	DIAZEPAM: {
		key: "DIAZEPAM",
		name: "Diazepam",
		brand: "Valium",
		drugClass: "Benzodiazepine",
		targets: [{ target: "GABA_A", action: "pam", ki: 1 }],
		defaultDose: 3,
		mechanism:
			"Binds a separate site on GABA-A receptors and makes GABA more effective. It does nothing without GABA.",
		watch:
			"Fire a GABA synapse with and without it: each IPSP gets deeper and longer.",
	},
	PHENELZINE: {
		key: "PHENELZINE",
		name: "Phenelzine",
		brand: "Nardil",
		drugClass: "MAOI antidepressant",
		targets: [{ target: "MAO", action: "enzymeInhibit", ki: 1 }],
		defaultDose: 5,
		mechanism:
			"Irreversibly inhibits MAO inside neurons, so cytosolic monoamines are not broken down.",
		watch:
			"The cytosol store climbs and recycled vesicles fill fuller (larger quanta), rather than transmitter lingering in the cleft.",
	},
	KETAMINE: {
		key: "KETAMINE",
		name: "Ketamine",
		brand: "",
		drugClass: "NMDA channel blocker",
		targets: [{ target: "NMDA", action: "channelBlock", ki: 1 }],
		defaultDose: 3,
		mechanism:
			"Plugs the open NMDA channel pore. Anaesthetic at high doses; a rapid-acting antidepressant at low doses.",
		watch:
			"At a glutamatergic synapse, burst firing that depends on NMDA current fades; AMPA responses remain.",
	},
};

/** UI order. */
export const DRUG_ORDER = [
	"FLUOXETINE",
	"SERTRALINE",
	"COCAINE",
	"METHYLPHENIDATE",
	"AMPHETAMINE",
	"DEXAMPHETAMINE",
	"LISDEXAMFETAMINE",
	"HALOPERIDOL",
	"RISPERIDONE",
	"DIAZEPAM",
	"PHENELZINE",
	"KETAMINE",
];

export const DOSE_RANGE = { min: 0.5, max: 20, step: 0.5 };

/**
 * Fractional occupancy at a relative dose (law of mass action, Hill = 1).
 * @param {number} dose
 * @param {number} ki
 */
export function occupancy(dose, ki) {
	return dose <= 0 ? 0 : dose / (dose + ki);
}

/** Display names for non-receptor targets. */
export const TARGET_NAMES = {
	SERT: "SERT",
	DAT: "DAT",
	NET: "NET",
	EAAT: "EAAT",
	GAT: "GAT",
	MAO: "MAO",
	VMAT: "VMAT2",
};

export const ACTION_LABELS = {
	transporterBlock: "blocked",
	transporterReverse: "reversed",
	vmatDisrupt: "disrupted",
	antagonist: "antagonised",
	pam: "potentiated",
	channelBlock: "pore blocked",
	enzymeInhibit: "inhibited",
};
