/**
 * @typedef {object} Series
 * @property {() => Float32Array} data   Ring buffer (read from `head`).
 * @property {() => string} color
 * @property {number | (() => number)} min
 * @property {number | (() => number)} max
 * @property {boolean} [fill]
 * @property {number} [width]
 */

/**
 * @typedef {object} Guide
 * @property {number} value
 * @property {number} series  Index of the series whose scale the guide uses.
 * @property {string} label
 * @property {string} color
 * @property {boolean} [dashed]
 */

/**
 * Minimal crisp canvas line chart for ring-buffered time series.
 */
export class LineChart {
	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {{series: Series[], guides?: Guide[], getHead: () => number}} options
	 */
	constructor(canvas, { series, guides = [], getHead }) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.series = series;
		this.guides = guides;
		this.getHead = getHead;
		this._resize();
		new ResizeObserver(() => this._resize()).observe(canvas);
	}

	_resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const { width, height } = this.canvas.getBoundingClientRect();
		this.width = width;
		this.height = height;
		this.canvas.width = Math.max(1, Math.round(width * dpr));
		this.canvas.height = Math.max(1, Math.round(height * dpr));
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	draw() {
		const { ctx, width: w, height: h } = this;
		if (!w || !h) return;
		ctx.clearRect(0, 0, w, h);
		const pad = { top: 8, bottom: 8 };
		const plotH = h - pad.top - pad.bottom;

		// Background grid.
		ctx.strokeStyle = "rgba(160, 170, 255, 0.06)";
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (let x = w; x > 0; x -= w / 10) {
			ctx.moveTo(Math.round(x) + 0.5, 0);
			ctx.lineTo(Math.round(x) + 0.5, h);
		}
		ctx.stroke();

		const scales = this.series.map((s) => {
			const min = typeof s.min === "function" ? s.min() : s.min;
			const max = typeof s.max === "function" ? s.max() : s.max;
			return (v) => pad.top + plotH * (1 - (v - min) / (max - min || 1));
		});

		for (const g of this.guides) {
			const y = Math.round(scales[g.series](g.value)) + 0.5;
			ctx.strokeStyle = g.color;
			ctx.setLineDash(g.dashed ? [4, 4] : []);
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = g.color;
			ctx.font = "10px 'JetBrains Mono', monospace";
			ctx.textAlign = "right";
			ctx.fillText(g.label, w - 4, y - 4);
		}

		const head = this.getHead();
		this.series.forEach((s, si) => {
			const data = s.data();
			const n = data.length;
			const yOf = scales[si];
			const color = s.color();
			ctx.beginPath();
			for (let i = 0; i < n; i++) {
				const v = data[(head + i) % n];
				const x = (i / (n - 1)) * w;
				const y = yOf(v);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.strokeStyle = color;
			ctx.lineWidth = s.width ?? 1.6;
			ctx.lineJoin = "round";
			ctx.stroke();

			if (s.fill) {
				ctx.lineTo(w, h);
				ctx.lineTo(0, h);
				ctx.closePath();
				const grad = ctx.createLinearGradient(0, 0, 0, h);
				grad.addColorStop(0, withAlpha(color, 0.35));
				grad.addColorStop(1, withAlpha(color, 0));
				ctx.fillStyle = grad;
				ctx.fill();
			}
		});
	}
}

/**
 * @param {string} hex `#rrggbb`
 * @param {number} alpha
 */
export function withAlpha(hex, alpha) {
	if (!hex.startsWith("#") || hex.length !== 7) return hex;
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
