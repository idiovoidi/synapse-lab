let nextId = 1;

export class NeurotransmitterEntity {
    constructor(position, type, properties) {
        this.id = nextId++;
        this.type = type;
        this.properties = properties;
        this.position = { x: position.x, y: position.y, z: position.z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.bound = false;
        this.reuptaking = false;
    }
}


