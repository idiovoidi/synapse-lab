# Heart Simulation - Physiological Effects

## Overview

The heart simulation visualizes real-time cardiovascular responses to neurotransmitter activity, showing how brain chemistry affects heart rate and rhythm.

## Features

### 🫀 3D Anatomical Heart
- Realistic heart shape with ventricles and atria
- Pulsing animation synchronized with heart rate
- Blood vessels (aorta, vena cava)
- Glowing beat effect

### 📊 ECG Monitor
- Real-time electrocardiogram display
- PQRST complex waveform
- Grid background
- Scrolling trace

### 💓 Heart Rate Monitor
- Live BPM display
- Active neurotransmitter effects
- Status indicator (normal/bradycardia/tachycardia)
- Visual beat indicator

## Neurotransmitter Effects

| Neurotransmitter | Effect | Change | Mechanism |
|------------------|--------|--------|-----------|
| **Norepinephrine** | ↑↑ Strong increase | +15 BPM | Fight-or-flight response |
| **Dopamine** | ↑ Slight increase | +5 BPM | Reward system activation |
| **Glutamate** | ↑ Minimal | +2 BPM | Excitatory effect |
| **Serotonin** | ↓ Slight decrease | -3 BPM | Calming effect |
| **GABA** | ↓ Moderate decrease | -5 BPM | Inhibitory effect |

## Heart Rate Ranges

- **40-60 BPM**: Bradycardia (Slow) - Blue status
- **60-100 BPM**: Normal Sinus Rhythm - Green status
- **100-140 BPM**: Tachycardia (Fast) - Orange status
- **140+ BPM**: Severe Tachycardia - Red status

## Usage

The heart automatically responds to neurotransmitter releases:

1. Release neurotransmitters
2. Watch heart rate change
3. Observe ECG waveform
4. See status updates

## Technical Details

**Location**: `src/physiology/heartSimulation.js`

**Integration**: Automatically initialized in `simulation.js`

**Updates**: 60 FPS synchronized with main loop

## Files

- `src/physiology/heartSimulation.js` - Main heart system
- `simulation.js` - Integration point
