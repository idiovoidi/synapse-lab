import * as THREE from "three";

/**
 * Creates an immersive 3D synaptic environment with curved, organic structures
 */
export class SynapticCleftStructure {
	constructor(scene) {
		this.scene = scene;
		this.cleftRadius = 8; // Radius of the synaptic bouton
		this.cleftGap = 0.5; // Gap between membranes

		this.createPresynapticBouton();
		this.createPostsynapticSpine();
		this.createCleftEnvironment();
		this.createVesiclePool();
		this.createReceptorClusters();
		this.createExtracellularMatrix();
	}

	createPresynapticBouton() {
		// Create a bulbous presynaptic terminal (axon bouton)
		const boutonGroup = new THREE.Group();

		// Main bouton body - hemisphere shape
		const boutonGeometry = new THREE.SphereGeometry(
			this.cleftRadius,
			64,
			64,
			0,
			Math.PI * 2,
			0,
			Math.PI * 0.6,
		);
		const boutonMaterial = new THREE.MeshStandardMaterial({
			color: 0xffbb88,
			transparent: true,
			opacity: 0.4,
			side: THREE.BackSide,
			roughness: 0.7,
			metalness: 0.1,
			emissive: 0x442200,
			emissiveIntensity: 0.05,
		});

		const bouton = new THREE.Mesh(boutonGeometry, boutonMaterial);
		bouton.position.x = -this.cleftGap / 2;
		bouton.rotation.y = Math.PI;
		bouton.castShadow = true;
		bouton.receiveShadow = true;

		boutonGroup.add(bouton);

		// Inner membrane surface with lipid texture
		const innerMembraneGeometry = new THREE.SphereGeometry(
			this.cleftRadius - 0.1,
			64,
			64,
			0,
			Math.PI * 2,
			0,
			Math.PI * 0.6,
		);
		const innerMembraneMaterial = new THREE.MeshStandardMaterial({
			color: 0xffcc99,
			transparent: true,
			opacity: 0.6,
			side: THREE.BackSide,
			roughness: 0.5,
			metalness: 0.2,
			emissive: 0x553311,
			emissiveIntensity: 0.1,
		});

		const innerMembrane = new THREE.Mesh(
			innerMembraneGeometry,
			innerMembraneMaterial,
		);
		innerMembrane.position.x = -this.cleftGap / 2;
		innerMembrane.rotation.y = Math.PI;
		boutonGroup.add(innerMembrane);

		// Add membrane proteins (bumps on surface)
		this.createMembraneProteins(
			boutonGroup,
			this.cleftRadius - 0.05,
			-this.cleftGap / 2,
			50,
		);

		// Cytoplasmic organelles visible through membrane
		this.createCytoplasmicStructures(boutonGroup, -this.cleftGap / 2);

		this.presynapticBouton = boutonGroup;
		this.scene.add(boutonGroup);
	}

