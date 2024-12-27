class Neurotransmitter {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = Math.random() * 2 + 1;
        this.angle = Math.random() * Math.PI / 2 - Math.PI / 4;
        this.bound = false;
    }

    update() {
        if (!this.bound) {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.bound ? '#ff0000' : '#0000ff';
        ctx.fill();
        ctx.closePath();
    }
}

class NeuronSimulation {
    constructor() {
        this.canvas = document.getElementById('neuronCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.neurotransmitters = [];
        this.receptors = [];
        
        this.setupCanvas();
        this.setupControls();
        this.createReceptors();
        this.animate();
    }

    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 400;
    }

    setupControls() {
        document.getElementById('releaseBtn').addEventListener('click', () => {
            this.releaseNeurotransmitters();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
    }

    createReceptors() {
        const receptorCount = 8;
        const spacing = 40;
        const startX = this.canvas.width - 100;
        const startY = this.canvas.height / 2 - (receptorCount * spacing) / 2;

        for (let i = 0; i < receptorCount; i++) {
            this.receptors.push({
                x: startX,
                y: startY + i * spacing,
                occupied: false
            });
        }
    }

    releaseNeurotransmitters() {
        const count = 20;
        const startX = 100;
        const startY = this.canvas.height / 2;

        for (let i = 0; i < count; i++) {
            this.neurotransmitters.push(new Neurotransmitter(startX, startY));
        }
    }

    reset() {
        this.neurotransmitters = [];
        this.receptors.forEach(receptor => receptor.occupied = false);
    }

    checkBinding() {
        this.neurotransmitters.forEach(nt => {
            if (!nt.bound) {
                this.receptors.forEach(receptor => {
                    if (!receptor.occupied) {
                        const distance = Math.hypot(nt.x - receptor.x, nt.y - receptor.y);
                        if (distance < 10) {
                            nt.bound = true;
                            nt.x = receptor.x;
                            nt.y = receptor.y;
                            receptor.occupied = true;
                        }
                    }
                });
            }
        });
    }

    drawNeurons() {
        // Draw presynaptic neuron
        this.ctx.beginPath();
        this.ctx.arc(50, this.canvas.height / 2, 40, 0, Math.PI * 2);
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fill();
        this.ctx.stroke();

        // Draw postsynaptic neuron
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - 50, this.canvas.height / 2, 40, 0, Math.PI * 2);
        this.ctx.fillStyle = '#90EE90';
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawReceptors() {
        this.receptors.forEach(receptor => {
            this.ctx.beginPath();
            this.ctx.rect(receptor.x - 5, receptor.y - 5, 10, 10);
            this.ctx.fillStyle = receptor.occupied ? '#ff0000' : '#ffffff';
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawNeurons();
        this.drawReceptors();
        
        this.neurotransmitters.forEach(nt => {
            nt.update();
            nt.draw(this.ctx);
        });
        
        this.checkBinding();
        
        requestAnimationFrame(() => this.animate());
    }
}

// Start the simulation when the page loads
window.addEventListener('load', () => {
    new NeuronSimulation();
}); 