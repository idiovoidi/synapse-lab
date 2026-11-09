import { NEUROTRANSMITTERS, NT_ORDER } from "../config/neurotransmitters.js";
import {
	ACTION_POTENTIAL,
	CLEFT,
	ENZYMES,
	HISTORY,
	MEMBRANE,
	PARTICLE,
	RECEPTORS,
	TONE,
	TRANSPORTERS,
	VESICLES,
} from "../config/synapse.js";
import { createRng } from "./random.js";

const MAX_SUBSTEP = 1 / 120;
const REUPTAKE_ANIM = 0.45;
const DEGRADE_ANIM = 0.4;

/**
 * Pure simulation of a single chemical synapse.
 *
 * No rendering or DOM code lives here: the renderer and HUD read the public
 * state each frame, and discrete happenings are reported through `emit`.
 * All dynamics are integrated against simulated seconds, so behaviour is
 * independent of frame rate.
 */
export class SynapseModel {
	/**
	 * @param {{seed?: number, emit?: (event: string, payload?: unknown) => void}} [options]
	 */
	constructor({ seed = Date.now(), emit = () => {} } = {}) {
		this.rng = createRng(seed);
		this.emit = emit;

		this.settings = {
			transmitter: "GLUTAMATE",
			vesiclesPerSpike: ACTION_POTENTIAL.defaultVesicles,
			reuptakeBlocked: false,
			enzymesBlocked: false,
			antagonist: false,
			autoFire: false,
			fireRate: 1.5,
		};

		this.receptors = this._createReceptors();
		this.transporters = this._createTransporters();
		this.enzymes = this._createEnzymes();
		this.vesicles = this._createVesicles();

		this.reset();
	}

	// ---------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------

	reset() {
		this.time = 0;
		this.particles = [];
		this.actionPotentials = [];
		this.calciumPulses = [];
		this.postSpikes = [];
		this._scheduled = [];
		this._nextId = 1;
		this._autoPhase = 0;
		this._sampleClock = 0;
		this._spikedThisSample = false;

		this.voltage = MEMBRANE.rest;
		this._refractoryUntil = 0;

		this.tone = Object.fromEntries(NT_ORDER.map((k) => [k, 0]));
		this.stats = {
			actionPotentials: 0,
			released: 0,
			bindings: 0,
			reuptaken: 0,
			degraded: 0,
			escaped: 0,
			spikes: 0,
			failures: 0,
		};

		for (const r of this.receptors) {
			r.particle = null;
			r.activation = 0;
			r.refractoryUntil = 0;
		}
		for (const t of this.transporters) t.flash = 0;
		for (const e of this.enzymes) e.flash = 0;
		for (const v of this.vesicles) this._restoreVesicle(v);
		this._applyAntagonist();

		this.history = {
			free: new Float32Array(HISTORY.length),
			occupancy: new Float32Array(HISTORY.length),
			voltage: new Float32Array(HISTORY.length).fill(MEMBRANE.rest),
			head: 0,
		};

		this.emit("sim:reset");
	}

	/** @param {string} key */
	setTransmitter(key) {
		if (!NEUROTRANSMITTERS[key] || key === this.settings.transmitter) return;
		this.settings.transmitter = key;
		// Vesicles waiting in the pool are refilled with the new transmitter.
		for (const v of this.vesicles) {
			if (v.state === "ready") v.type = key;
		}
		this.emit("settings:changed", { transmitter: key });
	}

	/**
	 * @param {"reuptakeBlocked" | "enzymesBlocked" | "antagonist" | "autoFire"} flag
	 * @param {boolean} [value]
	 */
	setFlag(flag, value = !this.settings[flag]) {
		this.settings[flag] = Boolean(value);
		if (flag === "antagonist") this._applyAntagonist();
		if (flag === "autoFire") this._autoPhase = 0.999; // fire promptly
		this.emit("settings:changed", { [flag]: this.settings[flag] });
	}

	/** @param {number} hz */
	setFireRate(hz) {
		this.settings.fireRate = Math.max(0.1, Math.min(8, hz));
	}

	/** @param {number} n */
	setVesiclesPerSpike(n) {
		this.settings.vesiclesPerSpike = Math.max(1, Math.min(8, Math.round(n)));
	}

	/** Launch an action potential down the presynaptic axon. */
	fireActionPotential() {
		this.stats.actionPotentials++;
		this.actionPotentials.push({ start: this.time });
		this.emit("ap:fired");
		this._schedule(ACTION_POTENTIAL.travelTime, () => this._onApArrival());
	}

