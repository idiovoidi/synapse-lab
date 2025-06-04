import * as THREE from 'three';

export class PostsynapticMembrane {
  constructor({ width = 2, height = 0.08, depth = 1, color = 0x228b22, opacity = 0.4 } = {}) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      shininess: 60
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, -0.2, 0); // Slightly below the cleft
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
} 