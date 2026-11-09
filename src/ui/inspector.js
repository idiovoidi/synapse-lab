import * as THREE from "three";
import { DRUGS } from "../config/drugs.js";
import { NEUROTRANSMITTERS } from "../config/neurotransmitters.js";
import { isExcitatory } from "../config/receptors.js";

const VESICLE_STATES = {
	ready: "Waiting in the vesicle pool",
	docking: "Docking at the active zone",
	fusing: "Fusing with the membrane",
};

const PARTICLE_STATES = {
	free: "Diffusing in the cleft",
	reuptake: "Being taken back up by a transporter",
	degrade: "Being broken down by COMT",
};

/**
 * Hover (mouse) or tap (touch) the 3D scene to see what a structure is and
 * its live state. Small objects are tested before the large translucent
 * membranes that enclose them.
 */
export class Inspector {
	/**
	 * @param {object} deps
	 * @param {import("../render/sceneManager.js").SceneManager} deps.sceneManager
	 * @param {import("../render/synapseView.js").SynapseView} deps.view
	 * @param {import("../sim/synapseModel.js").SynapseModel} deps.model
	 * @param {HTMLElement} deps.container
	 */
	constructor({ sceneManager, view, model, container }) {
		this.sceneManager = sceneManager;
		this.view = view;
		this.model = model;
		this.canvas = sceneManager.renderer.domElement;
		this.raycaster = new THREE.Raycaster();
		this.ndc = new THREE.Vector2();

		this.tip = document.createElement("div");
		this.tip.className = "inspect-tip";
		this.tip.setAttribute("role", "tooltip");
		this.tip.hidden = true;
		container.appendChild(this.tip);

		this.pointer = null; // { x, y, sticky }
		this.current = null; // { pick, instanceId }
		this._lastRefresh = 0;
		this._down = null;

		this.canvas.addEventListener("pointermove", (e) => {
			if (e.pointerType !== "mouse" || e.buttons !== 0) return;
			this.pointer = { x: e.clientX, y: e.clientY, sticky: false };
			this._dirty = true;
		});
		this.canvas.addEventListener("pointerleave", () => {
			if (!this.pointer?.sticky) this.hide();
		});
		this.canvas.addEventListener("pointerdown", (e) => {
			this._down = { x: e.clientX, y: e.clientY, t: performance.now() };
			if (e.pointerType === "mouse") this.hide();
		});
		this.canvas.addEventListener("pointerup", (e) => {
			const d = this._down;
			this._down = null;
			if (!d || e.pointerType === "mouse") return;
			const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
			// A short tap (not an orbit drag) inspects on touch screens.
			if (moved < 8 && performance.now() - d.t < 400) {
				this.pointer = { x: e.clientX, y: e.clientY, sticky: true };
				this._dirty = true;
			}
		});
		window.addEventListener("keydown", (e) => {
			if (e.key === "Escape") this.hide();
		});
	}

	hide() {
		this.pointer = null;
		this.current = null;
		this.tip.hidden = true;
		this.canvas.style.cursor = "";
	}

	/** Call once per frame after the scene has been updated. */
	update() {
		if (!this.pointer) return;
		const now = performance.now();
		if (this._dirty) {
			this._dirty = false;
			this.current = this._pick(this.pointer.x, this.pointer.y);
			this._lastRefresh = 0;
		}
		if (!this.current) {
			this.tip.hidden = true;
			this.canvas.style.cursor = "";
			return;
		}
		this.canvas.style.cursor = "help";
		// Live values refresh a few times a second.
		if (now - this._lastRefresh > 200) {
			this._lastRefresh = now;
			const info = this._describe(this.current);
			if (!info) {
				this.tip.hidden = true;
				return;
			}
			this.tip.innerHTML = `<strong>${info.title}</strong>${info.lines
				.filter(Boolean)
				.map((l) => `<span>${l}</span>`)
				.join("")}`;
			this.tip.hidden = false;
			this._place();
		}
	}

	_place() {
		const { x, y } = this.pointer;
		const rect = this.tip.getBoundingClientRect();
		const left = Math.min(window.innerWidth - rect.width - 12, x + 16);
		const top =
			y + rect.height + 28 > window.innerHeight ? y - rect.height - 12 : y + 18;
		this.tip.style.left = `${Math.max(12, left)}px`;
		this.tip.style.top = `${Math.max(12, top)}px`;
	}

	_pick(x, y) {
		const rect = this.canvas.getBoundingClientRect();
		this.ndc.set(
			((x - rect.left) / rect.width) * 2 - 1,
			-((y - rect.top) / rect.height) * 2 + 1,
		);
		this.raycaster.setFromCamera(this.ndc, this.sceneManager.camera);
		for (const group of [this.view.pickables, this.view.structures]) {
			for (const hit of this.raycaster.intersectObjects(group, true)) {
				if (!isVisible(hit.object)) continue;
				const owner = findPickable(hit.object);
				if (!owner) continue;
				return { pick: owner.userData.pick, instanceId: hit.instanceId };
			}
		}
		return null;
	}

