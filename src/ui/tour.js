const STORAGE_KEY = "synapse-lab.tour-seen";

/**
 * @typedef {object} TourStep
 * @property {string} title
 * @property {string[]} body
 * @property {string} [target]  `data-tour` value of the element to spotlight.
 * @property {string} [view]    Camera preset to fly to.
 * @property {string} [transmitter]
 * @property {{label: string, event: string}} [task]  Optional hands-on task.
 */

/** @type {TourStep[]} */
const STEPS = [
	{
		title: "Welcome to the synapse",
		body: [
			"Neurons talk to each other across a gap about 20 nanometres wide: the synaptic cleft.",
			"This tour takes about two minutes. You can drag to orbit and scroll to zoom at any time.",
		],
		view: "overview",
	},
	{
		title: "Sender and receiver",
		body: [
			"On the left, the presynaptic terminal is packed with vesicles, each holding a few thousand transmitter molecules.",
			"On the right, the postsynaptic spine is studded with receptors.",
		],
		view: "terminal",
	},
	{
		title: "Pick a messenger",
		body: [
			"Each neurotransmitter has its own receptors, clearance routes and effect. Start with glutamate, the brain's main excitatory signal.",
		],
		target: "transmitters",
		transmitter: "GLUTAMATE",
	},
	{
		title: "Fire an action potential",
		body: [
			"An electrical spike runs down the axon. At the terminal, Ca²⁺ floods in (yellow sparks) and each docked vesicle fuses with some probability, spilling its contents. Sometimes none fuse at all.",
		],
		target: "stimulate",
		view: "cleft",
		task: { label: "Press Fire (or Space)", event: "vesicle:fused" },
	},
	{
		title: "Lock and key",
		body: [
			"Molecules diffuse across the cleft. A receptor only binds its own transmitter. Ring-shaped channels act instantly; seven-sided GPCRs act slowly through G-proteins. Gold means excitatory, cyan inhibitory.",
		],
		view: "receptors",
		task: { label: "Watch a receptor bind", event: "nt:bound" },
	},
	{
		title: "Adding up to a spike",
		body: [
			"Each bound receptor nudges the membrane potential. Glutamate pushes it up toward the −50 mV threshold. Cross it and the postsynaptic neuron fires its own action potential.",
			"Try firing several times in quick succession.",
		],
		target: "potential",
		task: { label: "Make the postsynaptic cell fire", event: "post:spike" },
	},
	{
		title: "Cleaning up",
		body: [
			"The signal has to stop. Transporters (pale rings) pull transmitter back into the terminal or the green astrocyte. Inside the terminal, MAO on the mitochondria breaks down monoamines. Pink COMT enzymes on glia handle dopamine and norepinephrine that escape.",
			"Autoreceptors on the presynaptic side sense released transmitter and turn down further release.",
		],
		target: "cleft",
		view: "cleft",
	},
	{
		title: "Drugs change the rules",
		body: [
			"At this serotonergic synapse, turn on fluoxetine (Prozac). It blocks only SERT, so serotonin stays in the cleft longer and receptors stay busy.",
			"Then try it at a dopamine synapse: no effect. Selectivity is what separates an SSRI from cocaine.",
		],
		target: "pharmacology",
		transmitter: "SEROTONIN",
		task: {
			label: "Turn on fluoxetine",
			event: "drug:FLUOXETINE",
		},
	},
	{
		title: "Downstream effects (illustrative)",
		body: [
			"Sustained signalling drives an illustrative mood face, and noradrenergic tone drives a heart-rate analogy.",
			"Treat these as cartoons: real mood depends on whole circuits over weeks, and the heart is controlled by peripheral nerves.",
		],
		target: "body",
	},
	{
		title: "Your lab now",
		body: [
			"Try amphetamine at a dopamine synapse (release with no spikes), haloperidol's grey caps on D2 receptors, diazepam on GABA, or auto-fire at high rates to deplete the vesicle pool.",
			"Press ? for keyboard shortcuts. Have fun!",
		],
		target: "dock",
		view: "overview",
	},
];

/**
 * Guided walkthrough with a spotlight, camera moves and hands-on tasks.
 */
export class Tour {
	/**
	 * @param {{hud: import("./hud.js").Hud, bus: {on: Function}}} deps
	 */
	constructor({ hud, bus }) {
		this.hud = hud;
		this.bus = bus;
		this.index = -1;
		this.active = false;

		this.spot = document.createElement("div");
		this.spot.className = "tour-spotlight";
		this.card = document.createElement("div");
		this.card.className = "tour-card";
		this.card.setAttribute("role", "dialog");
		this.card.setAttribute("aria-live", "polite");

		this._onResize = () => this._position();
		this._onKey = (e) => {
			if (!this.active) return;
			if (e.key === "Escape") this.end();
			if (e.key === "ArrowRight" && !e.target.closest?.("input")) this.next();
			if (e.key === "ArrowLeft" && !e.target.closest?.("input")) this.prev();
		};

		for (const event of ["vesicle:fused", "nt:bound", "post:spike"]) {
			bus.on(event, () => this._complete(event));
		}
		bus.on("drug:changed", ({ key, dose }) => {
			if (dose > 0) this._complete(`drug:${key}`);
		});
		bus.on("ui:tour", () => (this.active ? this.end() : this.start()));
	}

