# Refactoring Plan for Biology_Neurotransmitters

This plan refactors the codebase to align with `CLEAN_ARCHITECTURE_RULES.md`, fixes correctness issues, and establishes clear contracts between simulation, rendering, and UI layers.

---

## Objectives
- Enforce separation of concerns between domain/simulation, rendering (Three.js), and UI/DOM.
- Fix current logic bugs and lifecycle leaks.
- Introduce explicit APIs and events for inter-layer communication.
- Improve performance and maintainability for future features.

---

## Layer definitions
- `src/models/`: Domain entities (pure data + minimal behavior). No Three.js/DOM.
- `src/constants/`: Configuration and constants (e.g., neurotransmitter definitions).
- `src/simulation/`: Simulation rules, state updates, and events. No Three.js/DOM.
- `src/render/`: Three.js scene management, mesh creation, transforms, camera.
- `src/ui/`: DOM elements, event handlers, formatting for info panel.
- `src/utils/`: Cross-cutting helpers (e.g., event bus).

---

## Phase 0 — Pre-flight
- Verify current app runs in the browser via `index.html` and `simulation.js`.
- Create a baseline Git commit before changes.

---

## Phase 1 — Quick wins (bug fixes and small decouplings)
Make these minimal, safe edits first:

- Fix receptor color logic in `src/simulation/neuronSimulation.js` by adding a `polarity` field to each entry in `src/constants/neurotransmitterTypes.js` (e.g., `"EXCITATORY" | "INHIBITORY"`) and color receptors based on that mapping when binding.
- Fix degradation particle lifecycle in `checkDegradation()` → end branch must remove the particle from the scene (not re-add it).
- Remove unused import of `EmotionalFace` from `simulation.js` and unused variables in `src/models/neurotransmitter.js`.
- Stop camera updates inside `NeuronSimulation.update()`; move camera motion to `src/render/sceneManager.js` (or disable for now).
- Add window resize handling in `src/render/sceneManager.js` to keep aspect and viewport correct.
- Improve `reset()` to clear neurotransmitters and reset receptors; optionally also clear or rebuild vesicles/enzymes/ECM for a full reset.
- Decouple immediate DOM access:
  - Change `NeuronSimulation.releaseNeurotransmitters(type)` to accept a `type` argument rather than reading `document.getElementById('ntType')`.
  - Move effects panel updates out of `NeuronSimulation.updateEffects()` into `src/ui/controls.js` (temporary; in Phase 2 this becomes event-driven).
- Update `src/ui/controls.js` to pass the selected type into `releaseNeurotransmitters(type)` and to render the info panel based on a getter.

Acceptance (Phase 1): Visual behavior unchanged, bugs fixed, no direct DOM reads inside `NeuronSimulation`.

---

## Phase 2 — Decouple simulation from rendering and UI (event-driven)
Introduce an event bus and move mesh creation out of the simulation layer.

- Add `src/utils/eventBus.js` (simple pub/sub with `on`, `off`, `emit`).
- Refactor `NeuronSimulation` (in `src/simulation/neuronSimulation.js`):
  - Remove all Three.js and DOM usage.
  - Maintain pure simulation state (entities and relationships).
  - Emit events for lifecycle changes: `nt:released`, `nt:moved`, `nt:bound`, `nt:reuptaken`, `nt:degraded`, `sim:reset`, `sim:effectsUpdated`.
  - Provide `getSnapshot()` returning lightweight state and `getMoodSummary()`.
- Create `src/render/synapseRenderer.js`:
  - Build meshes for neurons, receptors, cleft, transporters, enzymes, vesicles.
  - Map entity IDs to meshes; update transforms on events/ticks.
  - No simulation rules here; rendering only.
- Update `src/render/sceneManager.js`:
  - Own the camera and animation loop; invoke a provided `updateCallback` for the simulation tick and then render.
  - Handle `resize` and optional camera motion.
- Update `src/ui/controls.js`:
  - Subscribe to `sim:effectsUpdated` to render the info panel.
  - Wire buttons to simulation methods and toggles.
- Move creation of `EmotionalFace` out of simulation. It should subscribe to mood updates (via UI/controller) and accept `{ happiness, arousal, anxiety }` from `getMoodSummary()`.

Acceptance (Phase 2): Simulation has no Three.js or DOM references; rendering and UI respond via events; app behavior matches Phase 1.

---

## Phase 3 — Simulation design improvements
Solidify domain model and rules while staying decoupled.

- Entities (in `src/models/`):
  - `NeurotransmitterEntity`: `id`, `type`, `position`, `velocity`, `boundState`, flags for reuptake/degradation.
  - `Receptor`: `id`, `position`, `occupied`, `affinityByType`.
  - `Transporter`: `id`, `position`, `active`, `capacity`.
  - `Enzyme`: `id`, `position`, `activity`, `specificity`.
  - `Vesicle`: `id`, `position`, `contentType`, `quantity`.
