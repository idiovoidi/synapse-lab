import * as THREE from 'three';

export class PresynapticTerminal {
  constructor({ radius = 0.5, widthSegments = 32, heightSegments = 32, color = 0xffa500, opacity = 0.5 } = {}) {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      shininess: 80
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0.3, 0); // Slightly above the cleft
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
} 