	get seen() {
		try {
			return localStorage.getItem(STORAGE_KEY) === "1";
		} catch {
			return false;
		}
	}

	start() {
		this.active = true;
		document.body.append(this.spot, this.card);
		window.addEventListener("resize", this._onResize);
		window.addEventListener("keydown", this._onKey);
		this.hud.toggleLabels(true);
		this.show(0);
	}

	end() {
		this.active = false;
		this.spot.remove();
		this.card.remove();
		window.removeEventListener("resize", this._onResize);
		window.removeEventListener("keydown", this._onKey);
		this.hud.togglePanel("controls", false);
		try {
			localStorage.setItem(STORAGE_KEY, "1");
		} catch {
			/* storage unavailable: nothing to remember */
		}
	}

	next() {
		if (this.index >= STEPS.length - 1) this.end();
		else this.show(this.index + 1);
	}

	prev() {
		if (this.index > 0) this.show(this.index - 1);
	}

	/** @param {number} index */
	show(index) {
		this.index = index;
		const step = STEPS[index];
		this.taskDone = false;

		if (step.transmitter) this.hud.selectTransmitter(step.transmitter);
		if (step.view) this.hud.setView(step.view);

		// On narrow screens, open the drawer that holds the target.
		const target =
			step.target && document.querySelector(`[data-tour="${step.target}"]`);
		const panel = target?.closest(".panel");
		if (panel) this.hud.togglePanel(panel.id.replace("panel-", ""), true);
		else this.hud.togglePanel("controls", false);
		target?.scrollIntoView({ block: "nearest", behavior: "smooth" });

		const last = index === STEPS.length - 1;
		this.card.innerHTML = `
			<button type="button" class="btn btn-icon tour-close" aria-label="Close tour">✕</button>
			<div class="tour-step">STEP ${index + 1} OF ${STEPS.length}</div>
			<h2>${step.title}</h2>
			${step.body.map((p) => `<p>${p}</p>`).join("")}
			${step.task ? `<div class="tour-task" data-task><span>◎</span><span>${step.task.label}</span></div>` : ""}
			<div class="tour-foot">
				<div class="tour-dots">${STEPS.map((_, i) => `<i class="${i === index ? "is-active" : ""}"></i>`).join("")}</div>
				${index > 0 ? '<button type="button" class="btn btn-ghost" data-prev>Back</button>' : ""}
				<button type="button" class="btn btn-accent" data-next>${last ? "Start exploring" : index === 0 ? "Begin" : step.task ? "Skip" : "Next"}</button>
			</div>`;
		this.card
			.querySelector(".tour-close")
			.addEventListener("click", () => this.end());
		this.card
			.querySelector("[data-next]")
			.addEventListener("click", () => this.next());
		this.card
			.querySelector("[data-prev]")
			?.addEventListener("click", () => this.prev());

		this.target = target ?? null;
		// Wait for drawers to slide in before measuring.
		requestAnimationFrame(() => this._position());
		setTimeout(() => this._position(), 380);
		this.card.querySelector("[data-next]").focus({ preventScroll: true });
	}

	_complete(event) {
		if (!this.active || this.taskDone) return;
		const step = STEPS[this.index];
		if (step.task?.event !== event) return;
		this.taskDone = true;
		const task = this.card.querySelector("[data-task]");
		if (task) {
			task.classList.add("is-done");
			task.firstElementChild.textContent = "✓";
		}
		const btn = this.card.querySelector("[data-next]");
		btn.textContent = "Next";
		const index = this.index;
		setTimeout(() => {
			if (this.active && this.index === index) this.next();
		}, 2200);
	}

	_position() {
		if (!this.active) return;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const card = this.card.getBoundingClientRect();
		const margin = 16;

		if (!this.target) {
			this.spot.classList.add("is-empty");
			Object.assign(this.spot.style, {
				top: "50%",
				left: "50%",
				width: "0px",
				height: "0px",
			});
			this._place((vw - card.width) / 2, vh - card.height - 110);
			return;
		}

		this.spot.classList.remove("is-empty");
		const r = this.target.getBoundingClientRect();
		const pad = 6;
		Object.assign(this.spot.style, {
			top: `${r.top - pad}px`,
			left: `${r.left - pad}px`,
			width: `${r.width + pad * 2}px`,
			height: `${r.height + pad * 2}px`,
		});

		let left;
		let top = r.top;
		if (r.right + margin + card.width < vw) left = r.right + margin;
		else if (r.left - margin - card.width > 0)
			left = r.left - margin - card.width;
		else {
			// No room beside the target: place above or below it.
			left = (vw - card.width) / 2;
			top = r.top > vh / 2 ? r.top - card.height - margin : r.bottom + margin;
		}
		this._place(left, top);
	}

	_place(left, top) {
		const card = this.card.getBoundingClientRect();
		const x = Math.max(16, Math.min(window.innerWidth - card.width - 16, left));
		const y = Math.max(
			16,
			Math.min(window.innerHeight - card.height - 16, top),
		);
		this.card.style.left = `${x}px`;
		this.card.style.top = `${y}px`;
	}
}
