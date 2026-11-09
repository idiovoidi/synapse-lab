const SVG_NS = "http://www.w3.org/2000/svg";

const AXES = [
	{ key: "happiness", label: "Valence", pos: "#ffd166", neg: "#6b8cff" },
	{ key: "arousal", label: "Arousal", pos: "#ff8a5c", neg: "#5ff0e0" },
	{ key: "anxiety", label: "Anxiety", pos: "#ff5c7a", neg: "#3fd69a" },
];

/**
 * Vector face plus diverging bars that visualise the mood vector.
 * Rendered as SVG so it costs nothing next to the main WebGL scene.
 */
export class MoodFace {
	/**
	 * @param {SVGSVGElement} svg
	 * @param {HTMLElement} barsEl
	 */
	constructor(svg, barsEl) {
		this.svg = svg;
		this.current = { happiness: 0, arousal: 0, anxiety: 0 };
		this.target = { ...this.current };
		this._blinkAt = performance.now() + 2500;
		this._blink = 0;
		this._time = 0;
		this._build();
		this._buildBars(barsEl);
	}

	_el(tag, attrs, parent = this.svg) {
		const el = document.createElementNS(SVG_NS, tag);
		for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
		parent.appendChild(el);
		return el;
	}

	_build() {
		const defs = this._el("defs", {});
		const grad = this._el(
			"radialGradient",
			{ id: "face-grad", cx: "40%", cy: "35%", r: "70%" },
			defs,
		);
		this._el("stop", { offset: "0%", "stop-color": "#3a3f78" }, grad);
		this._el("stop", { offset: "100%", "stop-color": "#171a38" }, grad);

		this.halo = this._el("circle", {
			cx: 60,
			cy: 60,
			r: 56,
			fill: "none",
			stroke: "#9a8bff",
			"stroke-width": 2,
			opacity: 0.4,
		});
		this.head = this._el("circle", {
			cx: 60,
			cy: 60,
			r: 50,
			fill: "url(#face-grad)",
			stroke: "rgba(183,171,255,0.5)",
			"stroke-width": 1.5,
		});

		this.cheeks = [42, 78].map((cx) =>
			this._el("ellipse", {
				cx,
				cy: 74,
				rx: 8,
				ry: 4.5,
				fill: "#ff7a9c",
				opacity: 0,
			}),
		);

		this.eyes = [44, 76].map((cx) => {
			const g = this._el("g", {});
			const white = this._el(
				"ellipse",
				{ cx, cy: 54, rx: 8, ry: 8, fill: "#eef0ff" },
				g,
			);
			const pupil = this._el(
				"circle",
				{ cx, cy: 55, r: 3.6, fill: "#0b0d1c" },
				g,
			);
			const glint = this._el(
				"circle",
				{ cx: cx + 1.6, cy: 53, r: 1.2, fill: "#fff" },
				g,
			);
			return { cx, white, pupil, glint };
		});

		this.brows = [44, 76].map((cx) =>
			this._el("path", {
				d: "",
				stroke: "#c9c3ff",
				"stroke-width": 3,
				"stroke-linecap": "round",
				fill: "none",
				"data-cx": cx,
			}),
		);

		this.mouth = this._el("path", {
			d: "",
			stroke: "#eef0ff",
			"stroke-width": 3,
			"stroke-linecap": "round",
			fill: "none",
		});

		this.sweat = this._el("path", {
			d: "M92 36 q4 7 0 10 q-4 -3 0 -10z",
			fill: "#7fd3ff",
			opacity: 0,
		});
	}

	_buildBars(container) {
		this.bars = AXES.map((axis) => {
			const row = document.createElement("div");
			row.className = "mood-bar";
			row.innerHTML = `<span>${axis.label}</span><div class="mood-track"><div class="mood-fill"></div></div>`;
			container.appendChild(row);
			return { axis, fill: row.querySelector(".mood-fill") };
		});
	}

