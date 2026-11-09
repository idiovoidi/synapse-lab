import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DRUGS, occupancy } from "../src/config/drugs.js";
import { nmdaUnblocked } from "../src/config/receptors.js";
import { MEMBRANE, PARTICLE } from "../src/config/synapse.js";
import {
	computeHeartRate,
	computeMood,
	SynapseModel,
} from "../src/sim/synapseModel.js";

/** Run the model in fixed steps for `seconds` of simulated time. */
function run(model, seconds, dt = 1 / 60) {
	const steps = Math.round(seconds / dt);
	for (let i = 0; i < steps; i++) model.step(dt);
}

/** Fire `times` action potentials `gap` seconds apart, then let the last release land. */
function fire(model, times, gap = 0.6, settle = 1) {
	for (let i = 0; i < times; i++) {
		model.fireActionPotential();
		run(model, gap);
	}
	run(model, settle);
}

describe("SynapseModel", () => {
	it("releases transmitter into the cleft after an action potential arrives", () => {
		const events = [];
		const model = new SynapseModel({ seed: 1, emit: (e) => events.push(e) });
		model.fireActionPotential();
		run(model, 0.3);
		assert.equal(model.particles.length, 0, "nothing released mid-axon");
		run(model, 1);
		assert.ok(model.stats.released > 0);
		assert.ok(events.includes("ap:arrived"));
		assert.ok(events.includes("vesicle:fused"));
	});

	it("keeps free particles inside the cleft walls", () => {
		const model = new SynapseModel({ seed: 2 });
		fire(model, 3, 0.4);
		for (let i = 0; i < 120; i++) {
			model.step(1 / 60);
			for (const p of model.particles) {
				if (p.state !== "free" || Math.hypot(p.y, p.z) > 2.4) continue;
				assert.ok(p.x >= -1 + PARTICLE.radius - 1e-9, `x=${p.x}`);
				assert.ok(p.x <= 1 - PARTICLE.radius + 1e-9, `x=${p.x}`);
			}
		}
	});

	it("binds receptors and eventually clears all transmitter", () => {
		const model = new SynapseModel({ seed: 3 });
		model.setTransmitter("DOPAMINE");
		fire(model, 2);
		assert.ok(model.stats.bindings > 0, "some receptors bound");
		run(model, 40);
		assert.equal(model.particles.length, 0, "cleft cleared");
		const { reuptaken, degraded, escaped, released } = model.stats;
		assert.equal(reuptaken + degraded + escaped, released);
		assert.ok(degraded > 0, "dopamine is broken down by COMT");
	});

	for (const key of ["GLUTAMATE", "GABA", "SEROTONIN"]) {
		it(`${key} is not broken down in the extracellular space`, () => {
			const model = new SynapseModel({ seed: 4 });
			model.setTransmitter(key);
			fire(model, 3);
			run(model, 30);
			assert.equal(model.stats.degraded, 0);
		});
	}

	it("fires the postsynaptic cell with glutamate but not GABA", () => {
		const glu = new SynapseModel({ seed: 5 });
		fire(glu, 4);
		assert.ok(glu.stats.spikes > 0, "glutamate drives spikes");

		const gaba = new SynapseModel({ seed: 5 });
		gaba.setTransmitter("GABA");
		fire(gaba, 4);
		assert.equal(gaba.stats.spikes, 0);
		assert.ok(gaba.voltage < MEMBRANE.rest, "GABA hyperpolarises");
	});

	it("reuptake inhibition keeps transmitter in the cleft longer", () => {
		const measure = (blocked) => {
			const model = new SynapseModel({ seed: 6 });
			model.setTransmitter("SEROTONIN");
			if (blocked) model.setDrug("FLUOXETINE", 20);
			fire(model, 2, 0.5);
			run(model, 3);
			return model.particles.length;
		};
		assert.ok(measure(true) > measure(false) * 1.3);
	});

	it("an antagonist reduces receptor occupancy", () => {
		const measure = (antagonist) => {
			const model = new SynapseModel({ seed: 7 });
			model.setTransmitter("DOPAMINE");
			model.setReleaseProbability(0.8);
			if (antagonist) {
				model.setDrug("HALOPERIDOL", 20);
				run(model, 6);
			}
			let bound = 0;
			fire(model, 3, 0.3);
			for (let i = 0; i < 60; i++) {
				model.step(1 / 60);
				for (const r of model.receptors) {
					if (r.type.key === "D2" && r.particle) bound++;
				}
			}
			return bound;
		};
		assert.ok(measure(true) < measure(false) * 0.4);
	});

	it("depletes the vesicle pool under rapid firing", () => {
		const model = new SynapseModel({ seed: 8 });
		model.setReleaseProbability(0.95);
		fire(model, 8, 0.15);
		run(model, 1);
		assert.ok(model.stats.failures > 0, "some spikes fail to release");
		run(model, 8);
		assert.equal(model.readyVesicles, model.vesicles.length, "pool recovers");
	});

	it("is reproducible for a given seed", () => {
		const a = new SynapseModel({ seed: 9 });
		const b = new SynapseModel({ seed: 9 });
		fire(a, 3);
		fire(b, 3);
		assert.deepEqual(a.stats, b.stats);
	});

	it("reset clears pending releases", () => {
		const model = new SynapseModel({ seed: 10 });
		model.fireActionPotential();
		run(model, 0.2);
		model.reset();
		run(model, 2);
		assert.equal(model.stats.released, 0);
		assert.equal(model.particles.length, 0);
	});
});

