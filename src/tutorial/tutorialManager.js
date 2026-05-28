/**
 * Interactive Tutorial Manager
 * Guides users through neurotransmission concepts with step-by-step walkthrough
 */

export class TutorialManager {
	constructor(simulation, eventBus, sceneManager) {
		this.simulation = simulation;
		this.eventBus = eventBus;
		this.sceneManager = sceneManager;
		this.currentStep = 0;
		this.isActive = false;
		this.completed = false;

		this.steps = this.createSteps();
		this.setupUI();
		this.setupEventListeners();
	}

	createSteps() {
		return [
			{
				id: "welcome",
				title: "Welcome to Neurotransmitter Simulation! 🧠",
				text: "Learn how neurons communicate through chemical signals. This tutorial will guide you through the basics of synaptic transmission.",
				highlight: null,
				position: "center",
				action: null,
				nextButton: "Start Tutorial",
			},
			{
				id: "presynaptic",
				title: "The Presynaptic Neuron",
				text: "This is the sending neuron. It contains the cell body (soma) and stores neurotransmitters in tiny vesicles.",
				highlight: "preSoma",
				position: "left",
				cameraPosition: { x: -10, y: 5, z: 15 },
				action: null,
				nextButton: "Next",
			},
			{
				id: "postsynaptic",
				title: "The Postsynaptic Neuron",
				text: "This is the receiving neuron. It has receptors that detect neurotransmitters.",
				highlight: "postSoma",
				position: "right",
				cameraPosition: { x: 10, y: 5, z: 15 },
				action: null,
				nextButton: "Next",
			},
			{
				id: "synaptic-cleft",
				title: "The Synaptic Cleft",
				text: "This gap between neurons is where the magic happens. Neurotransmitters travel across this space.",
				highlight: "synapticCleft",
				position: "center",
				cameraPosition: { x: 0, y: 0, z: 20 },
				action: null,
				nextButton: "Next",
			},
			{
				id: "receptors",
				title: "Receptors",
				text: 'These are the "locks" on the postsynaptic neuron. Each receptor can bind to specific neurotransmitters.',
				highlight: "receptors",
				position: "right",
				cameraPosition: { x: 5, y: 0, z: 10 },
				action: null,
				nextButton: "Next",
			},
			{
				id: "select-nt",
				title: "Choose a Neurotransmitter",
				text: "Different neurotransmitters have different effects. Let's start with Dopamine, which is involved in reward and motivation.",
				highlight: "ntType",
				position: "bottom",
				action: "selectNeurotransmitter",
				waitFor: "nt-selected",
				nextButton: null,
			},
			{
				id: "release",
				title: "Release Neurotransmitters",
				text: "Click the Release button to send neurotransmitters across the synapse!",
				highlight: "releaseBtn",
				position: "bottom",
				action: "waitForRelease",
				waitFor: "nt:released",
				nextButton: null,
			},
			{
				id: "observe-movement",
				title: "Watch Them Move",
				text: "See how neurotransmitters drift across the synaptic cleft? They move randomly until they find a receptor.",
				highlight: null,
				position: "center",
				cameraPosition: { x: 0, y: 0, z: 15 },
				action: "waitForBinding",
				waitFor: "nt:bound",
				duration: 3000,
				nextButton: null,
			},
			{
				id: "binding",
				title: "Receptor Binding! 🎯",
				text: "When a neurotransmitter binds to a receptor, it triggers a response in the receiving neuron. Notice how the receptor changes color!",
				highlight: "receptors",
				position: "right",
				cameraPosition: { x: 5, y: 0, z: 10 },
				action: null,
				duration: 3000,
				nextButton: "Next",
			},
			{
				id: "mood-face",
				title: "Emotional Response",
				text: 'The face shows the overall "mood" based on active neurotransmitters. Dopamine increases happiness and arousal!',
				highlight: "emotionalFace",
				position: "top-right",
				action: null,
				nextButton: "Next",
			},
			{
				id: "reuptake",
				title: "Reuptake Process",
				text: "Neurotransmitters don't stay in the synapse forever. Transporters (orange structures) recycle them back into the presynaptic neuron.",
				highlight: "transporters",
				position: "left",
				cameraPosition: { x: -3, y: 0, z: 10 },
				action: null,
				nextButton: "Next",
			},
			{
				id: "reuptake-inhibition",
				title: "Reuptake Inhibition",
				text: 'Some medications (like antidepressants) block reuptake. Let\'s try it! Click the "Toggle Reuptake Inhibition" button.',
				highlight: "inhibitBtn",
				position: "bottom",
				action: "waitForInhibition",
				waitFor: "reuptake-toggled",
				nextButton: null,
			},
			{
				id: "observe-inhibition",
				title: "More Neurotransmitters!",
				text: "With reuptake blocked, neurotransmitters stay in the synapse longer. This is how SSRIs (antidepressants) work!",
				highlight: null,
				position: "center",
				action: null,
				duration: 3000,
				nextButton: "Next",
			},
			{
				id: "try-different",
				title: "Try Different Neurotransmitters",
				text: "Each neurotransmitter has unique effects:\n• Dopamine: Reward, motivation\n• Serotonin: Mood, well-being\n• GABA: Calming, inhibitory\n• Glutamate: Excitatory, learning\n• Norepinephrine: Alertness, arousal",
				highlight: "ntType",
				position: "bottom",
				action: null,
				nextButton: "Next",
			},
			{
				id: "reset",
				title: "Reset the Simulation",
				text: "You can reset everything at any time with the Reset button. This clears all neurotransmitters and starts fresh.",
				highlight: "resetBtn",
				position: "bottom",
				action: null,
				nextButton: "Next",
			},
			{
				id: "complete",
				title: "Tutorial Complete! 🎉",
				text: "Great job! You now understand the basics of synaptic transmission. Feel free to experiment with different neurotransmitters and settings.",
				highlight: null,
				position: "center",
				action: "complete",
				nextButton: "Finish",
			},
		];
	}

