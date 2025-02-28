import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SIMULATION_DEFAULTS } from '../constants/config';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = this.setupCamera();
        this.renderer = this.setupRenderer();
        this.controls = this.setupControls();
        this.lights = this.setupLights();
        
        this.setupEventListeners();
        this.animate = this.animate.bind(this);
        this.onAnimationFrame = null;
    }

    setupCamera() {
        const camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        
        const { x, y, z } = SIMULATION_DEFAULTS.CAMERA_POSITION;
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
        
        return camera;
    }

    setupRenderer() {
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(renderer.domElement);
        
        return renderer;
    }

    setupControls() {
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        return controls;
    }

    setupLights() {
        const lights = {
            ambient: new THREE.AmbientLight(
                0xffffff,
                SIMULATION_DEFAULTS.AMBIENT_LIGHT_INTENSITY
            ),
            main: new THREE.DirectionalLight(
                0xffffff,
                SIMULATION_DEFAULTS.LIGHT_INTENSITY
            ),
            fill: new THREE.DirectionalLight(
                0xffffff,
                SIMULATION_DEFAULTS.LIGHT_INTENSITY * 0.5
            )
        };

        lights.main.position.set(5, 5, 5);
        lights.main.castShadow = true;
        lights.fill.position.set(-5, 3, -5);

        this.scene.add(lights.ambient);
        this.scene.add(lights.main);
        this.scene.add(lights.fill);

        return lights;
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(this.animate);
        
        this.controls.update();
        
        if (this.onAnimationFrame) {
            this.onAnimationFrame();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.animate();
    }

    setAnimationCallback(callback) {
        this.onAnimationFrame = callback;
    }

    enableOrbitControls() {
        this.controls.enabled = true;
    }

    disableOrbitControls() {
        this.controls.enabled = false;
    }

    dispose() {
        window.removeEventListener('resize', this.onWindowResize);
        
        this.scene.traverse(object => {
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
        
        this.renderer.dispose();
        this.controls.dispose();
    }
} 