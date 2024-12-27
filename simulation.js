import * as THREE from 'three';

class Neurotransmitter {
    constructor(position, type) {
        const geometry = new THREE.SphereGeometry(0.2, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: type === 'excitatory' ? 0x4444ff : 0x44ff44,
            shininess: 100
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.type = type;
        this.bound = false;
        this.reuptaking = false;

        // Create more directed movement toward receptors
        const targetX = 4; // Position near receptors
        const directionX = targetX - position.x;
        const spread = 0.3; // Reduced spread for more focused movement

        this.velocity = new THREE.Vector3(
            0.1 + Math.random() * 0.05, // Consistent forward movement
            (Math.random() - 0.5) * spread, // Limited vertical spread
            (Math.random() - 0.5) * spread  // Limited depth spread
        );
    }

    update() {
        if (!this.bound && !this.reuptaking) {
            // Add slight wavering motion while maintaining forward direction
            this.velocity.y += (Math.random() - 0.5) * 0.01;
            this.velocity.z += (Math.random() - 0.5) * 0.01;
            
            // Clamp vertical and depth movement to maintain focused path
            this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -0.05, 0.05);
            this.velocity.z = THREE.MathUtils.clamp(this.velocity.z, -0.05, 0.05);
            
            this.mesh.position.add(this.velocity);
        }
    }
}

class StorageVesicle {
    constructor(position) {
        // Create vesicle container
        const vesicleGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const vesicleMaterial = new THREE.MeshPhongMaterial({
            color: 0x99ccff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(vesicleGeometry, vesicleMaterial);
        this.mesh.position.copy(position);

        // Create stored neurotransmitters
        this.storedNeurotransmitters = [];
        const ntCount = 6; // number of neurotransmitters per vesicle
        const ntGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const ntMaterial = new THREE.MeshPhongMaterial({
            color: 0x6699ff
        });

        // Arrange neurotransmitters in a circular pattern inside vesicle
        for (let i = 0; i < ntCount; i++) {
            const nt = new THREE.Mesh(ntGeometry, ntMaterial);
            const angle = (i / ntCount) * Math.PI * 2;
            const radius = 0.15;
            
            nt.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
            );
            
            this.mesh.add(nt);
            this.storedNeurotransmitters.push(nt);
        }

        this.isMoving = false;
    }

    moveToReleasePosition(targetPos, onComplete) {
        if (this.isMoving) return;
        
        this.isMoving = true;
        const startPos = this.mesh.position.clone();
        const duration = 1000; // ms
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Use easing function for smooth movement
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.mesh.position.lerpVectors(startPos, targetPos, easeProgress);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isMoving = false;
                if (onComplete) onComplete();
            }
        };

        animate();
    }
}

class NeuronSimulation {
    constructor() {
        try {
            // Initialize properties
            this.neurotransmitters = [];
            this.receptors = [];
            
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
            document.body.appendChild(this.renderer.domElement);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.scene.add(ambientLight);

            const mainLight = new THREE.DirectionalLight(0xffffff, 1);
            mainLight.position.set(10, 10, 10);
            this.scene.add(mainLight);

            // Create neurons and receptors
            this.createNeurons();
            this.createReceptors();
            this.setupControls();

            // Create detailed synapse structure
            this.createSynapticStructure();
            this.createVesicles();
            this.createMembraneLipids();

            // Start animation
            this.animate();

            console.log('Scene setup complete');

            this.reuptakeInhibited = false; // Track reuptake inhibition state
            
            // Add reuptake inhibition toggle button
            const inhibitBtn = document.createElement('button');
            inhibitBtn.id = 'inhibitBtn';
            inhibitBtn.textContent = 'Toggle Reuptake Inhibition';
            document.querySelector('.controls').appendChild(inhibitBtn);
            
            inhibitBtn.addEventListener('click', () => {
                this.toggleReuptakeInhibition();
            });
        } catch (error) {
            console.error('Error in constructor:', error);
        }
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
        
        if (this.vesicles.length > 0) {
            const vesicle = this.vesicles[0];
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

        this.renderer.render(this.scene, this.camera);
    }

    createSynapticStructure() {
        // Create axon terminal (bulb-like structure as shown in diagram)
        const terminalGeometry = new THREE.SphereGeometry(2.5, 32, 32);
        const neuronMaterial = new THREE.MeshPhongMaterial({
            color: 0xffcc88, // More yellow/orange like in diagram
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        this.axonTerminal = new THREE.Mesh(terminalGeometry, neuronMaterial);
        this.axonTerminal.position.x = -5;
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
        const matrixGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const matrixMaterial = new THREE.MeshPhongMaterial({
            color: 0x88aaff,
            transparent: true,
            opacity: 0.3
        });

        // Add matrix proteins throughout the cleft
        for (let i = 0; i < 50; i++) {
            const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial);
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2;
            
            matrix.position.set(
                Math.random() * 0.8 - 0.4,
                Math.sin(angle) * radius,
                Math.cos(angle) * radius
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
        if (this.reuptakeInhibited) return; // Skip reuptake if inhibited

        this.neurotransmitters.forEach(nt => {
            if (!nt.bound && !nt.reuptaking) {
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
                            }
                        };
                        
                        animate(0);
                    }
                });
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