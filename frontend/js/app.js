// frontend/js/app.js - Main orchestrator and voice intent parser
document.addEventListener("DOMContentLoaded", async () => {
    const videoEl = document.getElementById("camera-preview");
    const canvasEl = document.getElementById("detection-canvas");
    const tapArea = document.getElementById("tap-talk-layer");
    const micButton = document.getElementById("mic-btn");
    const micStatusText = document.getElementById("mic-status");
    const transcriptList = document.getElementById("transcript-list");
    const modePills = document.querySelectorAll(".mode-pill");
    const btnLiveDetect = document.getElementById("btn-live-detect");
    const btnDescribe = document.getElementById("btn-describe");
    const btnRead = document.getElementById("btn-read");
    const btnFindWashroom = document.getElementById("btn-find-washroom");
    const btnFindExit = document.getElementById("btn-find-exit");
    const btnStop = document.getElementById("btn-stop");
    const btnObstacles = document.getElementById("btn-obstacles");
    const btnHelp = document.getElementById("btn-help");
    const btnCameraFlip = document.getElementById("btn-camera-flip");
    const scanOverlay = document.getElementById("scan-radar-overlay");
    const helpModal = document.getElementById("help-modal");
    const btnCloseHelp = document.getElementById("btn-close-help");
    const fallbackFileInput = document.getElementById("fallback-file-input");

    // Initialize Camera & Live Detector
    await window.camera.init(videoEl);
    if (window.liveDetector) {
        await window.liveDetector.init(videoEl, canvasEl);
        // Start live detection by default
        window.modeController.setMode("detect");
    }


    // Update Mic State in UI
    window.speechEngine.onListeningChangeCallback = (isListening) => {
        if (isListening) {
            micButton.classList.add("listening");
            micStatusText.textContent = "Listening... Say a command";
            tapArea.setAttribute("aria-label", "Listening for voice command. Tap to cancel.");
        } else {
            micButton.classList.remove("listening");
            micStatusText.textContent = "Tap anywhere to speak";
            tapArea.setAttribute("aria-label", "Tap anywhere to speak a command");
        }
    };

    // Update Speech State in UI
    window.speechEngine.onSpeechStateCallback = (isSpeaking, text) => {
        const speakingIndicator = document.getElementById("speaking-indicator");
        if (speakingIndicator) {
            speakingIndicator.style.display = isSpeaking ? "flex" : "none";
        }
        if (isSpeaking && text) {
            addTranscriptEntry("assistant", text);
        }
    };

    // Voice Intent Matching
    window.speechEngine.onCommandCallback = (transcript, confidence) => {
        addTranscriptEntry("user", transcript);
        parseAndExecuteIntent(transcript);
    };

    function parseAndExecuteIntent(rawText) {
        const text = rawText.toLowerCase().trim();
        console.log("Parsing voice intent:", text);

        // 1. STOP command
        if (text === "stop" || text.includes("stop") || text.includes("cancel") || text.includes("quiet") || text.includes("shut up")) {
            window.speechEngine.stopSpeaking();
            window.modeController.stopFindScan(true);
            if (window.liveDetector) window.liveDetector.stop();
            return;
        }

        // 2. LIVE DETECT command
        if (text.includes("live") || text.includes("detect") || text.includes("continuous") || text.includes("object detection") || text.includes("start detecting")) {
            window.modeController.runLiveDetect();
            return;
        }

        // 3. REPEAT command
        if (text === "repeat" || text.includes("repeat") || text.includes("say again") || text.includes("what did you say")) {
            window.speechEngine.repeatLast();
            return;
        }

        // 4. HELP command
        if (text === "help" || text.includes("help") || text.includes("commands") || text.includes("what can you do")) {
            const helpSpeech = "Commands: say Live to start real-time object detection. Say Describe for your surroundings. Say Read to read signs. Say Find Washroom or Find Exit for guided navigation. Say Stop to cancel.";
            window.speechEngine.speak(helpSpeech);
            return;
        }

        // 5. OBSTACLES toggle
        if (text.includes("obstacle") || text.includes("hazard") || text.includes("warning")) {
            window.modeController.toggleObstacles();
            return;
        }

        // 6. DESCRIBE mode
        if (text === "describe" || text.includes("describe") || text.includes("what's around") || text.includes("what is around") || text.includes("look around") || text.includes("where am i")) {
            window.modeController.runDescribe();
            return;
        }


        // 6. READ mode
        if (text === "read" || text.includes("read") || text.includes("text") || text.includes("sign") || text.includes("what does this say") || text.includes("read this")) {
            window.modeController.runRead();
            return;
        }

        // 7. FIND mode (washroom, exit, or custom)
        if (text.startsWith("find") || text.startsWith("look for") || text.startsWith("where is") || text.startsWith("locate")) {
            let target = "washroom";
            if (text.includes("washroom") || text.includes("restroom") || text.includes("toilet") || text.includes("bathroom")) {
                target = "washroom";
            } else if (text.includes("exit") || text.includes("way out")) {
                target = "exit";
            } else if (text.includes("stairs") || text.includes("staircase")) {
                target = "stairs";
            } else if (text.includes("elevator") || text.includes("lift")) {
                target = "elevator";
            } else {
                // Extract whatever follows find/where is
                target = text.replace(/^(find|look for|where is|locate)\s+/i, "").trim() || "washroom";
            }
            window.modeController.startFindScan(target);
            return;
        }

        // Fuzzy match for standalone words: washroom / exit
        if (text.includes("washroom") || text.includes("restroom") || text.includes("toilet")) {
            window.modeController.startFindScan("washroom");
            return;
        }
        if (text.includes("exit")) {
            window.modeController.startFindScan("exit");
            return;
        }

        // Unrecognized intent
        window.speechEngine.speak(`I heard "${rawText}". Try saying describe, read, or find washroom.`);
    }

    // UI Transcript Logger
    function addTranscriptEntry(sender, text) {
        if (!text) return;
        const entry = document.createElement("div");
        entry.className = `transcript-item ${sender}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const senderLabel = sender === "user" ? "You said" : "DRISHTI-AI";

        entry.innerHTML = `
            <div class="transcript-meta">
                <span class="sender-name">${senderLabel}</span>
                <span class="timestamp">${time}</span>
            </div>
            <div class="transcript-bubble">${escapeHtml(text)}</div>
        `;

        transcriptList.appendChild(entry);
        transcriptList.scrollTop = transcriptList.scrollHeight;
    }

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Full-screen tap-to-talk
    tapArea.addEventListener("click", (e) => {
        // Prevent triggering if clicked directly on an interactive button
        if (e.target.closest("button") || e.target.closest("input") || e.target.closest("#help-modal")) {
            return;
        }
        window.speechEngine.toggleListening();
    });

    micButton.addEventListener("click", () => {
        window.speechEngine.toggleListening();
    });

    // Big On-Screen Accessible Button Handlers
    if (btnLiveDetect) {
        btnLiveDetect.addEventListener("click", () => {
            window.modeController.runLiveDetect();
        });
    }

    btnDescribe.addEventListener("click", () => {
        window.modeController.runDescribe();
    });

    btnRead.addEventListener("click", () => {
        window.modeController.runRead();
    });

    btnFindWashroom.addEventListener("click", () => {
        window.modeController.startFindScan("washroom");
    });

    btnFindExit.addEventListener("click", () => {
        window.modeController.startFindScan("exit");
    });

    btnStop.addEventListener("click", () => {
        window.speechEngine.stopSpeaking();
        window.modeController.stopFindScan(true);
        if (window.liveDetector) window.liveDetector.stop();
    });

    btnObstacles.addEventListener("click", () => {
        window.modeController.toggleObstacles();
    });

    // Mode Pill click handlers
    modePills.forEach(pill => {
        pill.addEventListener("click", () => {
            const m = pill.dataset.mode;
            if (m === "detect") window.modeController.runLiveDetect();
            else if (m === "describe") window.modeController.runDescribe();
            else if (m === "read") window.modeController.runRead();
            else if (m === "find") window.modeController.startFindScan("washroom");
        });
    });

    btnHelp.addEventListener("click", () => {
        helpModal.classList.add("open");
        const helpText = "DRISHTI-AI Help. Tap anywhere to speak. Say live to start live object detection, describe for surroundings, read for signs, or find washroom for guided navigation. Say stop to cancel.";
        window.speechEngine.speak(helpText);
    });

    btnCloseHelp.addEventListener("click", () => {
        helpModal.classList.remove("open");
    });

    btnCameraFlip.addEventListener("click", async () => {
        await window.camera.toggleFacingMode();
        window.speechEngine.speak(`Switched camera to ${window.camera.facingMode}`);
    });

    // Fallback file input for testing images without camera
    fallbackFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            window.camera.setFallbackImage(event.target.result);
            window.speechEngine.speak("Test image loaded. Running analysis.");
            window.modeController.runDescribe();
        };
        reader.readAsDataURL(file);
    });

    // Listen for Mode Controller State Changes
    window.modeController.onStateChange = (state) => {
        modePills.forEach(pill => {
            if (pill.dataset.mode === state.mode) {
                pill.classList.add("active");
                pill.setAttribute("aria-selected", "true");
            } else {
                pill.classList.remove("active");
                pill.setAttribute("aria-selected", "false");
            }
        });

        // Live Detect button state
        if (btnLiveDetect) {
            if (state.mode === "detect") {
                btnLiveDetect.classList.add("active-detect");
                btnLiveDetect.setAttribute("aria-pressed", "true");
            } else {
                btnLiveDetect.classList.remove("active-detect");
                btnLiveDetect.setAttribute("aria-pressed", "false");
            }
        }

        // Status badge update
        const badge = document.getElementById("status-badge");
        if (badge) {
            if (state.mode === "detect") {
                badge.textContent = "Live Detect Active";
                badge.className = "status-badge active-live";
            } else if (state.mode === "find" && state.isScanning) {
                badge.textContent = `Finding ${state.target || 'target'}...`;
                badge.className = "status-badge active-analyzing";
            } else {
                badge.textContent = "Ready";
                badge.className = "status-badge ready";
            }
        }

        // Obstacles toggle button state
        if (state.obstacles) {
            btnObstacles.classList.add("active-warning");
            btnObstacles.setAttribute("aria-pressed", "true");
        } else {
            btnObstacles.classList.remove("active-warning");
            btnObstacles.setAttribute("aria-pressed", "false");
        }

        // Radar sweep overlay during FIND scanning
        if (state.isScanning) {
            scanOverlay.style.display = "block";
            btnStop.classList.add("pulse-urgent");
        } else {
            scanOverlay.style.display = "none";
            btnStop.classList.remove("pulse-urgent");
        }
    };


    // Mode Controller Analysis Lifecycle
    window.modeController.onAnalysisStart = (info) => {
        const badge = document.getElementById("status-badge");
        if (badge) {
            badge.textContent = `Analyzing (${info.mode})...`;
            badge.className = "status-badge active-analyzing";
        }
    };

    window.modeController.onAnalysisComplete = (data) => {
        const badge = document.getElementById("status-badge");
        if (badge) {
            badge.textContent = data.demo ? "Demo Mode" : "Ready";
            badge.className = data.demo ? "status-badge demo-badge" : "status-badge ready";
        }
    };

    // Keyboard accessibility shortcut (Spacebar triggers listen)
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target === document.body) {
            e.preventDefault();
            window.speechEngine.toggleListening();
        }
    });

    // Device Shake Detection (Turns on camera & live detection)
    let lastShakeTime = 0;
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', (event) => {
            const acc = event.accelerationIncludingGravity;
            if (!acc) return;
            const x = acc.x || 0;
            const y = acc.y || 0;
            const z = acc.z || 0;
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            if (magnitude > 24) {
                const now = Date.now();
                if (now - lastShakeTime > 2000) {
                    lastShakeTime = now;
                    console.log("[DRISHTI-AI] Phone shake detected!");
                    if (window.haptics) window.haptics.warning();
                    window.camera.init(videoEl).then(() => {
                        if (window.liveDetector) {
                            window.modeController.runLiveDetect();
                        }
                    });
                    if (window.speechEngine) {
                        window.speechEngine.speak("Shake detected. Camera turned on.");
                    }
                    addTranscriptEntry("assistant", "Phone shake detected. Camera turned on with live object detection.");
                }
            }
        });
    }

    // Initial greeting
    setTimeout(() => {
        addTranscriptEntry("assistant", "DRISHTI-AI ready. Shake phone to turn on camera, or say live detect, describe, read, or find washroom.");
    }, 400);
});
