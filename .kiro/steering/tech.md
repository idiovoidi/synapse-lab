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

- Three.js loaded from unpkg.com CDN (no npm install needed for runtime)
- No other external libraries or frameworks
