export function setupControls(simulation, eventBus) {
    // Release button
    document.getElementById('releaseBtn').addEventListener('click', () => {
        const select = document.getElementById('ntType');
        const type = select && select.value ? select.value : 'DOPAMINE';
        simulation.releaseNeurotransmitters(type);
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

    // Render effects panel on simulation events
    const effectsEl = document.getElementById('effects');
    const renderEffects = (effects) => {
        if (!effectsEl) return;
        const list = effects && effects.length ? effects : [];
        effectsEl.innerHTML = list.length === 0
            ? 'No active neurotransmitters'
            : list.map(e => `<p><strong>${e.name}:</strong> ${e.description}</p>`).join('');
    };

    // Initial render
    renderEffects(simulation.latestEffects);

    // Subscribe to updates
    if (eventBus && eventBus.on) {
        eventBus.on('sim:effectsUpdated', renderEffects);
    }
} 