	/**
	 * Advance the simulation.
	 * @param {number} dt Simulated seconds.
	 */
	step(dt) {
		if (!(dt > 0)) return;
		const steps = Math.ceil(dt / MAX_SUBSTEP);
		const h = dt / steps;
		for (let i = 0; i < steps; i++) this._tick(h);
	}

	get freeCount() {
		let n = 0;
		for (const p of this.particles) if (p.state === "free") n++;
		return n;
	}

	get boundCount() {
		let n = 0;
		for (const r of this.receptors) if (r.particle) n++;
		return n;
	}

	get availableReceptors() {
		let n = 0;
		for (const r of this.receptors) if (!r.blocked) n++;
		return n;
	}

	get occupancy() {
		const available = this.availableReceptors;
		return available === 0 ? 0 : this.boundCount / available;
	}

	get readyVesicles() {
		let n = 0;
		for (const v of this.vesicles) if (v.state === "ready") n++;
		return n;
	}

	// ---------------------------------------------------------------------
	// Fixtures
	// ---------------------------------------------------------------------

	_createReceptors() {
		const receptors = [];
		let id = 0;
		for (const ring of RECEPTORS.rings) {
			const offset = this.rng.next() * Math.PI * 2;
			for (let i = 0; i < ring.n; i++) {
				const a = offset + (i / ring.n) * Math.PI * 2;
				const jitter = ring.r === 0 ? 0 : (this.rng.next() - 0.5) * 0.12;
				receptors.push({
					id: id++,
					x: CLEFT.xPost,
					y: Math.cos(a) * (ring.r + jitter),
					z: Math.sin(a) * (ring.r + jitter),
					antagonistSlot: this.rng.next() < RECEPTORS.antagonistFraction,
					blocked: false,
					particle: null,
					activation: 0,
					refractoryUntil: 0,
					lastType: null,
				});
			}
		}
		return receptors;
	}

	_createTransporters() {
		const list = [];
		for (const [side, spec] of Object.entries({
			pre: TRANSPORTERS.pre,
			post: TRANSPORTERS.post,
		})) {
			const offset = side === "pre" ? 0 : Math.PI / spec.n;
			for (let i = 0; i < spec.n; i++) {
				const a = offset + (i / spec.n) * Math.PI * 2;
				list.push({
					side,
					x: spec.x,
					y: Math.cos(a) * spec.r,
					z: Math.sin(a) * spec.r,
					flash: 0,
				});
			}
		}
		return list;
	}

	_createEnzymes() {
		const list = [];
		for (let i = 0; i < ENZYMES.count; i++) {
			const a = (i / ENZYMES.count) * Math.PI * 2 + this.rng.next() * 0.4;
			const r = 1.45 + this.rng.next() * 0.9;
			const home = {
				x: (this.rng.next() - 0.5) * 1.1,
				y: Math.cos(a) * r,
				z: Math.sin(a) * r,
			};
			list.push({
				home,
				x: home.x,
				y: home.y,
				z: home.z,
				phase: this.rng.next() * Math.PI * 2,
				flash: 0,
			});
		}
		return list;
	}

	_createVesicles() {
		const list = [];
		const minGap = VESICLES.radius * 2.1;
		let attempts = 0;
		while (list.length < VESICLES.count && attempts < 5000) {
			attempts++;
			const x = -1.55 - this.rng.next() * 2.3;
			// Terminal narrows away from the active zone.
			const maxR = 2.05 - (Math.abs(x) - 1.55) * 0.32;
			const a = this.rng.next() * Math.PI * 2;
			const r = Math.sqrt(this.rng.next()) * maxR;
			const home = { x, y: Math.cos(a) * r, z: Math.sin(a) * r };
			const clash = list.some(
				(v) =>
					(v.home.x - home.x) ** 2 +
						(v.home.y - home.y) ** 2 +
						(v.home.z - home.z) ** 2 <
					minGap * minGap,
			);
			if (!clash) {
				list.push({ id: list.length, home, x: 0, y: 0, z: 0 });
			}
		}
		return list;
	}

	_restoreVesicle(v) {
		v.state = "ready";
		v.t = 0;
		v.x = v.home.x;
		v.y = v.home.y;
		v.z = v.home.z;
		v.scale = 1;
		v.appear = 1;
		v.type = this.settings.transmitter;
	}

	_applyAntagonist() {
		for (const r of this.receptors) {
			r.blocked = this.settings.antagonist && r.antagonistSlot;
			if (r.blocked && r.particle) this._unbind(r.particle);
		}
	}

