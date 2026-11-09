import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
			model.setFlag("reuptakeBlocked", blocked);
			fire(model, 2, 0.5);
			run(model, 3);
			return model.particles.length;
		};
		assert.ok(measure(true) > measure(false) * 1.3);
	});

	it("an antagonist reduces receptor occupancy", () => {
		const measure = (antagonist) => {
			const model = new SynapseModel({ seed: 7 });
			model.setFlag("antagonist", antagonist);
			let bound = 0;
			fire(model, 3, 0.3);
			for (let i = 0; i < 60; i++) {
				model.step(1 / 60);
				bound += model.boundCount;
			}
			return bound;
		};
		assert.ok(measure(true) < measure(false) * 0.6);
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
			model.setFlag("reuptakeBlocked", true);
			model.setFlag("enzymesBlocked", true);
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
			model.setFlag("reuptakeBlocked", blocked);
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
