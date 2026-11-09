/**
 * Small seedable PRNG (mulberry32) with a Gaussian helper, so simulation
 * runs are reproducible in tests.
 * @param {number} seed
 */
export function createRng(seed = Date.now()) {
	let state = seed >>> 0;
	let spare = null;

	/** Uniform in [0, 1). */
	function next() {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}

	/** Standard normal via Box–Muller. */
	function gauss() {
		if (spare !== null) {
			const value = spare;
			spare = null;
			return value;
		}
		let u = 0;
		while (u === 0) u = next();
		const v = next();
		const mag = Math.sqrt(-2 * Math.log(u));
		spare = mag * Math.sin(2 * Math.PI * v);
		return mag * Math.cos(2 * Math.PI * v);
	}

	/** Exponentially distributed sample with the given mean. */
	function exponential(mean) {
		return -Math.log(1 - next()) * mean;
	}

	return { next, gauss, exponential };
}