	// ---------------------------------------------------------------------
	// Scheduling
	// ---------------------------------------------------------------------

	_schedule(delay, fn) {
		this._scheduled.push({ at: this.time + delay, fn });
	}

	_runScheduled() {
		if (this._scheduled.length === 0) return;
		const due = [];
		this._scheduled = this._scheduled.filter((job) => {
			if (job.at <= this.time) {
				due.push(job);
				return false;
			}
			return true;
		});
		for (const job of due) job.fn();
	}

	_onApArrival() {
		this.calciumPulses.push({ start: this.time });
		this.emit("ap:arrived");
		this._schedule(ACTION_POTENTIAL.calciumDelay, () => this._dockVesicles());
	}

	_dockVesicles() {
		// Vesicles closest to the active zone fuse first.
		const ready = this.vesicles
			.filter((v) => v.state === "ready")
			.sort((a, b) => b.home.x - a.home.x)
			.slice(0, this.settings.vesiclesPerSpike);

		if (ready.length === 0) {
			this.stats.failures++;
			this.emit("release:failed");
			return;
		}

		for (const v of ready) {
			const a = this.rng.next() * Math.PI * 2;
			const r = Math.sqrt(this.rng.next()) * 1.55;
			v.state = "docking";
			v.t = 0;
			v.from = { x: v.x, y: v.y, z: v.z };
			v.dock = {
				x: CLEFT.xPre - VESICLES.radius * 0.95,
				y: Math.cos(a) * r,
				z: Math.sin(a) * r,
			};
		}
	}

	// ---------------------------------------------------------------------
	// Integration
	// ---------------------------------------------------------------------

	_tick(h) {
		this.time += h;
		this._runScheduled();
		this._updateAutoFire(h);
		this._updateVesicles(h);
		this._updateEnzymes(h);
		this._updateParticles(h);
		this._updateReceptors(h);
		this._updateMembrane(h);
		this._updateTone(h);
		this._updateTransients(h);
		this._sample(h);
	}

	_updateAutoFire(h) {
		if (!this.settings.autoFire) return;
		this._autoPhase += this.settings.fireRate * h;
		if (this._autoPhase >= 1) {
			this._autoPhase -= 1;
			this.fireActionPotential();
		}
	}

	_updateVesicles(h) {
		for (const v of this.vesicles) {
			switch (v.state) {
				case "docking": {
					v.t += h / VESICLES.dockTime;
					const k = easeInOut(Math.min(v.t, 1));
					v.x = lerp(v.from.x, v.dock.x, k);
					v.y = lerp(v.from.y, v.dock.y, k);
					v.z = lerp(v.from.z, v.dock.z, k);
					if (v.t >= 1) {
						v.state = "fusing";
						v.t = 0;
					}
					break;
				}
				case "fusing": {
					v.t += h / VESICLES.fuseTime;
					v.scale = 1 - Math.min(v.t, 1) * 0.65;
					v.x = v.dock.x + Math.min(v.t, 1) * VESICLES.radius * 0.6;
					if (v.t >= 1) {
						this._releaseContents(v);
						v.state = "recycling";
						v.t = 0;
						v.scale = 0;
					}
					break;
				}
				case "recycling": {
					v.t += h;
					if (v.t >= VESICLES.refillTime) {
						this._restoreVesicle(v);
						v.appear = 0;
					}
					break;
				}
				default:
					if (v.appear < 1) v.appear = Math.min(1, v.appear + h * 2.5);
			}
		}
	}

	_releaseContents(v) {
		const n = VESICLES.transmittersPerVesicle;
		let released = 0;
		for (let i = 0; i < n; i++) {
			if (this.particles.length >= PARTICLE.maxCount) break;
			const a = this.rng.next() * Math.PI * 2;
			const r = this.rng.next() * 0.22;
			this.particles.push({
				id: this._nextId++,
				type: v.type,
				state: "free",
				x: CLEFT.xPre + PARTICLE.radius + this.rng.next() * 0.08,
				y: v.y + Math.cos(a) * r,
				z: v.z + Math.sin(a) * r,
				t: 0,
				age: 0,
				receptor: null,
				target: null,
			});
			released++;
		}
		this.stats.released += released;
		this.emit("vesicle:fused", {
			type: v.type,
			count: released,
			position: { x: CLEFT.xPre, y: v.y, z: v.z },
		});
	}

	_updateEnzymes(h) {
		for (const e of this.enzymes) {
			e.phase += h * 0.9;
			e.x = e.home.x + Math.sin(e.phase * 1.3) * 0.18;
			e.y = e.home.y + Math.sin(e.phase) * 0.22;
			e.z = e.home.z + Math.cos(e.phase * 0.8) * 0.22;
		}
	}

