import * as THREE from 'three';
import { NEUROTRANSMITTER_TYPES } from '../constants/neurotransmitterTypes.js';

export class SynapseRenderer {
    constructor(sceneManager, eventBus) {
        this.sceneManager = sceneManager;
        this.eventBus = eventBus;
        this.scene = sceneManager.scene;

        this.ntMeshById = new Map();
        this.receptorMeshes = [];
        this.transporterMeshes = [];
        this.enzymeMeshes = [];

        this._buildStaticScene();

        if (this.eventBus) {
            this.eventBus.on('sim:structure', (payload) => this._onStructure(payload));
            this.eventBus.on('nt:released', ({ nt }) => this._onNtReleased(nt));
            this.eventBus.on('nt:bound', ({ nt, receptorIndex }) => this._onNtBound(receptorIndex, nt));
            this.eventBus.on('nt:reuptaken', ({ nt }) => this._animateAndRemoveNt(nt, 'reuptake'));
            this.eventBus.on('nt:degraded', ({ nt }) => this._animateAndRemoveNt(nt, 'degradation'));
            this.eventBus.on('sim:reset', () => this._onReset());
        }
    }

    _buildStaticScene() {
        // Background/neurons/camera are handled by SceneManager; build synapse visuals here.
        const neuronMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });

        // Axon terminal
        const terminalGeometry = new THREE.SphereGeometry(2.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.7);
        this.axonTerminal = new THREE.Mesh(terminalGeometry, neuronMaterial);
        this.axonTerminal.position.x = -5;
        this.scene.add(this.axonTerminal);

        // Dendrite terminal
        const dendriteGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        this.dendrite = new THREE.Mesh(dendriteGeometry, neuronMaterial);
        this.dendrite.position.x = 5;
        this.scene.add(this.dendrite);

        // Synaptic cleft
        const cleftGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.8, 32, 5, true);
        const cleftMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            wireframe: true
        });
        this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
        this.synapticCleft.rotation.z = Math.PI / 2;
        this.scene.add(this.synapticCleft);
    }

    _onStructure(payload) {
        const { receptors, transporters, enzymes } = payload;

        // Build receptors
        this.receptorMeshes.forEach(m => this.scene.remove(m));
        this.receptorMeshes = receptors.map((r) => {
            const receptorGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const receptorMaterial = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 100 });
            const receptor = new THREE.Mesh(receptorGeometry, receptorMaterial);
            receptor.position.set(r.position.x, r.position.y, r.position.z);
            this.scene.add(receptor);
            return receptor;
        });

        // Build transporters
        this.transporterMeshes.forEach(m => this.scene.remove(m));
        this.transporterMeshes = transporters.map((t) => {
            const transporterGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
            const transporterMaterial = new THREE.MeshPhongMaterial({ color: 0xff9933, transparent: true, opacity: 0.8 });
            const transporter = new THREE.Mesh(transporterGeometry, transporterMaterial);
            transporter.position.set(t.position.x, t.position.y, t.position.z);
            transporter.rotation.z = t.isPresynaptic ? Math.PI / 2 : -Math.PI / 2;
            this.scene.add(transporter);
            return transporter;
        });

        // Build enzymes
        this.enzymeMeshes.forEach(m => this.scene.remove(m));
        const enzymeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const enzymeMaterial = new THREE.MeshPhongMaterial({ color: 0xff6666, transparent: true, opacity: 0.7, emissive: 0xff4444, emissiveIntensity: 0.3 });
        this.enzymeMeshes = enzymes.map((e) => {
            const enzyme = new THREE.Mesh(enzymeGeometry, enzymeMaterial);
            enzyme.position.set(e.position.x, e.position.y, e.position.z);
            enzyme.userData.originalPos = enzyme.position.clone();
            enzyme.userData.phase = Math.random() * Math.PI * 2;
            this.scene.add(enzyme);
            return enzyme;
        });
    }

    _onNtReleased(nt) {
        const props = NEUROTRANSMITTER_TYPES[nt.type];
        const geometry = new THREE.SphereGeometry(props.size, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: props.color, shininess: 100, emissive: props.color, emissiveIntensity: 0.2 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(nt.position.x, nt.position.y, nt.position.z);
        this.scene.add(mesh);
        this.ntMeshById.set(nt.id, mesh);
    }

    _onNtBound(receptorIndex, nt) {
        const receptor = this.receptorMeshes[receptorIndex];
        if (!receptor) return;
        const polarity = NEUROTRANSMITTER_TYPES[nt.type]?.polarity;
        receptor.material.color.setHex(polarity === 'EXCITATORY' ? 0xff4444 : 0x44ff44);
    }

    _animateAndRemoveNt(nt, mode) {
        const mesh = this.ntMeshById.get(nt.id);
        if (!mesh) return;
        const startPos = mesh.position.clone();
        const startColor = new THREE.Color(NEUROTRANSMITTER_TYPES[nt.type].color);

        const animate = (progress) => {
            if (progress <= 1) {
                const scale = 1 - (progress * 0.8);
                mesh.scale.setScalar(scale);
                const color = new THREE.Color();
                color.lerpColors(startColor, new THREE.Color(0x222222), progress);
                mesh.material.color = color;
                mesh.material.opacity = 1 - progress;
                requestAnimationFrame(() => animate(progress + 0.03));
            } else {
                this.scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
                this.ntMeshById.delete(nt.id);
            }
        };
        animate(0);
    }

    _onReset() {
        // Remove all NT meshes
        this.ntMeshById.forEach((mesh) => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        this.ntMeshById.clear();
        // Reset receptors color
        this.receptorMeshes.forEach((r) => r.material.color.setHex(0x444444));
    }

    updateFromSimulation(simulation) {
        // Update NT positions to match simulation domain state
        if (!simulation || !simulation.neurotransmitters) return;
        for (const nt of simulation.neurotransmitters) {
            const mesh = this.ntMeshById.get(nt.id);
            if (!mesh) continue;
            mesh.position.set(nt.position.x, nt.position.y, nt.position.z);
        }

        // Animate enzyme wobble
        this.enzymeMeshes.forEach(enzyme => {
            enzyme.userData.phase += 0.02;
            const wobble = Math.sin(enzyme.userData.phase) * 0.2;
            enzyme.position.copy(enzyme.userData.originalPos).add(new THREE.Vector3(wobble, wobble, wobble));
        });
    }
}


