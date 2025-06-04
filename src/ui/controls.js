export function setupControls(simulation) {
    // Release button
    document.getElementById('releaseBtn').addEventListener('click', () => {
        simulation.releaseNeurotransmitters();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        simulation.reset();
    });

    // Reuptake inhibition toggle button
    const inhibitBtn = document.createElement('button');
    inhibitBtn.id = 'inhibitBtn';
    inhibitBtn.textContent = 'Toggle Reuptake Inhibition';
    document.querySelector('.controls').appendChild(inhibitBtn);

    inhibitBtn.addEventListener('click', () => {
        simulation.toggleReuptakeInhibition();
        // Visual feedback for inhibition state
        inhibitBtn.style.backgroundColor = simulation.reuptakeInhibited ? '#ff4444' : '#333';
        inhibitBtn.textContent = simulation.reuptakeInhibited ?
            'Reuptake Inhibited' : 'Toggle Reuptake Inhibition';
    });
} 