	/** @returns {{title: string, lines: string[]} | null} */
	_describe({ pick, instanceId }) {
		const m = this.model;
		const nt = m.transmitter;
		const pct = (v) => `${Math.round(v * 100)}%`;
		switch (pick.kind) {
			case "receptor": {
				const r = pick.ref;
				const type = r.type;
				const action = isExcitatory(type) ? "excitatory" : "inhibitory";
				const kind =
					type.kind === "ionotropic"
						? "Ion channel"
						: `GPCR (${type.effector})`;
				let state = "Unoccupied";
				if (r.particle)
					state = `Bound: ${NEUROTRANSMITTERS[r.particle.type].name}`;
				else if (r.drug) state = `Blocked by ${DRUGS[r.drug].name}`;
				return {
					title: `${type.name} receptor`,
					lines: [
						`${kind} · ${action}`,
						r.side === "pre"
							? "Presynaptic autoreceptor: feeds back to reduce release"
							: "Postsynaptic",
						`<em>${state}</em>`,
						type.note,
					],
				};
			}
			case "transporter": {
				const t = pick.ref;
				const reversed = t.side === "pre" ? m.transporterReversal : 0;
				return {
					title: `${nt.transporter} transporter${t.side === "glia" ? " (astrocyte)" : ""}`,
					lines: [
						{
							pre: "On the presynaptic terminal",
							post: "On the postsynaptic neuron",
							glia: "On an astrocyte",
						}[t.side],
						`Carries ${nt.name.toLowerCase()} only`,
						`<em>Reuptake capacity ${pct(m.reuptakeCapacity)}</em>`,
						reversed > 0 ? `<em>Running in reverse: ${pct(reversed)}</em>` : "",
					],
				};
			}
			case "enzyme":
				return {
					title: "COMT enzyme",
					lines: [
						"Catechol-O-methyltransferase, on glia and the postsynaptic side",
						"Breaks down dopamine and norepinephrine that escape reuptake",
					],
				};
			case "vesicle": {
				const v = pick.ref;
				return {
					title: "Synaptic vesicle",
					lines: [
						`${v.content} molecules of ${NEUROTRANSMITTERS[v.type].name.toLowerCase()}`,
						`<em>${VESICLE_STATES[v.state] ?? ""}</em>`,
						"Filled by VMAT (monoamines) or VGLUT/VGAT (amino acids)",
					],
				};
			}
			case "particle": {
				const p = m.particles[instanceId];
				if (!p) return null;
				const where =
					p.state === "bound"
						? `Bound to ${p.receptor.type.name}${p.receptor.side === "pre" ? " autoreceptor" : ""}`
						: PARTICLE_STATES[p.state];
				return {
					title: `${NEUROTRANSMITTERS[p.type].name} molecule`,
					lines: [`<em>${where}</em>`, `Age ${p.age.toFixed(1)} s`],
				};
			}
			case "mitochondrion": {
				const inhibited = m.effects.enzymeInhibit.MAO || 0;
				return {
					title: "Mitochondrion",
					lines: [
						"Powers vesicle recycling",
						nt.mao
							? `<em>MAO breaking down ${m.maoActivity.toFixed(1)} molecules/s</em>`
							: `MAO idle: ${nt.name.toLowerCase()} isn't a substrate`,
						inhibited > 0 ? `<em>MAO ${pct(inhibited)} inhibited</em>` : "",
					],
				};
			}
			case "terminal":
				return {
					title: "Presynaptic terminal",
					lines: [
						`Vesicles ready ${m.readyVesicles} / ${m.vesicles.length}`,
						`<em>Release probability ${pct(m.effectiveReleaseProbability)}</em>`,
						`Cytosolic store ${Math.round(m.cytosol)} molecules`,
					],
				};
			case "spine":
				return {
					title: "Postsynaptic spine",
					lines: [
						`<em>Membrane ${m.voltage.toFixed(1)} mV</em>`,
						`${m.boundCount} receptors bound (${pct(m.occupancy)})`,
					],
				};
			case "dendrite":
				return {
					title: "Dendritic shaft",
					lines: ["Carries postsynaptic signals toward the cell body"],
				};
			case "axon":
				return {
					title: "Axon",
					lines: [
						"Myelin speeds the action potential",
						"Gaps between sheaths are nodes of Ranvier",
					],
				};
			case "activeZone":
				return {
					title: "Active zone",
					lines: ["Where vesicles dock and fuse; Ca²⁺ channels open here"],
				};
			case "psd":
				return {
					title: "Postsynaptic density",
					lines: ["Scaffold proteins that anchor and cluster receptors"],
				};
			case "astrocyte":
				return {
					title: "Astrocyte process",
					lines: [
						"Glial cell wrapping the synapse (the 'tripartite synapse')",
						nt.aminoAcid
							? `<em>Clearing ${nt.name} with ${nt.transporter} transporters</em>`
							: "Monoamines here are cleared mainly by neuronal transporters",
					],
				};
			default:
				return null;
		}
	}
}

function findPickable(object) {
	let o = object;
	while (o) {
		if (o.userData.pick) return o;
		o = o.parent;
	}
	return null;
}

function isVisible(object) {
	let o = object;
	while (o) {
		if (!o.visible) return false;
		o = o.parent;
	}
	return true;
}
