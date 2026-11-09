import {
	ACTION_LABELS,
	DOSE_RANGE,
	DRUG_ORDER,
	DRUGS,
	TARGET_NAMES,
} from "../config/drugs.js";
import { NEUROTRANSMITTERS, NT_ORDER } from "../config/neurotransmitters.js";
import { isExcitatory, RECEPTOR_TYPES } from "../config/receptors.js";
import { MEMBRANE, PARTICLE } from "../config/synapse.js";
import { CAMERA_PRESETS } from "../render/sceneManager.js";
import { LineChart } from "./lineChart.js";

// Same order as the dock buttons, used by the V shortcut.
const VIEWS = ["overview", "terminal", "cleft", "receptors", "spine"];

const $ = (sel) => document.querySelector(sel);

/**
 * Binds the static HUD markup in index.html to the simulation and scene.
 */
export class Hud {
	/**
	 * @param {object} deps
	 * @param {import("../sim/synapseModel.js").SynapseModel} deps.model
	 * @param {import("../render/sceneManager.js").SceneManager} deps.sceneManager
	 * @param {{on: Function, emit: Function}} deps.bus
	 * @param {{show: Function}} deps.toaster
	 */
	constructor({ model, sceneManager, bus, toaster }) {
		this.model = model;
		this.sceneManager = sceneManager;
		this.bus = bus;
		this.toaster = toaster;

		this.state = {
			paused: false,
			speed: 1,
			labels: true,
			orbit: false,
			view: "overview",
		};

		this._bindTransmitters();
		this._bindStimulation();
		this._bindPharmacology();
		this._bindDock();
		this._bindTopbar();
		this._bindKeyboard();
		this._bindEvents();
		this._buildCharts();

		this.statEls = [...document.querySelectorAll("[data-stat]")];
		this._lastStats = {};
		this.selectTransmitter(model.settings.transmitter);
	}

	// ---------------------------------------------------------------------
	// Transmitter picker
	// ---------------------------------------------------------------------

