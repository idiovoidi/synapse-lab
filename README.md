# Synapse Lab

An interactive 3D simulation of chemical neurotransmission. Fire action potentials, watch vesicles fuse and transmitter diffuse across the cleft, see receptors bind and the postsynaptic membrane potential climb toward threshold. Then change the rules with drugs.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5500>. No build step: the app is plain ES modules, with Three.js loaded from a CDN via an import map.

```bash
npm test        # simulation unit tests (node:test)
npm run lint    # Biome
```

## What you can do

| | |
|---|---|
| **Five transmitters** | Glutamate, GABA, dopamine, serotonin and norepinephrine, each with its own diffusion, affinity, dwell time, clearance routes and postsynaptic efficacy. |
| **Stimulate** | Fire single action potentials or auto-fire at 0.5 to 6 Hz. Set how many vesicles fuse per spike and watch the readily releasable pool deplete and recover. |
| **Pharmacology** | Reuptake inhibitor (SSRIs, cocaine), enzyme inhibitor (MAOIs) and receptor antagonist (antipsychotics). Each produces a measurable, explained effect. |
| **Postsynaptic response** | A conductance-based membrane model sums excitatory and inhibitory input. Cross −50 mV and the cell fires. Neuromodulators depolarise but can't fire it alone. |
| **Live readouts** | 20-second traces of membrane potential, free transmitter and receptor occupancy, plus clearance counters. |
| **Body & mood** | Slow transmitter "tone" drives a stylised mood face and heart rate (ECG). Simplified for teaching, not a clinical model. |
| **Guided tour** | A 10-step walkthrough with camera moves and hands-on tasks; offered automatically on first visit. |

### Keyboard

`Space` fire · `A` auto-fire · `1`–`5` transmitter · `P` pause · `R` reset · `L` labels · `O` orbit · `V` cycle views · `T` tour · `?` help

## Architecture

```
src/
├── config/     neurotransmitters.js, synapse.js (geometry + physiology constants)
├── sim/        synapseModel.js (pure, seedable, frame-rate independent), random.js
├── render/     sceneManager.js (renderer, bloom, camera), synapseView.js (anatomy + sync), materials.js
├── ui/         hud.js, lineChart.js, moodFace.js, heartMonitor.js, toasts.js, tour.js
├── utils/      eventBus.js
└── main.js     bootstrap + frame loop
styles/main.css
tests/synapseModel.test.js
```

- **The model is pure.** `SynapseModel` has no Three.js or DOM dependencies. It integrates in fixed sub-steps of simulated time, takes an injectable seed, and reports discrete events (`vesicle:fused`, `nt:bound`, `post:spike`…) through an `emit` callback. That is what makes it testable in Node.
- **The view reads state.** `SynapseView` builds the anatomy once and syncs instanced transmitter meshes, receptors, vesicles and effects from model state every frame.
- **The HUD is static markup.** `index.html` holds the layout; `hud.js` binds it. All styling lives in `styles/main.css` behind design tokens.

`window.synapse` exposes `{ model, view, hud, sceneManager, tour }` in the browser console for debugging.

## Scientific notes

Timescales are stretched (synaptic events take milliseconds; here they take about a second) and the geometry is not to scale, so the processes stay watchable. Relative behaviour is preserved: amino-acid transmitters are cleared by transporters only, monoamines also by enzymes, ionotropic transmitters drive fast large currents, and metabotropic modulators produce small slow ones. Mood and heart-rate mappings are illustrative.

Earlier design notes and progress reports are kept in [`docs/archive/`](docs/archive/).