	/** @param {{happiness:number, arousal:number, anxiety:number}} mood */
	setTarget(mood) {
		this.target = mood;
	}

	/** @param {number} dt */
	update(dt) {
		this._time += dt;
		const k = 1 - Math.exp(-dt * 4);
		for (const key of Object.keys(this.current)) {
			this.current[key] += (this.target[key] - this.current[key]) * k;
		}
		const { happiness: hap, arousal: aro, anxiety: anx } = this.current;

		// Blinking, faster when anxious.
		const now = performance.now();
		if (now > this._blinkAt) {
			this._blink = 1;
			this._blinkAt =
				now + 1600 + Math.random() * 2600 * (1 - Math.max(0, anx) * 0.7);
		}
		this._blink = Math.max(0, this._blink - dt * 7);
		const blinkScale = 1 - Math.sin(this._blink * Math.PI) * 0.95;

		const openness = (1 + aro * 0.35 - Math.max(0, -aro) * 0.25) * blinkScale;
		const pupilR = 3.6 * (1 + aro * 0.35);
		const jitter = Math.max(0, anx) * Math.sin(this._time * 40) * 0.6;

		for (const eye of this.eyes) {
			eye.white.setAttribute("ry", Math.max(0.6, 8 * openness).toFixed(2));
			eye.pupil.setAttribute("r", Math.min(pupilR, 8 * openness).toFixed(2));
			eye.pupil.setAttribute("cx", (eye.cx + jitter).toFixed(2));
			eye.pupil.setAttribute("opacity", openness < 0.3 ? 0 : 1);
			eye.glint.setAttribute("opacity", openness < 0.3 ? 0 : 1);
		}

		this.brows.forEach((brow, i) => {
			const cx = this.eyes[i].cx;
			const dir = i === 0 ? 1 : -1;
			const lift = 40 - hap * 3 - aro * 3;
			const inner = lift + anx * 4 * -1 + Math.max(0, -hap) * 3;
			const outer = lift + anx * 3;
			const innerX = cx + dir * 8;
			const outerX = cx - dir * 8;
			brow.setAttribute(
				"d",
				`M${outerX} ${outer.toFixed(2)} Q${cx} ${(Math.min(inner, outer) - 2).toFixed(2)} ${innerX} ${inner.toFixed(2)}`,
			);
		});

		const width = 16 + aro * 3 - Math.max(0, anx) * 4;
		const curve = hap * 12 - Math.max(0, anx) * 3;
		const wobble = Math.max(0, anx) * Math.sin(this._time * 18) * 1.2;
		const y = 80 + Math.max(0, anx) * 2;
		this.mouth.setAttribute(
			"d",
			`M${60 - width} ${y} Q60 ${(y + curve + wobble).toFixed(2)} ${60 + width} ${y}`,
		);

		const blush = Math.max(0, hap * 0.6 + aro * 0.2);
		for (const c of this.cheeks) c.setAttribute("opacity", blush.toFixed(2));
		this.sweat.setAttribute(
			"opacity",
			Math.max(0, (anx - 0.35) * 1.6).toFixed(2),
		);

		const tint =
			hap > 0.25
				? "#ffd166"
				: anx > 0.25
					? "#ff5c7a"
					: aro > 0.25
						? "#ff8a5c"
						: "#9a8bff";
		this.halo.setAttribute("stroke", tint);
		this.halo.setAttribute(
			"opacity",
			(
				0.25 +
				Math.max(Math.abs(hap), Math.abs(aro), Math.abs(anx)) * 0.6
			).toFixed(2),
		);

		for (const { axis, fill } of this.bars) {
			const v = this.current[axis.key];
			const pct = Math.abs(v) * 50;
			fill.style.left = v >= 0 ? "50%" : `${50 - pct}%`;
			fill.style.width = `${pct}%`;
			fill.style.background = v >= 0 ? axis.pos : axis.neg;
		}
	}
}
