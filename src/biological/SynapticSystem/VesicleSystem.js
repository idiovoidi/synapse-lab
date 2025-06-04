import * as THREE from 'three';

export class VesicleSystem {
  constructor({ count = 8, radius = 0.07, color = 0xcccc00, opacity = 0.8 } = {}) {
    this.vesicles = [];
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(radius, 16, 16);
      const material = new THREE.MeshPhongMaterial({
        color,
        transparent: true,
        opacity,
        shininess: 100
      });
      const mesh = new THREE.Mesh(geometry, material);
      // Arrange vesicles in a cluster above the cleft
      const angle = (i / count) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 0.25, 0.45 + Math.sin(angle) * 0.1, Math.sin(angle) * 0.15);
      this.vesicles.push(mesh);
    }
  }

  addToScene(scene) {
    this.vesicles.forEach(v => scene.add(v));
  }

  removeFromScene(scene) {
    this.vesicles.forEach(v => scene.remove(v));
  }

  clear(scene) {
    this.removeFromScene(scene);
    this.vesicles = [];
  }
} 