	_bindTransmitters() {
		const list = $("#nt-list");
		this.ntButtons = NT_ORDER.map((key, i) => {
			const nt = NEUROTRANSMITTERS[key];
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "nt-option";
			btn.setAttribute("role", "radio");
			btn.setAttribute("aria-label", nt.name);
			btn.title = `${nt.name} (${i + 1})`;
			btn.style.setProperty("--c", nt.color);
			btn.innerHTML = `<span class="nt-orb"></span><span class="nt-short">${nt.short}</span>`;
			btn.addEventListener("click", () => this.selectTransmitter(key));
			list.appendChild(btn);
			return { key, btn };
		});

		// Arrow-key navigation within the radiogroup.
		list.addEventListener("keydown", (e) => {
			const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
				e.key
			];
			if (!dir) return;
			e.preventDefault();
			const i = NT_ORDER.indexOf(this.model.settings.transmitter);
			const next = NT_ORDER[(i + dir + NT_ORDER.length) % NT_ORDER.length];
			this.selectTransmitter(next);
			this.ntButtons.find((b) => b.key === next).btn.focus();
		});
	}

	/** @param {string} key */
	selectTransmitter(key) {
		const nt = NEUROTRANSMITTERS[key];
		if (!nt) return;
		this.model.setTransmitter(key);
		document.documentElement.style.setProperty("--nt", nt.color);
		for (const { key: k, btn } of this.ntButtons) {
			const on = k === key;
			btn.setAttribute("aria-checked", String(on));
			btn.tabIndex = on ? 0 : -1;
		}
		$("#nt-info").innerHTML = `
			<div class="nt-title"><h3>${nt.synapse} synapse</h3><span class="nt-role">${nt.role}</span></div>
			<div class="nt-tags">
				${nt.postsynaptic.map(([key, f]) => receptorTag(key, f)).join("")}
			</div>
			<p class="nt-summary">${nt.summary}</p>
			<details class="nt-more"${this._factsOpen ? " open" : ""}>
				<summary>Receptor subtypes &amp; clearance</summary>
				<dl class="nt-facts">
					${nt.postsynaptic
						.map(
							([key]) =>
								`<dt>${RECEPTOR_TYPES[key].name}</dt><dd>${RECEPTOR_TYPES[key].note}</dd>`,
						)
						.join("")}
					<dt>Cleared by</dt><dd>${nt.clearance}</dd>
				</dl>
			</details>`;
		$("#nt-info .nt-more").addEventListener("toggle", (e) => {
			this._factsOpen = e.target.open;
		});
		if (this.drugCards) this._renderDrugs();
		this.bus.emit("ui:transmitter", key);
	}

	// ---------------------------------------------------------------------
	// Stimulation
	// ---------------------------------------------------------------------

	_bindStimulation() {
		this.fireBtn = $("#fire-btn");
		this.fireBtn.addEventListener("click", () => this.fire());
		$("#dock-fire-btn").addEventListener("click", () => this.fire());

		this.autoToggle = $("#autofire-toggle");
		this.autoToggle.addEventListener("change", () =>
			this.setAutoFire(this.autoToggle.checked),
		);

		const rate = $("#rate-slider");
		const rateOut = $("#rate-out");
		const syncRate = () => {
			this.model.setFireRate(Number(rate.value));
			rateOut.textContent = `${Number(rate.value).toFixed(1)} Hz`;
			setFill(rate);
		};
		rate.addEventListener("input", syncRate);
		syncRate();

		const pr = $("#release-slider");
		const prOut = $("#release-out");
		const syncPr = () => {
			this.model.setReleaseProbability(Number(pr.value));
			prOut.textContent = `${Math.round(Number(pr.value) * 100)}%`;
			setFill(pr);
		};
		pr.addEventListener("input", syncPr);
		syncPr();

		this.poolOut = $("#pool-out");
		this.poolMeter = $("#pool-meter");
		this.fillOut = $("#fill-out");
		this.brakeOut = $("#brake-out");
		this.cytosolOut = $("#cytosol-out");
	}

	fire() {
		this.model.fireActionPotential();
		this.fireBtn.classList.remove("is-firing");
		void this.fireBtn.offsetWidth; // restart the sweep animation
		this.fireBtn.classList.add("is-firing");
	}

	/** @param {boolean} on */
	setAutoFire(on) {
		this.model.setFlag("autoFire", on);
		this.autoToggle.checked = on;
	}

	// ---------------------------------------------------------------------
	// Pharmacology
	// ---------------------------------------------------------------------

	_bindPharmacology() {
		this.drugDoses = Object.fromEntries(
			DRUG_ORDER.map((key) => [key, DRUGS[key].defaultDose]),
		);
		this.drugCards = {};
		for (const key of DRUG_ORDER)
			this.drugCards[key] = this._buildDrugCard(key);
		this.bus.on("drug:changed", () => this._renderDrugs());
	}

	_buildDrugCard(key) {
		const drug = DRUGS[key];
		const card = document.createElement("div");
		card.className = "drug-card";
		card.dataset.drug = key;
		card.innerHTML = `
			<label class="drug">
				<input type="checkbox" />
				<span class="drug-body">
					<span class="drug-name">${drug.name}${drug.brand ? ` <span class="drug-brand">${drug.brand}</span>` : ""}</span>
					<span class="drug-class">${drug.drugClass}</span>
				</span>
				<span class="switch-track" aria-hidden="true"></span>
			</label>
			<div class="drug-detail" hidden>
				<div class="drug-targets"></div>
				<div class="slider-row">
					<span class="field-label">Dose</span>
					<input type="range" min="${DOSE_RANGE.min}" max="${DOSE_RANGE.max}" step="${DOSE_RANGE.step}" value="${drug.defaultDose}" aria-label="${drug.name} dose" />
					<output class="mono"></output>
				</div>
				<p class="drug-mech">${drug.mechanism}</p>
				<p class="drug-watch"><strong>Watch:</strong> ${drug.watch}</p>
				${drug.caveat ? `<p class="drug-caveat">${drug.caveat}</p>` : ""}
			</div>`;

		const toggle = card.querySelector("input[type=checkbox]");
		const slider = card.querySelector("input[type=range]");
		toggle.addEventListener("change", () => {
			this.model.setDrug(key, toggle.checked ? this.drugDoses[key] : 0);
			if (toggle.checked) this._explainDrug(key);
		});
		slider.addEventListener("input", () => {
			this.drugDoses[key] = Number(slider.value);
			if (toggle.checked) this.model.setDrug(key, this.drugDoses[key]);
			else this._renderDrugs();
		});
		return { card, toggle, slider, detail: card.querySelector(".drug-detail") };
	}

	/** Sort cards by relevance to this synapse and refresh their target chips. */
	_renderDrugs() {
		const relevantList = $("#drug-list");
		const otherList = $("#drug-list-other");
		let active = 0;
		for (const key of DRUG_ORDER) {
			const { card, toggle, slider, detail } = this.drugCards[key];
			const dose = this.drugDoses[key];
			const on = key in this.model.drugs;
			if (on) active++;
			toggle.checked = on;
			detail.hidden = !on;
			card.classList.toggle("is-active", on);
			slider.value = String(dose);
			setFill(slider);
			setText(card.querySelector("output"), `${dose}× Ki`);

			const targets = this.model.drugTargets(key, dose);
			const relevant = actsHere(targets);
			card.querySelector(".drug-targets").innerHTML = targets
				.map((t) => {
					const name = TARGET_NAMES[t.target] ?? RECEPTOR_TYPES[t.target].name;
					return t.present
						? `<span class="target-chip">${name} ${ACTION_LABELS[t.action]} · ${Math.round(t.occupancy * 100)}%${
								t.action === "antagonist" && on
									? ` <span class="live" data-live="${t.target}" title="Receptors actually capped right now. Released transmitter competes the drug off.">live –</span>`
									: ""
							}</span>`
						: `<span class="target-chip is-absent" title="Not present at this synapse">${name} · not here</span>`;
				})
				.join("");
			const list = relevant ? relevantList : otherList;
			if (card.parentElement !== list) list.appendChild(card);
		}
		// Keep catalogue order within each list.
		for (const list of [relevantList, otherList]) {
			for (const key of DRUG_ORDER) {
				const { card } = this.drugCards[key];
				if (card.parentElement === list) list.appendChild(card);
			}
		}
		$("#drug-others").hidden = otherList.childElementCount === 0;
		setText(
			$("#drug-count"),
			active === 0 ? "none active" : `${active} active`,
		);
	}

	_explainDrug(key) {
		const drug = DRUGS[key];
		const nt = this.model.transmitter;
		const relevant = actsHere(this.model.drugTargets(key, this.drugDoses[key]));
		if (relevant) return;
		this.toaster.show(
			`${drug.name} has no meaningful target at a ${nt.synapse.toLowerCase()} synapse, so it does (almost) nothing here.`,
			{ color: "#9a8bff", key: `drug-${key}`, throttle: 0 },
		);
	}

	// ---------------------------------------------------------------------
	// Dock and top bar
	// ---------------------------------------------------------------------

	_bindDock() {
		this.pauseBtn = $("#pause-btn");
		this.pauseBtn.addEventListener("click", () => this.togglePause());
		$("#reset-btn").addEventListener("click", () => this.reset());

		this.speedButtons = [
			...document.querySelectorAll("#speed-group [data-speed]"),
		];
		for (const btn of this.speedButtons) {
			btn.addEventListener("click", () =>
				this.setSpeed(Number(btn.dataset.speed)),
			);
		}

		this.viewButtons = [
			...document.querySelectorAll("#camera-group [data-view]"),
		];
		for (const btn of this.viewButtons) {
			btn.addEventListener("click", () => this.setView(btn.dataset.view));
		}

		this.orbitBtn = $("#orbit-btn");
		this.orbitBtn.addEventListener("click", () => this.toggleOrbit());
	}

	_bindTopbar() {
		this.labelsBtn = $("#labels-btn");
		this.labelsBtn.addEventListener("click", () => this.toggleLabels());

		const dialog = $("#shortcuts-dialog");
		$("#shortcuts-btn").addEventListener("click", () => dialog.showModal());
		this.shortcutsDialog = dialog;

		this.statusChip = $("#status-chip");
		this.statusText = $("#status-text");
		this.clockChip = $("#clock-chip");

		for (const btn of document.querySelectorAll(".panel-toggle")) {
			btn.addEventListener("click", () => this.togglePanel(btn.dataset.panel));
		}
	}

	/** @param {"controls" | "readouts"} name */
	togglePanel(name, force) {
		for (const btn of document.querySelectorAll(".panel-toggle")) {
			const panel = document.getElementById(`panel-${btn.dataset.panel}`);
			const open =
				btn.dataset.panel === name
					? (force ?? !panel.classList.contains("is-open"))
					: false;
			panel.classList.toggle("is-open", open);
			btn.setAttribute("aria-expanded", String(open));
		}
	}

	togglePause(force) {
		this.state.paused = force ?? !this.state.paused;
		this.pauseBtn.setAttribute("aria-pressed", String(this.state.paused));
		this.pauseBtn.title = this.state.paused ? "Resume (P)" : "Pause (P)";
		this.statusChip.classList.toggle("is-paused", this.state.paused);
		this.statusText.textContent = this.state.paused ? "Paused" : "Running";
	}

	/** @param {number} speed */
	setSpeed(speed) {
		this.state.speed = speed;
		for (const btn of this.speedButtons) {
			btn.setAttribute(
				"aria-checked",
				String(Number(btn.dataset.speed) === speed),
			);
		}
	}

	/** @param {string} view */
	setView(view) {
		if (!CAMERA_PRESETS[view]) return;
		this.state.view = view;
		this.sceneManager.flyTo(view);
		for (const btn of this.viewButtons) {
			btn.setAttribute("aria-checked", String(btn.dataset.view === view));
		}
	}

	toggleOrbit() {
		this.state.orbit = !this.state.orbit;
		this.sceneManager.setAutoRotate(this.state.orbit);
		this.orbitBtn.setAttribute("aria-pressed", String(this.state.orbit));
	}

	toggleLabels(force) {
		this.state.labels = force ?? !this.state.labels;
		this.sceneManager.setLabelsVisible(this.state.labels);
		this.labelsBtn.setAttribute("aria-pressed", String(this.state.labels));
	}

	reset() {
		this.model.reset();
		this.setAutoFire(false);
		this._lastStats = {};
		this.toaster.show("Simulation reset", {
			key: "reset",
			throttle: 800,
			duration: 1600,
		});
	}

	// ---------------------------------------------------------------------
	// Keyboard
	// ---------------------------------------------------------------------

	_bindKeyboard() {
		window.addEventListener("keydown", (e) => {
			if (e.ctrlKey || e.metaKey || e.altKey) return;
			if (this.shortcutsDialog.open) return;
			const tag = e.target?.tagName;
			const interactive =
				tag === "BUTTON" || tag === "INPUT" || tag === "SELECT";

			if (e.code === "Space") {
				if (interactive) return; // let the focused control handle it
				e.preventDefault();
				this.fire();
				return;
			}
			if (tag === "INPUT" && e.target.type !== "checkbox") return;

			const digit = Number.parseInt(e.key, 10);
			if (digit >= 1 && digit <= NT_ORDER.length) {
				this.selectTransmitter(NT_ORDER[digit - 1]);
				return;
			}
			switch (e.key.toLowerCase()) {
				case "a":
					this.setAutoFire(!this.model.settings.autoFire);
					break;
				case "p":
					this.togglePause();
					break;
				case "r":
					this.reset();
					break;
				case "l":
					this.toggleLabels();
					break;
				case "o":
					this.toggleOrbit();
					break;
				case "v":
					this.setView(
						VIEWS[(VIEWS.indexOf(this.state.view) + 1) % VIEWS.length],
					);
					break;
				case "t":
					this.bus.emit("ui:tour");
					break;
				case "?":
					this.shortcutsDialog.showModal();
					break;
				case "escape":
					this.togglePanel("controls", false);
					break;
			}
		});
	}

	// ---------------------------------------------------------------------
	// Simulation events
	// ---------------------------------------------------------------------

	_bindEvents() {
		this.bus.on("post:spike", () => {
			this._lastSpikeAt = performance.now();
			this.toaster.show("Postsynaptic neuron fired an action potential", {
				color: "#ffd166",
				key: "spike",
				throttle: 9000,
			});
		});
		this.bus.on("release:failed", ({ depleted }) => {
			if (depleted) {
				this.toaster.show("Release failed: the vesicle pool is depleted", {
					color: "#ff5c7a",
					key: "depleted",
					throttle: 6000,
				});
			} else {
				this.toaster.show(
					"No vesicle fused that time. Release is probabilistic, and autoreceptors lower the odds.",
					{ color: "#9a8bff", key: "failure", throttle: 15000 },
				);
			}
		});
		this.bus.on("sim:reset", () => {
			this._lastSpikeAt = 0;
		});
	}

	// ---------------------------------------------------------------------
	// Readouts
	// ---------------------------------------------------------------------

	_buildCharts() {
		const hist = () => this.model.history;
		const getHead = () => hist().head;
		const ntColor = () =>
			NEUROTRANSMITTERS[this.model.settings.transmitter].color;

		this.voltageChart = new LineChart($("#voltage-chart"), {
			getHead,
			series: [
				{
					data: () => hist().voltage,
					color: () => "#ffd166",
					min: -90,
					max: MEMBRANE.peak + 5,
					fill: true,
				},
			],
			guides: [
				{
					value: MEMBRANE.threshold,
					series: 0,
					label: "threshold",
					color: "rgba(255,92,122,0.7)",
					dashed: true,
				},
				{
					value: MEMBRANE.rest,
					series: 0,
					label: "rest",
					color: "rgba(160,170,255,0.35)",
				},
			],
		});

		this._freeMax = 40;
		this.cleftChart = new LineChart($("#cleft-chart"), {
			getHead,
			series: [
				{
					data: () => hist().free,
					color: ntColor,
					min: 0,
					max: () => this._freeMax,
					fill: true,
				},
				{
					data: () => hist().occupancy,
					color: () => "#eef0ff",
					min: 0,
					max: 1.05,
					width: 1.3,
				},
			],
		});

		this.voltageOut = $("#voltage-out");
		this.voltageTag = $("#voltage-tag");
		this.spikeBadge = $("#spike-badge");
	}

	/** Refresh text readouts and charts. Called once per frame. */
	update() {
		const m = this.model;
		this.clockChip.textContent = `t ${m.time.toFixed(1)} s`;

		const v = m.voltage;
		this.voltageOut.textContent = formatSigned(v);
		const firing = performance.now() - (this._lastSpikeAt ?? 0) < 350;
		const tag = firing
			? ["Firing!", "is-firing"]
			: v > MEMBRANE.rest + 1.5
				? ["Depolarised", "is-depolarised"]
				: v < MEMBRANE.rest - 1.5
					? ["Hyperpolarised", "is-hyperpolarised"]
					: ["At rest", ""];
		if (this.voltageTag.textContent !== tag[0]) {
			this.voltageTag.textContent = tag[0];
			this.voltageTag.className = `readout-tag ${tag[1]}`;
		}

		const spikes = m.stats.spikes;
		if (spikes !== this._lastStats.spikesShown) {
			this._lastStats.spikesShown = spikes;
			this.spikeBadge.textContent = `${spikes} spike${spikes === 1 ? "" : "s"}`;
		}

		for (const el of this.statEls) {
			const value = m.stats[el.dataset.stat];
			if (this._lastStats[el.dataset.stat] !== value) {
				this._lastStats[el.dataset.stat] = value;
				el.textContent = String(value);
			}
		}

		const ready = m.readyVesicles;
		const total = m.vesicles.length;
		this.poolOut.textContent = `${ready} / ${total}`;
		this.poolMeter.style.width = `${(ready / total) * 100}%`;
		this.poolMeter.classList.toggle("is-low", ready / total < 0.25);
		setText(this.fillOut, m.meanVesicleContent.toFixed(1));
		setText(
			this.brakeOut,
			`${Math.round((1 - m.effectiveReleaseProbability / m.settings.releaseProbability) * 100)}%`,
		);
		setText(this.cytosolOut, String(Math.round(m.cytosol)));

		// Free-transmitter axis expands to fit, then relaxes back.
		let peak = 0;
		for (const x of m.history.free) peak = Math.max(peak, x);
		const wanted = Math.min(PARTICLE.maxCount, Math.max(40, peak * 1.15));
		this._freeMax += (wanted - this._freeMax) * 0.05;

		// Live antagonist occupancy (competition with released transmitter).
		const now = performance.now();
		if (now - (this._lastLive ?? 0) > 250) {
			this._lastLive = now;
			for (const el of document.querySelectorAll("[data-live]")) {
				const occ = m.antagonistOccupancy(el.dataset.live);
				setText(el, `live ${Math.round(occ * 100)}%`);
			}
		}

		this.voltageChart.draw();
		this.cleftChart.draw();
	}
}

