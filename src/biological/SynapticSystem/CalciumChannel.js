import * as THREE from 'three';

export class CalciumChannel {
  constructor({ radius = 0.04, height = 0.12, color = 0x1e90ff, opacity = 0.9, x = 0, y = 0.55, z = 0 } = {}) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      shininess: 120
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.x = Math.PI / 2; // Lay flat
  }

  addToScene(scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene) {
    scene.remove(this.mesh);
  }
} 