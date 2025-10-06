export function setupControls(simulation, eventBus, sceneManager, vesicleView) {
    let currentMode = 'inside';
    
    // Camera mode toggle button
    const viewBtn = document.createElement('button');
    viewBtn.id = 'viewBtn';
    viewBtn.textContent = '🔬 Inside Vesicle View';
    viewBtn.style.backgroundColor = '#4466ff';
    viewBtn.style.fontWeight = 'bold';
    document.querySelector('.controls').insertBefore(viewBtn, document.querySelector('.controls').firstChild);

    viewBtn.addEventListener('click', () => {
        currentMode = currentMode === 'inside' ? 'outside' : 'inside';
        sceneManager.switchCameraMode(currentMode);
        
        if (currentMode === 'inside') {
            vesicleView.show();
            viewBtn.textContent = '🔬 Inside Vesicle View';
            viewBtn.style.backgroundColor = '#4466ff';
            document.getElementById('info').querySelector('p').textContent = 
                'You are inside a synaptic vesicle! Look around...';
        } else {
            vesicleView.hide();
            viewBtn.textContent = '🌍 Outside View';
            viewBtn.style.backgroundColor = '#333';
            document.getElementById('info').querySelector('p').textContent = 
                'Blue: Excitatory | Green: Inhibitory';
        }
    });

    // Release button - different behavior based on mode
    const releaseBtn = document.getElementById('releaseBtn');
    releaseBtn.addEventListener('click', () => {
        const select = document.getElementById('ntType');
        const type = select && select.value ? select.value : 'DOPAMINE';
        
        if (currentMode === 'inside') {
            // Release from inside - trigger vesicle opening
            vesicleView.release();
            
            // Switch to outside view after 1 second
            setTimeout(() => {
                currentMode = 'outside';
                sceneManager.switchCameraMode('outside');
                viewBtn.textContent = '🌍 Outside View';
                viewBtn.style.backgroundColor = '#333';
                document.getElementById('info').querySelector('p').textContent = 
                    'Blue: Excitatory | Green: Inhibitory';
            }, 1000);
            
            // Release neurotransmitters after 1.5 seconds
            setTimeout(() => {
                simulation.releaseNeurotransmitters(type);
            }, 1500);
        } else {
            // Normal release from outside view
            simulation.releaseNeurotransmitters(type);
        }
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        simulation.reset();
        
        // Reset to inside view
        if (currentMode === 'outside') {
            currentMode = 'inside';
            sceneManager.switchCameraMode('inside');
            viewBtn.textContent = '🔬 Inside Vesicle View';
            viewBtn.style.backgroundColor = '#4466ff';
            document.getElementById('info').querySelector('p').textContent = 
                'You are inside a synaptic vesicle! Look around...';
        }
        
        // Recreate vesicle view
        vesicleView.cleanup();
        const newVesicleView = new (vesicleView.constructor)(sceneManager.scene);
        Object.assign(vesicleView, newVesicleView);
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
    
    // Update info text for inside view
    document.getElementById('info').querySelector('p').textContent = 
        'You are inside a synaptic vesicle! Look around...';
} 