/**
 * Chip naming a receptor subtype, its share of the receptor field, and
 * whether it is a channel or a GPCR.
 */
function receptorTag(key, fraction) {
	const type = RECEPTOR_TYPES[key];
	const polarity = isExcitatory(type) ? "excitatory" : "inhibitory";
	const kind = type.kind === "ionotropic" ? "channel" : "GPCR";
	return `<span class="tag tag-${polarity}" title="${polarity} ${kind}">${type.name} · ${Math.round(fraction * 100)}% · ${kind}</span>`;
}

/** Write text only when it changed, to avoid needless layout work. */
function setText(el, text) {
	if (el.textContent !== text) el.textContent = text;
}

/** @param {HTMLInputElement} input */
function setFill(input) {
	const min = Number(input.min);
	const max = Number(input.max);
	const pct = ((Number(input.value) - min) / (max - min)) * 100;
	input.style.setProperty("--fill", `${pct}%`);
}

function formatSigned(v) {
	const s = Math.abs(v).toFixed(1);
	return v < 0 ? `−${s}` : `+${s}`;
}

/**
 * A drug acts at this synapse when one of its targets is present and the
 * dose occupies a meaningful share of it (at least 5%).
 */
function actsHere(targets) {
	return targets.some((t) => t.present && t.occupancy >= 0.05);
}
