import * as THREE from "three";

/**
 * Enhanced emotional face that visualizes mood (happiness, arousal, anxiety).
 * Features: smooth transitions, pupils, eyebrows, blinking, cheeks, glow effects,
 * head tilt, color changes, and dramatic expressions.
 */
export class EmotionalFace {
	constructor() {
		try {
			// Create face scene with better background
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color(0x1a1a2e);

			this.camera = new THREE.PerspectiveCamera(
				50,
				1, // Square aspect ratio
				0.1,
				1000,
			);

			this.renderer = new THREE.WebGLRenderer({
				antialias: true,
				alpha: false,
				powerPreference: "high-performance",
			});

			// Larger, more prominent display
			const size = Math.min(
				window.innerWidth * 0.25,
				window.innerHeight * 0.25,
				300,
			);
			this.renderer.setSize(size, size);
			this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

			// Position the face renderer in top-right corner with better styling
			const container = document.createElement("div");
			container.style.position = "absolute";
			container.style.top = "20px";
			container.style.right = "20px";
			container.style.zIndex = "100";
			container.style.borderRadius = "20px";
			container.style.overflow = "hidden";
			container.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.5)";
			container.style.border = "3px solid rgba(255, 255, 255, 0.1)";
			container.appendChild(this.renderer.domElement);
			document.body.appendChild(container);

			// Add title label
			const label = document.createElement("div");
			label.textContent = "Mood State";
			label.style.position = "absolute";
			label.style.bottom = "10px";
			label.style.left = "50%";
			label.style.transform = "translateX(-50%)";
			label.style.color = "rgba(255, 255, 255, 0.7)";
			label.style.fontSize = "12px";
			label.style.fontWeight = "bold";
			label.style.textTransform = "uppercase";
			label.style.letterSpacing = "1px";
			label.style.pointerEvents = "none";
			container.appendChild(label);

			this.camera.position.z = 5;

			// Add subtle lighting
			const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
			this.scene.add(ambientLight);

			const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
			frontLight.position.set(0, 0, 5);
			this.scene.add(frontLight);

			// Initialize face parts
			this.createFace();

			// Start with neutral expression
			this.currentMood = { happiness: 0, arousal: 0, anxiety: 0 };
			this.targetMood = { happiness: 0, arousal: 0, anxiety: 0 };
			this.moodLerpSpeed = 0.15; // smoothing factor per frame

			// Animation state
			this.time = 0;
			this.isBlinking = false;
			this.nextBlinkAt = performance.now() + this._randomBlinkDelay();

			// Particle effects for extreme emotions
			this.particles = [];
			this.createParticleSystem();

			this.animate();
			console.log("EmotionalFace initialized successfully");
		} catch (error) {
			console.error("Error initializing EmotionalFace:", error);
			throw error;
		}
	}

	createFace() {
		// Create head with gradient effect
		const headGeometry = new THREE.CircleGeometry(2, 64);
		const headMaterial = new THREE.MeshStandardMaterial({
			color: 0xffdbac,
			roughness: 0.8,
			metalness: 0.1,
			emissive: 0xffdbac,
			emissiveIntensity: 0.05,
		});
		this.head = new THREE.Mesh(headGeometry, headMaterial);
		this.scene.add(this.head);

		// Add head outline for better definition
		const outlineGeometry = new THREE.RingGeometry(1.95, 2.05, 64);
		const outlineMaterial = new THREE.MeshBasicMaterial({
			color: 0x8b6f47,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.3,
		});
		const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
		this.scene.add(outline);

		// Add cheeks (will change color with emotion)
		const cheekGeometry = new THREE.CircleGeometry(0.35, 32);
		this.leftCheekMaterial = new THREE.MeshBasicMaterial({
			color: 0xffb3ba,
			transparent: true,
			opacity: 0,
		});
		this.rightCheekMaterial = new THREE.MeshBasicMaterial({
			color: 0xffb3ba,
			transparent: true,
			opacity: 0,
		});

		this.leftCheek = new THREE.Mesh(cheekGeometry, this.leftCheekMaterial);
		this.leftCheek.position.set(-1.1, -0.2, 0.05);
		this.scene.add(this.leftCheek);

		this.rightCheek = new THREE.Mesh(cheekGeometry, this.rightCheekMaterial);
		this.rightCheek.position.set(1.1, -0.2, 0.05);
		this.scene.add(this.rightCheek);

		// Create enhanced eyes (sclera + iris + pupil + highlight)
		const scleraGeometry = new THREE.CircleGeometry(0.38, 32);
		const scleraMaterial = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			roughness: 0.3,
			metalness: 0.1,
		});

		const irisGeometry = new THREE.CircleGeometry(0.18, 32);
		const pupilGeometry = new THREE.CircleGeometry(0.08, 16);
		const highlightGeometry = new THREE.CircleGeometry(0.06, 16);

		const makeEye = (x, y) => {
			const group = new THREE.Group();

			// Sclera (white)
			const sclera = new THREE.Mesh(scleraGeometry, scleraMaterial);
			group.add(sclera);

			// Iris (colored, will change with mood)
			const irisMaterial = new THREE.MeshStandardMaterial({
				color: 0x4a90e2,
				roughness: 0.4,
				metalness: 0.2,
			});
			const iris = new THREE.Mesh(irisGeometry, irisMaterial);
			iris.position.z = 0.01;
			group.add(iris);

			// Pupil (black)
			const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
			const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
			pupil.position.z = 0.02;
			group.add(pupil);

			// Highlight (makes eyes look alive)
			const highlightMaterial = new THREE.MeshBasicMaterial({
				color: 0xffffff,
				transparent: true,
				opacity: 0.8,
			});
			const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
			highlight.position.set(-0.05, 0.05, 0.03);
			group.add(highlight);

			// Eye outline
			const outlineGeometry = new THREE.RingGeometry(0.36, 0.4, 32);
			const outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000,
				transparent: true,
				opacity: 0.3,
			});
			const eyeOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);
			eyeOutline.position.z = 0.04;
			group.add(eyeOutline);

			group.position.set(x, y, 0.1);
			group.userData.pupil = pupil;
			group.userData.iris = iris;
			group.userData.irisMaterial = irisMaterial;
			return group;
		};

		this.leftEye = makeEye(-0.7, 0.4);
		this.rightEye = makeEye(0.7, 0.4);
		this.scene.add(this.leftEye);
		this.scene.add(this.rightEye);

		// Enhanced eyebrows with thickness
		const browGeometry = new THREE.PlaneGeometry(0.9, 0.12);
		const browMaterial = new THREE.MeshStandardMaterial({
			color: 0x4a3728,
			roughness: 0.9,
			metalness: 0.05,
		});
		this.leftBrow = new THREE.Mesh(browGeometry, browMaterial);
		this.rightBrow = new THREE.Mesh(browGeometry, browMaterial.clone());
		this.leftBrow.position.set(-0.7, 0.95, 0.11);
		this.rightBrow.position.set(0.7, 0.95, 0.11);
		this.scene.add(this.leftBrow);
		this.scene.add(this.rightBrow);

		// Create enhanced mouth (will be animated)
		const mouthGeometry = new THREE.BufferGeometry();
		const mouthCurve = new THREE.QuadraticBezierCurve(
			new THREE.Vector2(-1, 0),
			new THREE.Vector2(0, 0),
			new THREE.Vector2(1, 0),
		);

		const points = mouthCurve.getPoints(50);
		const vertices = new Float32Array(points.length * 3);

		for (let i = 0; i < points.length; i++) {
			vertices[i * 3] = points[i].x;
			vertices[i * 3 + 1] = points[i].y;
			vertices[i * 3 + 2] = 0;
		}

		mouthGeometry.setAttribute(
			"position",
			new THREE.BufferAttribute(vertices, 3),
		);

		const mouthMaterial = new THREE.LineBasicMaterial({
			color: 0x8b4513,
			linewidth: 2,
		});
		this.mouth = new THREE.Line(mouthGeometry, mouthMaterial);
		this.mouth.position.set(0, -0.6, 0.1);
		this.mouth.scale.set(0.7, 1, 1);

		this.scene.add(this.mouth);

		// Add nose
		const noseGeometry = new THREE.CircleGeometry(0.08, 16);
		const noseMaterial = new THREE.MeshStandardMaterial({
			color: 0xffb3a0,
			roughness: 0.6,
			metalness: 0.1,
		});
		this.nose = new THREE.Mesh(noseGeometry, noseMaterial);
		this.nose.position.set(0, 0, 0.12);
		this.scene.add(this.nose);
	}

	createParticleSystem() {
		// Create particles for extreme emotions (sparkles for happiness, sweat for anxiety)
		const particleGeometry = new THREE.CircleGeometry(0.05, 8);

		for (let i = 0; i < 10; i++) {
			const material = new THREE.MeshBasicMaterial({
				color: 0xffff00,
				transparent: true,
				opacity: 0,
			});
			const particle = new THREE.Mesh(particleGeometry, material);
			particle.userData.velocity = new THREE.Vector2();
			particle.userData.life = 0;
			this.particles.push(particle);
			this.scene.add(particle);
		}
	}

	updateExpression(moodSummaryOrNeurotransmitters) {
		// Accept either a precomputed mood summary or a list of NTs (backward compatibility)
		const summary = moodSummaryOrNeurotransmitters;
		if (summary && typeof summary === "object" && "happiness" in summary) {
			this.targetMood = {
				happiness: this._clamp(summary.happiness || 0, -1, 1),
				arousal: this._clamp(summary.arousal || 0, -1, 1),
				anxiety: this._clamp(summary.anxiety || 0, -1, 1),
			};
		} else if (Array.isArray(summary)) {
			// Fallback: compute roughly from NT list
			this.targetMood = { happiness: 0, arousal: 0, anxiety: 0 };
			summary.forEach((nt) => {
				if (!nt?.type) return;
				switch (nt.type) {
					case "DOPAMINE":
						this.targetMood.happiness += 0.3;
						this.targetMood.arousal += 0.2;
						break;
					case "SEROTONIN":
						this.targetMood.happiness += 0.2;
						this.targetMood.anxiety -= 0.3;
						break;
					case "NOREPINEPHRINE":
						this.targetMood.arousal += 0.3;
						this.targetMood.anxiety += 0.2;
						break;
					case "GABA":
						this.targetMood.anxiety -= 0.2;
						this.targetMood.arousal -= 0.2;
						break;
				}
			});
		} else {
			return;
		}
		// Features update happens each animation frame with smoothing
	}

	updateMouth() {
		// Create mouth curve based on happiness (curvature) and arousal (width)
		const widthScale = 0.7 + this.currentMood.arousal * 0.3;
		const curvature = this.currentMood.happiness * 0.8;

		// Anxiety makes mouth tighter/smaller
		const anxietyTension = Math.max(0, this.currentMood.anxiety) * 0.3;

		const mouthCurve = new THREE.QuadraticBezierCurve(
			new THREE.Vector2(-1, -anxietyTension * 0.2),
			new THREE.Vector2(0, curvature - anxietyTension),
			new THREE.Vector2(1, -anxietyTension * 0.2),
		);

		const points = mouthCurve.getPoints(50);
		const vertices = new Float32Array(points.length * 3);

		for (let i = 0; i < points.length; i++) {
			vertices[i * 3] = points[i].x * widthScale;
			vertices[i * 3 + 1] = points[i].y;
			vertices[i * 3 + 2] = 0;
		}

		this.mouth.geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(vertices, 3),
		);

		// Mouth position changes with emotion
		this.mouth.position.y = -0.6 - anxietyTension * 0.1;
	}

	updateCheeks() {
		// Cheeks blush with happiness or arousal
		const blushIntensity = Math.max(
			this.currentMood.happiness * 0.6,
			this.currentMood.arousal * 0.4,
		);

		this.leftCheekMaterial.opacity = Math.max(0, blushIntensity);
		this.rightCheekMaterial.opacity = Math.max(0, blushIntensity);

		// Cheeks puff slightly with happiness
		const puff = 1 + this.currentMood.happiness * 0.2;
		this.leftCheek.scale.set(puff, puff, 1);
		this.rightCheek.scale.set(puff, puff, 1);
	}

	updateHeadTilt() {
		// Head tilts with emotion
		const tilt =
			this.currentMood.happiness * 0.08 - this.currentMood.anxiety * 0.05;
		this.head.rotation.z = tilt;

		// Subtle head bob with arousal
		const bob = Math.sin(this.time * 2) * this.currentMood.arousal * 0.02;
		this.head.position.y = bob;
	}

	updateParticles() {
		// Sparkles when very happy
		if (this.currentMood.happiness > 0.6) {
			this.particles.forEach((particle, _i) => {
				if (particle.userData.life <= 0 && Math.random() < 0.05) {
					// Spawn new sparkle
					particle.position.set(
						(Math.random() - 0.5) * 3,
						(Math.random() - 0.5) * 3,
						0.2,
					);
					particle.userData.velocity.set(
						(Math.random() - 0.5) * 0.02,
						Math.random() * 0.03 + 0.02,
					);
					particle.userData.life = 1;
					particle.material.color.setHex(0xffff00);
					particle.material.opacity = 0.8;
				}

				if (particle.userData.life > 0) {
					particle.position.x += particle.userData.velocity.x;
					particle.position.y += particle.userData.velocity.y;
					particle.userData.life -= 0.02;
					particle.material.opacity = particle.userData.life * 0.8;
				}
			});
		}

		// Sweat drops when very anxious
		if (this.currentMood.anxiety > 0.6) {
			this.particles.forEach((particle, i) => {
				if (particle.userData.life <= 0 && Math.random() < 0.03) {
					// Spawn sweat drop
					particle.position.set(Math.random() > 0.5 ? 1.2 : -1.2, 1.5, 0.2);
					particle.userData.velocity.set((Math.random() - 0.5) * 0.01, -0.04);
					particle.userData.life = 1;
					particle.material.color.setHex(0x88ccff);
					particle.material.opacity = 0.6;
				}

				if (particle.userData.life > 0) {
					particle.position.x += particle.userData.velocity.x;
					particle.position.y += particle.userData.velocity.y;
					particle.userData.life -= 0.015;
					particle.material.opacity = particle.userData.life * 0.6;
				}
			});
		}
	}

	updateBackground() {
		// Background color changes with mood
		const bgColor = new THREE.Color();

		if (this.currentMood.happiness > 0.4) {
			// Warm, bright background when happy
			bgColor.setHex(0x2a3a4a);
		} else if (this.currentMood.anxiety > 0.4) {
			// Darker, cooler when anxious
			bgColor.setHex(0x1a1a2e);
		} else if (this.currentMood.arousal > 0.5) {
			// Energetic purple when aroused
			bgColor.setHex(0x2a2040);
		} else {
			// Neutral
			bgColor.setHex(0x1a1a2e);
		}

		this.scene.background.lerp(bgColor, 0.05);
	}

	updateEyes() {
		// Pupil dilation with arousal (more dramatic)
		const pupilScale = 1 + this.currentMood.arousal * 0.8;
		this.leftEye.userData.pupil.scale.set(pupilScale, pupilScale, 1);
		this.rightEye.userData.pupil.scale.set(pupilScale, pupilScale, 1);

		// Iris color changes with mood
		const irisColor = new THREE.Color();
		if (this.currentMood.happiness > 0.3) {
			// Bright blue when happy
			irisColor.setHex(0x4a90e2);
		} else if (this.currentMood.anxiety > 0.3) {
			// Darker, more intense when anxious
			irisColor.setHex(0x2d5a7b);
		} else if (this.currentMood.arousal > 0.5) {
			// Vibrant when aroused
			irisColor.setHex(0x5ba3ff);
		} else {
			// Neutral
			irisColor.setHex(0x4a90e2);
		}
		this.leftEye.userData.irisMaterial.color = irisColor;
		this.rightEye.userData.irisMaterial.color = irisColor;

		// Eye group vertical shift with anxiety
		const anxietyOffset = this.currentMood.anxiety * 0.2;
		this.leftEye.position.y = 0.4 + anxietyOffset;
		this.rightEye.position.y = 0.4 + anxietyOffset;

		// Eye widening with arousal
		const arousalScale = 1 + this.currentMood.arousal * 0.15;

		// Simulate eyelid squinting with anxiety by scaling Y
		const squint = 1 - Math.max(0, this.currentMood.anxiety) * 0.6;
		const blinkScale = this.isBlinking ? 0.05 : 1;
		const eyeScaleY = Math.max(0.05, squint * blinkScale * arousalScale);
		this.leftEye.scale.y = eyeScaleY;
		this.rightEye.scale.y = eyeScaleY;
		this.leftEye.scale.x = arousalScale;
		this.rightEye.scale.x = arousalScale;

		// Subtle jitter with high anxiety
		const jitter = Math.max(0, this.currentMood.anxiety) * 0.03;
		this.leftEye.position.x = -0.7 + (Math.random() - 0.5) * jitter;
		this.rightEye.position.x = 0.7 + (Math.random() - 0.5) * jitter;
	}

	updateEyebrows() {
		// Eyebrows angle: raised with happiness, furrowed with anxiety
		const raise = this.currentMood.happiness * 0.35;
		const furrow = this.currentMood.anxiety * 0.5;
		const arousalRaise = this.currentMood.arousal * 0.15;

		this.leftBrow.position.y =
			0.95 + raise + arousalRaise - Math.max(0, furrow) * 0.15;
		this.rightBrow.position.y =
			0.95 + raise + arousalRaise - Math.max(0, furrow) * 0.15;

		// More dramatic angles
		this.leftBrow.rotation.z = 0.15 * furrow + this.currentMood.happiness * 0.1;
		this.rightBrow.rotation.z =
			-0.15 * furrow - this.currentMood.happiness * 0.1;

		// Eyebrow thickness changes with emotion
		const thickness = 1 + Math.abs(this.currentMood.anxiety) * 0.3;
		this.leftBrow.scale.y = thickness;
		this.rightBrow.scale.y = thickness;
	}

	animate() {
		requestAnimationFrame(() => this.animate());

		this.time += 0.016; // ~60fps

		// Smoothly move currentMood toward targetMood
		this._stepMood();

		// Blink scheduling
		const now = performance.now();
		if (now >= this.nextBlinkAt && !this.isBlinking) {
			this._doBlink();
			this.nextBlinkAt = now + this._randomBlinkDelay();
		}

		// Update all facial features
		this.updateMouth();
		this.updateEyes();
		this.updateEyebrows();
		this.updateCheeks();
		this.updateHeadTilt();
		this.updateParticles();
		this.updateBackground();

		this.renderer.render(this.scene, this.camera);
	}

	_stepMood() {
		const lerp = (a, b, t) => a + (b - a) * t;
		const t = this.moodLerpSpeed;
		this.currentMood.happiness = lerp(
			this.currentMood.happiness,
			this.targetMood.happiness,
			t,
		);
		this.currentMood.arousal = lerp(
			this.currentMood.arousal,
			this.targetMood.arousal,
			t,
		);
		this.currentMood.anxiety = lerp(
			this.currentMood.anxiety,
			this.targetMood.anxiety,
			t,
		);
	}

	_doBlink() {
		this.isBlinking = true;
		// End blink after short delay
		setTimeout(() => {
			this.isBlinking = false;
		}, 120);
	}

	_randomBlinkDelay() {
		// Faster, more frequent blinks with higher anxiety
		const base = 2500; // ms
		const anxietyFactor = 1 - Math.max(0, Math.min(1, this.targetMood.anxiety));
		const jitter = 500 + Math.random() * 800;
		return base * anxietyFactor + jitter;
	}

	_clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}
}
