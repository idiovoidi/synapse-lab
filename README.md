# Neurotransmitter Simulation

A p via a static server and open `index.html`. Requires a modern browser with ES modules.

## Structure
- `src/constants/`: neurotransmitter definitions and config
- `src/models/`: rendering models (Three.js meshes) and domain entities
- `src/render/`: scene manager and renderer modules
- `src/simulation/`: simulation logic and utilities
- `src/ui/`: UI wiring and DOM updates
- `simulation.js`: app bootstrap

## Development
1. Serve the folder (e.g., `npx serve .`) and open `index.html`.
2. Use the controls to release transmitters and toggle reuptake.

## Architecture
- Simulation emits events via a lightweight event bus (`src/utils/eventBus.js`).
- UI listens to `sim:effectsUpdated` and `sim:moodUpdated`.
- Emotional face updates from the `sim:moodUpdated` payload.