	setupUI() {
		// Create tutorial overlay
		const overlay = document.createElement("div");
		overlay.id = "tutorial-overlay";
		overlay.className = "tutorial-overlay";
		overlay.style.display = "none";

		overlay.innerHTML = `
      <div class="tutorial-backdrop"></div>
      <div class="tutorial-content">
        <div class="tutorial-header">
          <h2 id="tutorial-title"></h2>
          <button id="tutorial-skip" class="tutorial-skip">Skip Tutorial</button>
        </div>
        <div class="tutorial-body">
          <p id="tutorial-text"></p>
          <div class="tutorial-progress">
            <div class="tutorial-progress-bar">
              <div id="tutorial-progress-fill" class="tutorial-progress-fill"></div>
            </div>
            <span id="tutorial-progress-text" class="tutorial-progress-text"></span>
          </div>
        </div>
        <div class="tutorial-footer">
          <button id="tutorial-prev" class="tutorial-btn tutorial-btn-secondary">Previous</button>
          <button id="tutorial-next" class="tutorial-btn tutorial-btn-primary">Next</button>
        </div>
      </div>
      <div class="tutorial-arrow"></div>
    `;

		document.body.appendChild(overlay);

		// Create tutorial start button
		const startBtn = document.createElement("button");
		startBtn.id = "tutorial-start-btn";
		startBtn.className = "tutorial-start-btn";
		startBtn.innerHTML = "📚 Start Tutorial";
		startBtn.addEventListener("click", () => this.start());

		// Add to controls area
		const controls = document.querySelector(".controls");
		if (controls) {
			controls.insertBefore(startBtn, controls.firstChild);
		}

		// Add styles
		this.addStyles();
	}

