# Refactoring Plan for Biology_Neurotransmitters

This plan will guide the transition to a clean, maintainable architecture as described in `CLEAN_ARCHITECTURE_RULES.md`.

---

## Step 1: Set Up Project Structure
- Create a `src/` directory.
- Inside `src/`, create the following folders:
  - `models/`
  - `constants/`
  - `simulation/`
  - `render/`
  - `ui/`
  - `utils/`
- Move existing code files into `src/` as appropriate (temporarily, if needed).

---

## Step 2: Extract Constants
- Move neurotransmitter type definitions and other configuration values from `simulation.js` to `src/constants/neurotransmitterTypes.js`.
- Export these constants for use elsewhere.

---

## Step 3: Extract Domain Models
- Move the `Neurotransmitter` and `StorageVesicle` classes to `src/models/` as separate files (e.g., `neurotransmitter.js`, `storageVesicle.js`).
- Ensure these files only contain domain logic, not rendering or UI code.

---

## Step 4: Isolate Simulation Logic
- Move the main simulation logic (e.g., `NeuronSimulation` class) to `src/simulation/neuronSimulation.js`.
- Refactor so this class only manages simulation state and rules, not direct rendering or DOM manipulation.

---

## Step 5: Separate Rendering Logic
- Move all Three.js scene setup, camera, lights, animation loop, and mesh creation to `src/render/sceneManager.js` (or similar).
- The rendering layer should listen for simulation state changes and update the scene accordingly.

---

## Step 6: Isolate UI Controls
- Move all DOM event listeners, button handlers, and UI updates to `src/ui/controls.js`.
- UI should communicate with the simulation via public methods or events.

---

## Step 7: Update Imports/Exports
- Refactor all files to use ES6 `import`/`export` syntax.
- Remove any global variables.

---

## Step 8: Add Utility Functions
- Move any helper or utility functions to `src/utils/` as needed.

---

## Step 9: Test and Debug
- Test the application after each major step to ensure functionality is preserved.
- Fix any issues that arise from the refactor.

---

## Step 10: Clean Up and Document
- Remove any unused code or files.
- Add JSDoc comments to all public classes and methods.
- Update the README and architecture documentation as needed.

---

**Tip:** Commit your changes after each step to make it easy to revert if needed. 