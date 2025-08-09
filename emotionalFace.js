import * as THREE from 'three';

/**
 * Simple 2D face that visualizes mood (happiness, arousal, anxiety).
 * Now with smoother transitions, pupils, eyebrows, and blinking.
 */
export class EmotionalFace {
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
            this.currentMood = { happiness: 0, arousal: 0, anxiety: 0 };
            this.targetMood = { happiness: 0, arousal: 0, anxiety: 0 };
            this.moodLerpSpeed = 0.12; // smoothing factor per frame

            // Blinking state
            this.isBlinking = false;
            this.nextBlinkAt = performance.now() + this._randomBlinkDelay();
            
            this.animate();
            console.log('EmotionalFace initialized successfully');
        } catch (error) {
            console.error('Error initializing EmotionalFace:', error);
            throw error;
        }
    }

    createFace() {
        // Create head
        const headGeometry = new THREE.CircleGeometry(2, 64);
        const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffdbac, side: THREE.DoubleSide });
        this.head = new THREE.Mesh(headGeometry, headMaterial);
        this.scene.add(this.head);

        // Create eyes (sclera + pupil grouped)
        const scleraGeometry = new THREE.CircleGeometry(0.32, 32);
        const scleraMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.CircleGeometry(0.12, 16);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const makeEye = (x, y) => {
            const group = new THREE.Group();
            const sclera = new THREE.Mesh(scleraGeometry, scleraMaterial);
            const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            pupil.position.set(0, 0, 0.01);
            group.add(sclera);
            group.add(pupil);
            group.position.set(x, y, 0.1);
            group.userData.pupil = pupil;
            return group;
        };

        this.leftEye = makeEye(-0.8, 0.35);
        this.rightEye = makeEye(0.8, 0.35);
        this.scene.add(this.leftEye);
        this.scene.add(this.rightEye);

        // Eyebrows
        const browGeometry = new THREE.PlaneGeometry(0.8, 0.08);
        const browMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
        this.leftBrow = new THREE.Mesh(browGeometry, browMaterial);
        this.rightBrow = new THREE.Mesh(browGeometry, browMaterial);
        this.leftBrow.position.set(-0.8, 0.9, 0.11);
        this.rightBrow.position.set(0.8, 0.9, 0.11);
        this.scene.add(this.leftBrow);
        this.scene.add(this.rightBrow);

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

    updateExpression(moodSummaryOrNeurotransmitters) {
        // Accept either a precomputed mood summary or a list of NTs (backward compatibility)
        const summary = moodSummaryOrNeurotransmitters;
        if (summary && typeof summary === 'object' && 'happiness' in summary) {
            this.targetMood = {
                happiness: this._clamp(summary.happiness || 0, -1, 1),
                arousal: this._clamp(summary.arousal || 0, -1, 1),
                anxiety: this._clamp(summary.anxiety || 0, -1, 1)
            };
        } else if (Array.isArray(summary)) {
            // Fallback: compute roughly from NT list
            this.targetMood = { happiness: 0, arousal: 0, anxiety: 0 };
            summary.forEach(nt => {
                if (!nt || !nt.type) return;
                switch(nt.type) {
                    case 'DOPAMINE':
                        this.targetMood.happiness += 0.3; this.targetMood.arousal += 0.2; break;
                    case 'SEROTONIN':
                        this.targetMood.happiness += 0.2; this.targetMood.anxiety -= 0.3; break;
                    case 'NOREPINEPHRINE':
                        this.targetMood.arousal += 0.3; this.targetMood.anxiety += 0.2; break;
                    case 'GABA':
                        this.targetMood.anxiety -= 0.2; this.targetMood.arousal -= 0.2; break;
                }
            });
        } else {
            return;
        }
        // Features update happens each animation frame with smoothing
    }

    updateMouth() {
        // Create mouth curve based on happiness (curvature) and arousal (width)
        const widthScale = 0.8 + (this.currentMood.arousal * 0.2);
        const mouthCurve = new THREE.QuadraticBezierCurve(
            new THREE.Vector2(-1, 0),
            new THREE.Vector2(0, this.currentMood.happiness),
            new THREE.Vector2(1, 0)
        );
        
        const points = mouthCurve.getPoints(50);
        const vertices = new Float32Array(points.length * 3);
        
        for (let i = 0; i < points.length; i++) {
            vertices[i * 3] = points[i].x * widthScale;
            vertices[i * 3 + 1] = points[i].y;
            vertices[i * 3 + 2] = 0;
        }
        
        this.mouth.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }

    updateEyes() {
        // Pupil dilation with arousal
        const pupilScale = 1 + (this.currentMood.arousal * 0.6);
        this.leftEye.userData.pupil.scale.set(pupilScale, pupilScale, 1);
        this.rightEye.userData.pupil.scale.set(pupilScale, pupilScale, 1);

        // Eye group vertical shift with anxiety
        const anxietyOffset = this.currentMood.anxiety * 0.15;
        this.leftEye.position.y = 0.35 + anxietyOffset;
        this.rightEye.position.y = 0.35 + anxietyOffset;

        // Simulate eyelid squinting with anxiety by scaling Y
        const squint = 1 - Math.max(0, this.currentMood.anxiety) * 0.5;
        const blinkScale = this.isBlinking ? 0.05 : 1;
        const eyeScaleY = Math.max(0.05, squint * blinkScale);
        this.leftEye.scale.y = eyeScaleY;
        this.rightEye.scale.y = eyeScaleY;

        // Subtle jitter with high anxiety
        const jitter = Math.max(0, this.currentMood.anxiety) * 0.02;
        this.leftEye.position.x = -0.8 + (Math.random() - 0.5) * jitter;
        this.rightEye.position.x = 0.8 + (Math.random() - 0.5) * jitter;
    }

    updateEyebrows() {
        // Eyebrows angle: raised with happiness, furrowed with anxiety
        const raise = this.currentMood.happiness * 0.25;
        const furrow = this.currentMood.anxiety * 0.4;
        this.leftBrow.position.y = 0.9 + raise - Math.max(0, furrow) * 0.1;
        this.rightBrow.position.y = 0.9 + raise - Math.max(0, furrow) * 0.1;
        this.leftBrow.rotation.z = 0.1 * furrow;
        this.rightBrow.rotation.z = -0.1 * furrow;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        // Smoothly move currentMood toward targetMood
        this._stepMood();

        // Blink scheduling
        const now = performance.now();
        if (now >= this.nextBlinkAt && !this.isBlinking) {
            this._doBlink();
            this.nextBlinkAt = now + this._randomBlinkDelay();
        }

        // Update facial features
        this.updateMouth();
        this.updateEyes();
        this.updateEyebrows();
        this.renderer.render(this.scene, this.camera);
    }

    _stepMood() {
        const lerp = (a, b, t) => a + (b - a) * t;
        const t = this.moodLerpSpeed;
        this.currentMood.happiness = lerp(this.currentMood.happiness, this.targetMood.happiness, t);
        this.currentMood.arousal = lerp(this.currentMood.arousal, this.targetMood.arousal, t);
        this.currentMood.anxiety = lerp(this.currentMood.anxiety, this.targetMood.anxiety, t);
    }

    _doBlink() {
        this.isBlinking = true;
        // End blink after short delay
        setTimeout(() => { this.isBlinking = false; }, 120);
    }

    _randomBlinkDelay() {
        // Faster, more frequent blinks with higher anxiety
        const base = 2500; // ms
        const anxietyFactor = 1 - Math.max(0, Math.min(1, this.targetMood.anxiety));
        const jitter = 500 + Math.random() * 800;
        return base * anxietyFactor + jitter;
    }

    _clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
} 