	createPostsynapticSpine() {
		// Create a dendritic spine (mushroom-shaped)
		const spineGroup = new THREE.Group();

		// Spine head - bulbous receiving end
		const headGeometry = new THREE.SphereGeometry(
			this.cleftRadius * 0.9,
			64,
			64,
			0,
			Math.PI * 2,
			Math.PI * 0.4,
			Math.PI * 0.6,
		);
		const headMaterial = new THREE.MeshStandardMaterial({
			color: 0xffbb88,
			transparent: true,
			opacity: 0.4,
			side: THREE.BackSide,
			roughness: 0.7,
			metalness: 0.1,
			emissive: 0x442200,
			emissiveIntensity: 0.05,
		});

		const spineHead = new THREE.Mesh(headGeometry, headMaterial);
		spineHead.position.x = this.cleftGap / 2;
		spineHead.castShadow = true;
		spineHead.receiveShadow = true;

		spineGroup.add(spineHead);

		// Inner membrane
		const innerHeadGeometry = new THREE.SphereGeometry(
			this.cleftRadius * 0.9 - 0.1,
			64,
			64,
			0,
			Math.PI * 2,
			Math.PI * 0.4,
			Math.PI * 0.6,
		);
		const innerHeadMaterial = new THREE.MeshStandardMaterial({
			color: 0xffcc99,
			transparent: true,
			opacity: 0.6,
			side: THREE.BackSide,
			roughness: 0.5,
			metalness: 0.2,
			emissive: 0x553311,
			emissiveIntensity: 0.1,
		});

		const innerHead = new THREE.Mesh(innerHeadGeometry, innerHeadMaterial);
		innerHead.position.x = this.cleftGap / 2;
		spineGroup.add(innerHead);

		// Spine neck - connecting to dendrite
		const neckGeometry = new THREE.CylinderGeometry(1.5, 2, 6, 32);
		const neckMaterial = new THREE.MeshStandardMaterial({
			color: 0xffaa77,
			transparent: true,
			opacity: 0.5,
			roughness: 0.6,
			metalness: 0.1,
			emissive: 0x442200,
			emissiveIntensity: 0.05,
		});

		const neck = new THREE.Mesh(neckGeometry, neckMaterial);
		neck.position.set(this.cleftGap / 2 + 5, 0, 0);
		neck.rotation.z = Math.PI / 2;
		spineGroup.add(neck);

		// Postsynaptic density (PSD) - thick protein layer
		this.createPostsynapticDensity(spineGroup, this.cleftGap / 2);

		// Membrane proteins
		this.createMembraneProteins(
			spineGroup,
			this.cleftRadius * 0.9 - 0.05,
			this.cleftGap / 2,
			40,
		);

		this.postsynapticSpine = spineGroup;
		this.scene.add(spineGroup);
	}

	createMembraneProteins(parent, radius, xOffset, count) {
		// Create transmembrane proteins as bumps on the surface
		for (let i = 0; i < count; i++) {
			const proteinGroup = new THREE.Group();

			// Protein body
			const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
			const bodyMaterial = new THREE.MeshStandardMaterial({
				color: 0xff9966,
				roughness: 0.5,
				metalness: 0.4,
				emissive: 0xaa5533,
				emissiveIntensity: 0.3,
			});
			const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
			proteinGroup.add(body);

			// Extracellular domain
			const domainGeometry = new THREE.SphereGeometry(0.12, 12, 12);
			const domain = new THREE.Mesh(domainGeometry, bodyMaterial);
			domain.position.y = 0.2;
			proteinGroup.add(domain);

			// Position on spherical surface
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * Math.PI * 0.5;

			const x = xOffset + Math.cos(phi) * 0.1;
			const y = Math.sin(phi) * Math.cos(theta) * radius;
			const z = Math.sin(phi) * Math.sin(theta) * radius;

			proteinGroup.position.set(x, y, z);
			proteinGroup.lookAt(xOffset, y, z);
			proteinGroup.rotation.x += Math.PI / 2;

			parent.add(proteinGroup);
		}
	}

	createCytoplasmicStructures(parent, xOffset) {
		// Mitochondria
		for (let i = 0; i < 3; i++) {
			const mitoGeometry = new THREE.CapsuleGeometry(0.4, 1.5, 8, 16);
			const mitoMaterial = new THREE.MeshStandardMaterial({
				color: 0xff6644,
				transparent: true,
				opacity: 0.3,
				roughness: 0.6,
				metalness: 0.2,
				emissive: 0xaa3322,
				emissiveIntensity: 0.2,
			});

			const mito = new THREE.Mesh(mitoGeometry, mitoMaterial);
			mito.position.set(
				xOffset - 2 - Math.random() * 2,
				(Math.random() - 0.5) * 4,
				(Math.random() - 0.5) * 4,
			);
			mito.rotation.set(
				Math.random() * Math.PI,
				Math.random() * Math.PI,
				Math.random() * Math.PI,
			);

			parent.add(mito);
		}

		// Endoplasmic reticulum tubules
		for (let i = 0; i < 5; i++) {
			const points = [];
			for (let j = 0; j < 10; j++) {
				points.push(
					new THREE.Vector3(
						xOffset - 1 - Math.random() * 4,
						(Math.random() - 0.5) * 5 + Math.sin(j) * 0.5,
						(Math.random() - 0.5) * 5 + Math.cos(j) * 0.5,
					),
				);
			}

			const curve = new THREE.CatmullRomCurve3(points);
			const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
			const tubeMaterial = new THREE.MeshStandardMaterial({
				color: 0x88aaff,
				transparent: true,
				opacity: 0.2,
				roughness: 0.7,
				metalness: 0.1,
			});

			const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
			parent.add(tube);
		}
	}

