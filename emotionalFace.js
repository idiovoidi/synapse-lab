import * as THREE from 'three';

class EmotionalFace {
    constructor() {
        // Create face container
        this.container = new THREE.Group();
        this.container.position.set(20, 10, 0);
        this.container.scale.set(0.5, 0.5, 0.5);

        // Create face base
        const faceGeometry = new THREE.CircleGeometry(2, 32);
        const faceMaterial = new THREE.MeshPhongMaterial({
            color: 0xffdbac,
            side: THREE.DoubleSide
        });
        this.face = new THREE.Mesh(faceGeometry, faceMaterial);
        this.container.add(this.face);

        // Create eyes
        const eyeGeometry = new THREE.CircleGeometry(0.3, 32);
        const eyeMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        });

        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.7, 0.3, 0.1);
        this.container.add(this.leftEye);

        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.7, 0.3, 0.1);
        this.container.add(this.rightEye);

        // Create mouth (will be updated based on emotion)
        this.mouthGeometry = new THREE.BufferGeometry();
        const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        this.mouth = new THREE.Line(this.mouthGeometry, mouthMaterial);
        this.container.add(this.mouth);

        // Set default emotion
        this.setEmotion('neutral');
    }

    setEmotion(emotion) {
        const mouthPoints = [];
        
        switch(emotion) {
            case 'happy':
                mouthPoints.push(
                    new THREE.Vector3(-1, -0.3, 0.1),
                    new THREE.Vector3(0, -0.1, 0.1),
                    new THREE.Vector3(1, -0.3, 0.1)
                );
                this.face.material.color.setHex(0xffdbac);
                break;
            case 'sad':
                mouthPoints.push(
                    new THREE.Vector3(-1, -0.5, 0.1),
                    new THREE.Vector3(0, -0.7, 0.1),
                    new THREE.Vector3(1, -0.5, 0.1)
                );
                this.face.material.color.setHex(0xffd0a0);
                break;
            case 'excited':
                mouthPoints.push(
                    new THREE.Vector3(-1, -0.2, 0.1),
                    new THREE.Vector3(0, 0, 0.1),
                    new THREE.Vector3(1, -0.2, 0.1)
                );
                this.face.material.color.setHex(0xffe4b5);
                break;
            case 'neutral':
            default:
                mouthPoints.push(
                    new THREE.Vector3(-1, -0.4, 0.1),
                    new THREE.Vector3(0, -0.4, 0.1),
                    new THREE.Vector3(1, -0.4, 0.1)
                );
                this.face.material.color.setHex(0xffdbac);
                break;
        }

        // Update mouth geometry
        this.mouthGeometry.setFromPoints(mouthPoints);
    }

    updateFromNeurotransmitters(neurotransmitters) {
        try {
            let dopamineCount = 0;
            let serotoninCount = 0;
            let norepinephrineCount = 0;

            // Count bound neurotransmitters
            neurotransmitters.forEach(nt => {
                if (nt.bound) {
                    switch(nt.type) {
                        case 'DOPAMINE':
                            dopamineCount++;
                            break;
                        case 'SEROTONIN':
                            serotoninCount++;
                            break;
                        case 'NOREPINEPHRINE':
                            norepinephrineCount++;
                            break;
                    }
                }
            });

            // Determine emotion based on neurotransmitter levels
            if (dopamineCount > 3) {
                this.setEmotion('excited');
            } else if (serotoninCount > 3) {
                this.setEmotion('happy');
            } else if (norepinephrineCount > 3) {
                this.setEmotion('excited');
            } else if (dopamineCount < 1 && serotoninCount < 1) {
                this.setEmotion('sad');
            } else {
                this.setEmotion('neutral');
            }
        } catch (error) {
            console.error('Error updating emotional face:', error);
        }
    }

    getObject() {
        return this.container;
    }
}

export { EmotionalFace }; 