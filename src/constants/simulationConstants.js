/**
 * Simulation Constants
 * All magic numbers extracted to named constants for better maintainability
 */

// ============================================================================
// BINDING & COLLISION DETECTION
// ============================================================================
export const BINDING_DISTANCE = 0.6; // Distance threshold for NT-receptor binding
export const BINDING_OFFSET = 0.2; // Offset in front of receptor when bound
export const BINDING_MIN_DURATION_MS = 2000; // Minimum time before unbinding can occur
export const UNBINDING_PROBABILITY = 0.0005; // Per-frame probability of unbinding

// ============================================================================
// SPATIAL GRID CONFIGURATION
// ============================================================================
export const SPATIAL_GRID_BOUNDS = {
	minX: -5,
	maxX: 6,
	minY: -5,
	maxY: 5,
	minZ: -4,
	maxZ: 4,
};
export const SPATIAL_GRID_CELL_SIZE = 1.5; // Optimized for 0.6 binding radius

// ============================================================================
// NEUROTRANSMITTER RELEASE
// ============================================================================
export const NT_BURST_COUNT = 8; // Number of NTs released per burst
export const NT_BURST_SPREAD = 0.3; // Spatial spread of burst
export const NT_BURST_DELAY_MS = 40; // Delay between each NT in burst
export const NT_RELEASE_POSITION = { x: -3.5, y: 0, z: 0 }; // Release point

// ============================================================================
// REUPTAKE
// ============================================================================
export const REUPTAKE_DISTANCE = 1.5; // Distance threshold for reuptake (increased for visibility)
export const REUPTAKE_BASE_PROBABILITY = 0.02; // Base probability multiplier (increased from 0.003)

// ============================================================================
// DEGRADATION
// ============================================================================
export const DEGRADATION_DISTANCE = 0.8; // Distance threshold for enzyme degradation
export const DEGRADATION_PARTICLE_SIZE = 0.05; // Size of degradation particles
export const DEGRADATION_PARTICLE_SEGMENTS = 4; // Geometry segments

// ============================================================================
// NEURON GEOMETRY
// ============================================================================
export const SOMA_RADIUS = 3;
export const SOMA_SEGMENTS = 32;
export const NUCLEUS_RADIUS = 1;
export const NUCLEUS_SEGMENTS = 24;
export const PRESYNAPTIC_SOMA_POSITION = { x: -15, y: 0, z: 0 };
export const POSTSYNAPTIC_SOMA_POSITION = { x: 15, y: 0, z: 0 };
export const DENDRITE_COUNT = 6;

// ============================================================================
// AXON GEOMETRY
// ============================================================================
export const AXON_START_POSITION = { x: -15, y: 0, z: 0 };
export const AXON_END_POSITION = { x: -5, y: 0, z: 0 };
export const AXON_CONTROL_OFFSET = 5; // Bezier curve control point offset
export const AXON_CONTROL_Y_OFFSET = 2;
export const AXON_CURVE_POINTS = 50;
export const AXON_RADIUS = 0.3;
export const AXON_RADIAL_SEGMENTS = 8;
export const AXON_TUBULAR_SEGMENTS = 50;

// ============================================================================
// MYELIN SHEATHS
// ============================================================================
export const MYELIN_RADIUS = 0.5;
export const MYELIN_HEIGHT = 2;
export const MYELIN_SEGMENTS = 16;
export const MYELIN_SPACING = 10; // Points between myelin segments
export const MYELIN_START_OFFSET = 5;

// ============================================================================
// DENDRITES
// ============================================================================
export const DENDRITE_MIN_LENGTH = 2;
export const DENDRITE_MAX_LENGTH_OFFSET = 2;
export const DENDRITE_BASE_RADIUS = 0.2;
export const DENDRITE_BRANCH_DEPTH = 3;
export const DENDRITE_BRANCH_COUNT = 2;
export const DENDRITE_LENGTH_SCALE = 0.7;
export const DENDRITE_RADIUS_SCALE = 0.7;
export const DENDRITE_TUBULAR_SEGMENTS = 8;