	addStyles() {
		const style = document.createElement("style");
		style.textContent = `
      .tutorial-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        pointer-events: none;
      }
      
      .tutorial-overlay.active {
        pointer-events: all;
      }
      
      .tutorial-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(2px);
      }
      
      .tutorial-content {
        position: absolute;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        color: white;
        pointer-events: all;
        animation: tutorialSlideIn 0.3s ease-out;
      }
      
      @keyframes tutorialSlideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .tutorial-content.position-center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }
      
      .tutorial-content.position-top {
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .tutorial-content.position-bottom {
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .tutorial-content.position-left {
        top: 50%;
        left: 100px;
        transform: translateY(-50%);
      }
      
      .tutorial-content.position-right {
        top: 50%;
        right: 100px;
        transform: translateY(-50%);
      }
      
      .tutorial-content.position-top-right {
        top: 100px;
        right: 100px;
      }
      
      .tutorial-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      #tutorial-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      
      .tutorial-skip {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s;
      }
      
      .tutorial-skip:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .tutorial-body {
        margin-bottom: 20px;
      }
      
      #tutorial-text {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        white-space: pre-line;
      }
      
      .tutorial-progress {
        margin-top: 16px;
      }
      
      .tutorial-progress-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .tutorial-progress-fill {
        height: 100%;
        background: white;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      
      .tutorial-progress-text {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .tutorial-footer {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .tutorial-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .tutorial-btn-primary {
        background: white;
        color: #667eea;
      }
      
      .tutorial-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
      }
      
      .tutorial-btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }
      
      .tutorial-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .tutorial-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tutorial-arrow {
        position: absolute;
        width: 0;
        height: 0;
        border: 12px solid transparent;
        display: none;
      }
      
      .tutorial-highlight {
        position: relative;
        z-index: 9999 !important;
        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.8),
                    0 0 0 8px rgba(102, 126, 234, 0.4),
                    0 0 20px rgba(102, 126, 234, 0.6) !important;
        animation: tutorialPulse 2s infinite;
        pointer-events: all !important;
      }
      
      @keyframes tutorialPulse {
        0%, 100% {
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.8),
                      0 0 0 8px rgba(102, 126, 234, 0.4),
                      0 0 20px rgba(102, 126, 234, 0.6);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(102, 126, 234, 0.8),
                      0 0 0 12px rgba(102, 126, 234, 0.4),
                      0 0 30px rgba(102, 126, 234, 0.8);
        }
      }
      
      .tutorial-start-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: all 0.3s;
      }
      
      .tutorial-start-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }
    `;
		document.head.appendChild(style);
	}

	setupEventListeners() {
		// Next button
		document.getElementById("tutorial-next").addEventListener("click", () => {
			this.next();
		});

		// Previous button
		document.getElementById("tutorial-prev").addEventListener("click", () => {
			this.previous();
		});

		// Skip button
		document.getElementById("tutorial-skip").addEventListener("click", () => {
			this.skip();
		});

		// Listen for simulation events
		if (this.eventBus) {
			this.eventBus.on("nt:released", () => this.handleEvent("nt:released"));
			this.eventBus.on("nt:bound", () => this.handleEvent("nt:bound"));
		}
	}

	start() {
		this.isActive = true;
		this.currentStep = 0;
		this.showStep(0);

		// Hide start button
		const startBtn = document.getElementById("tutorial-start-btn");
		if (startBtn) startBtn.style.display = "none";
	}

	showStep(index) {
		if (index < 0 || index >= this.steps.length) return;

		const step = this.steps[index];
		const overlay = document.getElementById("tutorial-overlay");
		const content = overlay.querySelector(".tutorial-content");

		// Show overlay
		overlay.style.display = "block";
		overlay.classList.add("active");

		// Update content
		document.getElementById("tutorial-title").textContent = step.title;
		document.getElementById("tutorial-text").textContent = step.text;

		// Update progress
		const progress = ((index + 1) / this.steps.length) * 100;
		document.getElementById("tutorial-progress-fill").style.width =
			`${progress}%`;
		document.getElementById("tutorial-progress-text").textContent =
			`Step ${index + 1} of ${this.steps.length}`;

		// Position content
		content.className = "tutorial-content";
		if (step.position) {
			content.classList.add(`position-${step.position}`);
		}

		// Update buttons
		const prevBtn = document.getElementById("tutorial-prev");
		const nextBtn = document.getElementById("tutorial-next");

		prevBtn.disabled = index === 0;
		nextBtn.textContent = step.nextButton || "Next";
		nextBtn.disabled = step.waitFor !== undefined;

		// Clear previous highlights
		this.clearHighlights();

		// Highlight element
		if (step.highlight) {
			this.highlightElement(step.highlight);
		}

		// Move camera
		if (step.cameraPosition && this.sceneManager) {
			this.moveCamera(step.cameraPosition);
		}

		// Handle actions
		if (step.action) {
			this.handleAction(step.action, step);
		}

		// Auto-advance after duration
		if (step.duration && !step.waitFor) {
			setTimeout(() => {
				if (this.currentStep === index) {
					this.next();
				}
			}, step.duration);
		}
	}

