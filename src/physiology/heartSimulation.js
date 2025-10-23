/**
 * Heart Simulation
 * Visualizes heart rate and rhythm changes based on neurotransmitter activity
 */

import * as THREE from "three";

export class HeartSimulation {
  constructor(scene, eventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    // Heart state
    this.baseHeartRate = 70; // BPM
    this.currentHeartRate = 70;
    this.targetHeartRate = 70;
    this.beatPhase = 0;
    this.lastBeatTime = 0;

    // Neurotransmitter effects on heart
    this.ntEffects = {
      DOPAMINE: { rate: 5, strength: 0.1 }, // Slight increase
      SEROTONIN: { rate: -3, strength: 0.05 }, // Slight decrease
      GLUTAMATE: { rate: 2, strength: 0.05 }, // Minimal effect
      GABA: { rate: -5, strength: 0.1 }, // Calming effect
      NOREPINEPHRINE: { rate: 15, strength: 0.2 }, // Strong increase (fight/flight)
    };

    // Active neurotransmitters
    this.activeNTs = new Map();

    // Create heart visualization
    this.createHeart();
    this.createECG();
    this.createUI();

    // Subscribe to events
    this.setupEventListeners();

    console.log("Heart simulation initialized");
  }

  createHeart() {
    // Create anatomically-inspired heart shape
    const heartGroup = new THREE.Group();

    // Heart body (ventricles)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0);
    bodyShape.bezierCurveTo(0, -0.3, -0.6, -0.3, -0.6, 0);
    bodyShape.bezierCurveTo(-0.6, 0.3, -0.3, 0.6, 0, 0.9);
    bodyShape.bezierCurveTo(0.3, 0.6, 0.6, 0.3, 0.6, 0);
    bodyShape.bezierCurveTo(0.6, -0.3, 0, -0.3, 0, 0);

    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    };

    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    this.heartMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4444,
      roughness: 0.6,
      metalness: 0.2,
      emissive: 0xff0000,
      emissiveIntensity: 0.2,
    });

    const heartMesh = new THREE.Mesh(bodyGeometry, this.heartMaterial);
    heartMesh.rotation.x = Math.PI;
    heartGroup.add(heartMesh);

    // Add chambers (atria)
    const atriumGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const atriumMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6666,
      roughness: 0.6,
      metalness: 0.2,
      emissive: 0xff2222,
      emissiveIntensity: 0.2,
    });

    const leftAtrium = new THREE.Mesh(atriumGeometry, atriumMaterial);
    leftAtrium.position.set(-0.3, 0.6, 0.2);
    leftAtrium.scale.set(1, 0.8, 0.8);
    heartGroup.add(leftAtrium);

    const rightAtrium = new THREE.Mesh(atriumGeometry, atriumMaterial);
    rightAtrium.position.set(0.3, 0.6, 0.2);
    rightAtrium.scale.set(1, 0.8, 0.8);
    heartGroup.add(rightAtrium);

    // Add blood vessels (aorta, vena cava)
    const vesselGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 12);
    const vesselMaterial = new THREE.MeshStandardMaterial({
      color: 0xcc3333,
      roughness: 0.5,
      metalness: 0.3,
    });

    const aorta = new THREE.Mesh(vesselGeometry, vesselMaterial);
    aorta.position.set(-0.15, 0.9, 0.2);
    aorta.rotation.z = Math.PI / 6;
    heartGroup.add(aorta);

    // Pulsing glow effect
    const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    this.heartGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    heartGroup.add(this.heartGlow);

    // Position heart in scene
    heartGroup.position.set(-8, 8, 5);
    heartGroup.scale.setScalar(2);

    this.heartGroup = heartGroup;
    this.heartMesh = heartMesh;
    this.leftAtrium = leftAtrium;
    this.rightAtrium = rightAtrium;

    this.scene.add(heartGroup);
  }

  createECG() {
    // Create ECG monitor display
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    this.ecgCanvas = canvas;
    this.ecgContext = canvas.getContext("2d");

    // ECG data
    this.ecgData = new Array(512).fill(128);
    this.ecgIndex = 0;

    // Create texture from canvas
    this.ecgTexture = new THREE.CanvasTexture(canvas);

    // Create screen mesh
    const screenGeometry = new THREE.PlaneGeometry(4, 2);
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: this.ecgTexture,
      side: THREE.DoubleSide,
    });

    this.ecgScreen = new THREE.Mesh(screenGeometry, screenMaterial);
    this.ecgScreen.position.set(-8, 11, 5);
    this.scene.add(this.ecgScreen);

    // Draw initial ECG
    this.drawECG();
  }

  createUI() {
    // Create heart rate display
    const container = document.createElement("div");
    container.id = "heart-monitor";
    container.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #ff4444;
      border-radius: 8px;
      padding: 15px;
      color: #ff4444;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      min-width: 200px;
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
    `;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <div id="heart-icon" style="font-size: 24px;">❤️</div>
        <div>
          <div style="font-size: 12px; opacity: 0.7;">HEART RATE</div>
          <div id="heart-rate" style="font-size: 32px; font-weight: bold;">70</div>
        </div>
        <div style="font-size: 16px; opacity: 0.7;">BPM</div>
      </div>
      <div style="border-top: 1px solid rgba(255, 68, 68, 0.3); padding-top: 10px;">
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 5px;">ACTIVE EFFECTS:</div>
        <div id="heart-effects" style="font-size: 11px; line-height: 1.4;">
          No active neurotransmitters
        </div>
      </div>
      <div style="border-top: 1px solid rgba(255, 68, 68, 0.3); padding-top: 10px; margin-top: 10px;">
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 5px;">STATUS:</div>
        <div id="heart-status" style="font-size: 11px;">Normal Sinus Rhythm</div>
      </div>
    `;

    document.body.appendChild(container);

    this.heartRateEl = document.getElementById("heart-rate");
    this.heartEffectsEl = document.getElementById("heart-effects");
    this.heartStatusEl = document.getElementById("heart-status");
    this.heartIconEl = document.getElementById("heart-icon");
  }

  setupEventListeners() {
    if (!this.eventBus) return;

    // Track neurotransmitter releases
    this.eventBus.on("nt:released", ({ type, nt }) => {
      this.addNeurotransmitter(type);
    });

    // Track neurotransmitter removal
    this.eventBus.on("nt:reuptaken", ({ nt }) => {
      this.removeNeurotransmitter(nt.type);
    });

    this.eventBus.on("nt:degraded", ({ nt }) => {
      this.removeNeurotransmitter(nt.type);
    });

    // Reset
    this.eventBus.on("sim:reset", () => {
      this.reset();
    });
  }

  addNeurotransmitter(type) {
    const count = this.activeNTs.get(type) || 0;
    this.activeNTs.set(type, count + 1);
    this.updateHeartRate();
  }

  removeNeurotransmitter(type) {
    const count = this.activeNTs.get(type) || 0;
    if (count > 0) {
      this.activeNTs.set(type, count - 1);
      if (count - 1 === 0) {
        this.activeNTs.delete(type);
      }
      this.updateHeartRate();
    }
  }

  updateHeartRate() {
    // Calculate target heart rate based on active neurotransmitters
    let rateModifier = 0;
    const effects = [];

    this.activeNTs.forEach((count, type) => {
      const effect = this.ntEffects[type];
      if (effect) {
        const contribution = effect.rate * Math.min(count * effect.strength, 1);
        rateModifier += contribution;

        if (count > 0) {
          const sign = effect.rate > 0 ? "↑" : "↓";
          effects.push(
            `${type}: ${sign} ${Math.abs(Math.round(contribution))} BPM`
          );
        }
      }
    });

    // Update target heart rate
    this.targetHeartRate = Math.max(
      40,
      Math.min(180, this.baseHeartRate + rateModifier)
    );

    // Update UI
    this.updateUI(effects);
  }

  updateUI(effects) {
    // Update effects list
    if (effects.length === 0) {
      this.heartEffectsEl.textContent = "No active neurotransmitters";
      this.heartEffectsEl.style.opacity = "0.5";
    } else {
      this.heartEffectsEl.innerHTML = effects.join("<br>");
      this.heartEffectsEl.style.opacity = "1";
    }

    // Update status based on heart rate
    let status = "Normal Sinus Rhythm";
    let statusColor = "#44ff44";

    if (this.currentHeartRate < 60) {
      status = "Bradycardia (Slow)";
      statusColor = "#4444ff";
    } else if (this.currentHeartRate > 100) {
      status = "Tachycardia (Fast)";
      statusColor = "#ffaa44";
    } else if (this.currentHeartRate > 140) {
      status = "Severe Tachycardia";
      statusColor = "#ff4444";
    }

    this.heartStatusEl.textContent = status;
    this.heartStatusEl.style.color = statusColor;
  }

  update() {
    const now = Date.now();
    const deltaTime = 16; // ~60fps

    // Smoothly interpolate heart rate
    const lerpSpeed = 0.02;
    this.currentHeartRate +=
      (this.targetHeartRate - this.currentHeartRate) * lerpSpeed;

    // Update display
    this.heartRateEl.textContent = Math.round(this.currentHeartRate);

    // Calculate beat interval (ms per beat)
    const beatInterval = (60 / this.currentHeartRate) * 1000;

    // Update beat phase
    this.beatPhase += (deltaTime / beatInterval) * Math.PI * 2;

    // Trigger beat animation
    if (this.beatPhase >= Math.PI * 2) {
      this.beatPhase -= Math.PI * 2;
      this.triggerBeat();
    }

    // Animate heart
    this.animateHeart();

    // Update ECG
    this.updateECG();
  }

  triggerBeat() {
    // Visual beat effect
    this.lastBeatTime = Date.now();

    // Pulse icon
    this.heartIconEl.style.transform = "scale(1.3)";
    setTimeout(() => {
      this.heartIconEl.style.transform = "scale(1)";
    }, 100);

    // Flash glow
    this.heartGlow.material.opacity = 0.3;
  }

  animateHeart() {
    const timeSinceBeat = Date.now() - this.lastBeatTime;
    const beatDuration = (60 / this.currentHeartRate) * 1000;

    // Systole (contraction) - first 1/3 of beat
    // Diastole (relaxation) - remaining 2/3
    let scale = 1;

    if (timeSinceBeat < beatDuration * 0.15) {
      // Quick contraction
      const progress = timeSinceBeat / (beatDuration * 0.15);
      scale = 1 - progress * 0.15;
    } else if (timeSinceBeat < beatDuration * 0.35) {
      // Quick expansion
      const progress =
        (timeSinceBeat - beatDuration * 0.15) / (beatDuration * 0.2);
      scale = 0.85 + progress * 0.2;
    } else {
      // Slow relaxation back to normal
      const progress =
        (timeSinceBeat - beatDuration * 0.35) / (beatDuration * 0.65);
      scale = 1.05 - progress * 0.05;
    }

    // Apply scale
    this.heartMesh.scale.setScalar(scale);
    this.leftAtrium.scale.set(scale, scale * 0.8, scale * 0.8);
    this.rightAtrium.scale.set(scale, scale * 0.8, scale * 0.8);

    // Pulsing emissive
    const emissiveIntensity = 0.2 + Math.sin(this.beatPhase) * 0.1;
    this.heartMaterial.emissiveIntensity = emissiveIntensity;

    // Fade glow
    if (this.heartGlow.material.opacity > 0) {
      this.heartGlow.material.opacity *= 0.95;
    }

    // Rotate slightly for 3D effect
    this.heartGroup.rotation.y = Math.sin(Date.now() * 0.0005) * 0.1;
  }

  updateECG() {
    const timeSinceBeat = Date.now() - this.lastBeatTime;
    const beatDuration = (60 / this.currentHeartRate) * 1000;
    const progress = timeSinceBeat / beatDuration;

    // Generate ECG waveform (PQRST complex)
    let value = 128; // Baseline

    if (progress < 0.1) {
      // P wave (atrial depolarization)
      value = 128 + Math.sin(progress * Math.PI * 10) * 20;
    } else if (progress > 0.15 && progress < 0.35) {
      // QRS complex (ventricular depolarization)
      const qrsProgress = (progress - 0.15) / 0.2;
      if (qrsProgress < 0.3) {
        // Q wave (small dip)
        value = 128 - 15;
      } else if (qrsProgress < 0.6) {
        // R wave (large spike)
        value = 128 + 80;
      } else {
        // S wave (dip)
        value = 128 - 20;
      }
    } else if (progress > 0.4 && progress < 0.6) {
      // T wave (ventricular repolarization)
      const tProgress = (progress - 0.4) / 0.2;
      value = 128 + Math.sin(tProgress * Math.PI) * 30;
    }

    // Add to ECG data
    this.ecgData[this.ecgIndex] = value;
    this.ecgIndex = (this.ecgIndex + 1) % this.ecgData.length;

    // Draw ECG every few frames
    if (this.ecgIndex % 2 === 0) {
      this.drawECG();
    }
  }

  drawECG() {
    const ctx = this.ecgContext;
    const width = this.ecgCanvas.width;
    const height = this.ecgCanvas.height;

    // Clear with dark background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "rgba(68, 255, 68, 0.1)";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw ECG waveform
    ctx.strokeStyle = "#44ff44";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < this.ecgData.length; i++) {
      const x = i;
      const y = this.ecgData[i];

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw current position indicator
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.ecgIndex, 0);
    ctx.lineTo(this.ecgIndex, height);
    ctx.stroke();

    // Update texture
    this.ecgTexture.needsUpdate = true;
  }

  reset() {
    this.activeNTs.clear();
    this.targetHeartRate = this.baseHeartRate;
    this.currentHeartRate = this.baseHeartRate;
    this.updateHeartRate();
  }

  hide() {
    this.heartGroup.visible = false;
    this.ecgScreen.visible = false;
    document.getElementById("heart-monitor").style.display = "none";
  }

  show() {
    this.heartGroup.visible = true;
    this.ecgScreen.visible = true;
    document.getElementById("heart-monitor").style.display = "block";
  }
}