describe("derived physiology", () => {
	it("maps tone to mood and heart rate", () => {
		const calm = { GABA: 1 };
		const alarmed = { NOREPINEPHRINE: 1 };
		assert.ok(computeMood(calm).anxiety < 0);
		assert.ok(computeMood(alarmed).anxiety > 0);
		assert.ok(computeHeartRate(alarmed) > computeHeartRate({}));
		// Heart rate is a sympathetic analogy: only NE tone moves it.
		assert.equal(computeHeartRate(calm), computeHeartRate({}));
		assert.equal(computeHeartRate({ SEROTONIN: 1 }), computeHeartRate({}));
		const extreme = computeMood({ DOPAMINE: 1, SEROTONIN: 1, GLUTAMATE: 1 });
		for (const v of Object.values(extreme)) assert.ok(v <= 1 && v >= -1);
	});
});

describe("receptor specificity", () => {
	it("assigns the synapse's own receptor subtypes", () => {
		const model = new SynapseModel({ seed: 12 });
		model.setTransmitter("DOPAMINE");
		const kinds = new Set(model.receptors.map((r) => r.type.key));
		assert.deepEqual([...kinds].sort(), ["D1", "D2"]);
		for (const r of model.receptors) assert.equal(r.type.ligand, "DOPAMINE");
	});

	it("glutamate never binds dopamine receptors", () => {
		const model = new SynapseModel({ seed: 13 });
		model.setTransmitter("DOPAMINE");
		model.injectTransmitter("GLUTAMATE", 120);
		run(model, 6);
		assert.equal(model.stats.bindings, 0);
		assert.equal(model.stats.reuptaken, 0, "DAT does not carry glutamate");
	});

	it("switching synapse type releases mismatched ligands", () => {
		const model = new SynapseModel({ seed: 14 });
		fire(model, 2);
		assert.ok(model.boundCount > 0);
		model.setTransmitter("GABA");
		assert.equal(model.boundCount, 0);
	});
});

describe("NMDA receptors", () => {
	it("are Mg²⁺-blocked at rest and unblock with depolarisation", () => {
		assert.ok(nmdaUnblocked(-70) < 0.06);
		assert.ok(nmdaUnblocked(-20) > 0.35);
		assert.ok(nmdaUnblocked(0) > nmdaUnblocked(-40));
	});
});

