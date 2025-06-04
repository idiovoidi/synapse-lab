import * as THREE from 'three';
import { GEOMETRY_CONSTANTS, MATERIAL_PROPERTIES } from '../constants/config';
import { createBezierCurve, createWavyPath } from '../utils/mathUtils';

export class SynapticStructure {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.vesicles = new Set();
        this.calciumChannels = new Set();
        this.activeZones = new Set();
        
        this.createStructure();
        scene.add(this.group);
    }

    createStructure() {
        // Create presynaptic terminal with more anatomically accurate shape
        this.createPresynapticTerminal();
        
        // Add internal organelles and cytoskeleton
        this.createInternalStructures();
        
        // Create synaptic vesicles with proper organization
        this.createVesiclePool();
        
        // Add voltage-gated calcium channels in active zones
        this.createCalciumChannels();
        
        // Create detailed synaptic cleft with ECM
        this.createSynapticCleft();
        
        // Create postsynaptic density with receptor organization
        this.createPostsynapticDensity();
    }

    createPresynapticTerminal() {
        const { BULB_RADIUS, NECK_WIDTH } = GEOMETRY_CONSTANTS.TERMINAL;
        
        // Create anatomically accurate bulbous shape
        const terminalShape = new THREE.Shape();
        const controlPoints = [
            new THREE.Vector2(-NECK_WIDTH, 0),
            new THREE.Vector2(-BULB_RADIUS, 0),
            new THREE.Vector2(-BULB_RADIUS, BULB_RADIUS),
            new THREE.Vector2(0, BULB_RADIUS * 1.2),
            new THREE.Vector2(BULB_RADIUS, BULB_RADIUS),
            new THREE.Vector2(BULB_RADIUS, 0),
            new THREE.Vector2(NECK_WIDTH, 0)
        ];

        terminalShape.moveTo(controlPoints[0].x, controlPoints[0].y);
        terminalShape.bezierCurveTo(
            controlPoints[1].x, controlPoints[1].y,
            controlPoints[2].x, controlPoints[2].y,
            controlPoints[3].x, controlPoints[3].y
        );
        terminalShape.bezierCurveTo(
            controlPoints[4].x, controlPoints[4].y,
            controlPoints[5].x, controlPoints[5].y,
            controlPoints[6].x, controlPoints[6].y
        );

        // Create tapered neck
        terminalShape.lineTo(NECK_WIDTH * 0.8, -NECK_WIDTH * 1.5);
        terminalShape.lineTo(-NECK_WIDTH * 0.8, -NECK_WIDTH * 1.5);
        terminalShape.lineTo(-NECK_WIDTH, 0);

        const extrudeSettings = {
            steps: 1,
            depth: BULB_RADIUS * 1.5,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelSegments: 8
        };

        const terminalGeometry = new THREE.ExtrudeGeometry(terminalShape, extrudeSettings);
        const terminalMaterial = new THREE.MeshPhongMaterial(MATERIAL_PROPERTIES.MEMBRANE);

        this.presynapticTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        this.presynapticTerminal.rotation.x = Math.PI / 2;
        this.group.add(this.presynapticTerminal);
    }

    createInternalStructures() {
        // Add microtubules for vesicle transport
        const microtubuleCount = 8;
        const microtubuleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 4, 6);
        const microtubuleMaterial = new THREE.MeshPhongMaterial({
            color: 0x90caf9,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < microtubuleCount; i++) {
            const angle = (i / microtubuleCount) * Math.PI * 2;
            const radius = 0.8;
            
            const microtubule = new THREE.Mesh(microtubuleGeometry, microtubuleMaterial);
            microtubule.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            microtubule.rotation.x = Math.PI / 2;
            this.presynapticTerminal.add(microtubule);
        }

        // Add mitochondria for energy production
        const mitochondriaCount = 3;
        for (let i = 0; i < mitochondriaCount; i++) {
            const mitochondrion = this.createMitochondrion();
            const angle = (i / mitochondriaCount) * Math.PI * 2;
            const radius = 1.2;
            
            mitochondrion.position.set(
                Math.cos(angle) * radius,
                0.5,
                Math.sin(angle) * radius
            );
            this.presynapticTerminal.add(mitochondrion);
        }
    }

    createMitochondrion() {
        const mitochondrion = new THREE.Group();
        
        // Outer membrane
        const outerMembrane = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.2, 0.6, 8, 16),
            new THREE.MeshPhongMaterial({
                color: 0xe74c3c,
                transparent: true,
                opacity: 0.6
            })
        );
        mitochondrion.add(outerMembrane);

        // Inner membrane with cristae
        const cristaeCount = 8;
        for (let i = 0; i < cristaeCount; i++) {
            const cristae = new THREE.Mesh(
                new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI),
                new THREE.MeshPhongMaterial({
                    color: 0xc0392b,
                    transparent: true,
                    opacity: 0.8
                })
            );
            cristae.position.y = -0.3 + (i * 0.6 / cristaeCount);
            cristae.rotation.z = Math.PI / 2;
            mitochondrion.add(cristae);
        }

        return mitochondrion;
    }

    createVesiclePool() {
        const { RADIUS, SEGMENTS } = GEOMETRY_CONSTANTS.VESICLE;
        const vesicleGeometry = new THREE.SphereGeometry(RADIUS, SEGMENTS, SEGMENTS);
        const vesicleMaterial = new THREE.MeshPhongMaterial(MATERIAL_PROPERTIES.VESICLE);

        // Create reserve pool
        const reservePoolCount = 30;
        for (let i = 0; i < reservePoolCount; i++) {
            const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial.clone());
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const radius = 1 + Math.random() * 0.5;
            
            vesicle.position.setFromSphericalCoords(radius, phi, theta);
            vesicle.position.y += 0.5;
            this.presynapticTerminal.add(vesicle);
            this.vesicles.add(vesicle);
        }

        // Create readily releasable pool near active zones
        const rrpCount = 15;
        const activeZonePositions = this.createActiveZones();
        
        activeZonePositions.forEach(position => {
            for (let i = 0; i < rrpCount / activeZonePositions.length; i++) {
                const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial.clone());
                vesicle.position.copy(position);
                vesicle.position.add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.4,
                    0.2 + Math.random() * 0.3,
                    (Math.random() - 0.5) * 0.4
                ));
                this.presynapticTerminal.add(vesicle);
                this.vesicles.add(vesicle);
            }
        });
    }

    createActiveZones() {
        const activeZonePositions = [];
        const activeZoneCount = 4;
        
        for (let i = 0; i < activeZoneCount; i++) {
            const angle = (i / activeZoneCount) * Math.PI * 2;
            const radius = 1.5;
            const position = new THREE.Vector3(
                Math.cos(angle) * radius,
                -0.8,
                Math.sin(angle) * radius
            );
            
            // Create active zone scaffold proteins
            const scaffold = this.createActiveZoneScaffold(position);
            this.presynapticTerminal.add(scaffold);
            activeZonePositions.push(position);
            this.activeZones.add(scaffold);
        }
        
        return activeZonePositions;
    }

    createActiveZoneScaffold(position) {
        const scaffold = new THREE.Group();
        scaffold.position.copy(position);

        // Create protein dense region
        const scaffoldGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 8);
        const scaffoldMaterial = new THREE.MeshPhongMaterial({
            color: 0x8e44ad,
            transparent: true,
            opacity: 0.7
        });
        
        const scaffoldMesh = new THREE.Mesh(scaffoldGeometry, scaffoldMaterial);
        scaffold.add(scaffoldMesh);

        return scaffold;
    }

    createCalciumChannels() {
        const channelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
        const channelMaterial = new THREE.MeshPhongMaterial(MATERIAL_PROPERTIES.CALCIUM_CHANNEL);

        this.activeZones.forEach(activeZone => {
            const channelCount = 6;
            for (let i = 0; i < channelCount; i++) {
                const angle = (i / channelCount) * Math.PI * 2;
                const radius = 0.15;
                
                const channel = new THREE.Mesh(channelGeometry, channelMaterial.clone());
                channel.position.set(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );
                
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
                
                activeZone.add(channel);
                this.calciumChannels.add(channel);
            }
        });
    }

    createSynapticCleft() {
        const { WIDTH, HEIGHT, DEPTH } = GEOMETRY_CONSTANTS.SYNAPTIC_CLEFT;
        
        // Create main cleft space
        const cleftGeometry = new THREE.BoxGeometry(WIDTH, HEIGHT, DEPTH);
        const cleftMaterial = new THREE.MeshPhongMaterial({
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.1
        });
        
        this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
        this.synapticCleft.position.y = -1;
        this.group.add(this.synapticCleft);

        // Add extracellular matrix
        this.createExtracellularMatrix();
    }

    createExtracellularMatrix() {
        const matrixCount = 100;
        const matrixGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const matrixMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3
        });

        const matrixElements = [];
        for (let i = 0; i < matrixCount; i++) {
            const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial.clone());
            matrix.position.set(
                (Math.random() - 0.5) * 3.5,
                -1 + (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 2.5
            );
            this.synapticCleft.add(matrix);
            matrixElements.push(matrix);

            // Add connecting fibers between ECM elements
            if (i > 0) {
                const prevMatrix = matrixElements[Math.floor(Math.random() * i)];
                const fiber = this.createECMFiber(matrix.position, prevMatrix.position);
                this.synapticCleft.add(fiber);
            }
        }
    }

    createECMFiber(start, end) {
        const direction = end.clone().sub(start);
        const length = direction.length();
        
        const fiber = new THREE.Mesh(
            new THREE.CylinderGeometry(0.01, 0.01, length, 4),
            new THREE.MeshPhongMaterial({
                color: 0xcccccc,
                transparent: true,
                opacity: 0.3
            })
        );
        
        fiber.position.copy(start.clone().add(end).multiplyScalar(0.5));
        fiber.lookAt(end);
        
        return fiber;
    }

    createPostsynapticDensity() {
        // Create main PSD structure
        const psdGeometry = new THREE.BoxGeometry(3.5, 0.2, 2.5);
        const psdMaterial = new THREE.MeshPhongMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.7
        });

        this.postsynapticDensity = new THREE.Mesh(psdGeometry, psdMaterial);
        this.postsynapticDensity.position.y = -1.2;
        this.group.add(this.postsynapticDensity);

        // Add scaffold proteins
        this.createPSDScaffold();
    }

    createPSDScaffold() {
        const scaffoldCount = 20;
        const scaffoldGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.1);
        const scaffoldMaterial = new THREE.MeshPhongMaterial({
            color: 0x27ae60,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < scaffoldCount; i++) {
            const scaffold = new THREE.Mesh(scaffoldGeometry, scaffoldMaterial.clone());
            scaffold.position.set(
                (Math.random() - 0.5) * 3,
                0,
                (Math.random() - 0.5) * 2
            );
            this.postsynapticDensity.add(scaffold);
        }
    }

    dispose() {
        this.group.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }
    }
} 