import * as THREE from 'three';

export class StorageVesicle {
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