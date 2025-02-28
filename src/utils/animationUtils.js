import { easeInOutCubic } from './mathUtils';
import { ANIMATION_SETTINGS } from '../constants/config';

export class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.lastTime = performance.now();
    }

    addAnimation(id, {
        duration,
        onUpdate,
        onComplete = null,
        easing = easeInOutCubic
    }) {
        this.animations.set(id, {
            startTime: performance.now(),
            duration,
            onUpdate,
            onComplete,
            easing
        });
    }

    removeAnimation(id) {
        this.animations.delete(id);
    }

    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        for (const [id, animation] of this.animations.entries()) {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);
            const easedProgress = animation.easing(progress);

            animation.onUpdate(easedProgress, deltaTime);

            if (progress >= 1) {
                if (animation.onComplete) {
                    animation.onComplete();
                }
                this.animations.delete(id);
            }
        }
    }
}

export function createFadeAnimation(object, {
    startOpacity = 1,
    endOpacity = 0,
    duration = 1000,
    onComplete = null
}) {
    return {
        duration,
        onUpdate: (progress) => {
            const opacity = startOpacity + (endOpacity - startOpacity) * progress;
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.opacity = opacity);
            } else {
                object.material.opacity = opacity;
            }
        },
        onComplete
    };
}

export function createMoveAnimation(object, {
    startPosition,
    endPosition,
    duration = 1000,
    onComplete = null
}) {
    const initialPosition = startPosition.clone();
    return {
        duration,
        onUpdate: (progress) => {
            object.position.lerpVectors(initialPosition, endPosition, progress);
        },
        onComplete
    };
}

export function createScaleAnimation(object, {
    startScale = 1,
    endScale = 0,
    duration = 1000,
    onComplete = null
}) {
    return {
        duration,
        onUpdate: (progress) => {
            const scale = startScale + (endScale - startScale) * progress;
            object.scale.set(scale, scale, scale);
        },
        onComplete
    };
}

export function createParticleEffect(scene, {
    position,
    color = 0xffffff,
    count = 10,
    size = 0.1,
    speed = 1,
    duration = 1000
}) {
    const particles = new THREE.Group();
    scene.add(particles);

    for (let i = 0; i < count; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 8),
            new THREE.MeshPhongMaterial({
                color,
                transparent: true,
                opacity: 0.8
            })
        );

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            (Math.random() - 0.5) * speed
        );

        particle.position.copy(position);
        particle.userData.velocity = velocity;
        particles.add(particle);
    }

    return {
        duration,
        onUpdate: (progress, deltaTime) => {
            particles.children.forEach(particle => {
                particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime * 0.001));
                particle.material.opacity = 0.8 * (1 - progress);
            });
        },
        onComplete: () => {
            scene.remove(particles);
            particles.traverse(child => {
                if (child.material) {
                    child.material.dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            });
        }
    };
}

export function createPulseAnimation(object, {
    minScale = 0.8,
    maxScale = 1.2,
    duration = 1000,
    onComplete = null
}) {
    const originalScale = object.scale.clone();
    return {
        duration,
        onUpdate: (progress) => {
            const scale = minScale + Math.sin(progress * Math.PI * 2) * (maxScale - minScale);
            object.scale.copy(originalScale).multiplyScalar(scale);
        },
        onComplete: () => {
            object.scale.copy(originalScale);
            if (onComplete) onComplete();
        }
    };
} 