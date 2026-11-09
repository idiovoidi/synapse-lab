# Project Structure

## Architecture Pattern

Clean architecture with strict separation of concerns. The simulation model is pure JavaScript (no Three.js, no DOM) and is unit-tested in Node. Rendering and UI read model state each frame and react to events; they never mutate model internals directly.

## Directory Organization

```
src/
├── config/          # Neurotransmitter catalogue and synapse geometry/physiology constants
├── sim/             # Pure simulation: SynapseModel, mood/heart derivations, seedable RNG
├── render/          # Three.js scene, post-processing, materials, SynapseView (anatomy + per-frame sync)
├── ui/              # HUD bindings, charts, mood face (SVG), heart monitor, toasts, guided tour
├── utils/           # Event bus
└── main.js          # Bootstrap and frame loop
styles/main.css      # Design tokens and all HUD styling
tests/               # node:test suites for the simulation model
```

## Communication Pattern

- **Frame loop** (`src/main.js`): `model.step(simDt)` → `view.update(simDt)` → `hud.update()` → render.
- **Event bus** (`src/utils/eventBus.js`) carries discrete happenings from the model: `ap:fired`, `ap:arrived`, `vesicle:fused`, `nt:bound`, `nt:cleared`, `post:spike`, `release:failed`, `settings:changed`, `sim:reset`. UI events: `ui:transmitter`, `ui:tour`.
- **Time**: everything in the model integrates simulated seconds, so behaviour is frame-rate independent; pausing/speed only scale `simDt`.

## Dependency Rules

1. `config/` depends on nothing.
2. `sim/` depends on `config/` only, and must stay DOM- and Three.js-free so tests run in Node.
3. `render/` and `ui/` may depend on `sim/` and `config/`, never the reverse.
4. All modules use explicit ES module imports (no globals; `window.synapse` is a debug handle only).

## Naming Conventions

- Files use camelCase (e.g., `synapseModel.js`)
- Classes use PascalCase (e.g., `SynapseModel`)
- Constants use SCREAMING_SNAKE_CASE (e.g., `NEUROTRANSMITTERS`, `CLEFT`)
