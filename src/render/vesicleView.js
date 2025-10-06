import * as THREE from 'three';

/**
 * Creates an immersive "inside the vesicle" view
 */
export class VesicleView {
    constructor(scene, position = new THREE.Vector3(-4, 0, 0)) {
        this.scene = scene;
        this.position = position;
        this.isReleased = false;
        
        this.createVesicleMembrane();
        this.createFloatingNeurotransmitters();
        this.createAmbientParticles();
        this.createMembraneProteins();
    }
    
    createVesicleMembrane() {
        // Inner surface of vesicle membrane (what you see from inside)
        const membraneGeometry = new THREE.SphereGeometry(1.2, 64, 64);
        const membraneMaterial = new THREE.MeshStandardMaterial({
            color: 0x8899ff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide, // Render inside
            roughness: 0.7,
            metalness: 0.2,
            emissive: 0x4455aa,
            emissiveIntensity: 0.2
        });
        
        this.membrane = new THREE.Mesh(membraneGeometry, membraneMaterial);
        this.membrane.position.copy(this.position);
        this.scene.add(this.membrane);
        
        // Add subtle texture with wireframe overlay
        const wireframeGeometry = new THREE.SphereGeometry(1.18, 32, 32);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x6677dd,
            transparent: true,
            opacity: 0.15,
            wireframe: true,
            side: THREE.BackSide
        });
        
        this.wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        this.wireframe.position.copy(this.position);
        this.scene.add(this.wireframe);
    }
    
    createFloatingNeurotransmitters() {
        // Create neurotransmitters floating around inside
        this.floatingNTs = [];
        const ntCount = 12;
        
        for (let i = 0; i < ntCount; i++) {
            const ntGeometry = new THREE.SphereGeometry(0.08, 16, 16);
            const ntMaterial = new THREE.MeshStandardMaterial({
                color: 0x6699ff,
                roughness: 0.3,
                metalness: 0.5,
                emissive: 0x4466ff,
                emissiveIntensity: 0.4
            });
            
            const nt = new THREE.Mesh(ntGeometry, ntMaterial);
            
            // Random position inside vesicle
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 0.3 + Math.random() * 0.6;
            
            nt.position.set(
                this.position.x + Math.sin(phi) * Math.cos(theta) * radius,
                this.position.y + Math.sin(phi) * Math.sin(theta) * radius,
                this.position.z + Math.cos(phi) * radius
            );
            
            // Random velocity for floating motion
            nt.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002,
                (Math.random() - 0.5) * 0.002
            );
            
            nt.userData.originalPos = nt.position.clone();
            nt.castShadow = true;
            
            this.floatingNTs.push(nt);
            this.scene.add(nt);
        }
    }
    
    createAmbientParticles() {
        // Small particles representing proteins, ions, etc.
        this.ambientParticles = new THREE.Group();
        const particleCount = 50;
        const particleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
        const particleMaterial = new THREE.MeshStandardMaterial({
            color: 0xaabbff,
            transparent: true,
            opacity: 0.6,
            emissive: 0x6677ff,
            emissiveIntensity: 0.3
        });
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = 0.2 + Math.random() * 0.9;
            
            particle.position.set(
                Math.sin(phi) * Math.cos(theta) * radius,
                Math.sin(phi) * Math.sin(theta) * radius,
                Math.cos(phi) * radius
            );
            
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.001,
                (Math.random() - 0.5) * 0.001,
                (Math.random() - 0.5) * 0.001
            );
            
            this.ambientParticles.add(particle);
        }
        
        this.ambientParticles.position.copy(this.position);
        this.scene.add(this.ambientParticles);
    }
    
    createMembraneProteins() {
        // Proteins embedded in membrane (visible from inside)
        this.proteins = [];
        const proteinCount = 20;
        
        for (let i = 0; i < proteinCount; i++) {
            const proteinGroup = new THREE.Group();
            
            // Protein body
            const bodyGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8);
            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: 0xff9966,
                roughness: 0.5,
                metalness: 0.4,
                emissive: 0xaa5533,
                emissiveIntensity: 0.2
            });
            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            proteinGroup.add(body);
            
            // Protein head
            const headGeometry = new THREE.SphereGeometry(0.06, 8, 8);
            const head = new THREE.Mesh(headGeometry, bodyMaterial);
            head.position.y = 0.1;
            proteinGroup.add(head);
            
            // Position on inner membrane surface
            const theta = (i / proteinCount) * Math.PI * 2 + Math.random() * 0.5;
            const phi = Math.random() * Math.PI;
            const radius = 1.15;
            
            const pos = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * radius,
                Math.sin(phi) * Math.sin(theta) * radius,
                Math.cos(phi) * radius
            );
            
            proteinGroup.position.copy(pos).add(this.position);
            proteinGroup.lookAt(this.position);
            
            this.proteins.push(proteinGroup);
            this.scene.add(proteinGroup);
        }
    }
    
    update() {
        if (this.isReleased) return;
        
        // Animate floating neurotransmitters
        this.floatingNTs.forEach(nt => {
            nt.position.add(nt.userData.velocity);
            
            // Keep within vesicle bounds
            const distFromCenter = nt.position.distanceTo(this.position);
            if (distFromCenter > 0.9) {
                // Bounce back
                const direction = new THREE.Vector3()
                    .subVectors(nt.position, this.position)
                    .normalize();
                nt.userData.velocity.reflect(direction).multiplyScalar(0.8);
            }
            
            // Add slight pulsing
            const pulse = Math.sin(Date.now() * 0.003 + nt.id) * 0.02 + 1;
            nt.scale.setScalar(pulse);
        });
        
        // Animate ambient particles
        this.ambientParticles.children.forEach(particle => {
            particle.position.add(particle.userData.velocity);
            
            // Keep within bounds
            if (particle.position.length() > 1.0) {
                particle.userData.velocity.multiplyScalar(-1);
            }
        });
        
        // Subtle membrane pulsing
        const membranePulse = Math.sin(Date.now() * 0.001) * 0.02 + 1;
        this.membrane.scale.setScalar(membranePulse);
        this.wireframe.scale.setScalar(membranePulse);
    }
    
    release() {
        if (this.isReleased) return;
        this.isReleased = true;
        
        const duration = 2000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Membrane opens and fades
            this.membrane.material.opacity = 0.3 * (1 - progress);
            this.wireframe.material.opacity = 0.15 * (1 - progress);
            this.membrane.scale.setScalar(1 + progress * 0.5);
            this.wireframe.scale.setScalar(1 + progress * 0.5);
            
            // Neurotransmitters fly out
            this.floatingNTs.forEach((nt, i) => {
                const direction = new THREE.Vector3()
                    .subVectors(nt.position, this.position)
                    .normalize();
                nt.position.add(direction.multiplyScalar(0.05 * progress));
                nt.material.opacity = 1 - progress * 0.5;
            });
            
            // Ambient particles disperse
            this.ambientParticles.children.forEach(particle => {
                particle.position.multiplyScalar(1 + progress * 0.02);
                particle.material.opacity = 0.6 * (1 - progress);
            });
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.cleanup();
            }
        };
        
        animate();
    }
    
    cleanup() {
        // Remove all vesicle view elements
        this.scene.remove(this.membrane);
        this.scene.remove(this.wireframe);
        this.scene.remove(this.ambientParticles);
        
        this.floatingNTs.forEach(nt => this.scene.remove(nt));
        this.proteins.forEach(protein => this.scene.remove(protein));
    }
    
    hide() {
        this.membrane.visible = false;
        this.wireframe.visible = false;
        this.ambientParticles.visible = false;
        this.floatingNTs.forEach(nt => nt.visible = false);
        this.proteins.forEach(protein => protein.visible = false);
    }
    
    show() {
        if (this.isReleased) return;
        this.membrane.visible = true;
        this.wireframe.visible = true;
        this.ambientParticles.visible = true;
        this.floatingNTs.forEach(nt => nt.visible = true);
        this.proteins.forEach(protein => protein.visible = true);
    }
}