	_updateParticles(h) {
		const list = this.particles;
		for (let i = list.length - 1; i >= 0; i--) {
			const p = list[i];
			p.age += h;
			let remove = false;
			switch (p.state) {
				case "free":
					remove = this._moveFree(p, h);
					break;
				case "bound":
					if (this.time >= p.unbindAt) this._unbind(p);
					break;
				case "reuptake":
					p.t += h / REUPTAKE_ANIM;
					p.x = lerp(p.from.x, p.target.x, easeInOut(Math.min(p.t, 1)));
					p.y = lerp(p.from.y, p.target.y, easeInOut(Math.min(p.t, 1)));
					p.z = lerp(p.from.z, p.target.z, easeInOut(Math.min(p.t, 1)));
					if (p.t >= 1) {
						remove = true;
						this.stats.reuptaken++;
						this.emit("nt:cleared", { type: p.type, via: "reuptake" });
					}
					break;
				case "degrade":
					p.t += h / DEGRADE_ANIM;
					if (p.t >= 1) {
						remove = true;
						this.stats.degraded++;
						this.emit("nt:cleared", { type: p.type, via: "enzyme" });
					}
					break;
			}
			if (remove) {
				list[i] = list[list.length - 1];
				list.pop();
			}
		}
	}

	/** @returns {boolean} true when the particle should be removed. */
	_moveFree(p, h) {
		const nt = NEUROTRANSMITTERS[p.type];
		const sigma = Math.sqrt(2 * PARTICLE.diffusion * nt.diffusion * h);
		p.x += PARTICLE.drift * h + sigma * this.rng.gauss();
		p.y += sigma * this.rng.gauss();
		p.z += sigma * this.rng.gauss();

		const radial = Math.hypot(p.y, p.z);

		if (radial < CLEFT.radius) {
			const minX = CLEFT.xPre + PARTICLE.radius;
			const maxX = CLEFT.xPost - PARTICLE.radius;
			if (p.x < minX) p.x = 2 * minX - p.x;
			if (p.x > maxX) {
				if (this._tryBind(p, nt)) return false;
				p.x = 2 * maxX - p.x;
			}
		}

		if (radial > CLEFT.escapeRadius || Math.abs(p.x) > 3) {
			this.stats.escaped++;
			this.emit("nt:cleared", { type: p.type, via: "diffusion" });
			return true;
		}

		// Reuptake transporters sit on the periphery of both membranes.
		if (!this.settings.reuptakeBlocked && radial > 1.5) {
			const chance = 1 - Math.exp(-nt.reuptake * h);
			for (const t of this.transporters) {
				if (dist2(p, t) < TRANSPORTERS.captureRadius ** 2) {
					if (this.rng.next() < chance) {
						p.state = "reuptake";
						p.t = 0;
						p.from = { x: p.x, y: p.y, z: p.z };
						p.target = t;
						t.flash = 1;
					}
					break;
				}
			}
			if (p.state !== "free") return false;
		}

		// Extracellular enzymes break down monoamines.
		if (!this.settings.enzymesBlocked && nt.enzymatic > 0 && radial > 0.9) {
			const chance = 1 - Math.exp(-nt.enzymatic * h);
			for (const e of this.enzymes) {
				if (dist2(p, e) < ENZYMES.captureRadius ** 2) {
					if (this.rng.next() < chance) {
						p.state = "degrade";
						p.t = 0;
						p.enzyme = e;
						e.flash = 1;
					}
					break;
				}
			}
		}
		return false;
	}

	_tryBind(p, nt) {
		let best = null;
		let bestD = RECEPTORS.captureRadius ** 2;
		for (const r of this.receptors) {
			const d = (r.y - p.y) ** 2 + (r.z - p.z) ** 2;
			if (d < bestD) {
				bestD = d;
				best = r;
			}
		}
		if (
			!best ||
			best.particle ||
			best.blocked ||
			this.time < best.refractoryUntil ||
			this.rng.next() > nt.affinity
		) {
			return false;
		}

		p.state = "bound";
		p.receptor = best;
		p.x = best.x - PARTICLE.radius * 2.6;
		p.y = best.y;
		p.z = best.z;
		p.unbindAt = this.time + this.rng.exponential(nt.dwell);
		best.particle = p;
		best.lastType = p.type;
		this.stats.bindings++;
		this.emit("nt:bound", { type: p.type, polarity: nt.polarity });
		return true;
	}