	highlightElement(elementId) {
		const element = document.getElementById(elementId);
		if (element) {
			element.classList.add("tutorial-highlight");
		}
	}

	clearHighlights() {
		document.querySelectorAll(".tutorial-highlight").forEach((el) => {
			el.classList.remove("tutorial-highlight");
		});
	}

	moveCamera(position) {
		// Smooth camera transition
		const duration = 1000;
		const startPos = this.sceneManager.camera.position.clone();
		const startTime = Date.now();

		const animate = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = 1 - (1 - progress) ** 3; // Ease out cubic

			this.sceneManager.camera.position.lerpVectors(
				startPos,
				new THREE.Vector3(position.x, position.y, position.z),
				eased,
			);

			if (progress < 1) {
				requestAnimationFrame(animate);
			}
		};

		animate();
	}

	handleAction(action, step) {
		switch (action) {
			case "selectNeurotransmitter": {
				// Wait for user to select NT
				const ntSelect = document.getElementById("ntType");
				if (ntSelect) {
					const handler = () => {
						this.handleEvent("nt-selected");
						ntSelect.removeEventListener("change", handler);
					};
					ntSelect.addEventListener("change", handler);
				}
				break;
			}

			case "waitForRelease":
				// Handled by event listener
				break;

			case "waitForBinding":
				// Handled by event listener
				break;

			case "waitForInhibition": {
				const inhibitBtn = document.getElementById("inhibitBtn");
				if (inhibitBtn) {
					const handler = () => {
						this.handleEvent("reuptake-toggled");
						inhibitBtn.removeEventListener("click", handler);
					};
					inhibitBtn.addEventListener("click", handler);
				}
				break;
			}

			case "complete":
				this.completed = true;
				break;
		}
	}

	handleEvent(eventName) {
		const step = this.steps[this.currentStep];
		if (step && step.waitFor === eventName) {
			// Enable next button
			document.getElementById("tutorial-next").disabled = false;

			// Auto-advance after short delay
			setTimeout(() => {
				if (this.currentStep < this.steps.length - 1) {
					this.next();
				}
			}, 1500);
		}
	}

	next() {
		if (this.currentStep < this.steps.length - 1) {
			this.currentStep++;
			this.showStep(this.currentStep);
		} else {
			this.finish();
		}
	}

	previous() {
		if (this.currentStep > 0) {
			this.currentStep--;
			this.showStep(this.currentStep);
		}
	}

	skip() {
		if (confirm("Are you sure you want to skip the tutorial?")) {
			this.finish();
		}
	}

	finish() {
		this.isActive = false;
		this.clearHighlights();

		const overlay = document.getElementById("tutorial-overlay");
		overlay.style.display = "none";
		overlay.classList.remove("active");

		// Show start button again
		const startBtn = document.getElementById("tutorial-start-btn");
		if (startBtn) {
			startBtn.style.display = "block";
			startBtn.innerHTML = "📚 Restart Tutorial";
		}

		// Show completion message
		if (this.completed) {
			this.showCompletionMessage();
		}
	}

	showCompletionMessage() {
		const message = document.createElement("div");
		message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 40px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      z-index: 10001;
      text-align: center;
      animation: tutorialSlideIn 0.3s ease-out;
    `;

		message.innerHTML = `
      <h2 style="margin: 0 0 16px 0; font-size: 28px;">🎉 Tutorial Complete!</h2>
      <p style="margin: 0 0 20px 0; font-size: 16px;">
        You've learned the basics of synaptic transmission.<br>
        Now explore on your own!
      </p>
      <button id="completion-ok" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 12px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      ">Got it!</button>
    `;

		document.body.appendChild(message);

		document.getElementById("completion-ok").addEventListener("click", () => {
			message.remove();
		});

		setTimeout(() => {
			message.remove();
		}, 5000);
	}
}
