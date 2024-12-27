import * as THREE from 'three';

class EmotionalFace {
    constructor() {
        try {
            // Create face scene
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(
                75,
                window.innerWidth * 0.2 / (window.innerHeight * 0.2),
                0.1,
                1000
            );
            
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true 
            });
            this.renderer.setSize(window.innerWidth * 0.2, window.innerHeight * 0.2);
            
            // Position the face renderer in top-right corner
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '100';
            container.appendChild(this.renderer.domElement);
            document.body.appendChild(container);

            this.camera.position.z = 5;
            
            // Initialize face parts
            this.createFace();
            
            // Start with neutral expression
            this.currentMood = {
                happiness: 0,
                arousal: 0,
                anxiety: 0
            };
            
            this.animate();
            console.log('EmotionalFace initialized successfully');
        } catch (error) {
            console.error('Error initializing EmotionalFace:', error);
            throw error;
        }
    }

    createFace() {
        // Create head
        const headGeometry = new THREE.CircleGeometry(2, 32);
        const headMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffdbac,
            side: THREE.DoubleSide 
        });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.scene.add(this.head);

        // Create eyes
        const eyeGeometry = new THREE.CircleGeometry(0.3, 32);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.leftEye.position.set(-0.8, 0.3, 0.1);
        
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye.position.set(0.8, 0.3, 0.1);
        
        this.scene.add(this.leftEye);
        this.scene.add(this.rightEye);

        // Create mouth (will be animated)
        const mouthGeometry = new THREE.BufferGeometry();
        const mouthCurve = new THREE.QuadraticBezierCurve(
            new THREE.Vector2(-1, 0),
            new THREE.Vector2(0, 0),
            new THREE.Vector2(1, 0)
        );
        
        const points = mouthCurve.getPoints(50);
        const vertices = new Float32Array(points.length * 3);
        
        for (let i = 0; i < points.length; i++) {
            vertices[i * 3] = points[i].x;
            vertices[i * 3 + 1] = points[i].y;
            vertices[i * 3 + 2] = 0;
        }
        
        mouthGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        const mouthMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        this.mouth = new THREE.Line(mouthGeometry, mouthMaterial);
        this.mouth.position.set(0, -0.5, 0.1);
        this.mouth.scale.set(0.8, 1, 1);
        
        this.scene.add(this.mouth);
    }

    updateExpression(neurotransmitters) {
        if (!Array.isArray(neurotransmitters)) {
            console.warn('Invalid neurotransmitters array provided');
            return;
        }

        // Update mood based on neurotransmitter levels
        this.currentMood = {
            happiness: 0,
            arousal: 0,
            anxiety: 0
        };

        neurotransmitters.forEach(nt => {
            if (!nt || !nt.type) {
                console.warn('Invalid neurotransmitter object:', nt);
                return;
            }

            switch(nt.type) {
                case 'DOPAMINE':
                    this.currentMood.happiness += 0.3;
                    this.currentMood.arousal += 0.2;
                    break;
                case 'SEROTONIN':
                    this.currentMood.happiness += 0.2;
                    this.currentMood.anxiety -= 0.3;
                    break;
                case 'NOREPINEPHRINE':
                    this.currentMood.arousal += 0.3;
                    this.currentMood.anxiety += 0.2;
                    break;
                case 'GABA':
                    this.currentMood.anxiety -= 0.2;
                    this.currentMood.arousal -= 0.2;
                    break;
            }
        });

        // Update facial features
        this.updateMouth();
        this.updateEyes();
    }

    updateMouth() {
        // Create mouth curve based on happiness
        const mouthCurve = new THREE.QuadraticBezierCurve(
            new THREE.Vector2(-1, 0),
            new THREE.Vector2(0, this.currentMood.happiness),
            new THREE.Vector2(1, 0)
        );
        
        const points = mouthCurve.getPoints(50);
        const vertices = new Float32Array(points.length * 3);
        
        for (let i = 0; i < points.length; i++) {
            vertices[i * 3] = points[i].x;
            vertices[i * 3 + 1] = points[i].y;
            vertices[i * 3 + 2] = 0;
        }
        
        this.mouth.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }

    updateEyes() {
        // Adjust eye size based on arousal
        const baseScale = 1 + (this.currentMood.arousal * 0.3);
        this.leftEye.scale.set(baseScale, baseScale, 1);
        this.rightEye.scale.set(baseScale, baseScale, 1);

        // Adjust eye position based on anxiety
        const anxietyOffset = this.currentMood.anxiety * 0.2;
        this.leftEye.position.y = 0.3 + anxietyOffset;
        this.rightEye.position.y = 0.3 + anxietyOffset;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

export { EmotionalFace }; 