	_unbind(p) {
		const r = p.receptor;
		if (r) {
			r.particle = null;
			r.refractoryUntil = this.time + RECEPTORS.refractory;
		}
		p.receptor = null;
		p.state = "free";
		p.x = CLEFT.xPost - PARTICLE.radius * 3.5;
	}

	_updateReceptors(h) {
		const k = Math.min(1, h * 12);
		for (const r of this.receptors) {
			const target = r.particle ? 1 : 0;
			r.activation += (target - r.activation) * k;
		}
	}

	_updateMembrane(h) {
		let gE = 0;
		let gI = 0;
		for (const r of this.receptors) {
			if (!r.particle) continue;
			const nt = NEUROTRANSMITTERS[r.particle.type];
			const g = MEMBRANE.conductance * nt.efficacy;
			if (nt.polarity === "excitatory") gE += g;
			else gI += g;
		}
		this.conductance = { excitatory: gE, inhibitory: gI };

		if (this.time < this._refractoryUntil) {
			this.voltage += ((MEMBRANE.reset - this.voltage) * h) / 0.03;
			return;
		}

		const dv =
			(MEMBRANE.rest - this.voltage) / MEMBRANE.tau +
			gE * (MEMBRANE.excitatoryReversal - this.voltage) +
			gI * (MEMBRANE.inhibitoryReversal - this.voltage);
		this.voltage += dv * h;

		if (this.voltage >= MEMBRANE.threshold) {
			this.voltage = MEMBRANE.reset;
			this._refractoryUntil = this.time + MEMBRANE.refractory;
			this._spikedThisSample = true;
			this.stats.spikes++;
			this.postSpikes.push({ start: this.time });
			this.emit("post:spike");
		}
	}

	_updateTone(h) {
		const counts = {};
		for (const r of this.receptors) {
			if (r.particle)
				counts[r.particle.type] = (counts[r.particle.type] || 0) + 1;
		}
		const k = h / TONE.tau;
		for (const key of NT_ORDER) {
			const target = Math.min(1, (counts[key] || 0) / TONE.saturation);
			this.tone[key] += (target - this.tone[key]) * k;
		}
	}

	_updateTransients(h) {
		const decay = Math.exp(-h * 6);
		for (const t of this.transporters) t.flash *= decay;
		for (const e of this.enzymes) e.flash *= decay;

		const t = this.time;
		this.actionPotentials = this.actionPotentials.filter(
			(ap) => t - ap.start < ACTION_POTENTIAL.travelTime + 0.1,
		);
		this.calciumPulses = this.calciumPulses.filter((c) => t - c.start < 0.8);
		this.postSpikes = this.postSpikes.filter((s) => t - s.start < 1.2);
	}

	_sample(h) {
		this._sampleClock += h;
		if (this._sampleClock < HISTORY.sampleInterval) return;
		this._sampleClock -= HISTORY.sampleInterval;

		const hist = this.history;
		hist.free[hist.head] = this.freeCount;
		hist.occupancy[hist.head] = this.occupancy;
		hist.voltage[hist.head] = this._spikedThisSample
			? MEMBRANE.peak
			: this.voltage;
		hist.head = (hist.head + 1) % HISTORY.length;
		this._spikedThisSample = false;
	}
}

/**
 * Derive a mood vector (each axis in [-1, 1]) from transmitter tone.
 * @param {Record<string, number>} tone
 */
export function computeMood(tone) {
	const mood = { happiness: 0, arousal: 0, anxiety: 0 };
	for (const key of NT_ORDER) {
		const level = tone[key] || 0;
		const weights = NEUROTRANSMITTERS[key].mood;
		mood.happiness += weights.happiness * level;
		mood.arousal += weights.arousal * level;
		mood.anxiety += weights.anxiety * level;
	}
	for (const axis of Object.keys(mood)) {
		mood[axis] = Math.max(-1, Math.min(1, mood[axis] * 1.6));
	}
	return mood;
}

/**
 * Target heart rate implied by transmitter tone.
 * @param {Record<string, number>} tone
 * @param {number} [base]
 */
export function computeHeartRate(tone, base = 68) {
	let bpm = base;
	for (const key of NT_ORDER) {
		bpm += NEUROTRANSMITTERS[key].heart * (tone[key] || 0) * 1.6;
	}
	return Math.max(42, Math.min(170, bpm));
}

function lerp(a, b, t) {
	return a + (b - a) * t;
}

function easeInOut(t) {
	return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function dist2(a, b) {
	return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}