// ============================================================================
// RECEPTORS
// ============================================================================
export const RECEPTOR_COUNT = 10;
export const RECEPTOR_SPACING = 0.8;
export const RECEPTOR_START_X = 4;
export const RECEPTOR_START_Y = -3.5;
export const RECEPTOR_BASE_RADIUS = 0.15;
export const RECEPTOR_BASE_HEIGHT = 0.5;
export const RECEPTOR_BASE_SEGMENTS = 8;
export const RECEPTOR_BINDING_SITE_RADIUS = 0.25;
export const RECEPTOR_BINDING_SITE_SEGMENTS = 12;
export const RECEPTOR_BINDING_SITE_OFFSET = -0.3;

// ============================================================================
// RECEPTOR COLORS
// ============================================================================
export const RECEPTOR_COLORS = {
	INACTIVE: {
		base: 0x666666,
		emissive: 0x222222,
		baseEmissiveIntensity: 0.3,
		bindingSite: 0x888888,
		bindingSiteEmissive: 0x333333,
		bindingSiteEmissiveIntensity: 0.4,
	},
	EXCITATORY: {
		color: 0xff6666,
		emissiveIntensity: 0.7,
		bindingSiteEmissiveIntensity: 0.8,
	},
	INHIBITORY: {
		color: 0x66ff66,
		emissiveIntensity: 0.7,
		bindingSiteEmissiveIntensity: 0.8,
	},
};

// ============================================================================
// BOUND NEUROTRANSMITTER APPEARANCE
// ============================================================================
export const BOUND_NT_EMISSIVE_INTENSITY = 0.6;
export const BOUND_NT_SCALE = 1.2;
export const UNBOUND_NT_EMISSIVE_INTENSITY = 0.2;
export const UNBOUND_NT_SCALE = 1.0;

// ============================================================================
// SYNAPTIC TERMINAL
// ============================================================================
export const AXON_TERMINAL_RADIUS = 2.5;
export const AXON_TERMINAL_SEGMENTS = 32;
export const AXON_TERMINAL_POSITION_X = -5;
export const AXON_TERMINAL_PHI_LENGTH = Math.PI * 0.7;

export const DENDRITE_TERMINAL_RADIUS = 2.5;
export const DENDRITE_TERMINAL_SEGMENTS = 32;
export const DENDRITE_TERMINAL_POSITION_X = 5;

// ============================================================================
// SYNAPTIC CLEFT
// ============================================================================
export const SYNAPTIC_CLEFT_RADIUS = 2.8;
export const SYNAPTIC_CLEFT_HEIGHT = 0.8;
export const SYNAPTIC_CLEFT_SEGMENTS = 32;
export const SYNAPTIC_CLEFT_HEIGHT_SEGMENTS = 5;

// ============================================================================
// REUPTAKE TRANSPORTERS
// ============================================================================
export const TRANSPORTER_COUNT = 8;
export const TRANSPORTER_CHANNEL_RADIUS = 0.15;
export const TRANSPORTER_CHANNEL_HEIGHT = 0.5;
export const TRANSPORTER_CHANNEL_SEGMENTS = 8;
export const TRANSPORTER_OPENING_RADIUS = 0.12;
export const TRANSPORTER_OPENING_TUBE_RADIUS = 0.04;
export const TRANSPORTER_OPENING_SEGMENTS = 8;
export const TRANSPORTER_OPENING_RADIAL_SEGMENTS = 12;
export const TRANSPORTER_DISTANCE_FROM_CENTER = 2.2;
export const TRANSPORTER_POSITION_OFFSET = -3.5; // Presynaptic
export const TRANSPORTER_POSITION_OFFSET_POST = 3.5; // Postsynaptic

// ============================================================================
// TRANSPORTER COLORS
// ============================================================================
export const TRANSPORTER_COLORS = {
	ACTIVE: {
		channel: 0xff9933,
		emissive: 0x884400,
		emissiveIntensity: 0.3,
		opacity: 0.85,
	},
	INHIBITED: {
		channel: 0xff0000,
		emissive: 0xaa0000,
		emissiveIntensity: 0.8,
		opacity: 0.6,
	},
};

// ============================================================================
// VESICLES
// ============================================================================
export const VESICLE_LAYERS = 3;
export const VESICLES_PER_LAYER = 4;
export const VESICLE_LAYER_SPACING = 0.5;
export const VESICLE_RADIUS = 0.8;
export const VESICLE_BASE_X = -4;

