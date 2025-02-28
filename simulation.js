import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EmotionalFace } from './emotionalFace.js';
import { Neurotransmitter, NEUROTRANSMITTER_TYPES } from './neurotransmitter.js';
import { StorageVesicle } from './storageVesicle.js';
import { NeuronModels } from './neuronModels.js';

class NeuronSimulation {
    constructor() {
        try {
            // Initialize properties
            this.neurotransmitters = [];
            this.receptors = [];
            this.vesicles = [];
            this.transporters = [];
            this.maoEnzymes = [];
            this.isZoomedIn = false;
            
            // Store camera positions
            this.normalCameraPosition = new THREE.Vector3(0, 20, 30);
            this.zoomedCameraPosition = new THREE.Vector3(0, 5, 10);
            this.normalCameraTarget = new THREE.Vector3(0, 0, 0);
            this.zoomedCameraTarget = new THREE.Vector3(0, 0, 0);
            
            // Setup scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a1a);

            // Setup camera
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            this.camera.position.copy(this.normalCameraPosition);
            this.camera.lookAt(this.normalCameraTarget);

            // Setup renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            const container = document.getElementById('canvas-container');
            container.appendChild(this.renderer.domElement);

            // Setup OrbitControls
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 10;
            this.controls.maxDistance = 50;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.target.copy(this.normalCameraTarget);

            // Handle window resize
            window.addEventListener('resize', () => {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            });

            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.scene.add(ambientLight);

            const mainLight = new THREE.DirectionalLight(0xffffff, 1);
            mainLight.position.set(10, 10, 10);
            this.scene.add(mainLight);

            // Create emotional face and add to scene
            try {
                this.emotionalFace = new EmotionalFace();
                const faceObject = this.emotionalFace.getObject();
                faceObject.position.set(20, 10, 0);
                this.scene.add(faceObject);
                console.log('Emotional face created and added to scene successfully');
            } catch (error) {
                console.error('Error creating emotional face:', error);
                this.emotionalFace = null;
            }

            // Initialize state
            this.reuptakeInhibited = false;
            this.activeEffects = {
                reward_enhancement: false,
                anxiety_reduction: false,
                learning_enhancement: false
            };
            
            this.receptorSensitivity = {
                DOPAMINE: 1.0,
                SEROTONIN: 1.0,
                GLUTAMATE: 1.0,
                GABA: 1.0,
                NOREPINEPHRINE: 1.0
            };

            // Create neurons and receptors
            this.createNeurons();
            this.createReceptors();
            this.setupControls();

            // Create detailed synapse structure
            this.createSynapticStructure();
            this.createStorageVesicles();

            // Create MAO enzymes
            this.createMAOEnzymes();

            // Add reuptake inhibition toggle button if it doesn't exist
            if (!document.getElementById('inhibitBtn')) {
                const inhibitBtn = document.createElement('button');
                inhibitBtn.id = 'inhibitBtn';
                inhibitBtn.textContent = 'Toggle Reuptake Inhibition';
                document.querySelector('.controls').appendChild(inhibitBtn);
                
                inhibitBtn.addEventListener('click', () => {
                    this.toggleReuptakeInhibition();
                });
            }

            // Add zoom toggle button
            this.setupZoomControl();

            // Start animation
            this.animate();
            console.log('Scene setup complete');
        } catch (error) {
            console.error('Error in constructor:', error);
            throw error; // Re-throw to see full stack trace
        }
    }

    createNeurons() {
        // Create cell body (soma) with more accurate shape
        const somaGeometry = NeuronModels.createIrregularSomaGeometry();
        const somaMaterial = new THREE.MeshPhongMaterial({
            color: 0xd35400,  // More accurate reddish color from diagram
            transparent: true,
            opacity: 0.9,
            shininess: 30,
            specular: 0x444444
        });
        
        this.preSoma = new THREE.Mesh(somaGeometry, somaMaterial);
        this.preSoma.position.set(-15, 0, 0);
        this.scene.add(this.preSoma);

        // Create cell membrane
        const membraneGeometry = new THREE.SphereGeometry(3.1, 32, 32);
        const membraneMaterial = new THREE.MeshPhongMaterial({
            color: 0xe67e22,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
        this.preSoma.add(membrane);

        // Add detailed organelles
        this.addDetailedOrganelles(this.preSoma);

        // Create axon with myelin sheath and nodes of Ranvier
        this.createDetailedAxon(-15, 0, 0, -5, 0, 0);

        // Create complex dendrites with proper branching
        this.createDetailedDendrites(this.preSoma, 8);

        // Create postsynaptic neuron
        const postSomaGeometry = NeuronModels.createIrregularSomaGeometry();
        this.postSoma = new THREE.Mesh(postSomaGeometry, somaMaterial.clone());
        this.postSoma.position.set(15, 0, 0);
        this.scene.add(this.postSoma);

        // Add organelles to postsynaptic neuron
        this.addDetailedOrganelles(this.postSoma);

        // Create dendrites for postsynaptic neuron
        this.createDetailedDendrites(this.postSoma, 8);
    }

    addDetailedOrganelles(soma) {
        // Create nucleus with nucleolus and membrane
        const nucleusGroup = NeuronModels.createNuclearMembrane();
        nucleusGroup.position.set(0, 0.3, 0);
        soma.add(nucleusGroup);

        // Create rough ER (Nissl bodies)
        const roughER = NeuronModels.createEndoplasmicReticulum();
        roughER.position.set(-0.8, 0.5, 0.2);
        soma.add(roughER);

        // Create smooth ER
        const smoothER = NeuronModels.createEndoplasmicReticulum();
        smoothER.position.set(0.8, -0.5, 0.2);
        soma.add(smoothER);

        // Create Golgi apparatus with stacked cisternae
        const golgi = NeuronModels.createGolgiApparatus();
        golgi.position.set(0.5, 0.8, 0);
        soma.add(golgi);

        // Add polyribosomes and free ribosomes
        this.addRibosomes(soma);

        // Add mitochondria with detailed cristae
        this.addDetailedMitochondria(soma);
    }

    createRoughER() {
        const roughERGroup = new THREE.Group();
        const stackCount = 5;
        const stackSpacing = 0.15;

        for (let i = 0; i < stackCount; i++) {
            const membrane = new THREE.Mesh(
                new THREE.TorusGeometry(0.4 + i * 0.1, 0.02, 16, 32),
                new THREE.MeshPhongMaterial({
                    color: 0x3498db,
                    transparent: true,
                    opacity: 0.7
                })
            );
            membrane.position.y = i * stackSpacing;
            membrane.rotation.x = Math.PI / 4;

            // Add ribosomes along the membrane
            const ribosomeCount = 20;
            for (let j = 0; j < ribosomeCount; j++) {
                const ribosome = new THREE.Mesh(
                    new THREE.SphereGeometry(0.03, 8, 8),
                    new THREE.MeshPhongMaterial({
                        color: 0x9b59b6,
                        transparent: true,
                        opacity: 0.9
                    })
                );
                const angle = (j / ribosomeCount) * Math.PI * 2;
                ribosome.position.set(
                    Math.cos(angle) * (0.4 + i * 0.1),
                    i * stackSpacing,
                    Math.sin(angle) * (0.4 + i * 0.1)
                );
                roughERGroup.add(ribosome);
            }
            roughERGroup.add(membrane);
        }

        return roughERGroup;
    }

    createSmoothER() {
        const smoothERGroup = new THREE.Group();
        const tubeCount = 8;
        
        for (let i = 0; i < tubeCount; i++) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.2, 0.1, 0.1),
                new THREE.Vector3(0.4, -0.1, -0.1),
                new THREE.Vector3(0.6, 0.1, 0.1)
            ]);

