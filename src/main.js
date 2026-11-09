import { SceneManager } from "./render/sceneManager.js";
import { SynapseView } from "./render/synapseView.js";
import {
	computeHeartRate,
	computeMood,
	SynapseModel,
} from "./sim/synapseModel.js";
import { HeartMonitor } from "./ui/heartMonitor.js";
import { Hud } from "./ui/hud.js";
import { Inspector } from "./ui/inspector.js";
import { MoodFace } from "./ui/moodFace.js";
import { createToaster } from "./ui/toasts.js";
import { Tour } from "./ui/tour.js";
import { createEventBus } from "./utils/eventBus.js";

function boot() {
	const bus = createEventBus();
	const model = new SynapseModel({ emit: bus.emit });
	const toaster = createToaster(document.getElementById("toasts"));

	let sceneManager;
	try {
		sceneManager = new SceneManager(document.getElementById("viewport"));
	} catch (error) {
		console.error(error);
		document.getElementById("webgl-error").hidden = false;
		return;
	}

	const view = new SynapseView(sceneManager.scene, model);
	const inspector = new Inspector({
		sceneManager,
		view,
		model,
		container: document.getElementById("app"),
	});
	const hud = new Hud({ model, sceneManager, bus, toaster });
	const tour = new Tour({ hud, bus });
	document.getElementById("tour-btn").addEventListener("click", () => {
		if (tour.active) tour.end();
		else tour.start();
	});

	const face = new MoodFace(
		document.getElementById("face"),
		document.getElementById("mood-bars"),
	);
	const heart = new HeartMonitor({
		canvas: document.getElementById("ecg"),
		bpm: document.getElementById("bpm-out"),
		icon: document.getElementById("heart-icon"),
		status: document.getElementById("heart-status"),
	});

	bus.on("vesicle:fused", ({ position, type }) =>
		view.flashFusion(position, type),
	);
	bus.on("post:spike", () => view.flashSpine());

	let last = performance.now();
	function frame(now) {
		const dt = Math.min(0.1, (now - last) / 1000);
		last = now;
		const simDt = hud.state.paused ? 0 : dt * hud.state.speed;

		model.step(simDt);
		view.update(simDt);
		hud.update();

		face.setTarget(computeMood(model.tone, model.firingRate));
		face.update(dt);
		heart.setTarget(computeHeartRate(model.tone));
		heart.update(hud.state.paused ? 0 : dt);

		sceneManager.render(dt);
		inspector.update();
		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);

	if (!tour.seen) {
		setTimeout(() => {
			if (!tour.active) tour.start();
		}, 900);
	}

	// Handy for debugging from the console.
	window.synapse = { model, view, hud, sceneManager, tour, inspector };
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", boot);
} else {
	boot();
}
