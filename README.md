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
| **Five synapse types** | Glutamatergic, GABAergic, dopaminergic, serotonergic and noradrenergic. Each has its own receptor subtype mix (AMPA/NMDA, GABA-A, D1/D2, 5-HT1A/2A, α1/β1/α2), autoreceptor, transporter and clearance route. Receptors and transporters only recognise their own ligand. |
| **Stimulate** | Fire single action potentials or auto-fire at 0.5 to 6 Hz. Each docked vesicle fuses with a set release probability, so release is stochastic, and autoreceptors brake it. Watch the pool deplete and recover, and vesicle fill track the cytosolic store. |
| **Pharmacology** | Ten real drugs: fluoxetine, sertraline, cocaine, methylphenidate, amphetamine, haloperidol, risperidone, diazepam, phenelzine, ketamine. Each has a dose slider; occupancy follows dose ÷ (dose + Ki), and each drug only acts where its targets exist. |
| **Postsynaptic response** | A conductance model: fast channels (AMPA, NMDA with Mg²⁺ block, GABA-A) plus slow G-protein signalling (Gs/Gq excitation, Gi→GIRK inhibition). Cross −50 mV and the cell fires. Neuromodulators shift excitability but can't fire it alone. |
| **Live readouts** | 20-second traces with time and value axes: membrane potential, free transmitter and receptor occupancy. Also clearance counters, vesicle fill, autoreceptor brake and cytosolic store. |
| **Compare against baseline** | "Pin baseline" (or `B`) freezes the current traces as dashed lines and shows the change in mean free transmitter, occupancy and spikes. Pin, add a drug, then compare. |
| **Inspect** | Hover (or tap on touch) any receptor, transporter, vesicle, molecule, enzyme or membrane for a live description: subtype, coupling, what's bound, and drug occupancy. |
| **Time on treatment** | A conceptual slider applies the steady-state adaptations of weeks on a drug: SSRI autoreceptor desensitisation, D2 up-regulation under antipsychotics, and benzodiazepine tolerance. |
| **Downstream effects** | An illustrative mood face (from slow signalling and firing) and a heart-rate analogy driven only by noradrenergic tone. Clearly labelled as cartoons, not clinical models. |
| **Guided tour** | A 10-step walkthrough with camera moves and hands-on tasks; offered automatically on first visit. |

### Keyboard

`Space` fire · `A` auto-fire · `1`–`5` transmitter · `P` pause · `R` reset · `B` pin baseline · `L` labels · `O` orbit · `V` cycle views · `T` tour · `?` help

## Architecture

```
src/
├── config/     neurotransmitters.js (synapse recipes), receptors.js, drugs.js, synapse.js (constants)
├── sim/        synapseModel.js (pure, seedable, frame-rate independent), random.js
├── render/     sceneManager.js (renderer, bloom, camera), synapseView.js (anatomy + sync), materials.js
├── ui/         hud.js, lineChart.js, inspector.js, moodFace.js, heartMonitor.js, toasts.js, tour.js
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

Timescales are stretched (synaptic events take milliseconds; here they take about a second) and the geometry is not to scale, so the processes stay watchable. The top bar says so.

**What the model gets right (qualitatively)**
- Dale's principle: one transmitter per synapse, with ligand-specific receptor subtypes and transporters.
- Fast ionotropic vs slow metabotropic signalling, including NMDA's Mg²⁺ block and Gi-coupled GIRK inhibition.
- Probabilistic release, autoreceptor feedback, and a recycling loop: reuptake refills the cytosol, VMAT fills vesicles, and mitochondrial MAO degrades cytosolic monoamines. COMT acts on glia, and only on catecholamines.
- Amino-acid transmitters are cleared mostly by astrocytes; monoamines by presynaptic transporters, with more diffusion (volume transmission).
- Drug mechanisms: SSRIs are SERT-selective, cocaine blocks all three monoamine transporters, and amphetamine reverses transporters and empties vesicles (release without spikes). Antipsychotics are competitive and dose-dependent; with haloperidol, chips show both the mass-action occupancy and the live occupancy as dopamine competes. Benzodiazepines only amplify GABA, MAOIs enlarge vesicle stores, and ketamine blocks NMDA.

**What it leaves out**
- The time course of chronic adaptation. "Time on treatment" applies steady-state end points (autoreceptor desensitisation, receptor up-regulation, tolerance), not the weeks of gradual change, and leaves out downstream plasticity and gene expression.
- Whole-circuit and whole-body effects. Mood and heart rate are explicit cartoons.
- Absolute pharmacology. Ki values are relative, and doses are in multiples of each drug's primary Ki, not mg.
- Dendritic integration: here a single synapse can fire the cell, which real neurons rarely allow.

Earlier design notes and progress reports are kept in [`docs/archive/`](docs/archive/).
