import * as THREE from "three";
import { NEUROTRANSMITTER_TYPES } from "../constants/neurotransmitterTypes.js";
import { StorageVesicle } from "../models/storageVesicle.js";
import { Neurotransmitter } from "../models/neurotransmitter.js";
import { computeMoodSummary } from "./mood.js";
import { SpatialGrid } from "../utils/spatialGrid.js";
import * as CONST from "../constants/simulationConstants.js";

/**
 * Orchestrates neurotransmitter simulation and emits UI/rendering events.
 * Still contains rendering objects pending full renderer split (Phase 2 follow-up).
 */
export class NeuronSimulation {
  /**
   * @param {import('../render/sceneManager.js').SceneManager} sceneManager
   * @param {{on?:Function, off?:Function, emit?:Function}|null} eventBus
   */
  constructor(sceneManager, eventBus = null, cleftStructure = null) {
    this.sceneManager = sceneManager;
    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;
    this.renderer = sceneManager.renderer;
    this.eventBus = eventBus;
    this.cleftStructure = cleftStructure;
    this._lastEffectsEmitMs = 0;
    this.degradationParticlePool = [];
    this.degradationParticleGeometry = new THREE.SphereGeometry(
      CONST.DEGRADATION_PARTICLE_SIZE,
      CONST.DEGRADATION_PARTICLE_SEGMENTS,
      CONST.DEGRADATION_PARTICLE_SEGMENTS
    );
    this.degradationParticleMaterial = new THREE.MeshPhongMaterial({
      color: CONST.MATERIAL_DEFAULTS.degradationParticle.color,
      transparent: true,
      opacity: CONST.MATERIAL_DEFAULTS.degradationParticle.opacity,
    });

    // Initialize properties
    this.neurotransmitters = [];
    this.receptors = [];
    this.vesicles = [];

    // Emotional face is managed by UI/presentation layer

    // Create neurons and receptors
    this.createNeurons();
    this.createReceptors();

    // Create detailed synapse structure
    this.createSynapticStructure();
    this.createVesicles();
    this.createMembraneLipids();

    console.log("Scene setup complete");

    this.reuptakeInhibited = false; // Track reuptake inhibition state

    this.maoEnzymes = [];
    this.createMAOEnzymes();

    // Initialize spatial grid for efficient collision detection
    // Grid covers the synaptic cleft area where binding occurs
    this.spatialGrid = new SpatialGrid(
      CONST.SPATIAL_GRID_BOUNDS,
      CONST.SPATIAL_GRID_CELL_SIZE
    );
  }

