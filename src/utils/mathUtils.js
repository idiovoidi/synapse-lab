import * as THREE from 'three';

export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function createBezierCurve(points, segments = 50) {
    const curve = new THREE.CatmullRomCurve3(points);
    return curve.getPoints(segments);
}

export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function randomSphericalPosition(radius) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    return new THREE.Vector3().setFromSphericalCoords(radius, phi, theta);
}

export function calculateDistance(point1, point2) {
    return point1.distanceTo(point2);
}

export function lerpVector(start, end, alpha) {
    return new THREE.Vector3().lerpVectors(start, end, alpha);
}

export function addRandomOffset(vector, maxOffset) {
    return vector.add(new THREE.Vector3(
        (Math.random() - 0.5) * maxOffset,
        (Math.random() - 0.5) * maxOffset,
        (Math.random() - 0.5) * maxOffset
    ));
}

export function createWavyPath(startPoint, endPoint, amplitude = 0.2, frequency = 3) {
    const points = [];
    const segments = 15;
    const direction = endPoint.clone().sub(startPoint);
    const length = direction.length();
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = startPoint.clone().lerp(endPoint, t);
        
        point.y += Math.sin(t * Math.PI * frequency) * amplitude;
        point.z += Math.cos(t * Math.PI * frequency) * amplitude;
        
        points.push(point);
    }
    
    return points;
}

export function distributePointsAlongCurve(curve, count, randomOffset = 0) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const basePoint = curve.getPoint(t);
        const point = basePoint.clone();
        
        if (randomOffset > 0) {
            addRandomOffset(point, randomOffset);
        }
        
        points.push(point);
    }
    return points;
}

export function createOrientedObject(position, lookAt, up = new THREE.Vector3(0, 1, 0)) {
    const matrix = new THREE.Matrix4();
    const direction = lookAt.clone().sub(position).normalize();
    matrix.lookAt(position, lookAt, up);
    return matrix;
} 