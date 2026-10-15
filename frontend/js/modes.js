// frontend/js/modes.js - Core modes and state machine
class ModeController {
    constructor() {
        this.currentMode = "describe"; // "describe" | "read" | "find"
        this.obstaclesEnabled = false;

        // FIND mode state
        this.findTarget = "washroom";
        this.findScanCount = 0;
        this.maxFindScans = 8;
        this.isScanning = false;
        this.scanIntervalTimer = null;
        this.lastFindingText = null;

        // Callbacks for UI updates
        this.onAnalysisStart = null;
        this.onAnalysisComplete = null;
        this.onStateChange = null;
    }

    setMode(newMode, target = null) {
        if (this.isScanning) {
            this.stopFindScan();
        }

        if (this.currentMode === "detect" && newMode !== "detect") {
            if (window.liveDetector) window.liveDetector.stop();
        }

        this.currentMode = newMode;
        if (target) {
            this.findTarget = target;
        }

        if (newMode === "detect") {
            if (window.liveDetector && !window.liveDetector.isActive) {
                window.liveDetector.start();
            }
        }

        if (this.onStateChange) {
            this.onStateChange({
                mode: this.currentMode,
                obstacles: this.obstaclesEnabled,
                isScanning: this.isScanning,
                isLiveDetect: this.currentMode === "detect",
                target: this.findTarget
            });
        }
    }

    runLiveDetect() {
        if (this.currentMode === "detect" && window.liveDetector && window.liveDetector.isActive) {
            this.stopLiveDetect();
        } else {
            this.setMode("detect");
        }
    }

    stopLiveDetect() {
        if (window.liveDetector) {
            window.liveDetector.stop();
        }
        this.setMode("describe");
        if (window.speechEngine) {
            window.speechEngine.speak("Live detection stopped.");
        }
    }


    toggleObstacles() {
        this.obstaclesEnabled = !this.obstaclesEnabled;
        const msg = this.obstaclesEnabled ? "Obstacle warnings enabled. Remember, this is an aid and does not replace your cane or guide dog." : "Obstacle warnings disabled.";
        window.speechEngine.speak(msg);

        if (this.onStateChange) {
            this.onStateChange({
                mode: this.currentMode,
                obstacles: this.obstaclesEnabled,
                isScanning: this.isScanning,
                target: this.findTarget
            });
        }
    }

    async runDescribe() {
        this.setMode("describe");
        if (window.speechEngine) window.speechEngine.speak("Describing scene...");
        return this._executeAnalysis("describe");
    }

    async runRead() {
        this.setMode("read");
        if (window.speechEngine) window.speechEngine.speak("Reading sign...");
        return this._executeAnalysis("read");
    }

    // Hero Feature: Guided FIND Scanning Loop
    startFindScan(target = "washroom") {
        this.setMode("find", target);
        this.findScanCount = 0;
        this.isScanning = true;
        this.lastFindingText = null;

        if (this.onStateChange) {
            this.onStateChange({
                mode: "find",
                obstacles: this.obstaclesEnabled,
                isScanning: true,
                target: this.findTarget
            });
        }

        const initialGuide = `Finding ${this.findTarget}. Slowly turn left.`;
        window.speechEngine.speak(initialGuide, {
            onComplete: () => {
                if (this.isScanning) {
                    this._scheduleNextFindScan(600);
                }
            }
        });
    }

    stopFindScan(userInitiated = false) {
        if (this.scanIntervalTimer) {
            clearTimeout(this.scanIntervalTimer);
            this.scanIntervalTimer = null;
        }
        const wasScanning = this.isScanning;
        this.isScanning = false;

        if (this.onStateChange) {
            this.onStateChange({
                mode: this.currentMode,
                obstacles: this.obstaclesEnabled,
                isScanning: false,
                target: this.findTarget
            });
        }

        if (userInitiated && wasScanning) {
            window.speechEngine.speak("Scan stopped.");
        }
    }

    _scheduleNextFindScan(delayMs = 2500) {
        if (!this.isScanning) return;
        this.scanIntervalTimer = setTimeout(async () => {
            if (!this.isScanning) return;
            await this._performFindScanStep();
        }, delayMs);
    }

    async _performFindScanStep() {
        if (!this.isScanning) return;
        this.findScanCount += 1;

        if (window.haptics) window.haptics.scanTick();
        if (window.earcues) window.earcues.playProcessingTick();

        const result = await this._executeAnalysis("find", this.findTarget, this.findScanCount);

        if (!this.isScanning) return; // In case stopped while waiting for response

        if (result && result.found) {
            // TARGET FOUND!
            if (window.haptics) window.haptics.targetFound();
            if (window.earcues) window.earcues.playTargetFound();

            this.stopFindScan(false);
            window.speechEngine.speak(result.speech);
            return;
        }

        // Check if exceeded max scan frames (~8 frames)
        if (this.findScanCount >= this.maxFindScans) {
            this.stopFindScan(false);
            const notFoundMsg = `I could not locate ${this.findTarget} after a full scan. Try turning around or asking someone nearby for assistance.`;
            window.speechEngine.speak(notFoundMsg);
            return;
        }

        // Continue scanning cadence
        this._scheduleNextFindScan(2500);
    }

    async _executeAnalysis(mode, target = null, scanCount = 0) {
        const frameB64 = window.camera.captureFrameBase64();
        if (!frameB64) {
            window.speechEngine.speak("Camera frame unavailable. Please check camera access.");
            return null;
        }

        if (this.onAnalysisStart) {
            this.onAnalysisStart({ mode, target, scanCount });
        }

        const payload = {
            image_base64: frameB64,
            mode: mode,
            target: target,
            obstacles_enabled: this.obstaclesEnabled,
            scan_count: scanCount
        };

        try {
            const resp = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                throw new Error(`Server returned ${resp.status}`);
            }

            const data = await resp.json();

            // Check for detected hazards
            if (data.hazards && data.hazards.length > 0) {
                if (window.haptics) window.haptics.hazardAlert();
                if (window.earcues) window.earcues.playHazardAlert();
            }

            if (this.onAnalysisComplete) {
                this.onAnalysisComplete(data);
            }

            // Speak for describe and read modes directly
            if (mode !== "find") {
                window.speechEngine.speak(data.speech);
            }

            return data;
        } catch (err) {
            console.error("Analysis request failed:", err);
            const fallback = {
                speech: "I couldn't process that, please try again.",
                confidence: "low",
                found: false,
                hazards: [],
                mode: mode
            };
            if (this.onAnalysisComplete) {
                this.onAnalysisComplete(fallback);
            }
            if (mode !== "find") {
                window.speechEngine.speak(fallback.speech);
            }
            return fallback;
        }
    }
}

window.modeController = new ModeController();
