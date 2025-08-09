import * as THREE from 'three';
import { NEUROTRANSMITTER_TYPES } from '../constants/neurotransmitterTypes.js';
import { StorageVesicle } from '../models/storageVesicle.js';
import { Neurotransmitter } from '../models/neurotransmitter.js';
import { computeMoodSummary } from './mood.js';

/**
 * Orchestrates neurotransmitter simulation and emits UI/rendering events.
 * Still contains rendering objects pending full renderer split (Phase 2 follow-up).
 */
export class NeuronSimulation {
    /**
     * @param {import('../render/sceneManager.js').SceneManager} sceneManager
     * @param {{on?:Function, off?:Function, emit?:Function}|null} eventBus
     */
    constructor(sceneManager, eventBus = null) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.camera = sceneManager.camera;
        this.renderer = sceneManager.renderer;
        this.eventBus = eventBus;
        this._lastEffectsEmitMs = 0;
        this.degradationParticlePool = [];
        this.degradationParticleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        this.degradationParticleMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.5
        });

        // Initialize properties
        this.neurotransmitters = [];
        this.receptors = [];
        this.vesicles = [];
        
        // Emotional face is managed by UI/presentation layer

        // Create neurons and receptors
        this.createNeurons();
        this.createReceptors();

        // Create detailed synapse structure
        this.createSynapticStructure();
        this.createVesicles();
        this.createMembraneLipids();

        console.log('Scene setup complete');

        this.reuptakeInhibited = false; // Track reuptake inhibition state
        
        this.maoEnzymes = [];
        this.createMAOEnzymes();
    }

    createNeurons() {
        // Create cell body (soma) for presynaptic neuron
        const somaGeometry = new THREE.SphereGeometry(3, 32, 32);
        const somaMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.9
        });
        this.preSoma = new THREE.Mesh(somaGeometry, somaMaterial);
        this.preSoma.position.set(-15, 0, 0);
        this.scene.add(this.preSoma);

        // Create nucleus
        const nucleusGeometry = new THREE.SphereGeometry(1, 24, 24);
        const nucleusMaterial = new THREE.MeshPhongMaterial({
            color: 0x4444aa,
            transparent: true,
            opacity: 0.8
        });
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
        this.preSoma.add(nucleus);

        // Create axon using a curved path
        this.createAxon(-15, 0, 0, -5, 0, 0);

        // Create dendrites for presynaptic neuron
        this.createDendrites(this.preSoma, 6);

        // Create postsynaptic neuron
        this.postSoma = new THREE.Mesh(somaGeometry.clone(), somaMaterial.clone());
        this.postSoma.position.set(15, 0, 0);
        this.scene.add(this.postSoma);

        // Add nucleus to postsynaptic neuron
        const postNucleus = nucleus.clone();
        this.postSoma.add(postNucleus);

        // Create dendrites for postsynaptic neuron
        this.createDendrites(this.postSoma, 6);
    }

    createAxon(startX, startY, startZ, endX, endY, endZ) {
        // Create control points for curved axon
        const curve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(startX, startY, startZ),
            new THREE.Vector3(startX + 5, startY + 2, startZ),
            new THREE.Vector3(endX - 5, endY - 2, endZ),
            new THREE.Vector3(endX, endY, endZ)
        );

        // Create axon tube
        const points = curve.getPoints(50);
        const axonGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            50,  // tubular segments
            0.3, // radius
            8,   // radial segments
            false // closed
        );

        const axonMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.8
        });

        this.axon = new THREE.Mesh(axonGeometry, axonMaterial);
        this.scene.add(this.axon);

        // Add myelin sheaths
        this.createMyelinSheaths(points);
    }

    createMyelinSheaths(axonPoints) {
        const myelinMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });

        // Create myelin segments along the axon
        for (let i = 5; i < axonPoints.length - 5; i += 10) {
            const myelinGeometry = new THREE.CylinderGeometry(
                0.5,  // top radius
                0.5,  // bottom radius
                2,    // height
                16    // segments
            );

            const myelin = new THREE.Mesh(myelinGeometry, myelinMaterial);
            
            // Position myelin segment
            const point = axonPoints[i];
            myelin.position.set(point.x, point.y, point.z);
            
            // Orient myelin segment along axon
            if (i < axonPoints.length - 1) {
                myelin.lookAt(axonPoints[i + 1]);
                myelin.rotateX(Math.PI / 2);
            }
            
            this.scene.add(myelin);
        }
    }

    createDendrites(soma, count) {
        const dendriteMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const length = 2 + Math.random() * 2;

            // Create branching dendrites
            this.createDendriteBranch(
                soma.position.clone(),
                angle,
                length,
                0.2,
                3,
                dendriteMaterial
            );
        }
    }

    createDendriteBranch(startPos, angle, length, radius, branchDepth, material) {
        if (branchDepth <= 0) return;

        const endPos = new THREE.Vector3(
            startPos.x + Math.cos(angle) * length,
            startPos.y + Math.sin(angle) * length,
            startPos.z + (Math.random() - 0.5) * length
        );

        // Create dendrite segment
        const points = [startPos, endPos];
        const dendriteGeometry = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            8,     // tubular segments
            radius, // radius
            8,     // radial segments
            false  // closed
        );

        const dendrite = new THREE.Mesh(dendriteGeometry, material);
        this.scene.add(dendrite);

        // Create branches
        if (branchDepth > 1) {
            const branchCount = 2;
            for (let i = 0; i < branchCount; i++) {
                const newAngle = angle + (Math.random() - 0.5) * Math.PI / 2;
                this.createDendriteBranch(
                    endPos,
                    newAngle,
                    length * 0.7,
                    radius * 0.7,
                    branchDepth - 1,
                    material
                );
            }
        }
    }

    createReceptors() {
        const receptorCount = 8;
        const spacing = 1;
        const startX = 4;
        const startY = -2;

        for (let i = 0; i < receptorCount; i++) {
            const receptorGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
            const receptorMaterial = new THREE.MeshPhongMaterial({
                color: 0x444444,
                shininess: 100
            });
            const receptor = new THREE.Mesh(receptorGeometry, receptorMaterial);
            
            receptor.position.set(
                startX,
                startY + (i * spacing),
                0
            );
            receptor.occupied = false;
            
            this.receptors.push(receptor);
            this.scene.add(receptor);
        }
    }

    releaseNeurotransmitters(type) {
        if (!type || !NEUROTRANSMITTER_TYPES[type]) {
            type = 'DOPAMINE';
        }

        if (this.vesicles.length > 0) {
            const vesicle = new StorageVesicle(this.vesicles[0].mesh.position.clone());
            const releasePosition = new THREE.Vector3(-3.5, 0, 0);
            
            // Move vesicle to release position
            vesicle.moveToReleasePosition(releasePosition, () => {
                // Release neurotransmitters
                this.createNeurotransmitterBurst(vesicle.mesh.position, type);
                
                // Animate vesicle disappearing
                const fadeOut = (opacity) => {
                    if (opacity <= 0) {
                        this.scene.remove(vesicle.mesh);
                        this.vesicles.shift();
                    } else {
                        vesicle.mesh.material.opacity = opacity;
                        vesicle.storedNeurotransmitters.forEach(nt => {
                            nt.material.opacity = opacity;
                        });
                        requestAnimationFrame(() => fadeOut(opacity - 0.05));
                    }
                };
                
                fadeOut(0.8);
            });
        }
    }

    createNeurotransmitterBurst(position, type) {
        const count = 6; // Match the number of stored neurotransmitters
        const spread = 0.2; // Reduced spread for more focused release
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const pos = position.clone();
                const angle = (i / count) * Math.PI * 2;
                
                // Release in a circular pattern
                pos.add(new THREE.Vector3(
                    0,
                    Math.sin(angle) * spread,
                    Math.cos(angle) * spread
                ));
                
                const nt = new Neurotransmitter(pos, type);
                this.neurotransmitters.push(nt);
                this.scene.add(nt.mesh);
                if (this.eventBus) this.eventBus.emit('nt:released', { type, nt });
            }, i * 50);
        }
    }

    reset() {
        // Remove all neurotransmitters
        this.neurotransmitters.forEach(nt => {
            this.scene.remove(nt.mesh);
        });
        this.neurotransmitters = [];

        // Reset receptors
        this.receptors.forEach(receptor => {
            receptor.occupied = false;
            receptor.material.color.setHex(0x444444);
        });
    }

    checkBinding() {
        this.neurotransmitters.forEach(nt => {
            if (!nt.bound) {
                this.receptors.forEach(receptor => {
                    if (!receptor.occupied) {
                        const distance = nt.mesh.position.distanceTo(receptor.position);
                        if (distance < 0.5) {
                            nt.bound = true;
                            nt.mesh.position.copy(receptor.position);
                            receptor.occupied = true;
                            const polarity = NEUROTRANSMITTER_TYPES[nt.type]?.polarity;
                            const color = polarity === 'EXCITATORY' ? 0xff4444 : 0x44ff44;
                            receptor.material.color.setHex(color);
                            if (this.eventBus) this.eventBus.emit('nt:bound', { nt, receptor });
                        }
                    }
                });
            }
        });
    }

    createSynapticStructure() {
        // Create axon terminal (bulb-like structure as shown in diagram)
        const terminalGeometry = new THREE.SphereGeometry(2.5, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const neuronMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88, // More yellow/orange like in diagram
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.axonTerminal = new THREE.Mesh(terminalGeometry, neuronMaterial);
        this.axonTerminal.position.x = -5;
        
        // Add flow particles in terminal
        this.createAxonalFlow();
        
        this.scene.add(this.axonTerminal);

        // Create dendrite terminal (receiving end)
        const dendriteGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        this.dendrite = new THREE.Mesh(dendriteGeometry, neuronMaterial);
        this.dendrite.position.x = 5;
        this.scene.add(this.dendrite);

        // Create more detailed synaptic cleft
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

        // Add extracellular matrix elements in the cleft
        this.createExtracellularMatrix();

        // Create adhesion molecules connecting pre and post synaptic membranes
        this.createAdhesionMolecules();

        // Add reuptake transporters
        this.createReuptakeTransporters();
    }

    createReuptakeTransporters() {
        const transporterCount = 6;
        this.transporters = [];
        
        for (let i = 0; i < transporterCount; i++) {
            const transporterGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
            const transporterMaterial = new THREE.MeshPhongMaterial({
                color: 0xff9933, // Orange color for transporters
                transparent: true,
                opacity: 0.8
            });
            
            const transporter = new THREE.Mesh(transporterGeometry, transporterMaterial);
            
            // Position transporters along both pre and post synaptic membranes
            const angle = (i / transporterCount) * Math.PI;
            const isPresynaptic = i % 2 === 0;
            
            transporter.position.set(
                isPresynaptic ? -3.5 : 3.5,
                Math.sin(angle) * 2,
                Math.cos(angle) * 2
            );
            
            transporter.rotation.z = isPresynaptic ? Math.PI / 2 : -Math.PI / 2;
            
            this.transporters.push(transporter);
            this.scene.add(transporter);
        }
    }

    createVesicles() {
        this.vesicles = [];
        const vesicleCount = 12;
        
        // Create vesicle clusters in different layers
        const layers = 3;
        const vesiclesPerLayer = 4;
        
        for (let layer = 0; layer < layers; layer++) {
            for (let i = 0; i < vesiclesPerLayer; i++) {
                const angle = (i / vesiclesPerLayer) * Math.PI * 2;
                const radius = 0.8;
                
                const position = new THREE.Vector3(
                    -4 - layer * 0.5, // Move back in layers
                    Math.sin(angle) * radius,
                    Math.cos(angle) * radius
                );

                const vesicle = new StorageVesicle(position);
                this.vesicles.push(vesicle);
                this.scene.add(vesicle.mesh);
            }
        }
    }

    createMembraneLipids() {
        // Create lipid bilayer visualization
        const createLipidLayer = (x, isUpper) => {
            const lipidCount = 20;
            const spacing = 0.3;
            
            for (let i = 0; i < lipidCount; i++) {
                const headGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const tailGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
                
                const headMaterial = new THREE.MeshPhongMaterial({ color: 0xff9999 });
                const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
                
                const head = new THREE.Mesh(headGeometry, headMaterial);
                const tail = new THREE.Mesh(tailGeometry, tailMaterial);
                
                const lipid = new THREE.Group();
                lipid.add(head);
                lipid.add(tail);
                
                tail.position.y = isUpper ? -0.1 : 0.1;
                
                lipid.position.set(
                    x + (Math.random() - 0.5) * 0.1,
                    i * spacing - (lipidCount * spacing) / 2,
                    (Math.random() - 0.5) * 0.1
                );
                
                if (!isUpper) {
                    lipid.rotation.x = Math.PI;
                }
                
                this.scene.add(lipid);
            }
        };

        // Create upper and lower membrane layers for both neurons
        createLipidLayer(-3, true);
        createLipidLayer(-3, false);
        createLipidLayer(3, true);
        createLipidLayer(3, false);
    }

    createExtracellularMatrix() {
        const count = 50;
        const geo = new THREE.SphereGeometry(0.05, 8, 8);
        const mat = new THREE.MeshPhongMaterial({ color: 0x88aaff, transparent: true, opacity: 0.3 });
        const instanced = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2;
            dummy.position.set(
                Math.random() * 0.8 - 0.4,
                Math.sin(angle) * radius,
                Math.cos(angle) * radius
            );
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }
        instanced.instanceMatrix.needsUpdate = true;
        this.synapticCleft.add(instanced);
    }

    createAdhesionMolecules() {
        const adhesionGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
        const adhesionMaterial = new THREE.MeshPhongMaterial({
            color: 0xff88aa,
            transparent: true,
            opacity: 0.5
        });

        // Create adhesion molecules around the cleft periphery
        for (let i = 0; i < 8; i++) {
            const adhesion = new THREE.Mesh(adhesionGeometry, adhesionMaterial);
            const angle = (i / 8) * Math.PI * 2;
            const radius = 2.3;
            
            adhesion.position.set(
                0,
                Math.sin(angle) * radius,
                Math.cos(angle) * radius
            );
            
            this.synapticCleft.add(adhesion);
        }
    }

    toggleReuptakeInhibition() {
        this.reuptakeInhibited = !this.reuptakeInhibited;
        
        // Visual feedback for inhibition state
        this.transporters.forEach(transporter => {
            transporter.material.color.setHex(
                this.reuptakeInhibited ? 0xff0000 : 0xff9933
            );
            transporter.material.opacity = this.reuptakeInhibited ? 0.4 : 0.8;
        });
    }

    checkReuptake() {
        if (this.reuptakeInhibited) return;

        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.reuptaking) {
                // Use type-specific reuptake rate
                if (Math.random() < nt.properties.reuptakeRate) {
                    this.transporters.forEach(transporter => {
                        const distance = nt.mesh.position.distanceTo(transporter.position);
                        if (distance < 0.5) {
                            nt.reuptaking = true;
                            
                            // Animate reuptake with visual effects
                            const startPos = nt.mesh.position.clone();
                            const targetPos = transporter.position.clone();
                            const startScale = nt.mesh.scale.clone();
                            
                            const animate = (progress) => {
                                if (progress <= 1) {
                                    nt.mesh.position.lerpVectors(startPos, targetPos, progress);
                                    
                                    // Scale and color transition during reuptake
                                    const scale = 1 - (progress * 0.8);
                                    nt.mesh.scale.setScalar(scale);
                                    
                                    const color = new THREE.Color();
                                    color.lerpColors(
                                        new THREE.Color(0x4444ff),
                                        new THREE.Color(0x222222),
                                        progress
                                    );
                                    nt.mesh.material.color = color;
                                    
                                    requestAnimationFrame(() => animate(progress + 0.02));
                                } else {
                                    this.scene.remove(nt.mesh);
                                    this.neurotransmitters = this.neurotransmitters.filter(n => n !== nt);
                                    if (this.eventBus) this.eventBus.emit('nt:reuptaken', { nt, transporter });
                                }
                            };
                            
                            animate(0);
                        }
                    });
                }
            }
        });
    }

    updateEffects() {
        const activeNTs = new Set(this.neurotransmitters.map(nt => nt.type));
        this.latestEffects = Array.from(activeNTs).map(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            return { type, name: properties.name, description: properties.description };
        });

        // Compute mood summary for EmotionalFace and UI consumers
        this.moodSummary = computeMoodSummary(this.neurotransmitters);

        if (this.eventBus) {
            this.eventBus.emit('sim:effectsUpdated', this.latestEffects);
            this.eventBus.emit('sim:moodUpdated', this.moodSummary);
        }
    }

    createStorageVesicle(position, type) {
        const vesicle = new StorageVesicle(position);
        const ntProperties = NEUROTRANSMITTER_TYPES[type];
        
        // Update vesicle color based on neurotransmitter type
        vesicle.mesh.material.color.setHex(ntProperties.color);
        vesicle.mesh.material.opacity = 0.6;
        
        // Update stored neurotransmitter colors
        vesicle.storedNeurotransmitters.forEach(nt => {
            nt.material.color.setHex(ntProperties.color);
            nt.material.emissive.setHex(ntProperties.color);
            nt.material.emissiveIntensity = 0.2;
        });
        
        return vesicle;
    }

    createAxonalFlow() {
        const flowParticles = new THREE.Group();
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.userData.speed = 0.02 + Math.random() * 0.02;
            particle.userData.phase = Math.random() * Math.PI * 2;
            flowParticles.add(particle);
        }

        this.axonalFlow = flowParticles;
        this.axonTerminal.add(flowParticles);

        // Animate flow particles
        const animateFlow = () => {
            flowParticles.children.forEach(particle => {
                particle.userData.phase += particle.userData.speed;
                
                // Create flowing motion along axon terminal
                particle.position.set(
                    Math.cos(particle.userData.phase) * 1.5,
                    Math.sin(particle.userData.phase) * 1.5,
                    Math.sin(particle.userData.phase * 0.5) * 0.5
                );
            });
            
            requestAnimationFrame(animateFlow);
        };
        
        animateFlow();
    }

    createMAOEnzymes() {
        const enzymeCount = 15;
        const enzymeGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const enzymeMaterial = new THREE.MeshPhongMaterial({
            color: 0xff6666,
            transparent: true,
            opacity: 0.7,
            emissive: 0xff4444,
            emissiveIntensity: 0.3
        });

        for (let i = 0; i < enzymeCount; i++) {
            const enzyme = new THREE.Mesh(enzymeGeometry, enzymeMaterial);
            
            // Position enzymes around synaptic area
            const angle = (i / enzymeCount) * Math.PI * 2;
            const radius = 3 + Math.random();
            const height = Math.random() * 2 - 1;
            
            enzyme.position.set(
                0,
                Math.sin(angle) * radius,
                Math.cos(angle) * radius
            );
            
            enzyme.userData.originalPos = enzyme.position.clone();
            enzyme.userData.phase = Math.random() * Math.PI * 2;
            
            this.maoEnzymes.push(enzyme);
            this.scene.add(enzyme);
        }
    }

    checkDegradation() {
        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.reuptaking && nt.properties.maoSensitive) {
                this.maoEnzymes.forEach(enzyme => {
                    const distance = nt.mesh.position.distanceTo(enzyme.position);
                    
                    if (distance < 0.5 && Math.random() < nt.properties.degradationRate) {
                        // Animate degradation
                        const startPos = nt.mesh.position.clone();
                        const startColor = new THREE.Color(nt.properties.color);
                        
                        const animate = (progress) => {
                            if (progress <= 1) {
                                // Fade out and break apart effect
                                nt.mesh.scale.setScalar(1 - progress * 0.8);
                                
                                const color = new THREE.Color();
                                color.lerpColors(
                                    startColor,
                                    new THREE.Color(0x222222),
                                    progress
                                );
                                nt.mesh.material.color = color;
                                nt.mesh.material.opacity = 1 - progress;
                                
                                // Create breakdown particles
                                if (progress % 0.2 < 0.02) {
                                    this.createDegradationParticle(nt.mesh.position);
                                }
                                
                                requestAnimationFrame(() => animate(progress + 0.02));
                            } else {
                                this.scene.remove(nt.mesh);
                                this.neurotransmitters = this.neurotransmitters.filter(n => n !== nt);
                                if (this.eventBus) this.eventBus.emit('nt:degraded', { nt, enzyme });
                            }
                        };
                        
                        animate(0);
                    }
                });
            }
        });
    }

    createDegradationParticle(position) {
        let particle = this.degradationParticlePool.pop();
        if (particle) {
            particle.visible = true;
            particle.material.opacity = 0.5;
        } else {
            particle = new THREE.Mesh(this.degradationParticleGeometry, this.degradationParticleMaterial);
        }
        particle.position.copy(position);
        
        // Add random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        this.scene.add(particle);
        
        // Animate particle
        const animate = (progress) => {
            if (progress <= 1) {
                particle.position.add(velocity);
                particle.material.opacity = 0.5 * (1 - progress);
                requestAnimationFrame(() => animate(progress + 0.05));
            } else {
                particle.visible = false;
                this.degradationParticlePool.push(particle);
            }
        };
        
        animate(0);
    }

    update() {
        // Update neurotransmitters
        this.neurotransmitters.forEach(nt => nt.update());
        this.checkBinding();
        this.checkReuptake();
        this.checkDegradation();

        this.updateEffects();

        // Animate MAO enzymes
        this.maoEnzymes.forEach(enzyme => {
            enzyme.userData.phase += 0.02;
            const wobble = Math.sin(enzyme.userData.phase) * 0.2;
            enzyme.position.copy(enzyme.userData.originalPos)
                .add(new THREE.Vector3(wobble, wobble, wobble));
        });

        // Camera rotation and rendering are handled by SceneManager
        // We might still need camera updates related to simulation state if any
        // Camera motion moved to SceneManager (or disabled)
    }
}