  createNeurons() {
    // Create cell body (soma) for presynaptic neuron with better material
    const somaGeometry = new THREE.SphereGeometry(
      CONST.SOMA_RADIUS,
      CONST.SOMA_SEGMENTS,
      CONST.SOMA_SEGMENTS
    );
    const somaMaterial = new THREE.MeshStandardMaterial({
      color: CONST.MATERIAL_DEFAULTS.neuron.color,
      transparent: true,
      opacity: CONST.MATERIAL_DEFAULTS.neuron.opacity,
      roughness: CONST.MATERIAL_DEFAULTS.neuron.roughness,
      metalness: CONST.MATERIAL_DEFAULTS.neuron.metalness,
      emissive: CONST.MATERIAL_DEFAULTS.neuron.emissive,
      emissiveIntensity: CONST.MATERIAL_DEFAULTS.neuron.emissiveIntensity,
    });
    this.preSoma = new THREE.Mesh(somaGeometry, somaMaterial);
    this.preSoma.position.set(
      CONST.PRESYNAPTIC_SOMA_POSITION.x,
      CONST.PRESYNAPTIC_SOMA_POSITION.y,
      CONST.PRESYNAPTIC_SOMA_POSITION.z
    );
    this.preSoma.castShadow = true;
    this.preSoma.receiveShadow = true;
    this.scene.add(this.preSoma);

    // Create nucleus with better material
    const nucleusGeometry = new THREE.SphereGeometry(
      CONST.NUCLEUS_RADIUS,
      CONST.NUCLEUS_SEGMENTS,
      CONST.NUCLEUS_SEGMENTS
    );
    const nucleusMaterial = new THREE.MeshStandardMaterial({
      color: CONST.MATERIAL_DEFAULTS.nucleus.color,
      transparent: true,
      opacity: CONST.MATERIAL_DEFAULTS.nucleus.opacity,
      roughness: CONST.MATERIAL_DEFAULTS.nucleus.roughness,
      metalness: CONST.MATERIAL_DEFAULTS.nucleus.metalness,
      emissive: CONST.MATERIAL_DEFAULTS.nucleus.emissive,
      emissiveIntensity: CONST.MATERIAL_DEFAULTS.nucleus.emissiveIntensity,
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    this.preSoma.add(nucleus);

    // Create axon using a curved path
    this.createAxon(
      CONST.AXON_START_POSITION.x,
      CONST.AXON_START_POSITION.y,
      CONST.AXON_START_POSITION.z,
      CONST.AXON_END_POSITION.x,
      CONST.AXON_END_POSITION.y,
      CONST.AXON_END_POSITION.z
    );

    // Create dendrites for presynaptic neuron
    this.createDendrites(this.preSoma, CONST.DENDRITE_COUNT);

    // Create postsynaptic neuron
    const postSomaMaterial = new THREE.MeshStandardMaterial({
      color: CONST.MATERIAL_DEFAULTS.neuron.color,
      transparent: true,
      opacity: CONST.MATERIAL_DEFAULTS.neuron.opacity,
      roughness: CONST.MATERIAL_DEFAULTS.neuron.roughness,
      metalness: CONST.MATERIAL_DEFAULTS.neuron.metalness,
      emissive: CONST.MATERIAL_DEFAULTS.neuron.emissive,
      emissiveIntensity: CONST.MATERIAL_DEFAULTS.neuron.emissiveIntensity,
    });
    this.postSoma = new THREE.Mesh(somaGeometry.clone(), postSomaMaterial);
    this.postSoma.position.set(
      CONST.POSTSYNAPTIC_SOMA_POSITION.x,
      CONST.POSTSYNAPTIC_SOMA_POSITION.y,
      CONST.POSTSYNAPTIC_SOMA_POSITION.z
    );
    this.postSoma.castShadow = true;
    this.postSoma.receiveShadow = true;
    this.scene.add(this.postSoma);

    // Add nucleus to postsynaptic neuron
    const postNucleusMaterial = new THREE.MeshStandardMaterial({
      color: CONST.MATERIAL_DEFAULTS.nucleus.color,
      transparent: true,
      opacity: CONST.MATERIAL_DEFAULTS.nucleus.opacity,
      roughness: CONST.MATERIAL_DEFAULTS.nucleus.roughness,
      metalness: CONST.MATERIAL_DEFAULTS.nucleus.metalness,
      emissive: CONST.MATERIAL_DEFAULTS.nucleus.emissive,
      emissiveIntensity: CONST.MATERIAL_DEFAULTS.nucleus.emissiveIntensity,
    });
    const postNucleus = new THREE.Mesh(
      nucleusGeometry.clone(),
      postNucleusMaterial
    );
    this.postSoma.add(postNucleus);

    // Create dendrites for postsynaptic neuron
    this.createDendrites(this.postSoma, CONST.DENDRITE_COUNT);
  }

  createAxon(startX, startY, startZ, endX, endY, endZ) {
    // Create control points for curved axon
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(startX + 5, startY + 2, startZ),
      new THREE.Vector3(endX - 5, endY - 2, endZ),
      new THREE.Vector3(endX, endY, endZ)
    );

    // Create axon tube
    const points = curve.getPoints(50);
    const axonGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      50, // tubular segments
      0.3, // radius
      8, // radial segments
      false // closed
    );

    const axonMaterial = new THREE.MeshStandardMaterial({
      color: 0xffbb77,
      transparent: true,
      opacity: 0.85,
      roughness: 0.5,
      metalness: 0.05,
      emissive: 0x442200,
      emissiveIntensity: 0.05,
    });

    this.axon = new THREE.Mesh(axonGeometry, axonMaterial);
    this.axon.castShadow = true;
    this.axon.receiveShadow = true;
    this.scene.add(this.axon);

    // Add myelin sheaths
    this.createMyelinSheaths(points);
  }