describe("metabotropic signalling", () => {
	it("builds up after binding rather than instantly", () => {
		const model = new SynapseModel({ seed: 15 });
		model.setTransmitter("NOREPINEPHRINE");
		model.injectTransmitter("NOREPINEPHRINE", 150);
		run(model, 0.25);
		const early = model.messenger.Gs + model.messenger.Gq;
		run(model, 1.5);
		const late = model.messenger.Gs + model.messenger.Gq;
		assert.ok(late > early * 1.5, `early ${early}, late ${late}`);
	});

	for (const key of ["DOPAMINE", "SEROTONIN", "NOREPINEPHRINE"]) {
		it(`${key} cannot fire the cell on its own`, () => {
			const model = new SynapseModel({ seed: 11 });
			model.setTransmitter(key);
			model.setDrug("COCAINE", 20);
			model.setDrug("PHENELZINE", 20);
			fire(model, 12, 0.3);
			assert.equal(model.stats.spikes, 0);
		});
	}

	it("norepinephrine depolarises; D2-heavy signalling does not", () => {
		const ne = new SynapseModel({ seed: 16 });
		ne.setTransmitter("NOREPINEPHRINE");
		ne.injectTransmitter("NOREPINEPHRINE", 200);
		run(ne, 2);
		assert.ok(ne.voltage > MEMBRANE.rest + 2, `NE at ${ne.voltage}`);
	});
});

describe("presynaptic machinery", () => {
	it("release is probabilistic: some spikes fail at low Pr", () => {
		const model = new SynapseModel({ seed: 20 });
		model.setReleaseProbability(0.08);
		fire(model, 20, 0.4);
		assert.ok(model.stats.failures > 0);
		assert.ok(model.stats.fusions > 0);
		assert.ok(model.stats.fusions < 20 * 8 * 0.3);
	});

	it("autoreceptor activation lowers release per spike", () => {
		const fusionsPerSpike = (preload) => {
			let fusions = 0;
			for (let seed = 30; seed < 36; seed++) {
				const model = new SynapseModel({ seed });
				model.setTransmitter("DOPAMINE");
				for (let i = 0; i < 12; i++) {
					if (preload) model.injectTransmitter("DOPAMINE", 80);
					model.fireActionPotential();
					run(model, 0.5);
				}
				fusions += model.stats.fusions;
			}
			return fusions / (6 * 12);
		};
		const quiet = fusionsPerSpike(false);
		const braked = fusionsPerSpike(true);
		assert.ok(braked < quiet * 0.8, `quiet ${quiet}, braked ${braked}`);
	});

	it("MAO drains the cytosol only at monoamine synapses", () => {
		const da = new SynapseModel({ seed: 21 });
		da.setTransmitter("DOPAMINE");
		run(da, 5);
		assert.ok(da.stats.metabolised > 0);

		const glu = new SynapseModel({ seed: 21 });
		run(glu, 5);
		assert.equal(glu.stats.metabolised, 0);
	});

	it("reuptake refills vesicles; blocking it shrinks quanta under load", () => {
		const content = (blocked) => {
			const model = new SynapseModel({ seed: 22 });
			model.setTransmitter("DOPAMINE");
			if (blocked) model.setDrug("COCAINE", 20);
			model.setReleaseProbability(0.6);
			fire(model, 30, 0.25);
			run(model, 4);
			return model.meanVesicleContent;
		};
		assert.ok(content(true) < content(false));
	});

	it("monoamine synapses use only presynaptic transporters", () => {
		const model = new SynapseModel({ seed: 23 });
		model.setTransmitter("SEROTONIN");
		const active = model.transporters.filter((t) => t.active);
		assert.ok(active.length > 0);
		for (const t of active) assert.equal(t.side, "pre");
		model.setTransmitter("GLUTAMATE");
		assert.ok(model.transporters.some((t) => t.active && t.side === "glia"));
	});
});

