# What to Observe in the Simulation

## Quick Start
1. Run `npm run dev`
2. Open http://localhost:5500
3. Select a neurotransmitter type
4. Click "Release Neurotransmitters"
5. Watch the magic happen!

## Visual Guide

### 🔵 Neurotransmitter Colors
- **Purple** - Dopamine (reward/pleasure)
- **Orange** - Serotonin (mood regulation)
- **Blue** - Glutamate (excitatory)
- **Green** - GABA (inhibitory)
- **Red** - Norepinephrine (arousal/attention)

### 🎯 What Happens When You Release

1. **Axon Terminal Pulses** (left side)
   - Watch for a brief expansion - this is the release event

2. **Particles Appear** (center-left)
   - 8 colored spheres pop into existence
   - They start small and grow to full size
   - Each one pulses with a glow

3. **Diffusion Across Cleft** (center)
   - Particles drift rightward toward receptors
   - Slight wavering motion (brownian motion)
   - Stay within the cylindrical cleft boundaries
   - Cleft itself glows brighter with more activity

4. **Receptor Binding** (right side)
   - Gray cube receptors turn **RED** (excitatory) or **GREEN** (inhibitory)
   - Bound particle glows brighter and grows 20%
   - Particle "sticks" to receptor for 2+ seconds

5. **Unbinding** (after 2+ seconds)
   - Receptor returns to gray
   - Particle shrinks back to normal size
   - Drifts away slowly

6. **Clearance** (ongoing)
   - **Reuptake**: Orange transporters pull particles back (slow)
   - **Degradation**: Red MAO enzymes break down particles (slow)
   - Watch particles fade and shrink as they're cleared

### 🎭 Emotional Face (top-right) - ENHANCED!

**Display:**
- Larger, prominent square display with rounded corners
- Shadow and border effects
- "Mood State" label at bottom
- Dynamic background color that changes with mood

**Features:**
- **Eyes** - Multi-layered realistic eyes
  - Iris color changes (bright blue → dark blue → vibrant)
  - Pupils dilate dramatically with arousal (up to 80%)
  - Eyes widen when aroused (15% larger)
  - Squint when anxious (60% narrower)
  - Subtle jitter when very anxious
  - White highlights make eyes look alive
- **Eyebrows** - Thick, expressive brows
  - Raise high with happiness/arousal (35%)
  - Furrow inward with anxiety (15° angle)
  - Thicken with strong emotions (30%)
- **Mouth** - Dynamic curve and position
  - Smiles upward when happy (80% curve)
  - Frowns/tightens when anxious
  - Widens with arousal (30% wider)
  - Moves down when tense
- **Cheeks** - Blushing effect (NEW!)
  - Pink and puffy when happy
  - Visible with arousal
  - Fade when neutral/anxious
- **Nose** - Small centered nose (NEW!)
- **Head** - Tilts and bobs (NEW!)
  - Tilts 8° when happy
  - Tilts opposite 5° when anxious
  - Subtle bobbing with arousal
- **Particles** - Special effects (NEW!)
  - ✨ Yellow sparkles float up when very happy (>0.6)
  - 💧 Blue sweat drops fall when very anxious (>0.6)
- **Background** - Mood-responsive colors (NEW!)
  - Warm blue (0x2a3a4a) when happy
  - Energetic purple (0x2a2040) when aroused
  - Dark blue (0x1a1a2e) when anxious/neutral
- **Blinking** - Natural blinking, faster when anxious

### 📊 Info Panel (right side)
Shows active neurotransmitter types and their effects

### 🔴 Reuptake Inhibition Button
- Click to toggle reuptake on/off
- Transporters turn **RED** when inhibited
- Neurotransmitters stay in cleft much longer
- Simulates drugs like SSRIs (Selective Serotonin Reuptake Inhibitors)

## Interesting Experiments

### Experiment 1: Compare Neurotransmitter Types
- Release Dopamine → Watch for purple particles, red receptors
- Reset
- Release GABA → Watch for green particles, green receptors
- Notice different speeds and behaviors

### Experiment 2: Reuptake Inhibition
- Release Serotonin normally → Count how long particles last
- Reset
- Toggle "Reuptake Inhibition" ON (button turns red)
- Release Serotonin again → Particles last MUCH longer
- This is how antidepressants work!

### Experiment 3: Receptor Saturation
- Click "Release" multiple times rapidly
- Watch receptors fill up (turn colored)
- Notice new particles can't bind when all receptors occupied
- Wait for unbinding to free up receptors

### Experiment 4: Mixed Neurotransmitters
- Release Dopamine (excitatory/purple)
- Immediately release GABA (inhibitory/green)
- Watch the face react to the mixture
- See both red and green receptors active

### Experiment 5: Degradation vs Reuptake
- Release Dopamine (MAO-sensitive)
- Watch some particles get pulled to transporters (reuptake)
- Watch others break apart near red enzymes (degradation)
- Notice the balance between the two clearance mechanisms

## Performance Tips

- **Smooth**: 1-2 releases at a time
- **Busy**: 3-4 releases (lots of activity)
- **Overwhelming**: 5+ releases (may slow down)
- Use **Reset** to clear and start fresh

## Educational Concepts Demonstrated

1. **Vesicular Release** - Neurotransmitters stored in vesicles, released on demand
2. **Diffusion** - Random walk across synaptic cleft
3. **Receptor Specificity** - Different types bind to different receptors
4. **Excitatory vs Inhibitory** - Red vs green visual coding
5. **Reuptake** - Transporter proteins recycle neurotransmitters
6. **Enzymatic Degradation** - MAO breaks down certain types
7. **Receptor Dynamics** - Binding and unbinding over time
8. **Pharmacology** - Reuptake inhibition simulates drug effects
9. **Mood Effects** - Neurotransmitter combinations affect emotional state

## Common Questions

**Q: Why do particles move so slowly?**
A: Real neurotransmission happens in milliseconds, but we've slowed it down 100x so you can observe the process.

**Q: Why don't all particles bind?**
A: Limited receptors + random diffusion = some miss and get cleared by reuptake/degradation.

**Q: What are the red glowing spheres?**
A: MAO enzymes that break down certain neurotransmitters (Dopamine, Serotonin, Norepinephrine).

**Q: Why does the face look weird sometimes?**
A: It's reacting to the neurotransmitter mixture - high arousal + high anxiety = wide eyes and tension!

**Q: Can receptors be reused?**
A: Yes! After 2+ seconds, neurotransmitters unbind and receptors become available again.

## Enjoy Exploring! 🧠✨
