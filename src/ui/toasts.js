/**
 * Small transient notifications with per-key throttling.
 * @param {HTMLElement} container
 */
export function createToaster(container) {
	const lastShown = new Map();

	/**
	 * @param {string} message
	 * @param {{color?: string, key?: string, throttle?: number, duration?: number}} [options]
	 */
	function show(
		message,
		{ color, key = message, throttle = 4000, duration = 3200 } = {},
	) {
		const now = performance.now();
		if (now - (lastShown.get(key) ?? -Infinity) < throttle) return;
		lastShown.set(key, now);

		const el = document.createElement("div");
		el.className = "toast";
		el.textContent = message;
		if (color) el.style.setProperty("--toast-c", color);
		container.appendChild(el);
		while (container.children.length > 3) container.firstElementChild.remove();

		setTimeout(() => {
			el.classList.add("is-leaving");
			setTimeout(() => el.remove(), 320);
		}, duration);
	}

	return { show };
}
