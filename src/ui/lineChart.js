/**
 * @typedef {object} Axis
 * @property {"left" | "right"} side
 * @property {number[] | (() => number[])} ticks
 * @property {(v: number) => string} format
 * @property {string} [unit]
 */

/**
 * @typedef {object} Series
 * @property {() => Float32Array} data   Ring buffer (read from `head`).
 * @property {() => string} color
 * @property {number | (() => number)} min
 * @property {number | (() => number)} max
 * @property {boolean} [fill]
 * @property {number} [width]
 * @property {Axis} [axis]
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
 * @typedef {object} Baseline
 * @property {Float32Array[]} data  One buffer per series (null to skip).
 * @property {number} head
 */

const FONT = "10px 'JetBrains Mono', monospace";
const AXIS_COLOR = "rgba(167, 174, 203, 0.7)";
const GRID_COLOR = "rgba(160, 170, 255, 0.07)";

/**
 * Crisp canvas line chart for ring-buffered time series, with a time axis,
 * value axes and an optional dashed baseline overlay.
 */
export class LineChart {
	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {object} options
	 * @param {Series[]} options.series
	 * @param {Guide[]} [options.guides]
	 * @param {() => number} options.getHead
	 * @param {number} options.seconds  Length of the window, for the time axis.
	 * @param {() => Baseline | null} [options.getBaseline]
	 */
	constructor(canvas, { series, guides = [], getHead, seconds, getBaseline }) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.series = series;
		this.guides = guides;
		this.getHead = getHead;
		this.seconds = seconds;
		this.getBaseline = getBaseline ?? (() => null);
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

		const hasLeft = this.series.some((s) => s.axis?.side === "left");
		const hasRight = this.series.some((s) => s.axis?.side === "right");
		const plot = {
			left: hasLeft ? 30 : 4,
			right: w - (hasRight ? 30 : 4),
			top: 8,
			bottom: h - 15,
		};
		const plotW = plot.right - plot.left;
		const plotH = plot.bottom - plot.top;
		const xOf = (i, n) => plot.left + (i / (n - 1)) * plotW;

		const scales = this.series.map((s) => {
			const min = typeof s.min === "function" ? s.min() : s.min;
			const max = typeof s.max === "function" ? s.max() : s.max;
			return (v) => plot.top + plotH * (1 - (v - min) / (max - min || 1));
		});

		ctx.font = FONT;
		ctx.lineWidth = 1;

		// Time axis: vertical grid every 5 s, labelled relative to now.
		ctx.strokeStyle = GRID_COLOR;
		ctx.fillStyle = AXIS_COLOR;
		ctx.textBaseline = "alphabetic";
		const step = 5;
		for (let t = 0; t <= this.seconds; t += step) {
			const x = Math.round(plot.right - (t / this.seconds) * plotW) + 0.5;
			ctx.beginPath();
			ctx.moveTo(x, plot.top);
			ctx.lineTo(x, plot.bottom);
			ctx.stroke();
			ctx.textAlign =
				t === 0 ? "right" : t === this.seconds ? "left" : "center";
			ctx.fillText(t === 0 ? "now" : `−${t}s`, x, h - 3);
		}

		// Value axes.
		this.series.forEach((s, si) => {
			if (!s.axis) return;
			const ticks =
				typeof s.axis.ticks === "function" ? s.axis.ticks() : s.axis.ticks;
			const left = s.axis.side === "left";
			ctx.textAlign = left ? "right" : "left";
			ctx.textBaseline = "middle";
			for (const v of ticks) {
				const y = Math.round(scales[si](v)) + 0.5;
				ctx.strokeStyle = GRID_COLOR;
				ctx.beginPath();
				ctx.moveTo(plot.left, y);
				ctx.lineTo(plot.right, y);
				ctx.stroke();
				ctx.fillStyle = AXIS_COLOR;
				ctx.fillText(
					s.axis.format(v),
					left ? plot.left - 4 : plot.right + 4,
					y,
				);
			}
			if (s.axis.unit) {
				ctx.textBaseline = "top";
				ctx.fillStyle = s.color();
				ctx.fillText(s.axis.unit, left ? plot.left - 4 : plot.right + 4, 0);
			}
		});
		ctx.textBaseline = "alphabetic";

		for (const g of this.guides) {
			const y = Math.round(scales[g.series](g.value)) + 0.5;
			ctx.strokeStyle = g.color;
			ctx.setLineDash(g.dashed ? [4, 4] : []);
			ctx.beginPath();
			ctx.moveTo(plot.left, y);
			ctx.lineTo(plot.right, y);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = g.color;
			ctx.textAlign = "left";
			ctx.fillText(g.label, plot.left + 4, y - 4);
		}

		// Baseline overlay: dashed, dimmer copies of each pinned series.
		const baseline = this.getBaseline();
		if (baseline) {
			ctx.setLineDash([3, 3]);
			this.series.forEach((s, si) => {
				const data = baseline.data[si];
				if (!data) return;
				this._trace(data, baseline.head, scales[si], xOf);
				ctx.strokeStyle = withAlpha(s.color(), 0.55);
				ctx.lineWidth = 1.2;
				ctx.stroke();
			});
			ctx.setLineDash([]);
		}

		const head = this.getHead();
		this.series.forEach((s, si) => {
			const color = s.color();
			this._trace(s.data(), head, scales[si], xOf);
			ctx.strokeStyle = color;
			ctx.lineWidth = s.width ?? 1.6;
			ctx.lineJoin = "round";
			ctx.stroke();

			if (s.fill) {
				ctx.lineTo(plot.right, plot.bottom);
				ctx.lineTo(plot.left, plot.bottom);
				ctx.closePath();
				const grad = ctx.createLinearGradient(0, plot.top, 0, plot.bottom);
				grad.addColorStop(0, withAlpha(color, 0.32));
				grad.addColorStop(1, withAlpha(color, 0));
				ctx.fillStyle = grad;
				ctx.fill();
			}
		});
	}

	_trace(data, head, yOf, xOf) {
		const { ctx } = this;
		const n = data.length;
		ctx.beginPath();
		for (let i = 0; i < n; i++) {
			const x = xOf(i, n);
			const y = yOf(data[(head + i) % n]);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
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
