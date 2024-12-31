import * as THREE from 'three';

class StorageVesicle {
    constructor(position) {
        // Create vesicle membrane
        const vesicleGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const vesicleMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.6,
            shininess: 50
        });
        
        this.mesh = new THREE.Mesh(vesicleGeometry, vesicleMaterial);
        this.mesh.position.copy(position);
        
        // Create stored neurotransmitters (visual representation)
        this.storedNeurotransmitters = [];
        const ntCount = 6;
        
        for (let i = 0; i < ntCount; i++) {
            const angle = (i / ntCount) * Math.PI * 2;
            const radius = 0.15;
            
            const ntGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const ntMaterial = new THREE.MeshPhongMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.8,
                emissive: 0x444444,
                emissiveIntensity: 0.2
            });
            
            const nt = new THREE.Mesh(ntGeometry, ntMaterial);
            nt.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                0
            );
            
            this.storedNeurotransmitters.push(nt);
            this.mesh.add(nt);
        }
    }

    moveToReleasePosition(targetPosition, onComplete) {
        const startPosition = this.mesh.position.clone();
        const duration = 500; // milliseconds
        const startTime = Date.now();
        
        const animate = () => {
            const progress = (Date.now() - startTime) / duration;
            
            if (progress < 1) {
                const currentPos = new THREE.Vector3().lerpVectors(
                    startPosition,
                    targetPosition,
                    progress
                );
                this.mesh.position.copy(currentPos);
                
                requestAnimationFrame(animate);
            } else {
                this.mesh.position.copy(targetPosition);
                if (onComplete) onComplete();
            }
        };
        
        animate();
    }
}

export { StorageVesicle }; 