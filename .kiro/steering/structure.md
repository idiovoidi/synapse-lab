# Project Structure

## Architecture Pattern

Clean architecture with strict separation of concerns. Inner layers (domain/models) never depend on outer layers (rendering, UI).

## Directory Organization

```
src/
├── constants/       # Configuration and neurotransmitter type definitions
├── models/          # Domain entities (pure data + minimal behavior, no Three.js/DOM)
├── simulation/      # Simulation orchestration and business logic
├── render/          # Three.js scene management and rendering
├── ui/              # DOM controls and event handlers
└── utils/           # Cross-cutting utilities (event bus)
```

## Key Files

- `index.html`: Entry point with UI structure and import map
- `simulation.js`: Bootstrap script that initializes all components
- `emotionalFace.js`: Emotional face presentation layer (canvas-based)

## Communication Pattern

- **Event-driven architecture**: Uses lightweight event bus (`src/utils/eventBus.js`)
- **Core events**: `nt:released`, `nt:moved`, `nt:bound`, `nt:reuptaken`, `nt:degraded`, `sim:reset`, `sim:effectsUpdated`, `sim:moodUpdated`
- **UI layer**: Subscribes to `sim:effectsUpdated` and `sim:moodUpdated` events
- **Simulation layer**: Emits state changes, never directly manipulates DOM or Three.js meshes

## Dependency Rules

1. Models/constants have no dependencies on other layers
2. Simulation depends on models/constants only
3. Render and UI layers can depend on simulation but not vice versa
4. All modules use explicit ES6 imports (no globals)

## Naming Conventions

- Files use camelCase (e.g., `neuronSimulation.js`)
- Classes use PascalCase (e.g., `NeuronSimulation`)
- Constants use SCREAMING_SNAKE_CASE (e.g., `NEUROTRANSMITTER_TYPES`)