            const tube = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 20, 0.03, 8, false),
                new THREE.MeshPhongMaterial({
                    color: 0x3498db,
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            tube.rotation.y = (i / tubeCount) * Math.PI * 2;
            smoothERGroup.add(tube);
        }

        return smoothERGroup;
    }

    createDetailedGolgi() {
        const golgiGroup = new THREE.Group();
        const cisternaeCount = 6;
        
        for (let i = 0; i < cisternaeCount; i++) {
            const cisterna = new THREE.Mesh(
                new THREE.BoxGeometry(0.8 - (i * 0.1), 0.02, 0.3),
                new THREE.MeshPhongMaterial({
                    color: 0xf1c40f,
                    transparent: true,
                    opacity: 0.7
                })
            );
            
            cisterna.position.y = i * 0.1;
            cisterna.rotation.z = i * 0.1;
            
            // Add vesicles around cisternae
            const vesicleCount = 5;
            for (let j = 0; j < vesicleCount; j++) {
                const vesicle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.03, 8, 8),
                    new THREE.MeshPhongMaterial({
                        color: 0xf39c12,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                vesicle.position.set(
                    (Math.random() - 0.5) * 0.8,
                    i * 0.1 + (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.3
                );
                golgiGroup.add(vesicle);
            }
            
            golgiGroup.add(cisterna);
        }

        return golgiGroup;
    }

    addRibosomes(soma) {
        // Add polyribosomes in clusters
        const clusterCount = 10;
        for (let i = 0; i < clusterCount; i++) {
            const cluster = new THREE.Group();
            const ribosomeCount = 5 + Math.floor(Math.random() * 5);
            
            for (let j = 0; j < ribosomeCount; j++) {
                const ribosome = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 8, 8),
                    new THREE.MeshPhongMaterial({
                        color: 0x9b59b6,
                        transparent: true,
                        opacity: 0.9
                    })
                );
                ribosome.position.set(
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2,
                    (Math.random() - 0.5) * 0.2
                );
                cluster.add(ribosome);
            }
            
            cluster.position.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            soma.add(cluster);
        }

        // Add free ribosomes
        const freeRibosomeCount = 50;
        for (let i = 0; i < freeRibosomeCount; i++) {
            const ribosome = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 8, 8),
                new THREE.MeshPhongMaterial({
                    color: 0x9b59b6,
                    transparent: true,
                    opacity: 0.8
                })
            );
            ribosome.position.set(
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 2.5,
                (Math.random() - 0.5) * 2.5
            );
            soma.add(ribosome);
        }
    }

    addDetailedMitochondria(soma) {
        const mitochondriaCount = 12;
        
        for (let i = 0; i < mitochondriaCount; i++) {
            const mitochondrion = NeuronModels.createDetailedMitochondrion();
            
            // Position mitochondrion
            const angle = (i / mitochondriaCount) * Math.PI * 2;
            const radius = 1.5 + Math.random() * 0.5;
            mitochondrion.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                (Math.random() - 0.5) * 1.5
            );
            mitochondrion.rotation.z = Math.random() * Math.PI;
            
            soma.add(mitochondrion);
        }
    }

    createDetailedAxon(startX, startY, startZ, endX, endY, endZ) {
        const startPoint = new THREE.Vector3(startX, startY, startZ);
        const endPoint = new THREE.Vector3(endX, endY, endZ);
        
        // Create axon using NeuronModels
        const axon = NeuronModels.createDetailedAxon(startPoint, endPoint);
        this.axon = axon;
        this.scene.add(axon);

        // Create axon hillock
        this.createAxonHillock(startX, startY, startZ);
    }

    createAxonalCytoskeleton(axonCurve = null) {
        if (axonCurve) {
            // Handle axon cytoskeleton
            const points = axonCurve.getPoints(50);
            
            // Create microtubules
            const microtubuleCount = 10;
            for (let i = 0; i < microtubuleCount; i++) {
                const angle = (i / microtubuleCount) * Math.PI * 2;
                const radius = 0.3;
                
                const tubulePoints = points.map(point => {
                    const radialOffset = new THREE.Vector3(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        0
                    );
                    return point.clone().add(radialOffset);
                });

                const tubuleCurve = new THREE.CatmullRomCurve3(tubulePoints);
                const tubuleGeometry = new THREE.TubeGeometry(
                    tubuleCurve,
                    50,   // tubular segments
                    0.03, // radius
                    6,    // radial segments
                    false // closed
                );

                const tubuleMaterial = new THREE.MeshPhongMaterial({
                    color: 0x2ecc71,
                    transparent: true,
                    opacity: 0.7
                });

                const tubule = new THREE.Mesh(tubuleGeometry, tubuleMaterial);
                this.axon.add(tubule);
            }

            // Create neurofibrils
            const neurofilamentCount = 15;
            for (let i = 0; i < neurofilamentCount; i++) {
                const angle = (i / neurofilamentCount) * Math.PI * 2;
                const radius = 0.35;
                
                const filamentPoints = points.map(point => {
                    const radialOffset = new THREE.Vector3(
                        Math.cos(angle + Math.sin(point.x * 0.5) * 0.5) * radius,
                        Math.sin(angle + Math.sin(point.x * 0.5) * 0.5) * radius,
                        0
                    );
                    return point.clone().add(radialOffset);
                });

                const filamentCurve = new THREE.CatmullRomCurve3(filamentPoints);
                const filamentGeometry = new THREE.TubeGeometry(
                    filamentCurve,
                    50,   // tubular segments
                    0.02, // radius
                    4,    // radial segments
                    false // closed
                );

                const filamentMaterial = new THREE.MeshPhongMaterial({
                    color: 0xe74c3c,
                    transparent: true,
                    opacity: 0.6
                });

                const filament = new THREE.Mesh(filamentGeometry, filamentMaterial);
                this.axon.add(filament);
            }
        } else {
            // Handle synaptic terminal cytoskeleton
            if (!this.presynapticTerminal) {
                console.warn('Presynaptic terminal not initialized');
                return;
            }

            // Create microtubules as shown in diagram
            const microtubuleCount = 12;
            const microtubuleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 8, 8);
            const microtubuleMaterial = new THREE.MeshPhongMaterial({
                color: 0x2ecc71,
                transparent: true,
                opacity: 0.7
            });

            for (let i = 0; i < microtubuleCount; i++) {
                const angle = (i / microtubuleCount) * Math.PI * 2;
                const radius = 1.5;
                
                const microtubule = new THREE.Mesh(microtubuleGeometry, microtubuleMaterial);
                microtubule.position.set(
                    Math.cos(angle) * radius,
                    -2,
                    Math.sin(angle) * radius
                );
                microtubule.rotation.x = Math.PI / 2;
                this.presynapticTerminal.add(microtubule);
            }

            // Add neurofibrils
            const neurofilamentCount = 15;
            const neurofilamentGeometry = new THREE.CylinderGeometry(0.03, 0.03, 8, 6);
            const neurofilamentMaterial = new THREE.MeshPhongMaterial({
                color: 0xe74c3c,
                transparent: true,
                opacity: 0.6
            });

            for (let i = 0; i < neurofilamentCount; i++) {
                const angle = (i / neurofilamentCount) * Math.PI * 2;
                const radius = 1.8;
                
                const neurofilament = new THREE.Mesh(neurofilamentGeometry, neurofilamentMaterial);
                neurofilament.position.set(
                    Math.cos(angle) * radius,
                    -2,
                    Math.sin(angle) * radius
                );
                neurofilament.rotation.x = Math.PI / 2;
                this.presynapticTerminal.add(neurofilament);
            }
        }
    }

    createDetailedMyelinSheath(axonCurve) {
        const points = axonCurve.getPoints(50);
        const nodeSpacing = 10; // Spacing between nodes of Ranvier
        
        for (let i = 0; i < points.length - nodeSpacing; i += nodeSpacing) {
            // Create Schwann cell with detailed structure
            const schwannCell = this.createDetailedSchwannCell(
                points.slice(i, i + nodeSpacing)
            );
            this.axon.add(schwannCell);

            // Create node of Ranvier
            if (i + nodeSpacing < points.length) {
                this.createNodeOfRanvier(points[i + nodeSpacing]);
            }
        }
    }

    createDetailedSchwannCell(points) {
        const schwannGroup = new THREE.Group();
        
        // Create myelin layers with proper wrapping
        const layerCount = 8;
        const baseRadius = 0.55;
        const layerSpacing = 0.02;

        for (let layer = 0; layer < layerCount; layer++) {
            const radius = baseRadius + (layer * layerSpacing);
            const curve = new THREE.CatmullRomCurve3(points);
            
            const myelinGeometry = new THREE.TubeGeometry(
                curve,
                points.length * 2,
                radius,
                8,
                false
            );

            const myelinMaterial = new THREE.MeshPhongMaterial({
                color: 0x3498db, // Light blue for myelin
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });

            const myelinLayer = new THREE.Mesh(myelinGeometry, myelinMaterial);
            schwannGroup.add(myelinLayer);
        }

        // Add Schwann cell nucleus
        const nucleus = this.createSchwannNucleus();
        nucleus.position.copy(points[Math.floor(points.length / 2)]);
        nucleus.position.y += 0.8; // Position nucleus outside myelin
        schwannGroup.add(nucleus);

        // Add microfilaments in Schwann cell
        this.addSchwannCellFilaments(schwannGroup, points);

        return schwannGroup;
    }

    createNodeOfRanvier(position) {
        const nodeGroup = new THREE.Group();

        // Create sodium channels
        const channelCount = 8;
        for (let i = 0; i < channelCount; i++) {
            const channel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8),
                new THREE.MeshPhongMaterial({
                    color: 0xe74c3c,
                    transparent: true,
                    opacity: 0.8
                })
            );

            const angle = (i / channelCount) * Math.PI * 2;
            channel.position.set(
                Math.cos(angle) * 0.5,
                0,
                Math.sin(angle) * 0.5
            );
            channel.rotation.x = Math.PI / 2;
            nodeGroup.add(channel);
        }

        nodeGroup.position.copy(position);
        this.axon.add(nodeGroup);
    }

    createAxonHillock(startX, startY, startZ) {
        const hillockGroup = new THREE.Group();

        // Create conical shape for axon hillock
        const hillockGeometry = new THREE.ConeGeometry(1, 2, 16);
        const hillockMaterial = new THREE.MeshPhongMaterial({
            color: 0xd35400,
            transparent: true,
            opacity: 0.8
        });

        const hillock = new THREE.Mesh(hillockGeometry, hillockMaterial);
        hillock.rotation.z = Math.PI / 2;
        hillock.position.set(startX + 1, startY, startZ);

        // Add initial segment with high density of sodium channels
        const channelCount = 12;
        for (let i = 0; i < channelCount; i++) {
            const channel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8),
                new THREE.MeshPhongMaterial({
                    color: 0xe74c3c,
                    transparent: true,
                    opacity: 0.8
                })
            );

            const angle = (i / channelCount) * Math.PI * 2;
            const height = (i / channelCount) * 1.5;
            channel.position.set(
                height,
                Math.cos(angle) * 0.4,
                Math.sin(angle) * 0.4
            );
            channel.rotation.z = Math.PI / 2;
            hillockGroup.add(channel);
        }

        hillockGroup.add(hillock);
        this.scene.add(hillockGroup);
    }

    addSchwannCellFilaments(schwannCell, points) {
        const filamentCount = 10;
        const curve = new THREE.CatmullRomCurve3(points);
        
        for (let i = 0; i < filamentCount; i++) {
            const filamentPoints = curve.getPoints(20).map(point => {
                return point.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1
                ));
            });

            const filamentCurve = new THREE.CatmullRomCurve3(filamentPoints);
            const filamentGeometry = new THREE.TubeGeometry(
                filamentCurve,
                20,   // tubular segments
                0.01, // radius
                4,    // radial segments
                false // closed
            );

            const filamentMaterial = new THREE.MeshPhongMaterial({
                color: 0x95a5a6,
                transparent: true,
                opacity: 0.5
            });

            const filament = new THREE.Mesh(filamentGeometry, filamentMaterial);
            schwannCell.add(filament);
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

    setupControls() {
        document.getElementById('releaseBtn').addEventListener('click', () => {
            this.releaseNeurotransmitters();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
    }

    releaseNeurotransmitters() {
        const type = document.getElementById('ntType').value;
        
        // Trigger action potential first
        this.simulateActionPotential();
        
        // Delay neurotransmitter release until calcium channels open
        setTimeout(() => {
            const releasePattern = this.determineReleasePattern(type);
            switch(releasePattern) {
                case 'burst':
                    this.burstRelease(type);
                    break;
                case 'single':
                    this.singleVesicleRelease(type);
                    break;
                case 'continuous':
                    this.startContinuousRelease(type);
                    break;
            }
        }, 500); // Delay to match calcium channel opening
    }

    determineReleasePattern(type) {
        // Determine release pattern based on neurotransmitter type and current conditions
        const properties = NEUROTRANSMITTER_TYPES[type];
        
        if (this.activeEffects.reward_enhancement && type === 'DOPAMINE') {
            return 'burst';
        }
        
        if (properties.reuptakeRate > 0.8) {
            return 'continuous';
        }
        
        return 'single';
    }

    burstRelease(type) {
        const vesicleCount = 3;
        const delay = 100; // ms between vesicle releases
        
        for (let i = 0; i < vesicleCount; i++) {
            setTimeout(() => {
                this.singleVesicleRelease(type);
            }, i * delay);
        }
    }

    startContinuousRelease(type) {
        const duration = 3000; // 3 seconds
        const interval = 200; // Release every 200ms
        const startTime = Date.now();
        
        const continuousRelease = () => {
            if (Date.now() - startTime < duration) {
                this.singleVesicleRelease(type, 0.3); // Reduced amount
                setTimeout(continuousRelease, interval);
            }
        };
        
        continuousRelease();
    }

    singleVesicleRelease(type, amount = 1.0) {
        if (this.vesicles.length > 0) {
            const vesicle = this.vesicles[0];
            const releasePosition = new THREE.Vector3(-3.5, 0, 0);
            
            // Move vesicle to release position
            vesicle.moveToReleasePosition(releasePosition, () => {
                // Release neurotransmitters
                this.createNeurotransmitterBurst(vesicle.mesh.position, type, amount);
                
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

    createNeurotransmitterBurst(position, type, amount = 1.0) {
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
                            receptor.material.color.setHex(
                                nt.type === 'excitatory' ? 0xff4444 : 0x44ff44
                            );
                        }
                    }
                });
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update orbit controls
        if (this.controls) {
            this.controls.update();
        }

        // Only rotate camera if not zoomed in and orbit controls are disabled
        if (!this.isZoomedIn && (!this.controls || !this.controls.enabled)) {
            const time = Date.now() * 0.0001;
            this.camera.position.x = Math.cos(time) * 30;
            this.camera.position.z = Math.sin(time) * 30;
            this.camera.position.y = 15 + Math.sin(time * 0.5) * 5;
            this.camera.lookAt(0, 0, 0);
        }

        // Update neurotransmitters
        this.neurotransmitters.forEach(nt => nt.update());
        this.checkBinding();
        this.checkReuptake(); // Add reuptake check

        this.updateEffects();
        this.renderer.render(this.scene, this.camera);

        // Animate MAO enzymes
        this.maoEnzymes.forEach(enzyme => {
            enzyme.userData.phase += 0.02;
            const wobble = Math.sin(enzyme.userData.phase) * 0.2;
            enzyme.position.copy(enzyme.userData.originalPos)
                .add(new THREE.Vector3(wobble, wobble, wobble));
        });
        
        this.checkDegradation();

        this.checkSynergies();
        this.updateReceptorSensitivity();
        
        // Update neurotransmitter effects based on receptor sensitivity
        this.neurotransmitters.forEach(nt => {
            const sensitivity = this.receptorSensitivity[nt.type];
            if (nt.bound) {
                nt.mesh.scale.setScalar(sensitivity);
                nt.mesh.material.opacity = sensitivity;
            }
        });
    }

    createSynapticStructure() {
        // Create synaptic structure using NeuronModels
        const synapticStructure = NeuronModels.createSynapticStructure();
        this.synapticStructure = synapticStructure;
        
        // Store references to important components
        this.presynapticTerminal = synapticStructure.children[0];
        this.synapticCleft = synapticStructure.children[1];
        this.postsynapticDensity = synapticStructure.children[2];
        
        // Position the structure
        synapticStructure.position.set(0, 0, 0);
        this.scene.add(synapticStructure);

        // Create membrane charges visualization
        this.createDetailedMembraneCharges();
    }

    createDetailedVesicles() {
        const vesicleCount = 30; // Increased count for more realistic density
        const vesicleGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const vesicleMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.8
        });

        // Create reserve pool in clustered arrangement
        for (let i = 0; i < vesicleCount * 0.7; i++) {
            const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial.clone());
            
            // Position vesicles in clusters as shown in diagram
            const cluster = Math.floor(i / 5);
            const clusterAngle = (cluster / 4) * Math.PI * 2;
            const clusterRadius = 1.5;
            const localOffset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            
            vesicle.position.set(
                Math.cos(clusterAngle) * clusterRadius + localOffset.x,
                1 + localOffset.y,
                Math.sin(clusterAngle) * clusterRadius + localOffset.z
            );

            // Add neurotransmitter content visualization
            const ntContent = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 12, 12),
                new THREE.MeshPhongMaterial({
                    color: 0xff9933,
                    transparent: true,
                    opacity: 0.9
                })
            );
            vesicle.add(ntContent);
            
            this.presynapticTerminal.add(vesicle);
        }

        // Create readily releasable pool near active zones
        for (let i = 0; i < vesicleCount * 0.3; i++) {
            const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial.clone());
            const angle = (i / (vesicleCount * 0.3)) * Math.PI;
            
            vesicle.position.set(
                Math.cos(angle) * 2,
                -0.8,
                Math.sin(angle) * 2
            );
            
            const ntContent = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 12, 12),
                new THREE.MeshPhongMaterial({
                    color: 0xff9933,
                    transparent: true,
                    opacity: 0.9
                })
            );
            vesicle.add(ntContent);
            
            this.presynapticTerminal.add(vesicle);
        }
    }

    createDetailedCleft() {
        // Create synaptic cleft with 20-40nm spacing as shown in diagram
        const cleftWidth = 0.04; // 40 nanometers
        const cleftGeometry = new THREE.BoxGeometry(6, cleftWidth, 5);
        const cleftMaterial = new THREE.MeshPhongMaterial({
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.1
        });
        
        this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
        this.synapticCleft.position.y = -1;
        this.synapticStructure.add(this.synapticCleft);

        // Add extracellular matrix elements
        const matrixCount = 200; // Increased for more detail
        const matrixGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const matrixMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3
        });

        // Create dense matrix network as shown in diagram
        for (let i = 0; i < matrixCount; i++) {
            const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial.clone());
            matrix.position.set(
                (Math.random() - 0.5) * 5.5,
                -1 + (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 4.5
            );
            this.synapticCleft.add(matrix);

            // Add connecting fibers between ECM elements
            if (i > 0 && Math.random() < 0.4) {
                const prevMatrix = this.synapticCleft.children[Math.floor(Math.random() * i)];
                const fiber = this.createECMFiber(matrix.position, prevMatrix.position);
                this.synapticCleft.add(fiber);
            }
        }
    }

    createDetailedPostsynapticMembrane() {
        // Create postsynaptic density with proper thickness and density
        const psdGeometry = new THREE.BoxGeometry(5, 0.3, 4);
        const psdMaterial = new THREE.MeshPhongMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.7
        });

        this.psd = new THREE.Mesh(psdGeometry, psdMaterial);
        this.psd.position.y = -1.2;
        this.synapticStructure.add(this.psd);

        // Create receptor clusters as shown in diagram
        const receptorTypes = [
            { color: 0x3498db, name: 'AMPA', size: 0.2 },
            { color: 0xe74c3c, name: 'NMDA', size: 0.25 },
            { color: 0xf1c40f, name: 'Metabotropic', size: 0.22 }
        ];

        // Create dense receptor clusters in active zones
        receptorTypes.forEach((type, typeIndex) => {
            const clusterCount = 5;
            const receptorsPerCluster = 4;

            for (let i = 0; i < clusterCount; i++) {
                const cluster = new THREE.Group();
                const clusterAngle = (i / clusterCount) * Math.PI * 2;
                const clusterRadius = 1.5;
                const clusterCenter = new THREE.Vector3(
                    Math.cos(clusterAngle) * clusterRadius,
                    -0.1 - typeIndex * 0.2,
                    Math.sin(clusterAngle) * clusterRadius
                );

                for (let j = 0; j < receptorsPerCluster; j++) {
                    const receptor = this.createDetailedReceptor(type);
                    const receptorAngle = (j / receptorsPerCluster) * Math.PI * 2;
                    const localRadius = 0.3;
                    
                    receptor.position.set(
                        clusterCenter.x + Math.cos(receptorAngle) * localRadius,
                        clusterCenter.y,
                        clusterCenter.z + Math.sin(receptorAngle) * localRadius
                    );
                    receptor.rotation.x = Math.PI / 6;
                    
                    cluster.add(receptor);
                }

                this.psd.add(cluster);
            }
        });

        // Add scaffolding proteins
        this.addScaffoldingProteins();
    }

    createDetailedCalciumChannels() {
        const channelCount = 12;
        const channelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
        const channelMaterial = new THREE.MeshPhongMaterial({
            color: 0x4499ff,
            transparent: true,
            opacity: 0.9,
            emissive: 0x2277ff
        });

        // Create active zones with voltage-gated calcium channels as shown in diagram
        const activeZones = 4;
        const channelsPerZone = channelCount / activeZones;

        for (let zone = 0; zone < activeZones; zone++) {
            const zoneAngle = (zone / activeZones) * Math.PI * 2;
            const zoneRadius = 2;
            const zoneCenter = new THREE.Vector3(
                Math.cos(zoneAngle) * zoneRadius,
                -0.8,
                Math.sin(zoneAngle) * zoneRadius
            );

            // Create channel cluster in active zone
            for (let i = 0; i < channelsPerZone; i++) {
                const channel = new THREE.Mesh(channelGeometry, channelMaterial.clone());
                const channelAngle = zoneAngle + (i / channelsPerZone - 0.5) * Math.PI * 0.25;
                const localRadius = 0.4;
                
                channel.position.set(
                    zoneCenter.x + Math.cos(channelAngle) * localRadius,
                    zoneCenter.y,
                    zoneCenter.z + Math.sin(channelAngle) * localRadius
                );
                channel.rotation.x = Math.PI / 2;
                
                // Add voltage sensor domain
                const sensor = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2, 0.05, 0.1),
                    new THREE.MeshPhongMaterial({
                        color: 0x33bbff,
                        transparent: true,
                        opacity: 0.8
                    })
                );
                sensor.position.y = 0.2;
                channel.add(sensor);
                
                // Add pore region
                const pore = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
                    new THREE.MeshPhongMaterial({
                        color: 0x2277ff,
                        transparent: true,
                        opacity: 0.6
                    })
                );
                channel.add(pore);
                
                channel.userData.isOpen = false;
                channel.userData.sensor = sensor;
                this.presynapticTerminal.add(channel);
            }

            // Add active zone proteins and scaffolding
            this.createActiveZoneScaffolding(zoneCenter);
        }
    }

    createActiveZoneScaffolding(center) {
        const scaffoldGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
        const scaffoldMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            transparent: true,
            opacity: 0.5
        });

        const scaffold = new THREE.Mesh(scaffoldGeometry, scaffoldMaterial);
        scaffold.position.copy(center);
        this.presynapticTerminal.add(scaffold);

        // Add protein complexes
        const proteinCount = 6;
        const proteinGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const proteinMaterial = new THREE.MeshPhongMaterial({
            color: 0x7f8c8d,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < proteinCount; i++) {
            const protein = new THREE.Mesh(proteinGeometry, proteinMaterial);
            const angle = (i / proteinCount) * Math.PI * 2;
            const radius = 0.3;
            
            protein.position.set(
                center.x + Math.cos(angle) * radius,
                center.y + 0.05,
                center.z + Math.sin(angle) * radius
            );
            this.presynapticTerminal.add(protein);
        }
    }

    addScaffoldingProteins() {
        const proteinCount = 30;
        const proteinGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const proteinMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < proteinCount; i++) {
            const protein = new THREE.Mesh(proteinGeometry, proteinMaterial);
            protein.position.set(
                (Math.random() - 0.5) * 4,
                -0.15,
                (Math.random() - 0.5) * 3
            );
            this.psd.add(protein);

            // Add connecting filaments
            if (i > 0) {
                const prevProtein = this.psd.children[Math.floor(Math.random() * i)];
                const filament = this.createProteinFilament(protein.position, prevProtein.position);
                this.psd.add(filament);
            }
        }
    }

    createProteinFilament(start, end) {
        return NeuronModels.createProteinFilament(start, end);
    }

    createDetailedReceptor(type) {
        return NeuronModels.createDetailedReceptor(type);
    }

    createECMFiber(start, end) {
        return NeuronModels.createECMFiber(start, end);
    }

    createDetailedMembraneCharges() {
        // Create charge indicators
        const chargeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const positiveMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            emissive: 0xff0000,
            transparent: true,
            opacity: 0.8
        });
        const negativeMaterial = new THREE.MeshPhongMaterial({
            color: 0x4444ff,
            emissive: 0x0000ff,
            transparent: true,
            opacity: 0.8
        });

        this.charges = {
            positive: new THREE.Group(),
            negative: new THREE.Group()
        };

        // Add charges along membranes
        for (let i = 0; i < 20; i++) {
            const posCharge = new THREE.Mesh(chargeGeometry, positiveMaterial.clone());
            const negCharge = new THREE.Mesh(chargeGeometry, negativeMaterial.clone());
            
            const angle = (i / 20) * Math.PI * 2;
            const radius = 2;
            
            posCharge.position.set(
                Math.cos(angle) * radius,
                0.2,
                Math.sin(angle) * radius
            );
            
            negCharge.position.set(
                Math.cos(angle) * radius,
                -0.2,
                Math.sin(angle) * radius
            );
            
            this.charges.positive.add(posCharge);
            this.charges.negative.add(negCharge);
        }

        this.synapticStructure.add(this.charges.positive);
        this.synapticStructure.add(this.charges.negative);
    }

    createStorageVesicles() {
        const vesicleCount = 12;
        const layers = 3;
        const vesiclesPerLayer = Math.floor(vesicleCount / layers);
        
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
                            }
                        };
                        
                        animate(0);
                    }
                });
            }
        });
    }

    createDegradationParticle(position) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.5
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
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
                this.scene.add(particle);
            }
        };
        
        animate(0);
    }

    checkSynergies() {
        const activeTypes = new Set(this.neurotransmitters.map(nt => nt.type));
        
        // Check for synergistic effects
        activeTypes.forEach(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            if (properties.synergies) {
                Object.entries(properties.synergies).forEach(([synType, synEffect]) => {
                    if (activeTypes.has(synType)) {
                        this.activeEffects[synEffect.effect] = true;
                        this.applySynergisticEffect(type, synType, synEffect);
                    }
                });
            }
        });

        // Check for antagonistic effects
        activeTypes.forEach(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            if (properties.antagonists) {
                properties.antagonists.forEach(antagonist => {
                    if (activeTypes.has(antagonist)) {
                        this.applyAntagonisticEffect(type, antagonist);
                    }
                });
            }
        });
    }

    applySynergisticEffect(type1, type2, effect) {
        // Enhance neurotransmitter effects
        this.neurotransmitters.forEach(nt => {
            if (nt.type === type1 || nt.type === type2) {
                nt.mesh.scale.multiplyScalar(effect.multiplier);
                nt.mesh.material.emissiveIntensity *= effect.multiplier;
            }
        });
    }

    applyAntagonisticEffect(type1, type2) {
        // Reduce effectiveness of antagonistic neurotransmitters
        this.neurotransmitters.forEach(nt => {
            if (nt.type === type1 || nt.type === type2) {
                nt.mesh.scale.multiplyScalar(0.7);
                nt.mesh.material.opacity *= 0.7;
            }
        });
    }

    updateReceptorSensitivity() {
        // Update receptor sensitivity based on neurotransmitter levels
        Object.keys(this.receptorSensitivity).forEach(type => {
            const typeCount = this.neurotransmitters.filter(nt => nt.type === type).length;
            if (typeCount > 10) {
                // Decrease sensitivity with high levels
                this.receptorSensitivity[type] *= 0.95;
            } else if (typeCount === 0) {
                // Recover sensitivity when no neurotransmitters present
                this.receptorSensitivity[type] = Math.min(1.0, this.receptorSensitivity[type] * 1.05);
            }
        });
    }

    createReuptakeTransporters() {
        const transporterCount = 6;
        
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

    simulateActionPotential() {
        const duration = 2000; // 2 seconds for full action potential
        const startTime = Date.now();
        let phase = 'depolarization';
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress <= 1) {
                // Update membrane potential visualization
                const voltage = this.calculateMembranePotential(progress, phase);
                this.updateChannelStates(voltage);
                this.updateIonConcentrations(voltage);
                
                // Determine phase transitions
                if (progress > 0.2 && phase === 'depolarization') {
                    phase = 'repolarization';
                } else if (progress > 0.6 && phase === 'repolarization') {
                    phase = 'hyperpolarization';
                }
                
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    calculateMembranePotential(progress, phase) {
        switch(phase) {
            case 'depolarization':
                return -70 + (progress * 5 * 100); // -70mV to +30mV
            case 'repolarization':
                return 30 - (progress * 3 * 100); // +30mV to -70mV
            case 'hyperpolarization':
                return -70 - (progress * 20); // -70mV to -90mV
            default:
                return -70; // Resting potential
        }
    }

    updateChannelStates(voltage) {
        this.calciumChannels.children.forEach(channel => {
            const shouldBeOpen = voltage >= channel.userData.activationThreshold;
            if (shouldBeOpen !== channel.userData.isOpen) {
                channel.userData.isOpen = shouldBeOpen;
                channel.material.emissiveIntensity = shouldBeOpen ? 0.8 : 0.3;
                
                if (shouldBeOpen) {
                    // Trigger calcium influx when channel opens
                    this.triggerCalciumInflux(channel.position);
                }
            }
        });
    }

    updateIonConcentrations(voltage) {
        // Update membrane charges based on voltage
        if (this.charges) {
            const opacity = Math.min(1, Math.abs(voltage) / 70);
            
            this.charges.positive.children.forEach(charge => {
                charge.material.opacity = voltage > 0 ? opacity : 0.2;
                charge.material.emissiveIntensity = voltage > 0 ? 0.8 : 0.2;
            });
            
            this.charges.negative.children.forEach(charge => {
                charge.material.opacity = voltage < 0 ? opacity : 0.2;
                charge.material.emissiveIntensity = voltage < 0 ? 0.8 : 0.2;
            });
        }
    }

    triggerCalciumInflux(position) {
        const particleCount = 5;
        const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x44ff44,
            transparent: true,
            opacity: 0.8,
            emissive: 0x22ff22
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            
            this.scene.add(particle);
            
            const animate = (progress) => {
                if (progress <= 1) {
                    particle.position.add(velocity);
                    particle.material.opacity = 0.8 * (1 - progress);
                    requestAnimationFrame(() => animate(progress + 0.02));
                } else {
                    this.scene.remove(particle);
                }
            };
            
            animate(0);
        }
    }

    setupZoomControl() {
        const zoomBtn = document.createElement('button');
        zoomBtn.id = 'zoomBtn';
        zoomBtn.textContent = 'Toggle Synaptic Cleft Zoom';
        zoomBtn.style.position = 'absolute';
        zoomBtn.style.top = '10px';
        zoomBtn.style.right = '10px';
        zoomBtn.style.padding = '10px';
        zoomBtn.style.backgroundColor = '#333';
        zoomBtn.style.color = 'white';
        zoomBtn.style.border = 'none';
        zoomBtn.style.borderRadius = '5px';
        zoomBtn.style.cursor = 'pointer';
        document.querySelector('.controls').appendChild(zoomBtn);

        zoomBtn.addEventListener('click', () => this.toggleZoom());
    }

    toggleZoom() {
        this.isZoomedIn = !this.isZoomedIn;
        
        // Store current position and target
        const startPos = this.camera.position.clone();
        const startTarget = this.normalCameraTarget.clone();
        
        // Define end position and target based on zoom state
        const endPos = this.isZoomedIn ? this.zoomedCameraPosition : this.normalCameraPosition;
        const endTarget = this.isZoomedIn ? this.zoomedCameraTarget : this.normalCameraTarget;
        
        // Disable orbit controls during transition
        this.disableOrbitControls();
        
        // Animate the transition
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth transition
            const eased = this.easeInOutCubic(progress);
            
            // Interpolate position and target
            this.camera.position.lerpVectors(startPos, endPos, eased);
            const currentTarget = new THREE.Vector3().lerpVectors(startTarget, endTarget, eased);
            this.camera.lookAt(currentTarget);
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                // Re-enable orbit controls after transition
                this.enableOrbitControls();
                
                // Update button appearance
                const zoomBtn = document.getElementById('zoomBtn');
                zoomBtn.textContent = this.isZoomedIn ? 'Show Full View' : 'Toggle Synaptic Cleft Zoom';
                zoomBtn.style.backgroundColor = this.isZoomedIn ? '#ff4444' : '#333';
            }
        };
        
        animateCamera();
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    enableOrbitControls() {
        if (this.controls) {
            this.controls.enabled = true;
        }
    }

    disableOrbitControls() {
        if (this.controls) {
            this.controls.enabled = false;
        }
    }

    createDetailedDendrites(soma, count) {
        const dendriteMaterial = new THREE.MeshPhongMaterial({
            color: 0xd35400,
            transparent: true,
            opacity: 0.8
        });

        // Create primary dendrites
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const length = 2 + Math.random() * 2;
            const startPos = soma.position.clone();
            
            // Create dendrite branch using NeuronModels
            const dendriteBranch = NeuronModels.createDetailedDendriteBranch(
                startPos,
                angle,
                length,
                0.3,
                5,
                dendriteMaterial,
                Math.PI / 3
            );
            
            this.scene.add(dendriteBranch);
        }
    }

    createDetailedDendriteBranch(startPos, angle, length, radius, branchDepth, material, maxBranchAngle) {
        if (branchDepth <= 0) return;

        // Add more natural variation to the branch
        const endPos = new THREE.Vector3(
            startPos.x + Math.cos(angle) * length + (Math.random() - 0.5) * 0.8,
            startPos.y + Math.sin(angle) * length + (Math.random() - 0.5) * 0.8,
            startPos.z + (Math.random() - 0.5) * length * 0.5
        );

        // Create points for curved branch with more natural waviness
        const points = [];
        const segments = 8; // Increased segment count for smoother curves
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            // Add organic waviness
            if (i > 0 && i < segments) {
                pos.x += Math.sin(t * Math.PI * 2) * 0.2 * (1 - t);
                pos.y += Math.sin(t * Math.PI * 3) * 0.2 * (1 - t);
                pos.z += Math.sin(t * Math.PI * 2.5) * 0.2 * (1 - t);
            }
            points.push(pos);
        }

        // Create curved dendrite segment with varying radius
        const curve = new THREE.CatmullRomCurve3(points);
        const dendriteGeometry = new THREE.TubeGeometry(
            curve,
            12,    // Increased tubular segments for smoother appearance
            radius * (1 - (5 - branchDepth) * 0.15), // Gradually decrease radius
            8,     // Increased radial segments
            false  // closed
        );

        const dendrite = new THREE.Mesh(dendriteGeometry, material.clone());
        this.scene.add(dendrite);

        // Add spines along the dendrite
        if (branchDepth > 1) {
            this.addDendriticSpines(curve, radius, material);
        }

        // Create branches with more natural distribution
        const branchCount = Math.max(2, Math.floor(Math.random() * (branchDepth + 2)));
        const branchProbability = 0.8 * (branchDepth / 5); // Adjusted probability

        for (let i = 0; i < branchCount; i++) {
            if (Math.random() < branchProbability) {
                // Create branch point somewhere along the dendrite
                const t = 0.3 + Math.random() * 0.5; // Branch in middle section
                const branchPoint = curve.getPoint(t);
                
                // Calculate branch angle with more variation
                const baseAngle = Math.atan2(
                    endPos.y - startPos.y,
                    endPos.x - startPos.x
                );
                const branchAngle = baseAngle + (Math.random() - 0.5) * maxBranchAngle;
                
                // Create new branch with modified parameters
                const newLength = length * (0.6 + Math.random() * 0.3);
                const newRadius = radius * 0.8;
                
                this.createDetailedDendriteBranch(
                    branchPoint,
                    branchAngle,
                    newLength,
                    newRadius,
                    branchDepth - 1,
                    material,
                    maxBranchAngle * 0.9 // Slightly reduce maximum branch angle
                );
            }
        }
    }

    addDendriticSpines(curve, parentRadius, parentMaterial) {
        const spineCount = Math.floor(curve.getLength() * 5); // Density based on length
        
        for (let i = 0; i < spineCount; i++) {
            if (Math.random() < 0.7) { // 70% chance of spine at each position
                const t = Math.random();
                const position = curve.getPoint(t);
                const tangent = curve.getTangent(t);
                
                // Create spine with random orientation
                const spine = new THREE.Group();
                
                // Spine neck
                const neckGeometry = new THREE.CylinderGeometry(
                    0.02,
                    0.02,
                    0.2,
                    6,
                    1
                );
                const neck = new THREE.Mesh(neckGeometry, parentMaterial.clone());
                
                // Spine head
                const headGeometry = new THREE.SphereGeometry(0.05, 8, 8);
                const head = new THREE.Mesh(headGeometry, parentMaterial.clone());
                head.position.y = 0.2;
                
                spine.add(neck);
                spine.add(head);
                
                // Position and orient spine
                spine.position.copy(position);
                spine.position.add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1
                    )
                );
                
                // Calculate rotation to point away from dendrite
                const spineAngle = Math.random() * Math.PI * 2;
                spine.rotation.set(
                    Math.random() * Math.PI * 0.25,
                    spineAngle,
                    Math.PI / 2 + (Math.random() - 0.5) * 0.5
                );
                
                this.scene.add(spine);
            }
        }
    }

    generateAxonPoints(startX, startY, startZ, endX, endY, endZ) {
        const points = [];
        const segments = 15;
        const controlPoints = [
            new THREE.Vector3(startX, startY, startZ),
            new THREE.Vector3(
                startX + (endX - startX) * 0.25,
                startY + Math.random() * 2 - 1,
                startZ + Math.random() * 2 - 1
            ),
            new THREE.Vector3(
                startX + (endX - startX) * 0.5,
                startY + Math.random() * 2 - 1,
                startZ + Math.random() * 2 - 1
            ),
            new THREE.Vector3(
                startX + (endX - startX) * 0.75,
                startY + Math.random() * 2 - 1,
                startZ + Math.random() * 2 - 1
            ),
            new THREE.Vector3(endX, endY, endZ)
        ];

        // Create a smooth curve through the control points
        const curve = new THREE.CatmullRomCurve3(controlPoints);
        
        // Sample points along the curve
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = curve.getPoint(t);
            
            // Add subtle waviness to mimic natural axon path
            const waviness = 0.2;
            const frequency = 3;
            point.y += Math.sin(t * Math.PI * frequency) * waviness;
            point.z += Math.cos(t * Math.PI * frequency) * waviness;
            
            points.push(point);
        }

        return points;
    }

    createSchwannNucleus() {
        return NeuronModels.createSchwannNucleus();
    }

    checkReuptake() {
        if (this.reuptakeInhibited) return;

        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.reuptaking) {
                if (Math.random() < nt.properties.reuptakeRate) {
                    this.transporters.forEach(transporter => {
                        const distance = nt.mesh.position.distanceTo(transporter.position);
                        if (distance < 0.5) {
                            nt.reuptaking = true;
                            
                            // Create reuptake animation
                            const startPos = nt.mesh.position.clone();
                            const targetPos = transporter.position.clone();
                            
                            const animate = (progress) => {
                                if (progress <= 1) {
                                    // Move neurotransmitter towards transporter
                                    nt.mesh.position.lerpVectors(startPos, targetPos, progress);
                                    
                                    // Fade out as it's reuptaken
                                    nt.mesh.material.opacity = 1 - progress;
                                    
                                    // Scale down slightly
                                    nt.mesh.scale.setScalar(1 - progress * 0.5);
                                    
                                    requestAnimationFrame(() => animate(progress + 0.05));
                                } else {
                                    // Remove neurotransmitter once reuptake is complete
                                    this.scene.remove(nt.mesh);
                                    this.neurotransmitters = this.neurotransmitters.filter(n => n !== nt);
                                    
                                    // Create reuptake completion effect
                                    this.createReuptakeEffect(targetPos);
                                }
                            };
                            
                            animate(0);
                        }
                    });
                }
            }
        });
    }

    createReuptakeEffect(position) {
        const particleCount = 5;
        const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ff88,
            transparent: true,
            opacity: 0.6,
            emissive: 0x44aa44
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);
            
            // Add random velocity for particle spread
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
            );
            
            this.scene.add(particle);
            
            // Animate particles
            const animate = (progress) => {
                if (progress <= 1) {
                    particle.position.add(velocity);
                    particle.material.opacity = 0.6 * (1 - progress);
                    particle.scale.setScalar(1 - progress * 0.5);
                    requestAnimationFrame(() => animate(progress + 0.05));
                } else {
                    this.scene.remove(particle);
                }
            };
            
            animate(0);
        }
    }

    updateEffects() {
        const effects = document.getElementById('effects');
        const activeNTs = new Set();
        
        // Count bound neurotransmitters
        this.neurotransmitters.forEach(nt => {
            if (nt.bound) {
                activeNTs.add(nt.type);
            }
        });
        
        // Update effects display
        let effectText = '';
        activeNTs.forEach(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            effectText += `<p><strong>${properties.name}:</strong> ${properties.description}</p>`;
        });
        
        if (effects) {
            effects.innerHTML = effectText || 'No active neurotransmitters';
        }
        
        // Update emotional face if it exists
        if (this.emotionalFace) {
            try {
                // Update emotional face based on neurotransmitter levels
                this.emotionalFace.updateFromNeurotransmitters(this.neurotransmitters);
            } catch (error) {
                console.error('Error updating emotional face:', error);
            }
        }

        // Update visual effects based on active neurotransmitters
        this.updateVisualEffects(activeNTs);
    }

    updateVisualEffects(activeNTs) {
        // Reset all effects
        if (this.renderer) {
            this.renderer.toneMappingExposure = 1.0;
        }
        
        // Apply visual effects based on active neurotransmitters
        activeNTs.forEach(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            
            switch(type) {
                case 'DOPAMINE':
                    // Enhance brightness for dopamine (reward)
                    if (this.renderer) {
                        this.renderer.toneMappingExposure = 1.2;
                    }
                    break;
                    
                case 'SEROTONIN':
                    // Add subtle color enhancement
                    if (this.renderer) {
                        this.renderer.toneMappingExposure = 1.1;
                    }
                    break;
                    
                case 'GABA':
                    // Subtle calming effect (slight decrease in intensity)
                    if (this.renderer) {
                        this.renderer.toneMappingExposure = 0.9;
                    }
                    break;
            }
        });

        // Update receptor glow based on binding
        this.receptors.forEach(receptor => {
            if (receptor.occupied) {
                const material = receptor.material;
                material.emissive = new THREE.Color(0x444444);
                material.emissiveIntensity = 0.5;
            } else {
                const material = receptor.material;
                material.emissive = new THREE.Color(0x000000);
                material.emissiveIntensity = 0;
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Starting initialization...');
        const simulation = new NeuronSimulation();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}); 