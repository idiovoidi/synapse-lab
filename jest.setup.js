// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(),
  PerspectiveCamera: jest.fn(),
  WebGLRenderer: jest.fn(),
  Vector3: jest.fn(),
  Color: jest.fn(),
  AmbientLight: jest.fn(),
  DirectionalLight: jest.fn(),
  Mesh: jest.fn(),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  MeshPhongMaterial: jest.fn(),
  MeshBasicMaterial: jest.fn()
}));

// Mock window properties
Object.defineProperty(window, 'innerWidth', { value: 1024 });
Object.defineProperty(window, 'innerHeight', { value: 768 });

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id); 