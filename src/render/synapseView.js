import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { NEUROTRANSMITTERS } from "../config/neurotransmitters.js";
import { isExcitatory } from "../config/receptors.js";
import {
	ACTION_POTENTIAL,
	ASTROCYTE,
	CLEFT,
	PARTICLE,
	VESICLES,
} from "../config/synapse.js";
import {
	createGlowSprite,
	createMembraneMaterial,
	getGlowTexture,
} from "./materials.js";

const PALETTE = {
	preBase: "#1a1838",
	preRim: "#a291ff",
	postBase: "#0f2238",
	postRim: "#62c8ff",
	activeZone: "#3b2d72",
	psd: "#163f63",
	receptorIdle: "#8d9cc4",
	excitatory: "#ffd166",
	inhibitory: "#5ff0e0",
	blocked: "#2a2238",
	transporter: "#dcd6c4",
	transporterBlocked: "#ff4d6d",
	enzyme: "#ff7ad9",
	enzymeBlocked: "#4a4560",
	calcium: "#ffe066",
	actionPotential: "#ffe7a3",
	vesicleShell: "#cdd6ff",
};

/** Rotates a lathe (built around +Y) so its profile height runs along +X. */
const LATHE_TO_X = new THREE.Euler(0, 0, -Math.PI / 2);

/**
 * Builds the synapse anatomy and keeps it in sync with a SynapseModel.
 */
export class SynapseView {
	/**
	 * @param {THREE.Scene} scene
	 * @param {import("../sim/synapseModel.js").SynapseModel} model
	 */
	constructor(scene, model) {
		this.scene = scene;
		this.model = model;
		this.root = new THREE.Group();
		scene.add(this.root);

		this._tmpColor = new THREE.Color();
		this._tmpMatrix = new THREE.Matrix4();
		this._tmpQuat = new THREE.Quaternion();
		this._tmpScale = new THREE.Vector3();
		this._tmpPos = new THREE.Vector3();
		this._ntColors = Object.fromEntries(
			Object.values(NEUROTRANSMITTERS).map((nt) => [
				nt.key,
				new THREE.Color(nt.color),
			]),
		);

		this._buildMembranes();
		this._buildAxon();
		this._buildMembraneSpecialisations();
		this._buildReceptors();
		this._buildAstrocyte();
		this._buildTransporters();
		this._buildEnzymes();
		this._buildVesicles();
		this._buildParticles();
		this._buildCalcium();
		this._buildCleftDetail();
		this._buildDust();
		this._buildFusionFlashes();
		this._buildLabels();

		this._spineFlash = 0;
	}

	// ---------------------------------------------------------------------
	// Anatomy
	// ---------------------------------------------------------------------

	_lathe(profile, material) {
		const geometry = new THREE.LatheGeometry(
			profile.map(([r, h]) => new THREE.Vector2(r, h)),
			72,
		);
		const mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.copy(LATHE_TO_X);
		mesh.renderOrder = 2;
		return mesh;
	}