	createCleftEnvironment() {
		// Create the synaptic cleft as a volumetric space
		const cleftGroup = new THREE.Group();

		// Volumetric fog/glow effect
		const cleftGeometry = new THREE.SphereGeometry(
			this.cleftRadius * 0.95,
			32,
			32,
		);
		const cleftMaterial = new THREE.MeshStandardMaterial({
			color: 0x88aaff,
			transparent: true,
			opacity: 0.05,
			roughness: 1.0,
			metalness: 0,
			emissive: 0x4466ff,
			emissiveIntensity: 0,
			side: THREE.BackSide,
		});

		this.cleftSpace = new THREE.Mesh(cleftGeometry, cleftMaterial);
		cleftGroup.add(this.cleftSpace);

		// Particle field in cleft (ions, small molecules)
		this.createCleftParticles(cleftGroup);

		this.cleftEnvironment = cleftGroup;
		this.scene.add(cleftGroup);
	}

	createCleftParticles(parent) {
		// Create floating particles representing ions and small molecules
		const particleCount = 200;
		const positions = new Float32Array(particleCount * 3);
		const colors = new Float32Array(particleCount * 3);

		for (let i = 0; i < particleCount; i++) {
			// Random position in spherical volume
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * Math.PI;
			const r = Math.random() * this.cleftRadius * 0.9;

			positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
			positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
			positions[i * 3 + 2] = r * Math.cos(phi);

			// Random colors (ions)
			const colorChoice = Math.random();
			if (colorChoice < 0.3) {
				// Calcium ions (green)
				colors[i * 3] = 0.4;
				colors[i * 3 + 1] = 1.0;
				colors[i * 3 + 2] = 0.4;
			} else if (colorChoice < 0.6) {
				// Sodium ions (blue)
				colors[i * 3] = 0.4;
				colors[i * 3 + 1] = 0.6;
				colors[i * 3 + 2] = 1.0;
			} else {
				// Other molecules (white)
				colors[i * 3] = 0.8;
				colors[i * 3 + 1] = 0.9;
				colors[i * 3 + 2] = 1.0;
			}
		}

		const particleGeometry = new THREE.BufferGeometry();
		particleGeometry.setAttribute(
			"position",
			new THREE.BufferAttribute(positions, 3),
		);
		particleGeometry.setAttribute(
			"color",
			new THREE.BufferAttribute(colors, 3),
		);

		const particleMaterial = new THREE.PointsMaterial({
			size: 0.05,
			vertexColors: true,
			transparent: true,
			opacity: 0.6,
			sizeAttenuation: true,
		});

		this.cleftParticles = new THREE.Points(particleGeometry, particleMaterial);
		parent.add(this.cleftParticles);
	}