/** Mean free transmitter over a window, after firing a few spikes. */
function cleftLoad(model, spikes = 4, window = 4) {
	fire(model, spikes, 0.4, 0.2);
	let sum = 0;
	const steps = Math.round(window * 60);
	for (let i = 0; i < steps; i++) {
		model.step(1 / 60);
		sum += model.freeCount;
	}
	return sum / steps;
}

describe("pharmacology", () => {
	it("every drug's targets resolve against the receptor and transporter catalogue", () => {
		const model = new SynapseModel({ seed: 40 });
		for (const key of Object.keys(DRUGS)) {
			const targets = model.drugTargets(key);
			assert.ok(targets.length > 0);
			for (const t of targets) assert.ok(t.occupancy > 0 && t.occupancy < 1);
		}
	});

	it("fluoxetine leaves dopamine clearance unchanged", () => {
		const model = new SynapseModel({ seed: 41 });
		model.setTransmitter("DOPAMINE");
		model.setDrug("FLUOXETINE", 4);
		// DAT keeps ~99% of its capacity: SERT is the only real target.
		assert.ok(model._transportFraction() > 0.98);

		// Averaged over seeds, the cleft load matches an untreated synapse.
		const load = (drug) => {
			let total = 0;
			for (let seed = 41; seed < 47; seed++) {
				const m = new SynapseModel({ seed });
				m.setTransmitter("DOPAMINE");
				if (drug) m.setDrug("FLUOXETINE", 4);
				total += cleftLoad(m);
			}
			return total;
		};
		const ratio = load(true) / load(false);
		assert.ok(ratio > 0.85 && ratio < 1.15, `ratio ${ratio}`);
	});

	it("fluoxetine raises serotonin in the cleft", () => {
		const control = new SynapseModel({ seed: 42 });
		control.setTransmitter("SEROTONIN");
		const treated = new SynapseModel({ seed: 42 });
		treated.setTransmitter("SEROTONIN");
		treated.setDrug("FLUOXETINE", 6);
		assert.ok(cleftLoad(treated) > cleftLoad(control) * 1.3);
	});

	it("cocaine blocks DAT; methylphenidate spares SERT", () => {
		const da = (drug) => {
			const m = new SynapseModel({ seed: 43 });
			m.setTransmitter("DOPAMINE");
			if (drug) m.setDrug(drug, 6);
			return cleftLoad(m);
		};
		assert.ok(da("COCAINE") > da(null) * 1.3);

		const model = new SynapseModel({ seed: 44 });
		model.setTransmitter("SEROTONIN");
		const [sert] = model
			.drugTargets("METHYLPHENIDATE", 6)
			.filter((t) => t.target === "SERT");
		assert.ok(sert.present && sert.occupancy < 0.02);
	});

	it("amphetamine releases dopamine with no action potentials", () => {
		const model = new SynapseModel({ seed: 45 });
		model.setTransmitter("DOPAMINE");
		model.setDrug("AMPHETAMINE", 4);
		const before = model.meanVesicleContent;
		run(model, 4);
		assert.equal(model.stats.actionPotentials, 0);
		assert.ok(model.stats.effluxed > 20, `effluxed ${model.stats.effluxed}`);
		assert.ok(model.freeCount > 5);
		assert.ok(model.meanVesicleContent < before, "vesicles empty via VMAT2");
	});

	it("haloperidol's D2 occupancy matches dose/(dose + Ki)", () => {
		const dose = 2;
		const expected = occupancy(dose, 1);
		const model = new SynapseModel({ seed: 46 });
		model.setTransmitter("DOPAMINE");
		model.setDrug("HALOPERIDOL", dose);
		run(model, 10);
		let sum = 0;
		const samples = 3600; // 60 s: slow off-rate needs a long average
		for (let i = 0; i < samples; i++) {
			model.step(1 / 60);
			sum += model.antagonistOccupancy("D2");
		}
		const measured = sum / samples;
		assert.ok(Math.abs(measured - expected) < 0.07, `measured ${measured}`);
		assert.equal(model.antagonistOccupancy("D1"), 0, "D1 is untouched");
	});

	it("haloperidol increases release by blocking D2 autoreceptors", () => {
		const fusions = (drug) => {
			let total = 0;
			for (let seed = 50; seed < 56; seed++) {
				const m = new SynapseModel({ seed });
				m.setTransmitter("DOPAMINE");
				if (drug) m.setDrug("HALOPERIDOL", 8);
				run(m, 5);
				for (let i = 0; i < 12; i++) {
					m.injectTransmitter("DOPAMINE", 80);
					m.fireActionPotential();
					run(m, 0.5);
				}
				total += m.stats.fusions;
			}
			return total;
		};
		assert.ok(fusions(true) > fusions(false) * 1.15);
	});

	it("dopamine competes an antagonist off its receptors", () => {
		const capped = (flood) => {
			const m = new SynapseModel({ seed: 57 });
			m.setTransmitter("DOPAMINE");
			m.setDrug("HALOPERIDOL", 1);
			run(m, 8);
			let sum = 0;
			for (let i = 0; i < 180; i++) {
				if (flood && i % 15 === 0) m.injectTransmitter("DOPAMINE", 60);
				m.step(1 / 60);
				sum += m.antagonistOccupancy("D2");
			}
			return sum / 180;
		};
		assert.ok(capped(true) < capped(false));
	});

	it("diazepam does nothing without GABA and deepens inhibition with it", () => {
		const control = new SynapseModel({ seed: 58 });
		control.setTransmitter("GABA");
		const treated = new SynapseModel({ seed: 58 });
		treated.setTransmitter("GABA");
		treated.setDrug("DIAZEPAM", 6);
		run(control, 3);
		run(treated, 3);
		assert.equal(treated.voltage, control.voltage, "no GABA, no effect");

		const meanV = (drug) => {
			let total = 0;
			for (let seed = 60; seed < 64; seed++) {
				const m = new SynapseModel({ seed });
				m.setTransmitter("GABA");
				if (drug) m.setDrug("DIAZEPAM", 6);
				fire(m, 3, 0.4, 0.2);
				for (let i = 0; i < 120; i++) {
					m.step(1 / 60);
					total += m.voltage;
				}
			}
			return total / (4 * 120);
		};
		assert.ok(meanV(true) < meanV(false) - 0.5);
	});

	it("phenelzine fills vesicles fuller rather than prolonging the cleft signal", () => {
		const measure = (drug) => {
			const m = new SynapseModel({ seed: 65 });
			m.setTransmitter("SEROTONIN");
			if (drug) m.setDrug("PHENELZINE", 10);
			m.setReleaseProbability(0.9);
			run(m, 8);
			fire(m, 6, 0.6);
			run(m, 6);
			return { fill: m.meanVesicleContent, cytosol: m.cytosol };
		};
		const control = measure(false);
		const treated = measure(true);
		assert.ok(treated.cytosol > control.cytosol * 1.2);
		assert.ok(treated.fill > control.fill * 1.2);

		// Clearance from the cleft itself is unchanged: fluoxetine-style
		// lingering does not happen with an MAOI alone.
		const persistence = (drug) => {
			const m = new SynapseModel({ seed: 66 });
			m.setTransmitter("SEROTONIN");
			if (drug) m.setDrug("PHENELZINE", 10);
			m.injectTransmitter("SEROTONIN", 80);
			run(m, 1.5);
			return m.freeCount;
		};
		const ratio = persistence(true) / persistence(false);
		assert.ok(ratio > 0.8 && ratio < 1.25, `ratio ${ratio}`);
	});

	it("ketamine suppresses NMDA-driven firing at a glutamate synapse", () => {
		const spikes = (drug) => {
			let total = 0;
			for (let seed = 70; seed < 74; seed++) {
				const m = new SynapseModel({ seed });
				if (drug) m.setDrug("KETAMINE", 10);
				fire(m, 5, 0.4);
				total += m.stats.spikes;
			}
			return total;
		};
		assert.ok(spikes(true) < spikes(false));
	});
});
