import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
		assert.ok(degraded > 0, "monoamines are broken down by enzymes");
	});

	it("never degrades amino-acid transmitters enzymatically", () => {
		const model = new SynapseModel({ seed: 4 });
		fire(model, 3);
		run(model, 30);
		assert.equal(model.stats.degraded, 0);
	});

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
		model.setVesiclesPerSpike(6);
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
		assert.ok(computeHeartRate(calm) < computeHeartRate({}));
		const extreme = computeMood({ DOPAMINE: 1, SEROTONIN: 1, GLUTAMATE: 1 });
		for (const v of Object.values(extreme)) assert.ok(v <= 1 && v >= -1);
	});
});

describe("neuromodulators", () => {
	for (const key of ["DOPAMINE", "NOREPINEPHRINE"]) {
		it(`${key} depolarises but cannot fire the cell on its own`, () => {
			const model = new SynapseModel({ seed: 11 });
			model.setTransmitter(key);
			model.setFlag("reuptakeBlocked", true);
			model.setFlag("enzymesBlocked", true);
			fire(model, 12, 0.3);
			assert.equal(model.stats.spikes, 0);
			assert.ok(model.voltage > MEMBRANE.rest + 2);
		});
	}
});