// ============================================================================
// MEMBRANE LIPIDS
// ============================================================================
export const LIPID_COUNT = 20;
export const LIPID_SPACING = 0.3;
export const LIPID_HEAD_RADIUS = 0.1;
export const LIPID_HEAD_SEGMENTS = 8;
export const LIPID_TAIL_RADIUS = 0.02;
export const LIPID_TAIL_HEIGHT = 0.2;
export const LIPID_TAIL_SEGMENTS = 8;
export const LIPID_TAIL_OFFSET = 0.1;

// ============================================================================
// EXTRACELLULAR MATRIX
// ============================================================================
export const ECM_PARTICLE_COUNT = 50;
export const ECM_PARTICLE_RADIUS = 0.05;
export const ECM_PARTICLE_SEGMENTS = 8;

// ============================================================================
// ADHESION MOLECULES
// ============================================================================
export const ADHESION_MOLECULE_COUNT = 12;
export const ADHESION_STRAND_RADIUS = 0.04;
export const ADHESION_STRAND_HEIGHT = 0.8;
export const ADHESION_STRAND_SEGMENTS = 8;
export const ADHESION_DOMAIN_RADIUS = 0.08;
export const ADHESION_DOMAIN_SEGMENTS = 8;
export const ADHESION_DOMAIN_OFFSET = 0.4;
export const ADHESION_DISTANCE_FROM_CENTER = 2.5;

// ============================================================================
// MAO ENZYMES
// ============================================================================
export const MAO_ENZYME_COUNT = 15;
export const MAO_CORE_RADIUS = 0.18;
export const MAO_CORE_SEGMENTS = 12;
export const MAO_ACTIVE_SITE_RADIUS = 0.08;
export const MAO_ACTIVE_SITE_SEGMENTS = 8;
export const MAO_ACTIVE_SITE_OFFSET = 0.2;
export const MAO_WOBBLE_SPEED = 0.02;
export const MAO_WOBBLE_AMPLITUDE = 0.2;

// ============================================================================
// AXONAL FLOW
// ============================================================================
export const AXONAL_FLOW_PARTICLE_COUNT = 20;
export const AXONAL_FLOW_PARTICLE_RADIUS = 0.1;
export const AXONAL_FLOW_PARTICLE_SEGMENTS = 12;
export const AXONAL_FLOW_MIN_SPEED = 0.02;
export const AXONAL_FLOW_MAX_SPEED_OFFSET = 0.02;
export const AXONAL_FLOW_RADIUS = 1.5;

// ============================================================================
// ANIMATION & TIMING
// ============================================================================
export const VESICLE_PULSE_DURATION_MS = 300;
export const VESICLE_PULSE_SCALE = 0.15;
export const NT_POP_ANIMATION_DURATION_MS = 200;
export const NT_POP_START_SCALE = 0.1;
export const REUPTAKE_ANIMATION_STEP = 0.02;

// ============================================================================
// MATERIAL PROPERTIES
// ============================================================================
export const MATERIAL_DEFAULTS = {
	neuron: {
		color: 0xffbb77,
		opacity: 0.85,
		roughness: 0.4,
		metalness: 0.1,
		emissive: 0x442200,
		emissiveIntensity: 0.1,
	},
	nucleus: {
		color: 0x5555cc,
		opacity: 0.9,
		roughness: 0.3,
		metalness: 0.2,
		emissive: 0x222266,
		emissiveIntensity: 0.3,
	},
	myelin: {
		color: 0xffffff,
		opacity: 0.7,
		roughness: 0.2,
		metalness: 0.3,
		emissive: 0xccccff,
		emissiveIntensity: 0.1,
	},
	synapticCleft: {
		color: 0x88aaff,
		opacity: 0.15,
		roughness: 0.8,
		metalness: 0.2,
		emissive: 0x4466ff,
		emissiveIntensity: 0,
	},
	degradationParticle: {
		color: 0xff4444,
		opacity: 0.5,
	},
};

// ============================================================================
// PHYSICS & MOVEMENT
// ============================================================================
export const UNBIND_VELOCITY = {
	x: -0.02,
	xRandom: 0.01,
	yRange: 0.03,
	zRange: 0.03,
};

export const BOUNDARY_LIMITS = {
	y: { min: -4, max: 4 },
	z: { min: -3, max: 3 },
	xMax: 6,
};

// ============================================================================
// EFFECTS UPDATE THROTTLE
// ============================================================================
export const EFFECTS_UPDATE_THROTTLE_MS = 100; // Minimum time between effect updates
