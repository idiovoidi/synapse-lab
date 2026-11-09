/**
 * Sweeping ECG trace and BPM readout driven by a target heart rate.
 */
export class HeartMonitor {
	/**
	 * @param {{canvas: HTMLCanvasElement, bpm: HTMLElement, icon: Element, status: HTMLElement}} els
	 */
	constructor({ canvas, bpm, icon, status }) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
		this.bpmEl = bpm;
		this.iconEl = icon;
		this.statusEl = status;

		this.rate = 68;
		this.target = 68;
		this.phase = 0;
		this.sweepX = 0;
		this._lastY = null;
		this._shownBpm = null;

		this._resize();
		new ResizeObserver(() => this._resize()).observe(canvas);
	}

	_resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const { width, height } = this.canvas.getBoundingClientRect();
		this.w = width;
		this.h = height;
		this.canvas.width = Math.max(1, Math.round(width * dpr));
		this.canvas.height = Math.max(1, Math.round(height * dpr));
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.ctx.fillStyle = "#05060d";
		this.ctx.fillRect(0, 0, width, height);
		this.sweepX = 0;
		this._lastY = null;
	}

	/** @param {number} bpm */
	setTarget(bpm) {
		this.target = bpm;
	}

	/** @param {number} dt Seconds; pass 0 while paused. */
	update(dt) {
		if (dt <= 0) return;
		this.rate += (this.target - this.rate) * (1 - Math.exp(-dt * 0.8));

		const prevPhase = this.phase;
		this.phase = (this.phase + (dt * this.rate) / 60) % 1;
		if (this.phase < prevPhase) this._beat();

		const shown = Math.round(this.rate);
		if (shown !== this._shownBpm) {
			this._shownBpm = shown;
			this.bpmEl.textContent = String(shown);
			const fast = shown > 100;
			const slow = shown < 60;
			this.statusEl.textContent = fast
				? "Tachycardia (fast)"
				: slow
					? "Bradycardia (slow)"
					: "Normal sinus rhythm";
			this.statusEl.classList.toggle("is-fast", fast);
			this.statusEl.classList.toggle("is-slow", slow);
		}

		this._draw(dt);
	}

	_beat() {
		this.iconEl.classList.add("is-beat");
		setTimeout(() => this.iconEl.classList.remove("is-beat"), 130);
	}

	_draw(dt) {
		const { ctx, w, h } = this;
		if (!w || !h) return;
		const speed = w / 3; // 3-second sweep
		const x0 = this.sweepX;
		const x1 = x0 + speed * dt;

		// Erase just ahead of the trace.
		ctx.fillStyle = "#05060d";
		ctx.fillRect(x0, 0, Math.min(14, w - x0), h);

		const y = h * 0.62 - pqrst(this.phase) * h * 0.5;
		ctx.strokeStyle = "#3fd69a";
		ctx.lineWidth = 1.6;
		ctx.shadowColor = "#3fd69a";
		ctx.shadowBlur = 6;
		ctx.beginPath();
		ctx.moveTo(x0, this._lastY ?? y);
		ctx.lineTo(x1, y);
		ctx.stroke();
		ctx.shadowBlur = 0;

		this._lastY = y;
		this.sweepX = x1;
		if (this.sweepX > w) {
			this.sweepX = 0;
			this._lastY = null;
		}
	}
}

/** Stylised PQRST waveform for a beat phase in [0, 1). */
function pqrst(t) {
	const bump = (c, wdt, a) => a * Math.exp(-(((t - c) / wdt) ** 2));
	return (
		bump(0.1, 0.025, 0.12) + // P
		bump(0.19, 0.008, -0.12) + // Q
		bump(0.21, 0.01, 1) + // R
		bump(0.23, 0.01, -0.25) + // S
		bump(0.42, 0.045, 0.25) // T
	);
}
