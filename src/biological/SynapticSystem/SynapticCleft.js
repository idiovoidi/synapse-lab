import * as THREE from 'three';

export class SynapticCleft {
  constructor({ width = 2, height = 0.05, depth = 1, color = 0x00bfff, opacity = 0.3 } = {}) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      shininess: 100
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0, 0);
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
} 