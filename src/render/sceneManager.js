import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

/** Named camera framings used by the view buttons and the tour. */
export const CAMERA_PRESETS = {
	overview: { position: [7.5, 5.5, 13], target: [-0.5, 0, 0] },
	cleft: { position: [1.4, 3.4, 9.2], target: [0, 0, 0] },
	receptors: { position: [-3.4, 1.8, 4.6], target: [1, 0, 0] },
	terminal: { position: [-5.5, 3.6, 6.5], target: [-2.6, 0, 0] },
	spine: { position: [7.5, 2.5, 6], target: [3, 0, 0] },
};

/**
 * Owns the renderer, post-processing, camera and controls.
 */
export class SceneManager {
	/** @param {HTMLElement} container */
	constructor(container) {
		this.container = container;
		this.reducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color("#05070f");
		this.scene.fog = new THREE.FogExp2("#05070f", 0.028);

		this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
		this.camera.position.set(...CAMERA_PRESETS.overview.position);

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: "high-performance",
		});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.05;
		this.renderer.domElement.classList.add("scene-canvas");
		container.appendChild(this.renderer.domElement);

		this.labelRenderer = new CSS2DRenderer();
		this.labelRenderer.domElement.className = "scene-labels";
		container.appendChild(this.labelRenderer.domElement);

		this.composer = new EffectComposer(this.renderer);
		this.composer.addPass(new RenderPass(this.scene, this.camera));
		this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.78);
		this.composer.addPass(this.bloom);
		this.composer.addPass(new OutputPass());

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.07;
		this.controls.minDistance = 2.5;
		this.controls.maxDistance = 40;
		this.controls.autoRotateSpeed = 0.35;
		this.controls.target.set(...CAMERA_PRESETS.overview.target);
		this.controls.addEventListener("start", () => {
			this._tween = null;
		});

		this._addLights();

		this._tween = null;
		this._preset = "overview";
		this.resize();
		this.camera.position.copy(this._presetPosition("overview"));
		new ResizeObserver(() => this.resize()).observe(container);
	}

	/**
	 * Preset camera position, pulled back on narrow (portrait) viewports so
	 * the synapse still fits horizontally.
	 * @param {keyof typeof CAMERA_PRESETS} name
	 */
	_presetPosition(name) {
		const preset = CAMERA_PRESETS[name];
		const target = new THREE.Vector3(...preset.target);
		const offset = new THREE.Vector3(...preset.position).sub(target);
		const stretch = Math.min(2.4, Math.max(1, 1.35 / this.camera.aspect));
		return target.add(offset.multiplyScalar(stretch));
	}

	_addLights() {
		this.scene.add(new THREE.HemisphereLight("#9fb7ff", "#1a0f24", 0.9));
		const key = new THREE.DirectionalLight("#ffffff", 1.6);
		key.position.set(6, 10, 8);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight("#7f6bff", 1.1);
		rim.position.set(-8, -4, -10);
		this.scene.add(rim);
		const cleftLight = new THREE.PointLight("#7fb0ff", 6, 9, 2);
		cleftLight.position.set(0, 2.5, 2);
		this.scene.add(cleftLight);
	}

	resize() {
		const { clientWidth: w, clientHeight: h } = this.container;
		if (w === 0 || h === 0) return;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
		this.composer.setSize(w, h);
		this.labelRenderer.setSize(w, h);
	}

	/**
	 * Smoothly move the camera to a named preset.
	 * @param {keyof typeof CAMERA_PRESETS} name
	 */
	flyTo(name) {
		const preset = CAMERA_PRESETS[name];
		if (!preset) return;
		this._preset = name;
		this._tween = {
			t: 0,
			duration: this.reducedMotion ? 0.01 : 1.4,
			fromPos: this.camera.position.clone(),
			fromTarget: this.controls.target.clone(),
			toPos: this._presetPosition(name),
			toTarget: new THREE.Vector3(...preset.target),
		};
	}

	/** @param {boolean} enabled */
	setAutoRotate(enabled) {
		this.controls.autoRotate = enabled && !this.reducedMotion;
	}

	/** @param {boolean} visible */
	setLabelsVisible(visible) {
		this.labelRenderer.domElement.classList.toggle("is-hidden", !visible);
	}

	/** @param {number} dt Real seconds since last frame. */
	render(dt) {
		if (this._tween) {
			const tw = this._tween;
			tw.t = Math.min(1, tw.t + dt / tw.duration);
			const k = 1 - (1 - tw.t) ** 3;
			this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
			this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
			if (tw.t >= 1) this._tween = null;
		}
		this.controls.update(dt);
		this.composer.render(dt);
		this.labelRenderer.render(this.scene, this.camera);
	}
}
