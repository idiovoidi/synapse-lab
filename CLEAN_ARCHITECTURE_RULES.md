# Clean Code Architecture Rules for Biology_Neurotransmitters

## 1. Separation of Concerns

- **Rendering/3D logic (THREE.js)** must be separated from **domain logic** (neurotransmitter simulation).
- **UI controls and DOM manipulation** must be isolated from simulation logic.

---

## 2. Directory Structure

Organize code by responsibility:

- `src/models/` — Domain models (e.g., Neurotransmitter, StorageVesicle, Neuron)
- `src/constants/` — Constants and configuration (e.g., neurotransmitter types)
- `src/simulation/` — Simulation orchestration logic (e.g., NeuronSimulation)
- `src/render/` — Rendering and Three.js scene setup (scene, camera, lights, animation loop)
- `src/ui/` — UI controls and DOM event handlers
- `src/utils/` — Utility/helper functions

---

## 3. Dependency Rule

- Inner layers (domain/models) must not depend on outer layers (rendering, UI).
- Rendering/UI can depend on domain, but not vice versa.

---

## 4. Single Responsibility Principle

- Each class/module should have one reason to change.

---

## 5. Explicit Imports/Exports

- Use ES6 modules everywhere (`import`/`export`).
- No global variables.

---

## 6. UI and Simulation Communication

- The UI layer communicates with the simulation layer via public methods or events.
- The simulation layer exposes state changes (e.g., "release neurotransmitter", "bind to receptor").
- The rendering layer listens for these changes and updates the 3D scene accordingly.

---

## 7. Benefits

- **Testability**: Simulation logic can be tested without Three.js or the DOM.
- **Maintainability**: Changes to rendering or UI don't affect core logic.
- **Reusability**: Rendering engine or UI can be swapped without changing simulation logic. 