	_buildMembranes() {
		this.preMaterial = createMembraneMaterial({
			color: PALETTE.preBase,
			rim: PALETTE.preRim,
		});
		const pre = this._lathe(
			[
				[0.42, -6.6],
				[0.5, -5.9],
				[0.95, -5.25],
				[1.65, -4.6],
				[2.2, -3.9],
				[2.5, -3.1],
				[2.64, -2.3],
				[2.66, -1.7],
				[2.58, -1.3],
				[2.38, -1.08],
				[2.0, -1.0],
				[1.0, -1.0],
				[0.0, -1.0],
			],
			this.preMaterial,
		);
		this.root.add(pre);

		this.postMaterial = createMembraneMaterial({
			color: PALETTE.postBase,
			rim: PALETTE.postRim,
		});
		const post = this._lathe(
			[
				[0.0, 1.0],
				[1.0, 1.0],
				[2.0, 1.0],
				[2.38, 1.08],
				[2.58, 1.3],
				[2.66, 1.75],
				[2.52, 2.5],
				[2.12, 3.2],
				[1.42, 3.8],
				[0.78, 4.35],
				[0.62, 5.1],
				[0.66, 6.3],
			],
			this.postMaterial,
		);
		this.root.add(post);

		// Dendritic shaft the spine grows from.
		const shaftCurve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(7.6, 0.4, -14),
			new THREE.Vector3(7.4, 0, -4),
			new THREE.Vector3(7.4, 0, 4),
			new THREE.Vector3(7.8, -0.6, 14),
		]);
		this.shaftCurve = shaftCurve;
		const shaft = new THREE.Mesh(
			new THREE.TubeGeometry(shaftCurve, 80, 1.35, 40, false),
			this.postMaterial,
		);
		shaft.renderOrder = 2;
		this.root.add(shaft);

		// Mitochondria fuel vesicle cycling; MAO on their outer membrane breaks
		// down cytosolic monoamines, so they glow with MAO activity.
		const mitoMaterial = new THREE.MeshStandardMaterial({
			color: "#6d4fa8",
			emissive: "#2c1a52",
			roughness: 0.55,
			transparent: true,
			opacity: 0.55,
		});
		const cristae = new THREE.MeshBasicMaterial({
			color: "#b39cff",
			transparent: true,
			opacity: 0.35,
			wireframe: true,
		});
		for (const [x, y, z, rot] of [
			[-4.3, 1.0, -0.6, 0.4],
			[-3.6, -1.3, 0.9, -0.3],
		]) {
			const group = new THREE.Group();
			const geo = new THREE.CapsuleGeometry(0.32, 1.1, 8, 20);
			group.add(new THREE.Mesh(geo, mitoMaterial));
			group.add(
				new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1, 3, 8), cristae),
			);
			group.position.set(x, y, z);
			group.rotation.set(0.3, rot, Math.PI / 2 + rot);
			this.root.add(group);
		}
		this.mitoMaterial = mitoMaterial;
	}

	_buildAxon() {
		const curve = new THREE.CatmullRomCurve3([
			new THREE.Vector3(-6.4, 0, 0),
			new THREE.Vector3(-9.5, 0.35, -0.5),
			new THREE.Vector3(-13.5, 1.0, -1.6),
			new THREE.Vector3(-19, 1.4, -3.4),
		]);
		this.axonCurve = curve;
		const axon = new THREE.Mesh(
			new THREE.TubeGeometry(curve, 120, 0.42, 20, false),
			this.preMaterial,
		);
		axon.renderOrder = 2;
		this.root.add(axon);

		// Myelin sheath segments separated by nodes of Ranvier.
		const myelinMaterial = new THREE.MeshStandardMaterial({
			color: "#e9e4ff",
			emissive: "#3b3570",
			roughness: 0.35,
			metalness: 0.05,
			transparent: true,
			opacity: 0.85,
		});
		for (const [a, b] of [
			[0.14, 0.36],
			[0.42, 0.64],
			[0.7, 0.92],
		]) {
			const sub = new THREE.CatmullRomCurve3(
				Array.from({ length: 12 }, (_, i) =>
					curve.getPointAt(a + ((b - a) * i) / 11),
				),
			);
			const sheath = new THREE.Mesh(
				new THREE.TubeGeometry(sub, 40, 0.66, 28, false),
				myelinMaterial,
			);
			this.root.add(sheath);
		}

		// Action potential pulse.
		this.apPool = Array.from({ length: 6 }, () => {
			const group = new THREE.Group();
			group.add(createGlowSprite(PALETTE.actionPotential, 2.6));
			const core = new THREE.Mesh(
				new THREE.SphereGeometry(0.28, 16, 12),
				new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.6, 1.4) }),
			);
			group.add(core);
			group.visible = false;
			this.root.add(group);
			return group;
		});
	}

	_buildMembraneSpecialisations() {
		// Active zone (presynaptic) and postsynaptic density plates.
		const disc = (radius, x, color, opacity) => {
			const mesh = new THREE.Mesh(
				new THREE.CylinderGeometry(radius, radius, 0.05, 64),
				new THREE.MeshStandardMaterial({
					color,
					emissive: color,
					emissiveIntensity: 0.6,
					transparent: true,
					opacity,
					roughness: 0.8,
				}),
			);
			mesh.rotation.z = Math.PI / 2;
			mesh.position.x = x;
			this.root.add(mesh);
			return mesh;
		};
		disc(1.75, CLEFT.xPre - 0.04, PALETTE.activeZone, 0.55);
		this.psd = disc(2.0, CLEFT.xPost + 0.05, PALETTE.psd, 0.6);
	}

	_buildReceptors() {
		this.receptorViews = [
			...this.model.receptors.map((r) => this._makeReceptorView(r, -1, 1)),
			// Presynaptic autoreceptors face the cleft from the other side.
			...this.model.autoreceptors.map((r) => this._makeReceptorView(r, 1, 0.8)),
		];
	}

	/** Astrocyte process wrapping the back of the cleft (tripartite synapse). */
	_buildAstrocyte() {
		const material = createMembraneMaterial({
			color: "#0d2a20",
			rim: "#59e3a7",
			opacity: 0.75,
		});
		const mesh = new THREE.Mesh(
			new THREE.TorusGeometry(ASTROCYTE.radius, 0.5, 20, 72, ASTROCYTE.arc),
			material,
		);
		// Lay the ring in the YZ plane, then centre its arc behind the cleft.
		mesh.rotation.y = Math.PI / 2;
		mesh.renderOrder = 2;
		const group = new THREE.Group();
		group.rotation.x = -ASTROCYTE.arc / 2;
		group.add(mesh);
		this.root.add(group);
	}

	/**
	 * Receptor mesh: a stem through the membrane plus either a ring-shaped
	 * channel pore (ionotropic) or a seven-sided GPCR bundle (metabotropic),
	 * so the two kinds differ in shape, not only colour.
	 * @param {object} r Model receptor.
	 * @param {1 | -1} facing Direction of the cleft along X.
	 * @param {number} scale
	 */
	_makeReceptorView(r, facing, scale) {
		if (!this._receptorGeo) {
			const stem = new THREE.CylinderGeometry(0.075, 0.09, 0.42, 10);
			stem.rotateZ(Math.PI / 2);
			const pore = new THREE.TorusGeometry(0.115, 0.04, 10, 20);
			pore.rotateY(Math.PI / 2);
			const gpcr = new THREE.CylinderGeometry(0.12, 0.13, 0.17, 7);
			gpcr.rotateZ(Math.PI / 2);
			this._receptorGeo = {
				stem,
				pore,
				gpcr,
				cap: new THREE.SphereGeometry(0.1, 14, 10),
			};
		}
		const geo = this._receptorGeo;
		const material = new THREE.MeshStandardMaterial({
			color: PALETTE.receptorIdle,
			emissive: "#000000",
			roughness: 0.35,
			metalness: 0.4,
			flatShading: false,
		});
		const group = new THREE.Group();
		const stem = new THREE.Mesh(geo.stem, material);
		stem.position.x = -0.04 * facing;
		const pore = new THREE.Mesh(geo.pore, material);
		pore.position.x = 0.2 * facing;
		const gpcr = new THREE.Mesh(geo.gpcr, material);
		gpcr.position.x = 0.17 * facing;
		const cap = new THREE.Mesh(
			geo.cap,
			new THREE.MeshStandardMaterial({
				color: PALETTE.blocked,
				roughness: 0.9,
			}),
		);
		cap.position.x = 0.24 * facing;
		cap.visible = false;
		group.add(stem, pore, gpcr, cap);
		group.position.set(r.x, r.y, r.z);
		group.scale.setScalar(scale);
		this.root.add(group);
		return { model: r, material, cap, pore, gpcr, typeKey: null };
	}

	_buildTransporters() {
		const bodyGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.38, 14, 1, true);
		bodyGeo.rotateZ(Math.PI / 2);
		const mouthGeo = new THREE.TorusGeometry(0.12, 0.035, 10, 22);
		mouthGeo.rotateY(Math.PI / 2);

		this.transporterViews = this.model.transporters.map((t) => {
			const material = new THREE.MeshStandardMaterial({
				color: PALETTE.transporter,
				emissive: "#000000",
				roughness: 0.4,
				metalness: 0.3,
				side: THREE.DoubleSide,
			});
			const group = new THREE.Group();
			const body = new THREE.Mesh(bodyGeo, material);
			const mouth = new THREE.Mesh(mouthGeo, material);
			const inward = t.side === "post" ? -1 : 1;
			mouth.position.x = 0.17 * inward;
			group.add(body, mouth);
			group.position.set(t.x, t.y, t.z);
			if (t.side === "glia") {
				// Point the pore radially inward, toward the cleft.
				const toCleft = new THREE.Vector3(0, -t.y, -t.z).normalize();
				group.quaternion.setFromUnitVectors(
					new THREE.Vector3(1, 0, 0),
					toCleft,
				);
			}
			this.root.add(group);
			return { model: t, material, group };
		});
	}

	_buildEnzymes() {
		const geo = new THREE.IcosahedronGeometry(0.13, 1);
		// Carve a notch to suggest an active site.
		const pos = geo.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			if (pos.getX(i) > 0.09) pos.setX(i, pos.getX(i) * 0.45);
		}
		geo.computeVertexNormals();

		this.enzymeViews = this.model.enzymes.map((e) => {
			const material = new THREE.MeshStandardMaterial({
				color: PALETTE.enzyme,
				emissive: PALETTE.enzyme,
				emissiveIntensity: 0.25,
				roughness: 0.5,
				flatShading: true,
			});
			const mesh = new THREE.Mesh(geo, material);
			mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
			this.root.add(mesh);
			return { model: e, mesh, material };
		});
	}

	_buildVesicles() {
		const shellGeo = new THREE.SphereGeometry(VESICLES.radius, 28, 18);
		const coreGeo = new THREE.SphereGeometry(VESICLES.radius * 0.62, 18, 12);
		const shellMaterial = createMembraneMaterial({
			color: "#1d2246",
			rim: PALETTE.vesicleShell,
			opacity: 1.2,
		});
		this.vesicleViews = this.model.vesicles.map((v) => {
			const group = new THREE.Group();
			const shell = new THREE.Mesh(shellGeo, shellMaterial);
			shell.renderOrder = 3;
			const coreMaterial = new THREE.MeshBasicMaterial({
				color: "#ffffff",
				transparent: true,
				opacity: 0.85,
			});
			const core = new THREE.Mesh(coreGeo, coreMaterial);
			group.add(core, shell);
			this.root.add(group);
			return { model: v, group, core, coreMaterial, type: null };
		});
	}

	_buildParticles() {
		const max = PARTICLE.maxCount;
		this.particleMesh = new THREE.InstancedMesh(
			new THREE.IcosahedronGeometry(PARTICLE.radius, 1),
			new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
			max,
		);
		this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		this.particleMesh.setColorAt(0, new THREE.Color());
		this.particleMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
		this.particleMesh.count = 0;
		this.particleMesh.frustumCulled = false;
		this.root.add(this.particleMesh);

		// Soft halos rendered as additive point sprites.
		const haloGeo = new THREE.BufferGeometry();
		haloGeo.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(
				THREE.DynamicDrawUsage,
			),
		);
		haloGeo.setAttribute(
			"color",
			new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(
				THREE.DynamicDrawUsage,
			),
		);
		haloGeo.setDrawRange(0, 0);
		this.halos = new THREE.Points(
			haloGeo,
			new THREE.PointsMaterial({
				size: 0.42,
				map: getGlowTexture(),
				vertexColors: true,
				transparent: true,
				opacity: 0.5,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		);
		this.halos.frustumCulled = false;
		this.root.add(this.halos);
	}

	_buildCalcium() {
		const n = 70;
		const base = new Float32Array(n * 3);
		const dirs = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const r = Math.sqrt(Math.random()) * 1.8;
			base[i * 3] = CLEFT.xPre - 0.15;
			base[i * 3 + 1] = Math.cos(a) * r;
			base[i * 3 + 2] = Math.sin(a) * r;
			dirs[i * 3] = -(0.6 + Math.random() * 1.4);
			dirs[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
			dirs[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute(
			"position",
			new THREE.BufferAttribute(base.slice(), 3).setUsage(
				THREE.DynamicDrawUsage,
			),
		);
		this.calcium = new THREE.Points(
			geo,
			new THREE.PointsMaterial({
				color: PALETTE.calcium,
				size: 0.22,
				map: getGlowTexture(),
				transparent: true,
				opacity: 0,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		);
		this.calcium.userData = { base, dirs };
		this.root.add(this.calcium);
	}

	_buildCleftDetail() {
		// Adhesion molecules bridge the cleft around its rim.
		const points = [];
		const n = 22;
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			const r = 2.3 + (i % 2) * 0.12;
			const y = Math.cos(a) * r;
			const z = Math.sin(a) * r;
			points.push(
				new THREE.Vector3(CLEFT.xPre, y, z),
				new THREE.Vector3(0, y * 1.02, z * 1.02),
				new THREE.Vector3(0, y * 1.02, z * 1.02),
				new THREE.Vector3(CLEFT.xPost, y, z),
			);
		}
		const adhesion = new THREE.LineSegments(
			new THREE.BufferGeometry().setFromPoints(points),
			new THREE.LineBasicMaterial({
				color: "#c38bff",
				transparent: true,
				opacity: 0.35,
			}),
		);
		this.root.add(adhesion);

		// Extracellular matrix specks give the cleft volume.
		const specks = new Float32Array(260 * 3);
		for (let i = 0; i < 260; i++) {
			const a = Math.random() * Math.PI * 2;
			const r = Math.sqrt(Math.random()) * 2.6;
			specks[i * 3] = (Math.random() - 0.5) * 1.9;
			specks[i * 3 + 1] = Math.cos(a) * r;
			specks[i * 3 + 2] = Math.sin(a) * r;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(specks, 3));
		this.cleftSpecks = new THREE.Points(
			geo,
			new THREE.PointsMaterial({
				color: "#6f86ff",
				size: 0.05,
				transparent: true,
				opacity: 0.4,
				depthWrite: false,
			}),
		);
		this.root.add(this.cleftSpecks);
	}

	_buildDust() {
		const n = 1400;
		const arr = new Float32Array(n * 3);
		for (let i = 0; i < n; i++) {
			const r = 9 + Math.random() * 40;
			const t = Math.random() * Math.PI * 2;
			const p = Math.acos(2 * Math.random() - 1);
			arr[i * 3] = r * Math.sin(p) * Math.cos(t);
			arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.6;
			arr[i * 3 + 2] = r * Math.cos(p);
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
		this.dust = new THREE.Points(
			geo,
			new THREE.PointsMaterial({
				color: "#4f5dff",
				size: 0.32,
				map: getGlowTexture(),
				transparent: true,
				opacity: 0.35,
				depthWrite: false,
				blending: THREE.AdditiveBlending,
			}),
		);
		this.scene.add(this.dust);
	}

	_buildFusionFlashes() {
		this.flashes = Array.from({ length: 12 }, () => {
			const sprite = createGlowSprite("#ffffff", 1);
			sprite.visible = false;
			sprite.userData.life = 0;
			this.root.add(sprite);
			return sprite;
		});
		this._flashIndex = 0;
	}

	/**
	 * Show a bright flash where a vesicle fused.
	 * @param {{x:number,y:number,z:number}} position
	 * @param {string} type
	 */
	flashFusion(position, type) {
		const sprite = this.flashes[this._flashIndex];
		this._flashIndex = (this._flashIndex + 1) % this.flashes.length;
		sprite.position.set(position.x + 0.1, position.y, position.z);
		sprite.material.color.copy(this._ntColors[type]);
		sprite.userData.life = 1;
		sprite.visible = true;
	}

	flashSpine() {
		this._spineFlash = 1;
	}

	_buildLabels() {
		const specs = [
			["Axon (myelinated)", [-13, 2.2, -1.6]],
			["Presynaptic terminal", [-3.6, 3.1, 0]],
			["Synaptic vesicles", [-2.9, -2.35, 1.2]],
			["Active zone", [-1.15, -1.75, 0.6]],
			["Synaptic cleft", [0, -3.15, 0]],
			["Receptors", [1.25, 2.05, 0.6]],
			["Reuptake transporters", [-1, 2.75, 0.4]],
			["Autoreceptors", [-1.2, -1.95, -1.2]],
			["Astrocyte", [0, 3.7, -1.6]],
			["COMT (glia)", [0.6, -2.4, -2.2]],
			["Mitochondria (MAO)", [-4.4, 1.75, -0.6]],
			["Postsynaptic spine", [3.4, 3.0, 0]],
			["Dendrite", [7.4, 1.9, 5]],
		];
		this.labels = specs.map(([text, pos]) => {
			const el = document.createElement("div");
			el.className = "scene-label";
			el.textContent = text;
			const label = new CSS2DObject(el);
			label.position.set(...pos);
			this.root.add(label);
			return label;
		});
		this.comtLabel = this.labels.find(
			(l) => l.element.textContent === "COMT (glia)",
		);
	}

	// ---------------------------------------------------------------------
	// Per-frame sync
	// ---------------------------------------------------------------------

	/** @param {number} dt Real seconds since last frame. */
	update(dt) {
		const m = this.model;
		this._syncParticles();
		this._syncVesicles();
		this._syncReceptors();
		this._syncTransporters();
		this._syncEnzymes(dt);
		this._syncActionPotentials();
		this._syncCalcium();
		this._syncFlashes(dt);

		// Postsynaptic flash on spikes and gentle glow with depolarisation.
		this._spineFlash *= Math.exp(-dt * 3.5);
		const depol = Math.max(0, (m.voltage + 70) / 20);
		this.postMaterial.uniforms.uFlash.value =
			this._spineFlash * 0.45 + depol * 0.08;
		this.psd.material.emissiveIntensity =
			0.6 + depol * 0.6 + this._spineFlash * 0.6;

		// Mitochondria glow with MAO activity (monoamine breakdown).
		this.mitoMaterial.emissiveIntensity =
			1 + Math.min(2.5, m.maoActivity * 0.4);

		this.dust.rotation.y += dt * 0.01;
	}

	_syncParticles() {
		const list = this.model.particles;
		const mesh = this.particleMesh;
		const haloPos = this.halos.geometry.attributes.position.array;
		const haloCol = this.halos.geometry.attributes.color.array;
		const color = this._tmpColor;
		const n = Math.min(list.length, PARTICLE.maxCount);

		for (let i = 0; i < n; i++) {
			const p = list[i];
			let scale = 1;
			let brightness = 1.05;
			if (p.state === "bound") {
				scale = 1.2;
				brightness = 1.5;
			} else if (p.state === "reuptake") {
				scale = 1 - p.t * 0.75;
				brightness = 1.05 * (1 - p.t * 0.6);
			} else if (p.state === "degrade") {
				scale = 1 + p.t * 0.6;
				brightness = 1.05 * (1 - p.t);
			}
			// Pop in when freshly released.
			scale *= Math.min(1, 0.3 + p.age * 6);

			this._tmpPos.set(p.x, p.y, p.z);
			this._tmpScale.setScalar(scale);
			this._tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
			mesh.setMatrixAt(i, this._tmpMatrix);

			color.copy(this._ntColors[p.type]);
			if (p.state === "degrade") color.lerp(GREY, p.t);
			color.multiplyScalar(brightness);
			mesh.setColorAt(i, color);

			haloPos[i * 3] = p.x;
			haloPos[i * 3 + 1] = p.y;
			haloPos[i * 3 + 2] = p.z;
			const h = p.state === "bound" ? 0.7 : 0.35;
			haloCol[i * 3] = (color.r / brightness) * h;
			haloCol[i * 3 + 1] = (color.g / brightness) * h;
			haloCol[i * 3 + 2] = (color.b / brightness) * h;
		}

		mesh.count = n;
		mesh.instanceMatrix.needsUpdate = true;
		mesh.instanceColor.needsUpdate = true;
		this.halos.geometry.setDrawRange(0, n);
		this.halos.geometry.attributes.position.needsUpdate = true;
		this.halos.geometry.attributes.color.needsUpdate = true;
	}

	_syncVesicles() {
		for (const view of this.vesicleViews) {
			const v = view.model;
			const visible = v.state !== "recycling";
			view.group.visible = visible;
			if (!visible) continue;
			view.group.position.set(v.x, v.y, v.z);
			const appear = v.appear < 1 ? easeOutBack(v.appear) : 1;
			view.group.scale.set(
				v.scale * appear * (v.state === "fusing" ? 0.6 : 1),
				v.scale * appear,
				v.scale * appear,
			);
			if (view.type !== v.type) {
				view.type = v.type;
				view.coreMaterial.color.copy(this._ntColors[v.type]);
			}
			// Core size tracks how full the vesicle is (quantal size).
			const fill = Math.cbrt(
				Math.max(0.15, v.content / VESICLES.transmittersPerVesicle),
			);
			view.core.scale.setScalar(Math.min(1.35, fill));
			view.coreMaterial.opacity = v.state === "fusing" ? 1 : 0.8;
		}
	}

	_syncReceptors() {
		for (const view of this.receptorViews) this._syncReceptorView(view);
	}

	_syncReceptorView(view) {
		const r = view.model;
		if (view.typeKey !== r.type.key) {
			view.typeKey = r.type.key;
			const gpcr = r.type.kind === "metabotropic";
			view.gpcr.visible = gpcr;
			view.pore.visible = !gpcr;
		}
		view.cap.visible = r.blocked;
		const target = isExcitatory(r.type) ? EXCITATORY : INHIBITORY;
		view.material.color
			.set(r.blocked ? "#4b4560" : PALETTE.receptorIdle)
			.lerp(target, r.activation * 0.85);
		view.material.emissive.copy(target);
		view.material.emissiveIntensity = r.activation * 0.75;
	}

	_syncTransporters() {
		const blocked = this.model.settings.reuptakeBlocked;
		for (const view of this.transporterViews) {
			view.group.visible = view.model.active;
			if (!view.model.active) continue;
			const flash = view.model.flash;
			view.material.color.set(
				blocked ? PALETTE.transporterBlocked : PALETTE.transporter,
			);
			view.material.emissive.set(blocked ? "#7a0f24" : "#ffcf70");
			view.material.emissiveIntensity = blocked ? 0.35 : flash * 1.2;
		}
	}

	_syncEnzymes(dt) {
		const blocked = this.model.settings.enzymesBlocked;
		// COMT only matters for catecholamines (dopamine, norepinephrine).
		const present = this.model.transmitter.enzymatic > 0;
		this.comtLabel.visible = present;
		for (const view of this.enzymeViews) {
			view.mesh.visible = present;
			if (!present) continue;
			const e = view.model;
			view.mesh.position.set(e.x, e.y, e.z);
			view.mesh.rotation.y += dt * 0.6;
			view.mesh.scale.setScalar(1 + e.flash * 0.35);
			view.material.color.set(blocked ? PALETTE.enzymeBlocked : PALETTE.enzyme);
			view.material.emissiveIntensity = blocked ? 0 : 0.2 + e.flash * 1.1;
		}
	}

	_syncActionPotentials() {
		const aps = this.model.actionPotentials;
		const travel = ACTION_POTENTIAL.travelTime;
		this.apPool.forEach((group, i) => {
			const ap = aps[aps.length - 1 - i];
			if (!ap) {
				group.visible = false;
				return;
			}
			const progress = (this.model.time - ap.start) / travel;
			if (progress > 1.15) {
				group.visible = false;
				return;
			}
			group.visible = true;
			if (progress <= 1) {
				group.position.copy(this.axonCurve.getPointAt(1 - progress));
				group.scale.setScalar(1);
			} else {
				// Spread through the terminal as the pulse arrives.
				const k = (progress - 1) / 0.15;
				group.position.set(-6.4 + k * 3.5, 0, 0);
				group.scale.setScalar(1 + k * 2.5);
			}
		});
	}

	_syncCalcium() {
		const pulses = this.model.calciumPulses;
		const latest = pulses[pulses.length - 1];
		if (!latest) {
			this.calcium.material.opacity = 0;
			return;
		}
		const age = this.model.time - latest.start;
		const { base, dirs } = this.calcium.userData;
		const pos = this.calcium.geometry.attributes.position.array;
		for (let i = 0; i < pos.length; i++) pos[i] = base[i] + dirs[i] * age;
		this.calcium.geometry.attributes.position.needsUpdate = true;
		this.calcium.material.opacity = Math.max(0, 1 - age / 0.8);
	}

	_syncFlashes(dt) {
		for (const sprite of this.flashes) {
			if (!sprite.visible) continue;
			sprite.userData.life -= dt * 2.4;
			if (sprite.userData.life <= 0) {
				sprite.visible = false;
				continue;
			}
			const life = sprite.userData.life;
			sprite.scale.setScalar(0.4 + (1 - life) * 1.5);
			sprite.material.opacity = life * 0.8;
		}
	}
}

const GREY = new THREE.Color("#3a3a46");
const EXCITATORY = new THREE.Color(PALETTE.excitatory);
const INHIBITORY = new THREE.Color(PALETTE.inhibitory);

function easeOutBack(t) {
	const c1 = 1.70158;
	const c3 = c1 + 1;
	return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
