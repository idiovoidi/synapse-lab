# Technology Stack

## Core Technologies

- **JavaScript (ES6+ modules)**: All code uses ES6 module syntax with explicit imports/exports
- **Three.js (v0.159.0)**: 3D rendering library loaded via CDN import map
- **Vanilla HTML/CSS**: No framework dependencies for UI

## Build System

- **Development server**: `npm run dev` (runs http-server on port 5500)
- **No build step**: Pure ES modules served directly to browser
- **Module resolution**: Uses import maps in index.html for Three.js CDN imports

## Common Commands

```bash
# Start development server
npm run dev

# Then open http://localhost:5500 in a modern browser
```

## Browser Requirements

- Modern browser with ES module support
- WebGL support for Three.js rendering

## External Dependencies

- Three.js v0.170.0 loaded from jsDelivr CDN (no npm install needed for runtime)
- No other external libraries or frameworks

## CDN Updates

The project uses jsDelivr CDN for Three.js instead of unpkg for better reliability and performance:
- Main library: `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`
- Addons: `https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/`

Note: Three.js changed the import path from `three/examples/jsm/` to `three/addons/` in recent versions.
