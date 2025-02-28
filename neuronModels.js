import * as THREE from 'three';

export class NeuronModels {
    static createIrregularSomaGeometry() {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const positions = geometry.attributes.position;
        
        // Add irregularities to make it more biologically accurate
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Add random displacement
            positions.setXYZ(
                i,
                x + (Math.random() - 0.5) * 0.3,
                y + (Math.random() - 0.5) * 0.3,
                z + (Math.random() - 0.5) * 0.3
            );
        }
        
        geometry.computeVertexNormals();
        return geometry;
    }

    static createEndoplasmicReticulum() {
        const erGroup = new THREE.Group();
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
                erGroup.add(ribosome);
            }
            erGroup.add(membrane);
        }

        return erGroup;
    }

    static createNuclearMembrane() {
        const nucleusGroup = new THREE.Group();
        
        // Nuclear membrane (double layer)
        const nucleusMembrane = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 32, 32),
            new THREE.MeshPhongMaterial({
                color: 0x3498db,
                transparent: true,
                opacity: 0.6
            })
        );
        nucleusGroup.add(nucleusMembrane);

        // Nucleolus
        const nucleolus = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshPhongMaterial({
                color: 0x2ecc71,
                transparent: true,
                opacity: 0.9
            })
        );
        nucleolus.position.set(0, 0.2, 0);
        nucleusGroup.add(nucleolus);

        // Nuclear pores
        for (let i = 0; i < 20; i++) {
            const pore = new THREE.Mesh(
                new THREE.TorusGeometry(0.1, 0.02, 8, 16),
                new THREE.MeshPhongMaterial({
                    color: 0x2980b9,
                    transparent: true,
                    opacity: 0.8
                })
            );
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            pore.position.setFromSphericalCoords(1.2, phi, theta);
            pore.lookAt(0, 0, 0);
            nucleusGroup.add(pore);
        }

        return nucleusGroup;
    }

    static createDetailedMitochondrion() {
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
        for (let j = 0; j < cristaeCount; j++) {
            const cristae = new THREE.Mesh(
                new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI),
                new THREE.MeshPhongMaterial({
                    color: 0xc0392b,
                    transparent: true,
                    opacity: 0.8
                })
            );
            cristae.position.y = -0.3 + (j * 0.6 / cristaeCount);
            cristae.rotation.z = Math.PI / 2;
            mitochondrion.add(cristae);
        }

        return mitochondrion;
    }

    static createGolgiApparatus() {
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

    static createSchwannNucleus() {
        const nucleusGroup = new THREE.Group();

        // Main nucleus body
        const nucleusGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const nucleusMaterial = new THREE.MeshPhongMaterial({
            color: 0x3498db,
            transparent: true,
            opacity: 0.7
        });
        const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
        nucleusGroup.add(nucleus);

        // Nuclear membrane (double layer)
        const membraneGeometry = new THREE.SphereGeometry(0.31, 16, 16);
        const membraneMaterial = new THREE.MeshPhongMaterial({
            color: 0x2980b9,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
        nucleusGroup.add(membrane);

        // Add chromatin
        const chromatinCount = 10;
        for (let i = 0; i < chromatinCount; i++) {
            const chromatin = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 8, 8),
                new THREE.MeshPhongMaterial({
                    color: 0x8e44ad,
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const radius = 0.15 + Math.random() * 0.1;
            
            chromatin.position.setFromSphericalCoords(radius, phi, theta);
            nucleusGroup.add(chromatin);
        }

        // Add nuclear pores
        const poreCount = 8;
        for (let i = 0; i < poreCount; i++) {
            const pore = new THREE.Mesh(
                new THREE.TorusGeometry(0.03, 0.01, 8, 12),
                new THREE.MeshPhongMaterial({
                    color: 0x2c3e50,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            const phi = (i / poreCount) * Math.PI * 2;
            const theta = Math.PI / 2;
            pore.position.setFromSphericalCoords(0.31, phi, theta);
            pore.lookAt(0, 0, 0);
            nucleusGroup.add(pore);
        }

        return nucleusGroup;
    }

    static createDetailedReceptor(type) {
        const receptor = new THREE.Group();
        
        // Create receptor body
        const bodyGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: type.color,
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        receptor.add(body);

        // Add binding site
        const bindingSite = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 8, 8),
            new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6
            })
        );
        bindingSite.position.y = 0.2;
        receptor.add(bindingSite);

        // Add transmembrane domains
        const domainCount = 7;
        for (let i = 0; i < domainCount; i++) {
            const domain = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
                new THREE.MeshPhongMaterial({
                    color: type.color,
                    transparent: true,
                    opacity: 0.7
                })
            );
            domain.position.set(
                ((i - (domainCount - 1) / 2) * 0.06),
                -0.2,
                0
            );
            receptor.add(domain);
        }

        return receptor;
    }

    static createECMFiber(start, end) {
        const fiberGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1, 4);
        const fiberMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3
        });

        const fiber = new THREE.Mesh(fiberGeometry, fiberMaterial);
        
        // Position and orient fiber
        const direction = end.clone().sub(start);
        const center = start.clone().add(end).multiplyScalar(0.5);
        const length = direction.length();
        
        fiber.position.copy(center);
        fiber.scale.y = length;
        fiber.lookAt(end);
        
        return fiber;
    }

    static createProteinFilament(start, end) {
        const filamentGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 4);
        const filamentMaterial = new THREE.MeshPhongMaterial({
            color: 0x95a5a6,
            transparent: true,
            opacity: 0.4
        });

        const filament = new THREE.Mesh(filamentGeometry, filamentMaterial);
        
        // Position and orient filament
        const direction = end.clone().sub(start);
        const center = start.clone().add(end).multiplyScalar(0.5);
        const length = direction.length();
        
        filament.position.copy(center);
        filament.scale.y = length;
        filament.lookAt(end);
        
        return filament;
    }

    static createDetailedDendriteBranch(startPos, angle, length, radius, branchDepth, material, maxBranchAngle) {
        const branchGroup = new THREE.Group();
        if (branchDepth <= 0) return branchGroup;

        // Add more natural variation to the branch
        const endPos = new THREE.Vector3(
            startPos.x + Math.cos(angle) * length + (Math.random() - 0.5) * 0.8,
            startPos.y + Math.sin(angle) * length + (Math.random() - 0.5) * 0.8,
            startPos.z + (Math.random() - 0.5) * length * 0.5
        );

        // Create points for curved branch with more natural waviness
        const points = [];
        const segments = 8;
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

        // Create curved dendrite segment
        const curve = new THREE.CatmullRomCurve3(points);
        const dendriteGeometry = new THREE.TubeGeometry(
            curve,
            12,
            radius * (1 - (5 - branchDepth) * 0.15),
            8,
            false
        );

        const dendrite = new THREE.Mesh(dendriteGeometry, material.clone());
        branchGroup.add(dendrite);

        // Add spines along the dendrite
        if (branchDepth > 1) {
            const spines = this.createDendriticSpines(curve, radius, material);
            branchGroup.add(spines);
        }

        // Create branches
        const branchCount = Math.max(2, Math.floor(Math.random() * (branchDepth + 2)));
        const branchProbability = 0.8 * (branchDepth / 5);

        for (let i = 0; i < branchCount; i++) {
            if (Math.random() < branchProbability) {
                const t = 0.3 + Math.random() * 0.5;
                const branchPoint = curve.getPoint(t);
                const baseAngle = Math.atan2(
                    endPos.y - startPos.y,
                    endPos.x - startPos.x
                );
                const branchAngle = baseAngle + (Math.random() - 0.5) * maxBranchAngle;
                const newLength = length * (0.6 + Math.random() * 0.3);
                const newRadius = radius * 0.8;
                
                const branch = this.createDetailedDendriteBranch(
                    branchPoint,
                    branchAngle,
                    newLength,
                    newRadius,
                    branchDepth - 1,
                    material,
                    maxBranchAngle * 0.9
                );
                branchGroup.add(branch);
            }
        }

        return branchGroup;
    }

    static createDendriticSpines(curve, parentRadius, parentMaterial) {
        const spineGroup = new THREE.Group();
        const spineCount = Math.floor(curve.getLength() * 5);
        
        for (let i = 0; i < spineCount; i++) {
            if (Math.random() < 0.7) {
                const t = Math.random();
                const position = curve.getPoint(t);
                
                // Create spine with random orientation
                const spine = new THREE.Group();
                
                // Spine neck
                const neckGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6, 1);
                const neck = new THREE.Mesh(neckGeometry, parentMaterial.clone());
                
                // Spine head
                const headGeometry = new THREE.SphereGeometry(0.05, 8, 8);
                const head = new THREE.Mesh(headGeometry, parentMaterial.clone());
                head.position.y = 0.2;
                
                spine.add(neck);
                spine.add(head);
                
                spine.position.copy(position);
                spine.position.add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1
                    )
                );
                
                const spineAngle = Math.random() * Math.PI * 2;
                spine.rotation.set(
                    Math.random() * Math.PI * 0.25,
                    spineAngle,
                    Math.PI / 2 + (Math.random() - 0.5) * 0.5
                );
                
                spineGroup.add(spine);
            }
        }
        
        return spineGroup;
    }

    static createDetailedAxon(startPoint, endPoint) {
        const axonGroup = new THREE.Group();
        
        // Generate points for the axon path
        const points = this.generateAxonPoints(startPoint, endPoint);
        const curve = new THREE.CatmullRomCurve3(points);
        
        // Create main axon membrane
        const axonGeometry = new THREE.TubeGeometry(
            curve,
            50,
            0.5,
            12,
            false
        );

        const axonMaterial = new THREE.MeshPhongMaterial({
            color: 0xd35400,
            transparent: true,
            opacity: 0.7
        });

        const axonMesh = new THREE.Mesh(axonGeometry, axonMaterial);
        axonGroup.add(axonMesh);

        // Add axonal cytoskeleton
        const cytoskeleton = this.createAxonalCytoskeleton(curve);
        axonGroup.add(cytoskeleton);

        // Add myelin sheath
        const myelinSheath = this.createDetailedMyelinSheath(curve);
        axonGroup.add(myelinSheath);

        return axonGroup;
    }

    static generateAxonPoints(startPoint, endPoint) {
        const points = [];
        const segments = 15;
        const controlPoints = [
            startPoint,
            new THREE.Vector3(
                startPoint.x + (endPoint.x - startPoint.x) * 0.25,
                startPoint.y + Math.random() * 2 - 1,
                startPoint.z + Math.random() * 2 - 1
            ),
            new THREE.Vector3(
                startPoint.x + (endPoint.x - startPoint.x) * 0.5,
                startPoint.y + Math.random() * 2 - 1,
                startPoint.z + Math.random() * 2 - 1
            ),
            new THREE.Vector3(
                startPoint.x + (endPoint.x - startPoint.x) * 0.75,
                startPoint.y + Math.random() * 2 - 1,
                startPoint.z + Math.random() * 2 - 1
            ),
            endPoint
        ];

        const curve = new THREE.CatmullRomCurve3(controlPoints);
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = curve.getPoint(t);
            
            const waviness = 0.2;
            const frequency = 3;
            point.y += Math.sin(t * Math.PI * frequency) * waviness;
            point.z += Math.cos(t * Math.PI * frequency) * waviness;
            
            points.push(point);
        }

        return points;
    }

    static createAxonalCytoskeleton(curve) {
        const cytoskeletonGroup = new THREE.Group();
        const points = curve.getPoints(50);
        
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
                50,
                0.03,
                6,
                false
            );

            const tubuleMaterial = new THREE.MeshPhongMaterial({
                color: 0x2ecc71,
                transparent: true,
                opacity: 0.7
            });

            const tubule = new THREE.Mesh(tubuleGeometry, tubuleMaterial);
            cytoskeletonGroup.add(tubule);
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
                50,
                0.02,
                4,
                false
            );

            const filamentMaterial = new THREE.MeshPhongMaterial({
                color: 0xe74c3c,
                transparent: true,
                opacity: 0.6
            });

            const filament = new THREE.Mesh(filamentGeometry, filamentMaterial);
            cytoskeletonGroup.add(filament);
        }

        return cytoskeletonGroup;
    }

    static createDetailedMyelinSheath(curve) {
        const myelinGroup = new THREE.Group();
        const points = curve.getPoints(50);
        const nodeSpacing = 10;
        
        for (let i = 0; i < points.length - nodeSpacing; i += nodeSpacing) {
            // Create Schwann cell with detailed structure
            const schwannCell = this.createDetailedSchwannCell(
                points.slice(i, i + nodeSpacing)
            );
            myelinGroup.add(schwannCell);

            // Create node of Ranvier
            if (i + nodeSpacing < points.length) {
                const node = this.createNodeOfRanvier(points[i + nodeSpacing]);
                myelinGroup.add(node);
            }
        }

        return myelinGroup;
    }

    static createDetailedSchwannCell(points) {
        const schwannGroup = new THREE.Group();
        
        // Create myelin layers
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
                color: 0x3498db,
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
        nucleus.position.y += 0.8;
        schwannGroup.add(nucleus);

        return schwannGroup;
    }

    static createNodeOfRanvier(position) {
        const nodeGroup = new THREE.Group();

        // Create sodium channels
        const channelCount = 8;
        const channelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
        const channelMaterial = new THREE.MeshPhongMaterial({
            color: 0xe74c3c,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < channelCount; i++) {
            const channel = new THREE.Mesh(channelGeometry, channelMaterial);
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
        return nodeGroup;
    }

    static createSynapticStructure() {
        const synapticGroup = new THREE.Group();

        // Create presynaptic terminal with bulbous shape as shown in diagram
        const terminalShape = new THREE.Shape();
        const bulbRadius = 3;
        const neckWidth = 1.2;
        
        // Create anatomically accurate bulbous shape
        terminalShape.moveTo(-neckWidth, 0);
        terminalShape.bezierCurveTo(
            -bulbRadius, 0,
            -bulbRadius, bulbRadius,
            0, bulbRadius
        );
        terminalShape.bezierCurveTo(
            bulbRadius, bulbRadius,
            bulbRadius, 0,
            neckWidth, 0
        );
        
        // Create tapered neck as shown in diagram
        terminalShape.lineTo(neckWidth * 0.8, -neckWidth * 1.5);
        terminalShape.lineTo(-neckWidth * 0.8, -neckWidth * 1.5);
        terminalShape.lineTo(-neckWidth, 0);

        const extrudeSettings = {
            steps: 1,
            depth: 2,
            bevelEnabled: true,
            bevelThickness: 0.2,
            bevelSize: 0.2,
            bevelSegments: 8
        };

        const terminalGeometry = new THREE.ExtrudeGeometry(terminalShape, extrudeSettings);
        const terminalMaterial = new THREE.MeshPhongMaterial({
            color: 0xe8d5b7,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        const presynapticTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        presynapticTerminal.rotation.x = Math.PI / 2;
        synapticGroup.add(presynapticTerminal);

        // Create synaptic vesicles with proper clustering as shown in diagram
        const vesicleCount = 15;
        const vesicleGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const vesicleMaterial = new THREE.MeshPhongMaterial({
            color: 0x98fb98,
            transparent: true,
            opacity: 0.8
        });

        // Create clustered vesicle organization
        for (let i = 0; i < vesicleCount; i++) {
            const vesicle = new THREE.Mesh(vesicleGeometry, vesicleMaterial.clone());
            
            // Position vesicles in clusters near active zones
            const cluster = Math.floor(i / 5);
            const clusterAngle = (cluster / 3) * Math.PI * 2;
            const clusterRadius = 1;
            
            vesicle.position.set(
                Math.cos(clusterAngle) * clusterRadius + (Math.random() - 0.5) * 0.4,
                0.5 + Math.random() * 0.5,
                Math.sin(clusterAngle) * clusterRadius + (Math.random() - 0.5) * 0.4
            );

            // Add neurotransmitter content visualization
            const ntContent = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 12, 12),
                new THREE.MeshPhongMaterial({
                    color: 0x90ee90,
                    transparent: true,
                    opacity: 0.9
                })
            );
            vesicle.add(ntContent);
            
            presynapticTerminal.add(vesicle);
        }

        // Create voltage-gated calcium channels as shown in diagram
        const channelCount = 8;
        const channelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 12);
        const channelMaterial = new THREE.MeshPhongMaterial({
            color: 0x4499ff,
            transparent: true,
            opacity: 0.9
        });

        // Position channels in active zones
        for (let i = 0; i < channelCount; i++) {
            const channel = new THREE.Mesh(channelGeometry, channelMaterial.clone());
            const angle = (i / channelCount) * Math.PI * 2;
            const radius = 1.5;
            
            channel.position.set(
                Math.cos(angle) * radius,
                -0.8,
                Math.sin(angle) * radius
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
            
            presynapticTerminal.add(channel);
        }

        // Create synaptic cleft with proper 20-40nm spacing
        const cleftGeometry = new THREE.BoxGeometry(4, 0.04, 3); // 40nm spacing
        const cleftMaterial = new THREE.MeshPhongMaterial({
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.1
        });
        
        const synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
        synapticCleft.position.y = -1;
        synapticGroup.add(synapticCleft);

        // Add extracellular matrix elements
        const matrixCount = 100;
        const matrixGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const matrixMaterial = new THREE.MeshPhongMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.3
        });

        // Create dense matrix network
        for (let i = 0; i < matrixCount; i++) {
            const matrix = new THREE.Mesh(matrixGeometry, matrixMaterial.clone());
            matrix.position.set(
                (Math.random() - 0.5) * 3.5,
                -1 + (Math.random() - 0.5) * 0.03,
                (Math.random() - 0.5) * 2.5
            );
            synapticCleft.add(matrix);

            // Add connecting fibers between ECM elements
            if (i > 0) {
                const prevMatrix = synapticCleft.children[Math.floor(Math.random() * i)];
                const fiber = this.createECMFiber(matrix.position, prevMatrix.position);
                synapticCleft.add(fiber);
            }
        }

        // Create postsynaptic density with receptor clusters
        const psdGeometry = new THREE.BoxGeometry(3.5, 0.2, 2.5);
        const psdMaterial = new THREE.MeshPhongMaterial({
            color: 0x2ecc71,
            transparent: true,
            opacity: 0.7
        });

        const psd = new THREE.Mesh(psdGeometry, psdMaterial);
        psd.position.y = -1.2;
        synapticGroup.add(psd);

        // Add receptor clusters as shown in diagram
        const receptorTypes = [
            { color: 0x3498db, name: 'AMPA', size: 0.2 },
            { color: 0xe74c3c, name: 'NMDA', size: 0.25 }
        ];

        receptorTypes.forEach((type, typeIndex) => {
            const clusterCount = 4;
            const receptorsPerCluster = 3;

            for (let i = 0; i < clusterCount; i++) {
                const cluster = new THREE.Group();
                const clusterAngle = (i / clusterCount) * Math.PI * 2;
                const clusterRadius = 1;
                
                for (let j = 0; j < receptorsPerCluster; j++) {
                    const receptor = this.createDetailedReceptor(type);
                    const receptorAngle = clusterAngle + (j / receptorsPerCluster - 0.5) * 0.5;
                    
                    receptor.position.set(
                        Math.cos(receptorAngle) * clusterRadius,
                        -0.1 - typeIndex * 0.2,
                        Math.sin(receptorAngle) * clusterRadius
                    );
                    receptor.rotation.x = Math.PI / 6;
                    
                    cluster.add(receptor);
                }

                psd.add(cluster);
            }
        });

        return synapticGroup;
    }
} 