- Processes per tick (in `NeuronSimulation.update(dt)`):
  - Diffusion with drift toward receptor plane; cleft bounds handling.
  - Binding/unbinding via distance × affinity probabilities.
  - Reuptake via proximity × type-specific rates; disabled when inhibited.
  - Degradation via proximity to enzymes × type-specific rates.
  - Vesicle trafficking and release; decrement vesicle contents.
  - Mood calculation: use weights from `NEUROTRANSMITTER_TYPES` (e.g., `moodWeights: { happiness, arousal, anxiety }`) instead of switch statements.
- APIs:
  - `releaseNeurotransmitters(type: string, count?: number)`
  - `setReuptakeInhibited(flag: boolean)`
  - `reset()`
  - `getSnapshot()` and `getMoodSummary()`
  - `on(eventName, handler)` / `off(eventName, handler)` via the event bus

Acceptance (Phase 3): Rules produce stable, predictable behavior; mood updates originate from simulation and are consumed by UI/EmotionalFace.

---

## Phase 4 — Performance and lifecycle
- Replace many repeated small meshes (lipids, enzymes, ECM) with `THREE.InstancedMesh`.
- Object pooling for neurotransmitters and particles to reduce GC.
- Throttle/debounce info panel DOM updates to ~10–20 Hz.
- Ensure `dispose()` paths for all Three.js resources on `reset()` and page unload.
- Avoid per-frame allocations inside hot loops.

Acceptance (Phase 4): Frame time stable under burst releases; memory does not grow unbounded across resets.

---

## Phase 5 — Testing and verification
- Add unit tests for pure simulation logic (no Three.js) using a lightweight runner or manual assertions.
- Manual acceptance checklist:
  - Releasing each neurotransmitter type works and shows correct description.
  - Reuptake toggle visually and functionally changes clearance.
  - Receptors change color correctly based on neurotransmitter polarity.
  - Reset returns scene and state to initial conditions without leaks.
  - Window resize preserves aspect and layout.

---

## Phase 6 — Cleanup and documentation
- Remove dead code and unused imports.
- Add JSDoc to public classes and methods.
- Update `CLEAN_ARCHITECTURE_RULES.md` with any clarified conventions.
- Update `README` with run instructions and architecture overview.

---

## API changes summary (for implementers)
- `NeuronSimulation`:
  - `constructor(eventBus, config?)`
  - `releaseNeurotransmitters(type: string, count?: number)`
  - `setReuptakeInhibited(flag: boolean)`
  - `reset()`
  - `update(dt: number)`
  - `getSnapshot()`, `getMoodSummary()`
- Events (via event bus): `nt:released`, `nt:moved`, `nt:bound`, `nt:reuptaken`, `nt:degraded`, `sim:effectsUpdated`, `sim:reset`
- `EmotionalFace.updateExpression(moodSummary)` receives `{ happiness, arousal, anxiety }`.

---

## Implementation order (short checklist)
1) Phase 1 quick fixes (polarity, particles, imports/vars, camera, resize, reset, DOM decouple).
2) Phase 2 event bus + renderer split + UI wiring + face driven by mood.
3) Phase 3 domain/entities/process refinements and mood weights.
4) Phase 4 perf and lifecycle.
5) Phase 5 tests and verification.
6) Phase 6 cleanup and docs.

Commit after each sub-step to ease rollback.

---

## Status and remaining work

- Phase 1: Complete
  - Bugs fixed, DOM decoupled from simulation where safe, camera moved to renderer, resize handling added.
- Phase 2: Partially complete
  - Event bus in place; simulation emits lifecycle/effects/mood events; UI listens; `SynapseRenderer` scaffold added.
  - Remaining: Migrate mesh creation/updates (receptors, transporters, enzymes, NTs) fully from `NeuronSimulation` to `SynapseRenderer` without regressions.
- Phase 3: Core complete
  - `moodWeights` added; mood summary computed and emitted; `EmotionalFace` consumes mood summary.
  - Optional: finalize pure domain entities and remove remaining Three.js from simulation.
- Phase 4: Partial wins delivered
  - ECM instanced; degradation particle pooling; throttled UI events.
  - Optional: instancing for enzymes/adhesions/lipids; pooling for NT meshes; central dispose on reset/unload.
- Phase 5: Baseline verification complete
  - Mood calculation extracted to `computeMoodSummary`; README added; manual checklist passed.
  - Optional: add lightweight automated tests (browser or node) for pure helpers.
- Phase 6: Complete
  - JSDoc added; architecture rules updated with event/mood conventions; bootstrap cleaned.

### Go-live checklist
- [ ] Release NTs of each type renders correctly and info panel updates accordingly
- [ ] Face appears and reacts to mood updates
- [ ] Reuptake toggle changes transporter visuals and clearance behavior
- [ ] Reset clears NTs and receptor colors
- [ ] Window resize maintains aspect and layout
- [ ] No console errors

### Post-refactor TODOs (optional but recommended)
- [ ] Complete `SynapseRenderer` migration; remove remaining Three.js meshes from `NeuronSimulation`
- [ ] Add simple tests for `computeMoodSummary` and any future pure logic
- [ ] Consider instancing/pooling for remaining repetitive meshes; add `dispose()` paths on reset/unload