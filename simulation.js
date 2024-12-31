import * as THREE from 'three';
import { EmotionalFace } from './emotionalFace.js';
import { Neurotransmitter, NEUROTRANSMITTER_TYPES } from './neurotransmitter.js';
import { StorageVesicle } from './storageVesicle.js';

class NeuronSimulation {
    constructor() {
        try {
            // Initialize properties
            this.neurotransmitters = [];
            this.receptors = [];
            this.vesicles = [];
            this.transporters = [];
            this.maoEnzymes = [];
            
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
            this.camera.position.set(0, 20, 30);
            this.camera.lookAt(0, 0, 0);

            // Setup renderer
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            const container = document.getElementById('canvas-container');
            container.appendChild(this.renderer.domElement);

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

            // Start animation
            this.animate();
            console.log('Scene setup complete');
        } catch (error) {
            console.error('Error in constructor:', error);
            throw error; // Re-throw to see full stack trace
        }
    }

    createNeurons() {
        // Create irregular cell body (soma) for presynaptic neuron
        const somaGeometry = this.createIrregularSomaGeometry();
        const somaMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.9,
            roughness: 0.7,
            metalness: 0.2
        });
        
        this.preSoma = new THREE.Mesh(somaGeometry, somaMaterial);
        this.preSoma.position.set(-15, 0, 0);
        this.scene.add(this.preSoma);

        // Add organelles
        this.addCellOrganelles(this.preSoma);

        // Create axon using a curved path
        this.createAxon(-15, 0, 0, -5, 0, 0);

        // Create complex dendrites for presynaptic neuron
        this.createDendrites(this.preSoma, 8);

        // Create postsynaptic neuron with different irregular shape
        const postSomaGeometry = this.createIrregularSomaGeometry();
        this.postSoma = new THREE.Mesh(postSomaGeometry, somaMaterial.clone());
        this.postSoma.position.set(15, 0, 0);
        this.scene.add(this.postSoma);

        // Add organelles to postsynaptic neuron
        this.addCellOrganelles(this.postSoma);

        // Create dendrites for postsynaptic neuron
        this.createDendrites(this.postSoma, 8);
    }

    createIrregularSomaGeometry() {
        const baseRadius = 3;
        const segments = 32;
        const vertices = [];
        const indices = [];
        
        // Create irregular sphere vertices
        for (let i = 0; i <= segments; i++) {
            const phi = (i * Math.PI) / segments;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            
            for (let j = 0; j <= segments; j++) {
                const theta = (j * 2 * Math.PI) / segments;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                
                // Add random variation to radius
                const variation = 1 + (Math.random() - 0.5) * 0.3;
                const radius = baseRadius * variation;
                
                vertices.push(
                    radius * sinPhi * cosTheta,
                    radius * cosPhi,
                    radius * sinPhi * sinTheta
                );
            }
        }
        
        // Create faces
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segments; j++) {
                const first = i * (segments + 1) + j;
                const second = first + segments + 1;
                
                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        return geometry;
    }

    addCellOrganelles(soma) {
        // Add nucleus
        const nucleusGeometry = new THREE.SphereGeometry(1.2, 24, 24);
        const nucleusMaterial = new THREE.MeshPhongMaterial({
            color: 0x4444aa,
            transparent: true,
            opacity: 0.8
        });
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
        nucleus.position.y = 0.3; // Slightly offset from center
        soma.add(nucleus);

        // Add mitochondria
        const mitochondriaCount = 5;
        const mitoGeometry = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8);
        const mitoMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8866,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < mitochondriaCount; i++) {
            const mito = new THREE.Mesh(mitoGeometry, mitoMaterial);
            const angle = (i / mitochondriaCount) * Math.PI * 2;
            const radius = 1.5;
            mito.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
            );
            mito.rotation.z = Math.random() * Math.PI;
            soma.add(mito);
        }
    }

    createAxon(startX, startY, startZ, endX, endY, endZ) {
        // Create more complex control points for twisted axon
        const points = [];
        const segments = 10;
        const twistFactor = 0.8;
        const branchProbability = 0.3;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = startX + (endX - startX) * t;
            const y = startY + (Math.sin(t * Math.PI * 2) * twistFactor);
            const z = startZ + (Math.cos(t * Math.PI * 2) * twistFactor);
            points.push(new THREE.Vector3(x, y, z));

            // Add random branches
            if (Math.random() < branchProbability && i > 2 && i < segments - 2) {
                const branchLength = 1 + Math.random() * 2;
                const branchAngle = Math.random() * Math.PI * 2;
                const branchEnd = new THREE.Vector3(
                    x + Math.cos(branchAngle) * branchLength,
                    y + Math.sin(branchAngle) * branchLength,
                    z + Math.sin(branchAngle) * branchLength
                );
                this.createAxonBranch(new THREE.Vector3(x, y, z), branchEnd);
            }
        }

        // Create main axon tube
        const curve = new THREE.CatmullRomCurve3(points);
        const axonGeometry = new THREE.TubeGeometry(
            curve,
            segments * 5,  // tubular segments
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

        // Add myelin sheaths with proper nodes of Ranvier
        this.createMyelinSheaths(curve.getPoints(segments * 5));
    }

    createAxonBranch(start, end) {
        const branchPoints = [];
        const branchSegments = 5;
        
        for (let i = 0; i <= branchSegments; i++) {
            const t = i / branchSegments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            // Add some natural variation
            if (i > 0 && i < branchSegments) {
                point.y += (Math.random() - 0.5) * 0.3;
                point.z += (Math.random() - 0.5) * 0.3;
            }
            branchPoints.push(point);
        }

        const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
        const branchGeometry = new THREE.TubeGeometry(
            branchCurve,
            branchSegments * 3,
            0.15, // thinner than main axon
            6,
            false
        );

        const branchMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.8
        });

        const branch = new THREE.Mesh(branchGeometry, branchMaterial);
        this.scene.add(branch);
    }

    createMyelinSheaths(axonPoints) {
        const myelinMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        const nodeLength = 0.5; // Length of nodes of Ranvier
        const myelinLength = 2.5; // Length of myelin segments
        let currentDistance = 0;
        
        for (let i = 1; i < axonPoints.length; i++) {
            const point = axonPoints[i];
            const prevPoint = axonPoints[i-1];
            const segmentLength = point.distanceTo(prevPoint);
            currentDistance += segmentLength;

            // Create myelin segments with proper spacing for nodes of Ranvier
            if (currentDistance >= myelinLength) {
                const myelinGeometry = new THREE.CylinderGeometry(
                    0.5,  // top radius
                    0.5,  // bottom radius
                    myelinLength - nodeLength,    // length minus node gap
                    16,   // segments
                    3,    // height segments
                    true  // open-ended
                );

                const myelin = new THREE.Mesh(myelinGeometry, myelinMaterial);
                myelin.position.copy(point);
                
                // Orient myelin segment along axon
                if (i < axonPoints.length - 1) {
                    myelin.lookAt(axonPoints[i + 1]);
                    myelin.rotateX(Math.PI / 2);
                }
                
                this.scene.add(myelin);
                currentDistance = 0; // Reset distance for next segment
            }
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
            const startPos = soma.position.clone();
            
            // Create primary dendrite branch
            this.createDendriteBranch(
                startPos,
                angle,
                length,
                0.2,
                4, // Increased branch depth
                dendriteMaterial,
                Math.PI / 4 // Maximum branch angle
            );
        }
    }

    createDendriteBranch(startPos, angle, length, radius, branchDepth, material, maxBranchAngle) {
        if (branchDepth <= 0) return;

        // Add some natural variation to the branch
        const endPos = new THREE.Vector3(
            startPos.x + Math.cos(angle) * length + (Math.random() - 0.5) * 0.5,
            startPos.y + Math.sin(angle) * length + (Math.random() - 0.5) * 0.5,
            startPos.z + (Math.random() - 0.5) * length
        );

        // Create points for curved branch
        const points = [];
        const segments = 5;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
            
            // Add some natural waviness
            if (i > 0 && i < segments) {
                pos.x += Math.sin(t * Math.PI) * 0.2;
                pos.y += Math.sin(t * Math.PI * 2) * 0.2;
            }
            points.push(pos);
        }

        // Create curved dendrite segment
        const curve = new THREE.CatmullRomCurve3(points);
        const dendriteGeometry = new THREE.TubeGeometry(
            curve,
            8,     // tubular segments
            radius, // radius
            6,     // radial segments
            false  // closed
        );

        const dendrite = new THREE.Mesh(dendriteGeometry, material);
        this.scene.add(dendrite);

        // Create branches with decreasing probability as we go deeper
        const branchCount = Math.max(2, Math.floor(Math.random() * 4));
        const branchProbability = 0.7 * (branchDepth / 4); // Reduce probability with depth

        for (let i = 0; i < branchCount; i++) {
            if (Math.random() < branchProbability) {
                const branchAngle = angle + (Math.random() - 0.5) * maxBranchAngle;
                const newLength = length * 0.7;
                const newRadius = radius * 0.8;
                
                this.createDendriteBranch(
                    endPos,
                    branchAngle,
                    newLength,
                    newRadius,
                    branchDepth - 1,
                    material,
                    maxBranchAngle * 0.8 // Reduce maximum branch angle with depth
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

        // Rotate camera around the scene
        const time = Date.now() * 0.0001;
        this.camera.position.x = Math.cos(time) * 30;
        this.camera.position.z = Math.sin(time) * 30;
        this.camera.position.y = 15 + Math.sin(time * 0.5) * 5;
        this.camera.lookAt(0, 0, 0);

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
        // Create axon terminal with more realistic bulbous shape
        const terminalShape = new THREE.Shape();
        const bulbRadius = 2.5;
        const neckRadius = 1.2;
        
        // Create custom bulbous shape
        terminalShape.moveTo(0, -bulbRadius);
        terminalShape.quadraticCurveTo(bulbRadius, -bulbRadius, bulbRadius, 0);
        terminalShape.quadraticCurveTo(bulbRadius, bulbRadius, 0, bulbRadius);
        terminalShape.quadraticCurveTo(-bulbRadius, bulbRadius, -bulbRadius, 0);
        terminalShape.quadraticCurveTo(-bulbRadius, -bulbRadius, 0, -bulbRadius);

        const extrudeSettings = {
            steps: 1,
            depth: 2,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelSegments: 3
        };

        const terminalGeometry = new THREE.ExtrudeGeometry(terminalShape, extrudeSettings);
        const neuronMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        this.axonTerminal = new THREE.Mesh(terminalGeometry, neuronMaterial);
        this.axonTerminal.position.set(-5, 0, -1);
        this.scene.add(this.axonTerminal);

        // Create vesicle pool regions
        this.createVesiclePoolRegions();
        
        // Add flow particles in terminal
        this.createAxonalFlow();

        // Create postsynaptic density with proper membrane proteins
        this.createPostsynapticDensity();

        // Create more detailed synaptic cleft with proper spacing
        const cleftWidth = 0.04; // 40 nanometers in scene units
        const cleftGeometry = new THREE.BoxGeometry(5, cleftWidth, 4);
        const cleftMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
        this.synapticCleft.position.set(0, 0, 0);
        this.scene.add(this.synapticCleft);

        // Add extracellular matrix elements in the cleft
        this.createExtracellularMatrix();

        // Create adhesion molecules with proper spacing
        this.createAdhesionMolecules();

        // Add reuptake transporters with proper distribution
        this.createReuptakeTransporters();

        // Create calcium channels
        this.createCalciumChannels();
    }

    createVesiclePoolRegions() {
        // Create reserve pool
        const reservePoolGeometry = new THREE.TorusGeometry(1.5, 0.3, 16, 32);
        const poolMaterial = new THREE.MeshPhongMaterial({
            color: 0x88ff88,
            transparent: true,
            opacity: 0.3
        });
        const reservePool = new THREE.Mesh(reservePoolGeometry, poolMaterial);
        reservePool.position.set(-4.5, 0, 0);
        this.axonTerminal.add(reservePool);

        // Create readily releasable pool near membrane
        const rrpGeometry = new THREE.TorusGeometry(0.8, 0.2, 16, 32);
        const rrpMaterial = poolMaterial.clone();
        rrpMaterial.color.setHex(0xff8888);
        const rrp = new THREE.Mesh(rrpGeometry, rrpMaterial);
        rrp.position.set(-3.2, 0, 0);
        this.axonTerminal.add(rrp);
    }

    createPostsynapticDensity() {
        const psdGeometry = new THREE.BoxGeometry(3, 0.2, 2);
        const psdMaterial = new THREE.MeshPhongMaterial({
            color: 0xff8866,
            transparent: true,
            opacity: 0.6
        });
        this.psd = new THREE.Mesh(psdGeometry, psdMaterial);
        this.psd.position.set(5, 0.1, 0);
        this.scene.add(this.psd);

        // Add receptor clusters
        const receptorCount = 12;
        const receptorGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const receptorMaterial = new THREE.MeshPhongMaterial({
            color: 0x44ff44,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < receptorCount; i++) {
            const receptor = new THREE.Mesh(receptorGeometry, receptorMaterial);
            const angle = (i / receptorCount) * Math.PI * 2;
            const radius = 0.8;
            receptor.position.set(
                Math.cos(angle) * radius,
                0.15,
                Math.sin(angle) * radius
            );
            this.psd.add(receptor);
        }
    }

    createCalciumChannels() {
        const channelCount = 8;
        const channelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
        const channelMaterial = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.7,
            emissive: 0xff0000,
            emissiveIntensity: 0.3
        });

        for (let i = 0; i < channelCount; i++) {
            const channel = new THREE.Mesh(channelGeometry, channelMaterial);
            const angle = (i / channelCount) * Math.PI * 2;
            const radius = 1.8;
            channel.position.set(
                Math.cos(angle) * radius - 3.5,
                0,
                Math.sin(angle) * radius
            );
            channel.rotation.x = Math.PI / 2;
            this.axonTerminal.add(channel);
        }
    }

    createExtracellularMatrix() {
        const matrixCount = 40;
        const matrixGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const matrixMaterial = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.4
        });

        for (let i = 0; i < matrixCount; i++) {
            const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial);
            matrix.position.set(
                (Math.random() - 0.5) * 4,
                0,
                (Math.random() - 0.5) * 3
            );
            this.synapticCleft.add(matrix);
        }
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

        // Update button appearance
        const inhibitBtn = document.getElementById('inhibitBtn');
        inhibitBtn.style.backgroundColor = this.reuptakeInhibited ? '#ff4444' : '#333';
        inhibitBtn.textContent = this.reuptakeInhibited ? 
            'Reuptake Inhibited' : 'Toggle Reuptake Inhibition';
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
                            
                            const startPos = nt.mesh.position.clone();
                            const targetPos = transporter.position.clone();
                            
                            const animate = (progress) => {
                                if (progress <= 1) {
                                    nt.mesh.position.lerpVectors(startPos, targetPos, progress);
                                    nt.mesh.material.opacity = 1 - progress;
                                    requestAnimationFrame(() => animate(progress + 0.05));
                                } else {
                                    this.scene.remove(nt.mesh);
                                    this.neurotransmitters = this.neurotransmitters.filter(n => n !== nt);
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
        const effects = document.getElementById('effects');
        const activeNTs = new Set();
        
        // Count bound neurotransmitters
        this.neurotransmitters.forEach(nt => {
            if (nt.bound) {
                activeNTs.add(nt.type);
            }
        });
        
        let effectText = '';
        activeNTs.forEach(type => {
            const properties = NEUROTRANSMITTER_TYPES[type];
            effectText += `<p><strong>${properties.name}:</strong> ${properties.description}</p>`;
        });
        
        effects.innerHTML = effectText || 'No active neurotransmitters';
        
        // Update emotional face if it exists
        if (this.emotionalFace) {
            try {
                this.emotionalFace.updateFromNeurotransmitters(this.neurotransmitters);
            } catch (error) {
                console.error('Error updating emotional face:', error);
            }
        }
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