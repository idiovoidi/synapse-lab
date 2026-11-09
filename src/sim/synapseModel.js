import { DRUGS, occupancy } from "../config/drugs.js";
import { NEUROTRANSMITTERS, NT_ORDER } from "../config/neurotransmitters.js";
import {
	isExcitatory,
	nmdaUnblocked,
	RECEPTOR_TYPES,
} from "../config/receptors.js";
import {
	ACTION_POTENTIAL,
	AUTORECEPTORS,
	CLEFT,
	CYTOSOL,
	ENZYMES,
	FIRING_RATE_TAU,
	HISTORY,
	MEMBRANE,
	MESSENGER,
	PARTICLE,
	PHARMACOLOGY,
	RECEPTORS,
	RELEASE,
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
			releaseProbability: RELEASE.probability,
			autoFire: false,
			fireRate: 1.5,
		};

		/** Active drugs: key → relative dose. */
		this.drugs = {};
		this._recomputeDrugEffects();

		this.receptors = this._createReceptors();
		this.autoreceptors = this._createAutoreceptors();
		this._allReceptors = [...this.receptors, ...this.autoreceptors];
		this.transporters = this._createTransporters();
		this.enzymes = this._createEnzymes();
		this.vesicles = this._createVesicles();
		this._configureSynapse();

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
		this.messenger = { Gs: 0, Gq: 0, Gi: 0 };
		this.conductance = { excitatory: 0, inhibitory: 0 };
		/** Smoothed postsynaptic firing rate (spikes/s). */
		this.firingRate = 0;
		/** Smoothed autoreceptor (Gi) activation, 0–1. */
		this.autoBrake = 0;

		this.cytosol = this.cytosolSetpoint;
		this._effluxAccumulator = 0;
		/** Smoothed MAO breakdown rate (molecules/s). */
		this.maoActivity = 0;
		this._maoAccumulator = 0;

		this.tone = Object.fromEntries(NT_ORDER.map((k) => [k, 0]));
		this.stats = {
			actionPotentials: 0,
			fusions: 0,
			released: 0,
			bindings: 0,
			reuptaken: 0,
			degraded: 0,
			metabolised: 0,
			escaped: 0,
			spikes: 0,
			failures: 0,
			injected: 0,
			effluxed: 0,
		};

		for (const r of this._allReceptors) {
			r.particle = null;
			r.activation = 0;
			r.refractoryUntil = 0;
			r.drug = null;
			r.blocked = false;
		}
		for (const t of this.transporters) t.flash = 0;
		for (const e of this.enzymes) e.flash = 0;
		for (const v of this.vesicles) {
			this._placeVesicle(v);
			v.content = VESICLES.transmittersPerVesicle;
			v.leak = 0;
		}

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
		// A different transmitter means a different synapse (Dale's principle):
		// vesicles are refilled and the receptor and transporter mix changes.
		this._configureSynapse();
		this.cytosol = this.cytosolSetpoint;
		for (const v of this.vesicles) {
			if (v.state === "ready") {
				v.type = key;
				v.content = VESICLES.transmittersPerVesicle;
			}
		}
		this.emit("settings:changed", { transmitter: key });
	}

	/**
	 * @param {"autoFire"} flag
	 * @param {boolean} [value]
	 */
	setFlag(flag, value = !this.settings[flag]) {
		this.settings[flag] = Boolean(value);
		if (flag === "autoFire") this._autoPhase = 0.999; // fire promptly
		this.emit("settings:changed", { [flag]: this.settings[flag] });
	}

	/**
	 * Apply a drug at a relative dose (0 removes it).
	 * @param {string} key
	 * @param {number} dose
	 */
	setDrug(key, dose) {
		if (!DRUGS[key]) return;
		if (dose > 0) this.drugs[key] = dose;
		else delete this.drugs[key];
		this._recomputeDrugEffects();
		this.emit("drug:changed", { key, dose: this.drugs[key] ?? 0 });
	}

	/**
	 * A drug's targets, its occupancy of each, and whether each target
	 * exists at the current synapse.
	 * @param {string} key
	 * @param {number} [dose]
	 */
	drugTargets(key, dose = this.drugs[key] ?? DRUGS[key].defaultDose) {
		const nt = this.transmitter;
		const receptorsHere = new Set([
			...nt.postsynaptic.map(([k]) => k),
			nt.autoreceptor,
		]);
		return DRUGS[key].targets.map((t) => {
			let present;
			switch (t.action) {
				case "transporterBlock":
				case "transporterReverse":
					present = t.target === nt.transporter;
					break;
				case "vmatDisrupt":
					present = !nt.aminoAcid;
					break;
				case "enzymeInhibit":
					present = t.target === "MAO" && nt.mao;
					break;
				default:
					present = receptorsHere.has(t.target);
			}
			return { ...t, occupancy: occupancy(dose, t.ki), present };
		});
	}

	/** Fraction of D2-type (or any) receptors currently capped by an antagonist. */
	antagonistOccupancy(typeKey) {
		let n = 0;
		let blocked = 0;
		for (const r of this._allReceptors) {
			if (r.type.key !== typeKey) continue;
			n++;
			if (r.drug) blocked++;
		}
		return n === 0 ? 0 : blocked / n;
	}

	/** @param {number} hz */
	setFireRate(hz) {
		this.settings.fireRate = Math.max(0.1, Math.min(8, hz));
	}

	/** @param {number} p Per-vesicle fusion probability, 0–1. */
	setReleaseProbability(p) {
		this.settings.releaseProbability = Math.max(0.01, Math.min(1, p));
	}

	/**
	 * Place transmitter directly into the cleft at the presynaptic face,
	 * bypassing vesicles (used for experiments and tests).
	 * @param {string} type
	 * @param {number} count
	 */
	injectTransmitter(type, count) {
		if (!NEUROTRANSMITTERS[type]) return;
		for (let i = 0; i < count; i++) {
			const a = this.rng.next() * Math.PI * 2;
			const r = Math.sqrt(this.rng.next()) * 1.6;
			if (!this._spawnParticle(type, Math.cos(a) * r, Math.sin(a) * r)) break;
			this.stats.injected++;
		}
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

	get transmitter() {
		return NEUROTRANSMITTERS[this.settings.transmitter];
	}

	get freeCount() {
		let n = 0;
		for (const p of this.particles) if (p.state === "free") n++;
		return n;
	}

	/** Bound postsynaptic receptors. */
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

	/** Mean transmitter content of vesicles waiting to be released. */
	get meanVesicleContent() {
		let sum = 0;
		let n = 0;
		for (const v of this.vesicles) {
			if (v.state !== "ready") continue;
			sum += v.content;
			n++;
		}
		return n === 0 ? 0 : sum / n;
	}

	/** Release probability after autoreceptor feedback. */
	get effectiveReleaseProbability() {
		return (
			this.settings.releaseProbability *
			(1 - AUTORECEPTORS.brake * this.autoBrake)
		);
	}

	/** Fraction of normal reuptake capacity left after drugs (0–1). */
	get reuptakeCapacity() {
		return this._transportFraction();
	}

	/** Strength of transporter reversal by releasers at this synapse (0–1). */
	get transporterReversal() {
		return this.effects.transporterReverse[this.transmitter.transporter] || 0;
	}

	/** Steady-state cytosolic level for the current transmitter. */
	get cytosolSetpoint() {
		const s = CYTOSOL.synthesis;
		if (!this.transmitter.mao) return CYTOSOL.capacity;
		return s / (s / CYTOSOL.capacity + CYTOSOL.mao);
	}

	// ---------------------------------------------------------------------
	// Fixtures
	// ---------------------------------------------------------------------

	/**
	 * Combine all active drugs into per-target effect strengths. Drugs acting
	 * on the same target compete for it, so their dose/Ki ratios add before
	 * the mass-action saturation.
	 */
	_recomputeDrugEffects() {
		const ratios = {};
		const firstDrug = {};
		for (const [key, dose] of Object.entries(this.drugs)) {
			for (const t of DRUGS[key].targets) {
				const id = `${t.action}:${t.target}`;
				ratios[id] = (ratios[id] || 0) + dose / t.ki;
				firstDrug[id] ??= key;
			}
		}
		const effects = {
			transporterBlock: {},
			transporterReverse: {},
			vmatDisrupt: 0,
			antagonist: {},
			antagonistDrug: {},
			pam: {},
			channelBlock: {},
			enzymeInhibit: {},
		};
		for (const [id, ratio] of Object.entries(ratios)) {
			const [action, target] = id.split(":");
			const occ = ratio / (1 + ratio);
			if (action === "vmatDisrupt") effects.vmatDisrupt = occ;
			else effects[action][target] = occ;
			if (action === "antagonist")
				effects.antagonistDrug[target] = firstDrug[id];
		}
		this.effects = effects;
	}

	_receptorSlot(side, x, y, z, id) {
		return {
			id,
			side,
			/** Stable random value that picks this slot's subtype. */
			slot: this.rng.next(),
			type: null,
			x,
			y,
			z,
			/** Antagonist currently capping this receptor, if any. */
			drug: null,
			blocked: false,
			particle: null,
			activation: 0,
			refractoryUntil: 0,
			lastType: null,
		};
	}

	_createReceptors() {
		const receptors = [];
		let id = 0;
		for (const ring of RECEPTORS.rings) {
			const offset = this.rng.next() * Math.PI * 2;
			for (let i = 0; i < ring.n; i++) {
				const a = offset + (i / ring.n) * Math.PI * 2;
				const jitter = ring.r === 0 ? 0 : (this.rng.next() - 0.5) * 0.12;
				const r = ring.r + jitter;
				receptors.push(
					this._receptorSlot(
						"post",
						CLEFT.xPost,
						Math.cos(a) * r,
						Math.sin(a) * r,
						id++,
					),
				);
			}
		}
		return receptors;
	}

	_createAutoreceptors() {
		const list = [];
		for (let i = 0; i < AUTORECEPTORS.n; i++) {
			const a = ((i + 0.5) / AUTORECEPTORS.n) * Math.PI * 2;
			list.push(
				this._receptorSlot(
					"pre",
					CLEFT.xPre,
					Math.cos(a) * AUTORECEPTORS.r,
					Math.sin(a) * AUTORECEPTORS.r,
					1000 + i,
				),
			);
		}
		return list;
	}

	_createTransporters() {
		const list = [];
		for (const side of ["pre", "post"]) {
			const spec = TRANSPORTERS[side];
			const offset = side === "pre" ? 0 : Math.PI / spec.n;
			for (let i = 0; i < spec.n; i++) {
				const a = offset + (i / spec.n) * Math.PI * 2;
				list.push({
					side,
					x: spec.x,
					y: Math.cos(a) * spec.r,
					z: Math.sin(a) * spec.r,
					flash: 0,
					active: true,
				});
			}
		}
		// Astrocyte transporters follow the glial arc behind the cleft.
		const glia = TRANSPORTERS.glia;
		for (let i = 0; i < glia.n; i++) {
			const theta = -glia.arc / 2 + (glia.arc * i) / (glia.n - 1);
			list.push({
				side: "glia",
				x: i % 2 === 0 ? -0.35 : 0.35,
				y: Math.sin(theta) * glia.r,
				z: -Math.cos(theta) * glia.r,
				flash: 0,
				active: true,
			});
		}
		return list;
	}

	_createEnzymes() {
		// COMT sits on glia and the postsynaptic side, outside the cleft proper.
		const list = [];
		for (let i = 0; i < ENZYMES.count; i++) {
			const a = (i / ENZYMES.count) * Math.PI * 2 + this.rng.next() * 0.4;
			const r = 2.55 + this.rng.next() * 0.6;
			const home = {
				x: 0.15 + this.rng.next() * 0.8,
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
				list.push({
					id: list.length,
					home,
					x: 0,
					y: 0,
					z: 0,
					content: 0,
					leak: 0,
				});
			}
		}
		return list;
	}

	/** Apply the current synapse recipe to receptors and transporters. */
	_configureSynapse() {
		const nt = this.transmitter;
		for (const r of this.receptors) {
			this._setReceptorType(r, pickFromMix(nt.postsynaptic, r.slot));
		}
		for (const r of this.autoreceptors) {
			this._setReceptorType(r, nt.autoreceptor);
		}
		for (const t of this.transporters) {
			// Monoamine transporters are presynaptic; amino-acid synapses also
			// use postsynaptic and astrocyte transporters.
			t.active = t.side === "pre" || nt.aminoAcid;
		}
	}

	_setReceptorType(r, key) {
		const type = RECEPTOR_TYPES[key];
		if (r.particle && r.particle.type !== type.ligand) this._unbind(r.particle);
		if (r.type !== type) {
			r.drug = null;
			r.blocked = false;
		}
		r.type = type;
	}

	_placeVesicle(v) {
		v.state = "ready";
		v.t = 0;
		v.x = v.home.x;
		v.y = v.home.y;
		v.z = v.home.z;
		v.scale = 1;
		v.appear = 1;
		v.type = this.settings.transmitter;
	}

	/**
	 * Fill a recycled vesicle from the cytosolic pool. Fill scales with the
	 * cytosolic level, so MAO inhibition (more cytosolic transmitter) makes
	 * bigger quanta, and heavy use without reuptake makes smaller ones.
	 */
	_fillVesicle(v) {
		const ratio = Math.max(0, this.cytosol / this.cytosolSetpoint);
		const wanted = Math.round(
			VESICLES.transmittersPerVesicle * ratio ** CYTOSOL.fillExponent,
		);
		const target = Math.max(CYTOSOL.minFill, Math.min(CYTOSOL.maxFill, wanted));
		const taken = Math.min(target, Math.floor(this.cytosol));
		this.cytosol -= taken;
		v.content = taken;
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
		this._schedule(ACTION_POTENTIAL.calciumDelay, () =>
			this._releaseVesicles(),
		);
	}

	/**
	 * Each vesicle at a docking site fuses independently with the release
	 * probability, reduced by autoreceptor feedback.
	 */
	_releaseVesicles() {
		const candidates = this.vesicles
			.filter((v) => v.state === "ready")
			.sort((a, b) => b.home.x - a.home.x)
			.slice(0, RELEASE.sites);
		const p = this.effectiveReleaseProbability;
		const fusing = candidates.filter(() => this.rng.next() < p);

		if (fusing.length === 0) {
			this.stats.failures++;
			this.emit("release:failed", { depleted: candidates.length === 0 });
			return;
		}

		this.stats.fusions += fusing.length;
		for (const v of fusing) {
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
		this._updateCytosol(h);
		this._updateVesicles(h);
		this._updateEnzymes(h);
		this._updateParticles(h);
		this._updateReceptors(h);
		this._updateAntagonists(h);
		this._updateReleasers(h);
		this._updateAutoreceptorBrake(h);
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

	_updateCytosol(h) {
		// Synthesis slows as the store fills (end-product inhibition).
		this.cytosol +=
			CYTOSOL.synthesis * (1 - this.cytosol / CYTOSOL.capacity) * h;

		let maoRate = 0;
		const maoInhibition = this.effects.enzymeInhibit.MAO || 0;
		if (this.transmitter.mao) {
			maoRate = CYTOSOL.mao * this.cytosol * (1 - maoInhibition);
			const broken = maoRate * h;
			this.cytosol -= broken;
			this._maoAccumulator += broken;
			while (this._maoAccumulator >= 1) {
				this._maoAccumulator -= 1;
				this.stats.metabolised++;
			}
		}
		this.maoActivity += (maoRate - this.maoActivity) * Math.min(1, h * 2);
		this.cytosol = Math.max(0, this.cytosol);
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
						this._placeVesicle(v);
						this._fillVesicle(v);
						v.appear = 0;
					}
					break;
				}
				default:
					if (v.appear < 1) v.appear = Math.min(1, v.appear + h * 2.5);
			}
		}
	}

	/** @returns {boolean} false when the particle cap is reached. */
	_spawnParticle(type, y, z) {
		if (this.particles.length >= PARTICLE.maxCount) return false;
		this.particles.push({
			id: this._nextId++,
			type,
			state: "free",
			x: CLEFT.xPre + PARTICLE.radius + this.rng.next() * 0.08,
			y,
			z,
			t: 0,
			age: 0,
			receptor: null,
			target: null,
		});
		return true;
	}

	_releaseContents(v) {
		let released = 0;
		for (let i = 0; i < v.content; i++) {
			const a = this.rng.next() * Math.PI * 2;
			const r = this.rng.next() * 0.22;
			const y = v.y + Math.cos(a) * r;
			const z = v.z + Math.sin(a) * r;
			if (!this._spawnParticle(v.type, y, z)) break;
			released++;
		}
		v.content = 0;
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
						// Presynaptic reuptake refills the terminal directly; astrocytes
						// return amino acids via the glutamate–glutamine cycle.
						if (p.target.side !== "post") this.cytosol += 1;
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
			if (p.x < minX) {
				if (this._tryBind(p, this.autoreceptors)) return false;
				p.x = 2 * minX - p.x;
			}
			if (p.x > maxX) {
				if (this._tryBind(p, this.receptors)) return false;
				p.x = 2 * maxX - p.x;
			}
		}

		if (radial > CLEFT.escapeRadius || Math.abs(p.x) > 3) {
			this.stats.escaped++;
			this.emit("nt:cleared", { type: p.type, via: "diffusion" });
			return true;
		}

		// Transporters carry only this synapse's transmitter (DAT, SERT, EAAT…).
		const transport = this._transportFraction();
		if (transport > 0 && p.type === this.settings.transmitter && radial > 1.5) {
			const chance = 1 - Math.exp(-nt.reuptake * transport * h);
			for (const t of this.transporters) {
				if (!t.active) continue;
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

		// COMT on glia and the postsynaptic side breaks down catecholamines.
		if (nt.enzymatic > 0 && radial > 2) {
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

	/**
	 * @param {object} p Particle touching a membrane.
	 * @param {object[]} list Receptors on that membrane.
	 */
	_tryBind(p, list) {
		let best = null;
		let bestD = RECEPTORS.captureRadius ** 2;
		for (const r of list) {
			const d = (r.y - p.y) ** 2 + (r.z - p.z) ** 2;
			if (d < bestD) {
				bestD = d;
				best = r;
			}
		}
		// Receptors only recognise their own ligand.
		if (
			!best ||
			best.type.ligand !== p.type ||
			best.particle ||
			best.blocked ||
			this.time < best.refractoryUntil ||
			this.rng.next() > best.type.affinity
		) {
			return false;
		}

		const inward = best.side === "pre" ? 1 : -1;
		p.state = "bound";
		p.receptor = best;
		p.x = best.x + inward * PARTICLE.radius * 2.6;
		p.y = best.y;
		p.z = best.z;
		// Benzodiazepine-like modulators keep the channel open longer.
		const pam = this.effects.pam[best.type.key] || 0;
		const dwell = best.type.dwell * (1 + PHARMACOLOGY.pamDwell * pam);
		p.unbindAt = this.time + this.rng.exponential(dwell);
		best.particle = p;
		best.lastType = p.type;
		this.stats.bindings++;
		this.emit("nt:bound", {
			type: p.type,
			receptor: best.type.key,
			side: best.side,
			polarity: isExcitatory(best.type) ? "excitatory" : "inhibitory",
		});
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
		p.x =
			r?.side === "pre"
				? CLEFT.xPre + PARTICLE.radius * 3.5
				: CLEFT.xPost - PARTICLE.radius * 3.5;
	}

	_updateReceptors(h) {
		const k = Math.min(1, h * 12);
		for (const r of this._allReceptors) {
			const target = r.particle ? 1 : 0;
			r.activation += (target - r.activation) * k;
		}
	}

	/** Fraction of normal reuptake capacity left after drugs. */
	_transportFraction() {
		const key = this.transmitter.transporter;
		const block = this.effects.transporterBlock[key] || 0;
		// A transporter substrate (amphetamine) competes with normal uptake.
		const substrate =
			(this.effects.transporterReverse[key] || 0) *
			PHARMACOLOGY.substrateCompetition;
		return (1 - block) * (1 - substrate);
	}

	/**
	 * Competitive antagonists bind and leave receptors stochastically. With
	 * no agonist around, the fraction capped settles at the mass-action
	 * occupancy; a receptor holding its agonist cannot be capped, so heavy
	 * transmitter release competes the antagonist off.
	 */
	_updateAntagonists(h) {
		const koff = PHARMACOLOGY.antagonistKoff;
		const pOff = 1 - Math.exp(-koff * h);
		for (const r of this._allReceptors) {
			const occ = Math.min(0.98, this.effects.antagonist[r.type.key] || 0);
			if (r.drug) {
				if (this.rng.next() < pOff) {
					r.drug = null;
					r.blocked = false;
				}
			} else if (occ > 0 && !r.particle) {
				const kon = (koff * occ) / (1 - occ);
				if (this.rng.next() < 1 - Math.exp(-kon * h)) {
					r.drug = this.effects.antagonistDrug[r.type.key];
					r.blocked = true;
				}
			}
		}
	}

	/**
	 * Amphetamine-like releasers: VMAT disruption empties vesicles into the
	 * cytosol, and reversed transporters pump cytosolic transmitter out into
	 * the cleft without any action potential.
	 */
	_updateReleasers(h) {
		const nt = this.transmitter;
		const vmat = nt.aminoAcid ? 0 : this.effects.vmatDisrupt;
		if (vmat > 0) {
			for (const v of this.vesicles) {
				if (v.state !== "ready" || v.content <= 0) continue;
				v.leak += PHARMACOLOGY.vmatLeak * vmat * v.content * h;
				while (v.leak >= 1 && v.content > 0) {
					v.leak -= 1;
					v.content--;
					this.cytosol += 1;
				}
			}
		}

		const reverse = this.effects.transporterReverse[nt.transporter] || 0;
		if (reverse <= 0) return;
		const pumps = this.transporters.filter((t) => t.active && t.side === "pre");
		const rate =
			PHARMACOLOGY.efflux *
			reverse *
			pumps.length *
			Math.min(2, this.cytosol / this.cytosolSetpoint);
		this._effluxAccumulator += rate * h;
		while (this._effluxAccumulator >= 1 && this.cytosol >= 1) {
			this._effluxAccumulator -= 1;
			const t = pumps[Math.floor(this.rng.next() * pumps.length)];
			if (!this._spawnParticle(nt.key, t.y * 0.92, t.z * 0.92)) break;
			this.cytosol -= 1;
			this.stats.effluxed++;
			t.flash = 1;
		}
	}

	/** Gi-coupled autoreceptors throttle release with G-protein kinetics. */
	_updateAutoreceptorBrake(h) {
		let bound = 0;
		for (const r of this.autoreceptors) if (r.particle) bound++;
		const drive = bound / this.autoreceptors.length;
		const tau = drive > this.autoBrake ? MESSENGER.rise : MESSENGER.decay;
		this.autoBrake += ((drive - this.autoBrake) * h) / tau;
	}

	_updateMembrane(h) {
		const v = this.voltage;
		let gCation = 0;
		let gChloride = 0;
		const drive = { Gs: 0, Gq: 0, Gi: 0 };

		for (const r of this.receptors) {
			if (!r.particle) continue;
			const type = r.type;
			if (type.kind === "metabotropic") {
				drive[type.effector] += type.gain;
				continue;
			}
			let g = MEMBRANE.conductance * type.gain;
			if (type.mgBlock) g *= nmdaUnblocked(v);
			g *= 1 + PHARMACOLOGY.pamConductance * (this.effects.pam[type.key] || 0);
			g *= 1 - (this.effects.channelBlock[type.key] || 0);
			if (type.effector === "cation") gCation += g;
			else gChloride += g;
		}

		// G-protein messengers build up and decay slowly.
		for (const key of Object.keys(this.messenger)) {
			const m = this.messenger[key];
			const tau = drive[key] > m ? MESSENGER.rise : MESSENGER.decay;
			this.messenger[key] += ((drive[key] - m) * h) / tau;
		}
		const gSlowCation =
			(this.messenger.Gs + this.messenger.Gq) * MESSENGER.conductance;
		const gGirk = this.messenger.Gi * MESSENGER.conductance;

		this.conductance = {
			excitatory: gCation + gSlowCation,
			inhibitory: gChloride + gGirk,
		};
		this.firingRate *= Math.exp(-h / FIRING_RATE_TAU);

		if (this.time < this._refractoryUntil) {
			this.voltage += ((MEMBRANE.reset - this.voltage) * h) / 0.03;
			return;
		}

		const dv =
			(MEMBRANE.rest - v) / MEMBRANE.tau +
			(gCation + gSlowCation) * (MEMBRANE.excitatoryReversal - v) +
			gChloride * (MEMBRANE.inhibitoryReversal - v) +
			gGirk * (MEMBRANE.potassiumReversal - v);
		this.voltage += dv * h;

		if (this.voltage >= MEMBRANE.threshold) {
			this.voltage = MEMBRANE.reset;
			this._refractoryUntil = this.time + MEMBRANE.refractory;
			this._spikedThisSample = true;
			this.stats.spikes++;
			this.firingRate += 1 / FIRING_RATE_TAU;
			this.postSpikes.push({ start: this.time });
			this.emit("post:spike");
		}
	}

	_updateTone(h) {
		const counts = {};
		for (const r of this.receptors) {
			if (r.particle) {
				counts[r.particle.type] = (counts[r.particle.type] || 0) + 1;
			}
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
 * Illustrative mood vector (each axis in [-1, 1]) from slow transmitter tone
 * and postsynaptic firing. A teaching device, not a model of real mood,
 * which emerges from whole circuits over days to weeks.
 * @param {Record<string, number>} tone
 * @param {number} [firingRate] Postsynaptic spikes/s.
 */
export function computeMood(tone, firingRate = 0) {
	const mood = { happiness: 0, arousal: 0, anxiety: 0 };
	for (const key of NT_ORDER) {
		const level = tone[key] || 0;
		const weights = NEUROTRANSMITTERS[key].mood;
		mood.happiness += weights.happiness * level;
		mood.arousal += weights.arousal * level;
		mood.anxiety += weights.anxiety * level;
	}
	mood.arousal += Math.min(0.35, firingRate * 0.08);
	for (const axis of Object.keys(mood)) {
		mood[axis] = Math.max(-1, Math.min(1, mood[axis] * 1.6));
	}
	return mood;
}

/**
 * Heart-rate analogy. Real heart rate is set by peripheral autonomic nerves,
 * so only noradrenergic (sympathetic-like) tone moves it here.
 * @param {Record<string, number>} tone
 * @param {number} [base]
 */
export function computeHeartRate(tone, base = 68) {
	const bpm = base + 48 * (tone.NOREPINEPHRINE || 0);
	return Math.max(42, Math.min(170, bpm));
}

/** Pick a subtype from a receptor mix using a stable value in [0, 1). */
function pickFromMix(mix, value) {
	let acc = 0;
	for (const [key, fraction] of mix) {
		acc += fraction;
		if (value < acc) return key;
	}
	return mix[mix.length - 1][0];
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
