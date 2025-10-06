import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Manages the Three.js scene, camera, renderer, and animation loop.
 */
export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        // Darker, more professional background with subtle gradient
        this.scene.background = new THREE.Color(0x0a0a0f);
        this.scene.fog = new THREE.Fog(0x0a0a0f, 30, 100);

        this.camera = new THREE.PerspectiveCamera(
            60, // Slightly narrower FOV for less distortion
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        // Better angle to see the synaptic cleft and neurotransmitter flow
        this.camera.position.set(0, 8, 25);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        // Handle resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Enhanced lighting setup
        const ambientLight = new THREE.AmbientLight(0x333344, 0.4);
        this.scene.add(ambientLight);
        
        // Main key light (from top-right)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(15, 15, 15);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        this.scene.add(mainLight);
        
        // Fill light (from left, cooler tone)
        const fillLight = new THREE.DirectionalLight(0x6688ff, 0.5);
        fillLight.position.set(-10, 5, 10);
        this.scene.add(fillLight);
        
        // Rim light (from behind, warm tone)
        const rimLight = new THREE.DirectionalLight(0xffaa88, 0.6);
        rimLight.position.set(0, 5, -15);
        this.scene.add(rimLight);
        
        // Spotlight on synaptic cleft
        const spotLight = new THREE.SpotLight(0x88aaff, 0.8);
        spotLight.position.set(0, 10, 0);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.3;
        spotLight.decay = 2;
        spotLight.distance = 30;
        this.scene.add(spotLight);

        // Orbit controls with better constraints
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 12;
        this.controls.maxDistance = 60;
        this.controls.maxPolarAngle = Math.PI * 0.75; // Prevent going below
        this.controls.target.set(0, 0, 0);
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.update();
    }

    add(object) {
        this.scene.add(object);
    }

    remove(object) {
        this.scene.remove(object);
    }

    render() {
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Starts the render loop and calls updateCallback each frame before rendering.
     * @param {() => void} updateCallback
     */
    startAnimationLoop(updateCallback) {
        const animate = () => {
            updateCallback();
            this.render();
            requestAnimationFrame(animate);
        };
        animate();
    }
}