	createVesiclePool() {
		// Create a pool of synaptic vesicles near the presynaptic membrane
		this.vesiclePool = [];
		const vesicleCount = 15;

		for (let i = 0; i < vesicleCount; i++) {
			const vesicleGroup = new THREE.Group();

			// Vesicle membrane
			const vesicleGeometry = new THREE.SphereGeometry(0.35, 32, 32);
			const vesicleMaterial = new THREE.MeshStandardMaterial({
				color: 0x99ccff,
				transparent: true,
				opacity: 0.6,
				roughness: 0.4,
				metalness: 0.3,
				emissive: 0x4466aa,
				emissiveIntensity: 0.2,
			});

			const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial);
			vesicleGroup.add(vesicle);

			// Neurotransmitters inside vesicle
			for (let j = 0; j < 8; j++) {
				const ntGeometry = new THREE.SphereGeometry(0.08, 12, 12);
				const ntMaterial = new THREE.MeshStandardMaterial({
					color: 0x6699ff,
					roughness: 0.3,
					metalness: 0.5,
					emissive: 0x4466ff,
					emissiveIntensity: 0.4,
				});

				const nt = new THREE.Mesh(ntGeometry, ntMaterial);
				const theta = (j / 8) * Math.PI * 2;
				const phi = Math.random() * Math.PI;
				const r = 0.15;

				nt.position.set(
					Math.sin(phi) * Math.cos(theta) * r,
					Math.sin(phi) * Math.sin(theta) * r,
					Math.cos(phi) * r,
				);

				vesicleGroup.add(nt);
			}

			// Position vesicles in a cluster near membrane
			const theta = (i / vesicleCount) * Math.PI * 2;
			const phi = Math.random() * Math.PI * 0.3;
			const r = this.cleftRadius - 1.5;

			vesicleGroup.position.set(
				-this.cleftGap / 2 - 0.5 + Math.cos(phi) * 0.3,
				Math.sin(phi) * Math.cos(theta) * r,
				Math.sin(phi) * Math.sin(theta) * r,
			);

			this.vesiclePool.push(vesicleGroup);
			this.scene.add(vesicleGroup);
		}
	}

	createPostsynapticDensity(parent, xOffset) {
		// Create a thick, bumpy postsynaptic density layer
		const psdGroup = new THREE.Group();

		// Main PSD layer - curved to match spine surface
		const psdGeometry = new THREE.SphereGeometry(
			this.cleftRadius * 0.9 - 0.15,
			32,
			32,
			0,
			Math.PI * 2,
			Math.PI * 0.4,
			Math.PI * 0.3,
		);

		const psdMaterial = new THREE.MeshStandardMaterial({
			color: 0x996644,
			transparent: true,
			opacity: 0.7,
			roughness: 0.8,
			metalness: 0.2,
			emissive: 0x553322,
			emissiveIntensity: 0.3,
		});

		const psd = new THREE.Mesh(psdGeometry, psdMaterial);
		psd.position.x = xOffset;
		psdGroup.add(psd);

		// Scaffolding proteins extending into cytoplasm
		for (let i = 0; i < 30; i++) {
			const scaffoldGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
			const scaffoldMaterial = new THREE.MeshStandardMaterial({
				color: 0xbb7755,
				roughness: 0.6,
				metalness: 0.4,
				emissive: 0x664433,
				emissiveIntensity: 0.2,
			});

			const scaffold = new THREE.Mesh(scaffoldGeometry, scaffoldMaterial);

			// Position on PSD surface
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.PI * 0.5 + Math.random() * Math.PI * 0.2;
			const r = this.cleftRadius * 0.9 - 0.15;

			scaffold.position.set(
				xOffset + Math.cos(phi) * 0.2,
				Math.sin(phi) * Math.cos(theta) * r,
				Math.sin(phi) * Math.sin(theta) * r,
			);

			scaffold.lookAt(xOffset + 1, scaffold.position.y, scaffold.position.z);
			scaffold.rotation.x += Math.PI / 2;

			psdGroup.add(scaffold);
		}

		parent.add(psdGroup);
	}

	createReceptorClusters() {
		// Create clusters of receptors on postsynaptic membrane
		this.receptorClusters = [];
		const clusterCount = 8;

		for (let i = 0; i < clusterCount; i++) {
			const clusterGroup = new THREE.Group();
			const receptorsPerCluster = 5;

			// Base position for cluster
			const theta = (i / clusterCount) * Math.PI * 2;
			const phi = Math.PI * 0.55;
			const r = this.cleftRadius * 0.9 - 0.1;

			const baseX = this.cleftGap / 2;
			const baseY = Math.sin(phi) * Math.cos(theta) * r;
			const baseZ = Math.sin(phi) * Math.sin(theta) * r;

			for (let j = 0; j < receptorsPerCluster; j++) {
				const receptorGroup = new THREE.Group();

				// Receptor body (transmembrane)
				const bodyGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8);
				const bodyMaterial = new THREE.MeshStandardMaterial({
					color: 0x666666,
					roughness: 0.4,
					metalness: 0.6,
					emissive: 0x222222,
					emissiveIntensity: 0.3,
				});

				const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
				receptorGroup.add(body);

				// Binding site (extracellular)
				const bindingGeometry = new THREE.SphereGeometry(0.12, 12, 12);
				const bindingMaterial = new THREE.MeshStandardMaterial({
					color: 0x888888,
					roughness: 0.3,
					metalness: 0.5,
					emissive: 0x333333,
					emissiveIntensity: 0.4,
				});

				const binding = new THREE.Mesh(bindingGeometry, bindingMaterial);
				binding.position.y = -0.2;
				receptorGroup.add(binding);

				// Position in cluster
				const offset = (Math.random() - 0.5) * 0.3;
				receptorGroup.position.set(
					baseX + offset * 0.5,
					baseY + offset,
					baseZ + offset,
				);

				receptorGroup.lookAt(baseX - 1, baseY, baseZ);
				receptorGroup.rotation.x += Math.PI / 2;

				receptorGroup.userData.baseMaterial = bodyMaterial;
				receptorGroup.userData.bindingSiteMaterial = bindingMaterial;
				receptorGroup.userData.occupied = false;

				clusterGroup.add(receptorGroup);
			}

			this.receptorClusters.push(clusterGroup);
			this.scene.add(clusterGroup);
		}
	}

	createExtracellularMatrix() {
		// Create fibrous extracellular matrix spanning the cleft
		const ecmGroup = new THREE.Group();

		// Collagen fibers - connecting pre and post synaptic membranes
		const fiberCount = 20;
		for (let i = 0; i < fiberCount; i++) {
			const points = [];
			const segments = 15;

			// Start point on presynaptic side
			const startTheta = Math.random() * Math.PI * 2;
			const startPhi = Math.random() * Math.PI * 0.5;
			const startR = this.cleftRadius - 0.5;

			// End point on postsynaptic side
			const endTheta = startTheta + (Math.random() - 0.5) * 0.5;
			const endPhi = Math.PI - startPhi + (Math.random() - 0.5) * 0.3;
			const endR = this.cleftRadius * 0.9 - 0.5;

			for (let j = 0; j < segments; j++) {
				const t = j / (segments - 1);

				// Interpolate between start and end with some waviness
				const theta = startTheta + (endTheta - startTheta) * t;
				const phi = startPhi + (endPhi - startPhi) * t;
				const r = startR + (endR - startR) * t;

				// Add waviness
				const wave = Math.sin(t * Math.PI * 3) * 0.2;

				points.push(
					new THREE.Vector3(
						-this.cleftGap / 2 + t * this.cleftGap + wave * 0.1,
						Math.sin(phi) * Math.cos(theta) * r + wave,
						Math.sin(phi) * Math.sin(theta) * r + wave,
					),
				);
			}

			const curve = new THREE.CatmullRomCurve3(points);
			const tubeGeometry = new THREE.TubeGeometry(curve, 30, 0.02, 8, false);
			const tubeMaterial = new THREE.MeshStandardMaterial({
				color: 0x88aacc,
				transparent: true,
				opacity: 0.4,
				roughness: 0.7,
				metalness: 0.2,
				emissive: 0x5577aa,
				emissiveIntensity: 0.1,
			});

			const fiber = new THREE.Mesh(tubeGeometry, tubeMaterial);
			ecmGroup.add(fiber);
		}

		// Proteoglycans - branching structures
		const pgCount = 30;
		for (let i = 0; i < pgCount; i++) {
			const pgGroup = new THREE.Group();

			// Core
			const coreGeometry = new THREE.SphereGeometry(0.08, 12, 12);
			const coreMaterial = new THREE.MeshStandardMaterial({
				color: 0x99bbdd,
				transparent: true,
				opacity: 0.6,
				roughness: 0.6,
				metalness: 0.3,
				emissive: 0x5577aa,
				emissiveIntensity: 0.3,
			});

			const core = new THREE.Mesh(coreGeometry, coreMaterial);
			pgGroup.add(core);

			// Branches
			for (let j = 0; j < 6; j++) {
				const branchGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
				const branch = new THREE.Mesh(branchGeometry, coreMaterial);

				const angle = (j / 6) * Math.PI * 2;
				branch.position.set(Math.cos(angle) * 0.15, Math.sin(angle) * 0.15, 0);
				branch.lookAt(0, 0, 0);

				pgGroup.add(branch);
			}

			// Position in cleft
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.random() * Math.PI;
			const r = Math.random() * this.cleftRadius * 0.8;

			pgGroup.position.set(
				(Math.random() - 0.5) * this.cleftGap,
				Math.sin(phi) * Math.cos(theta) * r,
				Math.sin(phi) * Math.sin(theta) * r,
			);

			ecmGroup.add(pgGroup);
		}

		this.extracellularMatrix = ecmGroup;
		this.scene.add(ecmGroup);
	}

	updateCleftGlow(intensity) {
		// Update cleft glow based on activity
		if (this.cleftSpace) {
			this.cleftSpace.material.emissiveIntensity = intensity * 0.5;
			this.cleftSpace.material.opacity = 0.05 + intensity * 0.15;
		}

		// Animate cleft particles
		if (this.cleftParticles) {
			const positions = this.cleftParticles.geometry.attributes.position.array;
			for (let i = 0; i < positions.length; i += 3) {
				// Gentle brownian motion
				positions[i] += (Math.random() - 0.5) * 0.02;
				positions[i + 1] += (Math.random() - 0.5) * 0.02;
				positions[i + 2] += (Math.random() - 0.5) * 0.02;

				// Keep within bounds
				const dist = Math.sqrt(
					positions[i] ** 2 + positions[i + 1] ** 2 + positions[i + 2] ** 2,
				);
				if (dist > this.cleftRadius * 0.9) {
					positions[i] *= 0.95;
					positions[i + 1] *= 0.95;
					positions[i + 2] *= 0.95;
				}
			}
			this.cleftParticles.geometry.attributes.position.needsUpdate = true;
		}
	}

	getReceptors() {
		// Return all receptors from clusters
		const receptors = [];
		if (this.receptorClusters) {
			this.receptorClusters.forEach((cluster) => {
				cluster.children.forEach((receptor) => {
					receptors.push(receptor);
				});
			});
		}
		return receptors;
	}

	hide() {
		if (this.presynapticBouton) this.presynapticBouton.visible = false;
		if (this.postsynapticSpine) this.postsynapticSpine.visible = false;
		if (this.cleftEnvironment) this.cleftEnvironment.visible = false;
		if (this.extracellularMatrix) this.extracellularMatrix.visible = false;
		if (this.vesiclePool) this.vesiclePool.forEach((v) => { v.visible = false; });
		if (this.receptorClusters)
			this.receptorClusters.forEach((c) => { c.visible = false; });
	}

	show() {
		if (this.presynapticBouton) this.presynapticBouton.visible = true;
		if (this.postsynapticSpine) this.postsynapticSpine.visible = true;
		if (this.cleftEnvironment) this.cleftEnvironment.visible = true;
		if (this.extracellularMatrix) this.extracellularMatrix.visible = true;
		if (this.vesiclePool) this.vesiclePool.forEach((v) => { v.visible = true; });
		if (this.receptorClusters)
			this.receptorClusters.forEach((c) => { c.visible = true; });
	}
}