  createMyelinSheaths(axonPoints) {
    const myelinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0xccccff,
      emissiveIntensity: 0.1,
    });

    // Create myelin segments along the axon
    for (let i = 5; i < axonPoints.length - 5; i += 10) {
      const myelinGeometry = new THREE.CylinderGeometry(
        0.5, // top radius
        0.5, // bottom radius
        2, // height
        16 // segments
      );

      const myelin = new THREE.Mesh(myelinGeometry, myelinMaterial);

      // Position myelin segment
      const point = axonPoints[i];
      myelin.position.set(point.x, point.y, point.z);

      // Orient myelin segment along axon
      if (i < axonPoints.length - 1) {
        myelin.lookAt(axonPoints[i + 1]);
        myelin.rotateX(Math.PI / 2);
      }

      this.scene.add(myelin);
    }
  }

  createDendrites(soma, count) {
    const dendriteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffbb77,
      transparent: true,
      opacity: 0.75,
      roughness: 0.6,
      metalness: 0.05,
      emissive: 0x442200,
      emissiveIntensity: 0.05,
    });

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const length = 2 + Math.random() * 2;

      // Create branching dendrites
      this.createDendriteBranch(
        soma.position.clone(),
        angle,
        length,
        0.2,
        3,
        dendriteMaterial
      );
    }
  }

  createDendriteBranch(startPos, angle, length, radius, branchDepth, material) {
    if (branchDepth <= 0) return;

    const endPos = new THREE.Vector3(
      startPos.x + Math.cos(angle) * length,
      startPos.y + Math.sin(angle) * length,
      startPos.z + (Math.random() - 0.5) * length
    );

    // Create dendrite segment
    const points = [startPos, endPos];
    const dendriteGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      8, // tubular segments
      radius, // radius
      8, // radial segments
      false // closed
    );

    const dendrite = new THREE.Mesh(dendriteGeometry, material);
    this.scene.add(dendrite);

    // Create branches
    if (branchDepth > 1) {
      const branchCount = 2;
      for (let i = 0; i < branchCount; i++) {
        const newAngle = angle + ((Math.random() - 0.5) * Math.PI) / 2;
        this.createDendriteBranch(
          endPos,
          newAngle,
          length * 0.7,
          radius * 0.7,
          branchDepth - 1,
          material
        );
      }
    }
  }

  createReceptors() {
    const receptorCount = 10;
    const spacing = 0.8;
    const startX = 4;
    const startY = -3.5;

    for (let i = 0; i < receptorCount; i++) {
      // Create more complex receptor shape (Y-shaped)
      const receptorGroup = new THREE.Group();

      // Base (transmembrane domain)
      const baseGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.4,
        metalness: 0.6,
        emissive: 0x222222,
        emissiveIntensity: 0.3,
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.rotation.z = Math.PI / 2;
      receptorGroup.add(base);

      // Binding site (extracellular domain)
      const bindingSiteGeometry = new THREE.SphereGeometry(0.25, 12, 12);
      const bindingSiteMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0x333333,
        emissiveIntensity: 0.4,
      });
      const bindingSite = new THREE.Mesh(
        bindingSiteGeometry,
        bindingSiteMaterial
      );
      bindingSite.position.x = -0.3;
      receptorGroup.add(bindingSite);

      receptorGroup.position.set(
        startX,
        startY + i * spacing,
        (Math.random() - 0.5) * 0.5
      );
      receptorGroup.rotation.set(
        Math.random() * 0.15,
        Math.random() * 0.15,
        Math.random() * 0.15
      );

      receptorGroup.occupied = false;
      receptorGroup.baseMaterial = baseMaterial;
      receptorGroup.bindingSiteMaterial = bindingSiteMaterial;
      receptorGroup.castShadow = true;
      receptorGroup.receiveShadow = true;

      this.receptors.push(receptorGroup);
      this.scene.add(receptorGroup);
    }
  }

  releaseNeurotransmitters(type) {
    if (!type || !NEUROTRANSMITTER_TYPES[type]) {
      type = "DOPAMINE";
    }

    // Simply release from the axon terminal position
    const releasePosition = new THREE.Vector3(
      CONST.NT_RELEASE_POSITION.x,
      CONST.NT_RELEASE_POSITION.y,
      CONST.NT_RELEASE_POSITION.z
    );
    this.createNeurotransmitterBurst(releasePosition, type);

    // Visual feedback: pulse the axon terminal
    if (this.axonTerminal) {
      const originalScale = this.axonTerminal.scale.clone();
      const pulseStart = Date.now();

      const pulseAnimation = () => {
        const elapsed = Date.now() - pulseStart;
        const progress = elapsed / CONST.VESICLE_PULSE_DURATION_MS;

        if (progress < 1) {
          const scale = 1 + Math.sin(progress * Math.PI) * CONST.VESICLE_PULSE_SCALE;
          this.axonTerminal.scale.setScalar(scale);
          requestAnimationFrame(pulseAnimation);
        } else {
          this.axonTerminal.scale.copy(originalScale);
        }
      };
      pulseAnimation();
    }
  }

  createNeurotransmitterBurst(position, type) {
    const count = CONST.NT_BURST_COUNT;
    const spread = CONST.NT_BURST_SPREAD;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const pos = position.clone();
        const angle = (i / count) * Math.PI * 2;

        // Release in a circular pattern with slight forward bias
        pos.add(
          new THREE.Vector3(
            Math.random() * spread, // Small forward offset
            Math.sin(angle) * spread,
            Math.cos(angle) * spread
          )
        );

        const nt = new Neurotransmitter(pos, type);
        this.neurotransmitters.push(nt);
        this.scene.add(nt.mesh);

        // Add initial "pop" animation
        nt.mesh.scale.setScalar(CONST.NT_POP_START_SCALE);
        const startTime = Date.now();
        const popAnimation = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / CONST.NT_POP_ANIMATION_DURATION_MS, 1);
          nt.mesh.scale.setScalar(CONST.NT_POP_START_SCALE + progress * (1 - CONST.NT_POP_START_SCALE));
          if (progress < 1) requestAnimationFrame(popAnimation);
        };
        popAnimation();

        if (this.eventBus) this.eventBus.emit("nt:released", { type, nt });
      }, i * CONST.NT_BURST_DELAY_MS);
    }
  }

  reset() {
    // Remove all neurotransmitters
    this.neurotransmitters.forEach((nt) => {
      this.scene.remove(nt.mesh);
    });
    this.neurotransmitters = [];

    // Reset receptors
    this.receptors.forEach((receptor) => {
      receptor.occupied = false;
      receptor.boundNT = null;
      receptor.baseMaterial.color.setHex(CONST.RECEPTOR_COLORS.INACTIVE.base);
      receptor.baseMaterial.emissive.setHex(CONST.RECEPTOR_COLORS.INACTIVE.emissive);
      receptor.baseMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.INACTIVE.baseEmissiveIntensity;
      receptor.bindingSiteMaterial.color.setHex(CONST.RECEPTOR_COLORS.INACTIVE.bindingSite);
      receptor.bindingSiteMaterial.emissive.setHex(CONST.RECEPTOR_COLORS.INACTIVE.bindingSiteEmissive);
      receptor.bindingSiteMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.INACTIVE.bindingSiteEmissiveIntensity;
    });

    // Emit reset event
    if (this.eventBus) this.eventBus.emit("sim:reset");
  }

  checkBinding() {
    // Rebuild spatial grid each frame with receptor positions
    // This is fast since we only have ~10 receptors
    this.spatialGrid.clear();
    this.receptors.forEach(receptor => {
      if (!receptor.occupied) {
        this.spatialGrid.insert(receptor, receptor.position);
      }
    });

    // Check each neurotransmitter against only nearby receptors
    this.neurotransmitters.forEach((nt) => {
      if (!nt.bound) {
        // Get only receptors near this neurotransmitter (spatial optimization)
        const nearbyReceptors = this.spatialGrid.getNearby(
          nt.mesh.position,
          CONST.BINDING_DISTANCE
        );
        
        // Check distance only for nearby receptors
        for (const receptor of nearbyReceptors) {
          if (!receptor.occupied) {
            const distance = nt.mesh.position.distanceTo(receptor.position);
            if (distance < CONST.BINDING_DISTANCE) {
              nt.bound = true;
              nt.bindTime = Date.now();
              nt.mesh.position.copy(receptor.position);
              nt.mesh.position.x -= CONST.BINDING_OFFSET;
              receptor.occupied = true;
              receptor.boundNT = nt;

              // Color receptor based on polarity
              const polarity = NEUROTRANSMITTER_TYPES[nt.type]?.polarity;
              const color = polarity === "EXCITATORY" 
                ? CONST.RECEPTOR_COLORS.EXCITATORY.color 
                : CONST.RECEPTOR_COLORS.INHIBITORY.color;
              receptor.baseMaterial.color.setHex(color);
              receptor.baseMaterial.emissive.setHex(color);
              receptor.baseMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.EXCITATORY.emissiveIntensity;
              receptor.bindingSiteMaterial.color.setHex(color);
              receptor.bindingSiteMaterial.emissive.setHex(color);
              receptor.bindingSiteMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.EXCITATORY.bindingSiteEmissiveIntensity;

              // Make bound NT glow brighter
              nt.mesh.material.emissiveIntensity = CONST.BOUND_NT_EMISSIVE_INTENSITY;
              nt.mesh.scale.setScalar(CONST.BOUND_NT_SCALE);

              if (this.eventBus)
                this.eventBus.emit("nt:bound", { nt, receptor });
              
              break; // Stop checking once bound
            }
          }
        }
      } else {
        // Check for unbinding after some time
        const bindDuration = Date.now() - (nt.bindTime || 0);

        if (bindDuration > CONST.BINDING_MIN_DURATION_MS && Math.random() < CONST.UNBINDING_PROBABILITY) {
          // Unbind
          const receptor = this.receptors.find((r) => r.boundNT === nt);
          if (receptor) {
            receptor.occupied = false;
            receptor.boundNT = null;
            receptor.baseMaterial.color.setHex(CONST.RECEPTOR_COLORS.INACTIVE.base);
            receptor.baseMaterial.emissive.setHex(CONST.RECEPTOR_COLORS.INACTIVE.emissive);
            receptor.baseMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.INACTIVE.baseEmissiveIntensity;
            receptor.bindingSiteMaterial.color.setHex(CONST.RECEPTOR_COLORS.INACTIVE.bindingSite);
            receptor.bindingSiteMaterial.emissive.setHex(CONST.RECEPTOR_COLORS.INACTIVE.bindingSiteEmissive);
            receptor.bindingSiteMaterial.emissiveIntensity = CONST.RECEPTOR_COLORS.INACTIVE.bindingSiteEmissiveIntensity;
          }

          nt.bound = false;
          nt.mesh.scale.setScalar(CONST.UNBOUND_NT_SCALE);
          nt.mesh.material.emissiveIntensity = CONST.UNBOUND_NT_EMISSIVE_INTENSITY;

          // Give it a small random velocity to drift away
          nt.velocity = new THREE.Vector3(
            CONST.UNBIND_VELOCITY.x + Math.random() * CONST.UNBIND_VELOCITY.xRandom,
            (Math.random() - 0.5) * CONST.UNBIND_VELOCITY.yRange,
            (Math.random() - 0.5) * CONST.UNBIND_VELOCITY.zRange
          );

          if (this.eventBus) this.eventBus.emit("nt:unbound", { nt, receptor });
        }
      }
    });
  }

  createSynapticStructure() {
    // Create axon terminal (bulb-like structure) with better material
    const terminalGeometry = new THREE.SphereGeometry(
      2.5,
      32,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.7
    );
    const terminalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffbb77,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x442200,
      emissiveIntensity: 0.15,
    });
    this.axonTerminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
    this.axonTerminal.position.x = -5;
    this.axonTerminal.castShadow = true;
    this.axonTerminal.receiveShadow = true;

    // Add flow particles in terminal
    this.createAxonalFlow();

    this.scene.add(this.axonTerminal);

    // Create dendrite terminal (receiving end) with better material
    const dendriteGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const dendriteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffbb77,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x442200,
      emissiveIntensity: 0.15,
    });
    this.dendrite = new THREE.Mesh(dendriteGeometry, dendriteMaterial);
    this.dendrite.position.x = 5;
    this.dendrite.castShadow = true;
    this.dendrite.receiveShadow = true;
    this.scene.add(this.dendrite);

    // Create more detailed synaptic cleft with better visualization
    const cleftGeometry = new THREE.CylinderGeometry(
      2.8,
      2.8,
      0.8,
      32,
      5,
      true
    );
    const cleftMaterial = new THREE.MeshStandardMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: false,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x4466ff,
      emissiveIntensity: 0,
    });
    this.synapticCleft = new THREE.Mesh(cleftGeometry, cleftMaterial);
    this.synapticCleft.rotation.z = Math.PI / 2;
    this.scene.add(this.synapticCleft);

    // Add wireframe overlay for better depth perception
    const wireframeGeometry = cleftGeometry.clone();
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x6688ff,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    wireframe.rotation.z = Math.PI / 2;
    this.scene.add(wireframe);

    // Add extracellular matrix elements in the cleft
    this.createExtracellularMatrix();

    // Create adhesion molecules connecting pre and post synaptic membranes
    this.createAdhesionMolecules();

    // Add reuptake transporters
    this.createReuptakeTransporters();
  }

  createReuptakeTransporters() {
    const transporterCount = 8;
    this.transporters = [];

    for (let i = 0; i < transporterCount; i++) {
      // Create more detailed transporter (channel-like structure)
      const transporterGroup = new THREE.Group();

      // Main channel body
      const channelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8);
      const channelMaterial = new THREE.MeshStandardMaterial({
        color: 0xff9933,
        transparent: true,
        opacity: 0.85,
        roughness: 0.3,
        metalness: 0.6,
        emissive: 0x884400,
        emissiveIntensity: 0.3,
      });
      const channel = new THREE.Mesh(channelGeometry, channelMaterial);
      transporterGroup.add(channel);

      // Opening indicator
      const openingGeometry = new THREE.TorusGeometry(0.12, 0.04, 8, 12);
      const openingMaterial = new THREE.MeshStandardMaterial({
        color: 0xffbb55,
        emissive: 0xaa6600,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.7,
      });
      const opening = new THREE.Mesh(openingGeometry, openingMaterial);
      opening.rotation.x = Math.PI / 2;
      transporterGroup.add(opening);

      // Position transporters along both pre and post synaptic membranes
      const angle = (i / transporterCount) * Math.PI * 2;
      const isPresynaptic = i % 2 === 0;

      transporterGroup.position.set(
        isPresynaptic ? -3.5 : 3.5,
        Math.sin(angle) * 2.2,
        Math.cos(angle) * 2.2
      );

      transporterGroup.rotation.z = isPresynaptic ? Math.PI / 2 : -Math.PI / 2;
      transporterGroup.channelMaterial = channelMaterial;
      transporterGroup.castShadow = true;
      transporterGroup.receiveShadow = true;

      this.transporters.push(transporterGroup);
      this.scene.add(transporterGroup);
    }
  }

  createVesicles() {
    this.vesicles = [];
    const vesicleCount = 12;

    // Create vesicle clusters in different layers
    const layers = 3;
    const vesiclesPerLayer = 4;

    for (let layer = 0; layer < layers; layer++) {
      for (let i = 0; i < vesiclesPerLayer; i++) {
        const angle = (i / vesiclesPerLayer) * Math.PI * 2;
        const radius = 0.8;

        const position = new THREE.Vector3(
          -4 - layer * 0.5, // Move back in layers
          Math.sin(angle) * radius,
          Math.cos(angle) * radius
        );

        const vesicle = new StorageVesicle(position);
        this.vesicles.push(vesicle);
        this.scene.add(vesicle.mesh);
      }
    }
  }

  createMembraneLipids() {
    // Create lipid bilayer visualization
    const createLipidLayer = (x, isUpper) => {
      const lipidCount = 20;
      const spacing = 0.3;

      for (let i = 0; i < lipidCount; i++) {
        const headGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const tailGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);

        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xff9999 });
        const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });

        const head = new THREE.Mesh(headGeometry, headMaterial);
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);

        const lipid = new THREE.Group();
        lipid.add(head);
        lipid.add(tail);

        tail.position.y = isUpper ? -0.1 : 0.1;

        lipid.position.set(
          x + (Math.random() - 0.5) * 0.1,
          i * spacing - (lipidCount * spacing) / 2,
          (Math.random() - 0.5) * 0.1
        );

        if (!isUpper) {
          lipid.rotation.x = Math.PI;
        }

        this.scene.add(lipid);
      }
    };

    // Create upper and lower membrane layers for both neurons
    createLipidLayer(-3, true);
    createLipidLayer(-3, false);
    createLipidLayer(3, true);
    createLipidLayer(3, false);
  }

  createExtracellularMatrix() {
    const count = 50;
    const geo = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.3,
    });
    const instanced = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      dummy.position.set(
        Math.random() * 0.8 - 0.4,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius
      );
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    this.synapticCleft.add(instanced);
  }

  createAdhesionMolecules() {
    const adhesionCount = 12;

    for (let i = 0; i < adhesionCount; i++) {
      // Create adhesion molecule as a chain
      const adhesionGroup = new THREE.Group();

      // Main strand
      const strandGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
      const strandMaterial = new THREE.MeshStandardMaterial({
        color: 0xff88aa,
        transparent: true,
        opacity: 0.6,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x884455,
        emissiveIntensity: 0.2,
      });
      const strand = new THREE.Mesh(strandGeometry, strandMaterial);
      adhesionGroup.add(strand);

      // Binding domains at ends
      const domainGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const domainMaterial = new THREE.MeshStandardMaterial({
        color: 0xffaacc,
        emissive: 0xaa6688,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.4,
      });

      const topDomain = new THREE.Mesh(domainGeometry, domainMaterial);
      topDomain.position.y = 0.4;
      adhesionGroup.add(topDomain);

      const bottomDomain = new THREE.Mesh(domainGeometry, domainMaterial);
      bottomDomain.position.y = -0.4;
      adhesionGroup.add(bottomDomain);

      const angle = (i / adhesionCount) * Math.PI * 2;
      const radius = 2.5;

      adhesionGroup.position.set(
        0,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius
      );

      this.synapticCleft.add(adhesionGroup);
    }
  }

  toggleReuptakeInhibition() {
    this.reuptakeInhibited = !this.reuptakeInhibited;

    // Visual feedback for inhibition state
    this.transporters.forEach((transporter) => {
      transporter.channelMaterial.color.setHex(
        this.reuptakeInhibited ? 0xff0000 : 0xff9933
      );
      transporter.channelMaterial.emissive.setHex(
        this.reuptakeInhibited ? 0xaa0000 : 0x884400
      );
      transporter.channelMaterial.emissiveIntensity = this.reuptakeInhibited
        ? 0.8
        : 0.3;
      transporter.channelMaterial.opacity = this.reuptakeInhibited ? 0.6 : 0.85;
    });
  }

  checkReuptake() {
    if (this.reuptakeInhibited) return;

    // Check each neurotransmitter for reuptake
    this.neurotransmitters.forEach((nt) => {
      if (!nt.bound && !nt.reuptaking) {
        // Find nearest transporter
        let nearestTransporter = null;
        let nearestDistance = Infinity;
        
        this.transporters.forEach((transporter) => {
          const distance = nt.mesh.position.distanceTo(transporter.position);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestTransporter = transporter;
          }
        });
        
        // Check if close enough to a transporter
        const reuptakeDistance = CONST.REUPTAKE_DISTANCE || 1.5;
        if (nearestDistance < reuptakeDistance) {
          // Higher probability when closer to transporter
          const proximityFactor = 1 - (nearestDistance / reuptakeDistance);
          const reuptakeChance = nt.properties.reuptakeRate * CONST.REUPTAKE_BASE_PROBABILITY * proximityFactor;
          
          if (Math.random() < reuptakeChance) {
            nt.reuptaking = true;

            // Animate reuptake with visual effects
            const startPos = nt.mesh.position.clone();
            const targetPos = nearestTransporter.position.clone();
            const startTime = Date.now();
            const duration = 800; // ms

            const animate = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              if (progress < 1) {
                // Smooth movement toward transporter
                nt.mesh.position.lerpVectors(startPos, targetPos, progress);

                // Scale down as it gets reuptaken
                const scale = 1 - progress * 0.8;
                nt.mesh.scale.setScalar(scale);

                // Color transition
                const originalColor = new THREE.Color(nt.properties.color);
                const targetColor = new THREE.Color(0x222222);
                nt.mesh.material.color.lerpColors(originalColor, targetColor, progress);
                
                // Fade opacity
                nt.mesh.material.opacity = 1 - progress * 0.5;

                requestAnimationFrame(animate);
              } else {
                // Remove from scene
                this.scene.remove(nt.mesh);
                
                // Remove from array
                const index = this.neurotransmitters.indexOf(nt);
                if (index > -1) {
                  this.neurotransmitters.splice(index, 1);
                }
                
                // Emit event
                if (this.eventBus) {
                  this.eventBus.emit("nt:reuptaken", { nt, transporter: nearestTransporter });
                }
                
                // Visual feedback on transporter
                this.flashTransporter(nearestTransporter);
              }
            };

            animate();
          }
        }
      }
    });
  }
  
  flashTransporter(transporter) {
    // Flash the transporter to show it's working
    const originalColor = transporter.channelMaterial.color.clone();
    const originalIntensity = transporter.channelMaterial.emissiveIntensity;
    
    transporter.channelMaterial.color.setHex(0xffff00);
    transporter.channelMaterial.emissiveIntensity = 0.8;
    
    setTimeout(() => {
      transporter.channelMaterial.color.copy(originalColor);
      transporter.channelMaterial.emissiveIntensity = originalIntensity;
    }, 200);
  }

  updateEffects() {
    const activeNTs = new Set(this.neurotransmitters.map((nt) => nt.type));
    this.latestEffects = Array.from(activeNTs).map((type) => {
      const properties = NEUROTRANSMITTER_TYPES[type];
      return {
        type,
        name: properties.name,
        description: properties.description,
      };
    });

    // Compute mood summary for EmotionalFace and UI consumers
    this.moodSummary = computeMoodSummary(this.neurotransmitters);

    // Update synaptic cleft glow based on activity
    const activityLevel = Math.min(this.neurotransmitters.length / 20, 1);
    if (this.cleftStructure) {
      this.cleftStructure.updateCleftGlow(activityLevel);
    } else if (this.synapticCleft) {
      this.synapticCleft.material.emissiveIntensity = activityLevel * 0.3;
      this.synapticCleft.material.opacity = 0.1 + activityLevel * 0.15;
    }

    if (this.eventBus) {
      this.eventBus.emit("sim:effectsUpdated", this.latestEffects);
      this.eventBus.emit("sim:moodUpdated", this.moodSummary);
    }
  }

  createStorageVesicle(position, type) {
    const vesicle = new StorageVesicle(position);
    const ntProperties = NEUROTRANSMITTER_TYPES[type];

    // Update vesicle color based on neurotransmitter type
    vesicle.mesh.material.color.setHex(ntProperties.color);
    vesicle.mesh.material.opacity = 0.6;

    // Update stored neurotransmitter colors
    vesicle.storedNeurotransmitters.forEach((nt) => {
      nt.material.color.setHex(ntProperties.color);
      nt.material.emissive.setHex(ntProperties.color);
      nt.material.emissiveIntensity = 0.2;
    });

    return vesicle;
  }

  createAxonalFlow() {
    const flowParticles = new THREE.Group();
    const particleCount = 20;
    const particleGeometry = new THREE.SphereGeometry(0.1, 12, 12);
    const particleMaterial = new THREE.MeshStandardMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.7,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x4466ff,
      emissiveIntensity: 0.4,
    });

    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.userData.speed = 0.02 + Math.random() * 0.02;
      particle.userData.phase = Math.random() * Math.PI * 2;
      flowParticles.add(particle);
    }

    this.axonalFlow = flowParticles;
    this.axonTerminal.add(flowParticles);
  }

  updateAxonalFlow() {
    if (this.axonalFlow) {
      this.axonalFlow.children.forEach((particle) => {
        particle.userData.phase += particle.userData.speed;

        // Create flowing motion along axon terminal
        particle.position.set(
          Math.cos(particle.userData.phase) * 1.5,
          Math.sin(particle.userData.phase) * 1.5,
          Math.sin(particle.userData.phase * 0.5) * 0.5
        );
      });
    }
  }

  createMAOEnzymes() {
    const enzymeCount = 15;

    for (let i = 0; i < enzymeCount; i++) {
      // Create enzyme as a group with multiple parts
      const enzymeGroup = new THREE.Group();

      // Core
      const coreGeometry = new THREE.SphereGeometry(0.18, 12, 12);
      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6666,
        transparent: true,
        opacity: 0.8,
        roughness: 0.4,
        metalness: 0.3,
        emissive: 0xff4444,
        emissiveIntensity: 0.5,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      enzymeGroup.add(core);

      // Active site indicators (small protrusions)
      for (let j = 0; j < 3; j++) {
        const siteGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const siteMaterial = new THREE.MeshStandardMaterial({
          color: 0xffaa88,
          emissive: 0xff6644,
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.5,
        });
        const site = new THREE.Mesh(siteGeometry, siteMaterial);
        const siteAngle = (j / 3) * Math.PI * 2;
        site.position.set(
          Math.cos(siteAngle) * 0.15,
          Math.sin(siteAngle) * 0.15,
          0
        );
        enzymeGroup.add(site);
      }

      // Position enzymes around synaptic area
      const angle = (i / enzymeCount) * Math.PI * 2;
      const radius = 3 + Math.random();

      enzymeGroup.position.set(
        0,
        Math.sin(angle) * radius,
        Math.cos(angle) * radius
      );

      enzymeGroup.userData.originalPos = enzymeGroup.position.clone();
      enzymeGroup.userData.phase = Math.random() * Math.PI * 2;
      enzymeGroup.castShadow = true;

      this.maoEnzymes.push(enzymeGroup);
      this.scene.add(enzymeGroup);
    }
  }

  checkDegradation() {
    this.neurotransmitters.forEach((nt) => {
      if (!nt.bound && !nt.reuptaking && nt.properties.maoSensitive) {
        this.maoEnzymes.forEach((enzyme) => {
          const distance = nt.mesh.position.distanceTo(enzyme.position);

          if (
            distance < 0.5 &&
            Math.random() < nt.properties.degradationRate * 0.002
          ) {
            // Animate degradation
            const startPos = nt.mesh.position.clone();
            const startColor = new THREE.Color(nt.properties.color);

            const animate = (progress) => {
              if (progress <= 1) {
                // Fade out and break apart effect
                nt.mesh.scale.setScalar(1 - progress * 0.8);

                const color = new THREE.Color();
                color.lerpColors(
                  startColor,
                  new THREE.Color(0x222222),
                  progress
                );
                nt.mesh.material.color = color;
                nt.mesh.material.opacity = 1 - progress;

                // Create breakdown particles
                if (progress % 0.2 < 0.02) {
                  this.createDegradationParticle(nt.mesh.position);
                }

                requestAnimationFrame(() => animate(progress + 0.02));
              } else {
                this.scene.remove(nt.mesh);
                this.neurotransmitters = this.neurotransmitters.filter(
                  (n) => n !== nt
                );
                if (this.eventBus)
                  this.eventBus.emit("nt:degraded", { nt, enzyme });
              }
            };

            animate(0);
          }
        });
      }
    });
  }

  createDegradationParticle(position) {
    let particle = this.degradationParticlePool.pop();
    if (particle) {
      particle.visible = true;
      particle.material.opacity = 0.5;
    } else {
      particle = new THREE.Mesh(
        this.degradationParticleGeometry,
        this.degradationParticleMaterial
      );
    }
    particle.position.copy(position);

    // Add random velocity
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );

    this.scene.add(particle);

    // Animate particle
    const animate = (progress) => {
      if (progress <= 1) {
        particle.position.add(velocity);
        particle.material.opacity = 0.5 * (1 - progress);
        requestAnimationFrame(() => animate(progress + 0.05));
      } else {
        particle.visible = false;
        this.degradationParticlePool.push(particle);
      }
    };

    animate(0);
  }

  update() {
    // Update neurotransmitters
    this.neurotransmitters.forEach((nt) => nt.update());
    this.checkBinding();
    this.checkReuptake();
    this.checkDegradation();

    this.updateEffects();

    // Animate MAO enzymes
    this.maoEnzymes.forEach((enzyme) => {
      enzyme.userData.phase += 0.02;
      const wobble = Math.sin(enzyme.userData.phase) * 0.2;
      enzyme.position
        .copy(enzyme.userData.originalPos)
        .add(new THREE.Vector3(wobble, wobble, wobble));
    });

    // Update axonal flow (moved from separate animation loop)
    this.updateAxonalFlow();

    // Camera rotation and rendering are handled by SceneManager
    // We might still need camera updates related to simulation state if any
    // Camera motion moved to SceneManager (or disabled)
  }
}
