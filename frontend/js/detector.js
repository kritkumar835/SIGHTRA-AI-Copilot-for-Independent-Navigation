// frontend/js/detector.js - Real-Time Live Object Detection & Obstacle Navigation
class LiveObjectDetector {
    constructor() {
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.isActive = false;
        this.model = null;
        this.isLoadingModel = false;
        this.useBackendFallback = false;
        this.animationFrameId = null;
        this.lastBackendCallTime = 0;
        this.backendCallIntervalMs = 450;
        this.isProcessingFrame = false;

        // Announcements and debouncing for blind audio guidance
        this.speechEnabled = true;
        this.lastSpokenTime = 0;
        this.minSpeechIntervalMs = 3500; // minimum time between regular spoken updates
        this.recentAnnouncements = new Map(); // key -> timestamp
        this.lastHazardSpoken = 0;

        // Currently detected objects
        this.currentDetections = [];
        this.fpsCounter = 0;
        this.fps = 0;
        this.lastFpsUpdateTime = performance.now();

        // Callbacks
        this.onDetectionsChange = null;
    }

    async init(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvas = canvasElement;
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
        await this._loadModel();
    }

    async _loadModel() {
        if (this.model || this.isLoadingModel) return;
        this.isLoadingModel = true;

        try {
            if (window.cocoSsd && window.tf) {
                console.log("Loading TensorFlow.js COCO-SSD model...");
                this.model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
                console.log("COCO-SSD live detector ready!");
                this.useBackendFallback = false;
            } else {
                console.warn("TFJS / COCO-SSD script not found in window, using high-speed backend /api/detect fallback.");
                this.useBackendFallback = true;
            }
        } catch (err) {
            console.warn("Failed to load browser TFJS model, falling back to /api/detect:", err);
            this.useBackendFallback = true;
        } finally {
            this.isLoadingModel = false;
        }
    }

    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.recentAnnouncements.clear();
        this.lastSpokenTime = 0;
        this.lastHazardSpoken = 0;

        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Show HUD badge
        const hudBadge = document.getElementById("live-hud-badge");
        if (hudBadge) hudBadge.style.display = "flex";

        if (window.speechEngine) {
            window.speechEngine.speak("Live object detection started. Pan your camera to explore.");
        }

        this._loop();
    }

    stop() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clear canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Hide HUD badges
        const hudBadge = document.getElementById("live-hud-badge");
        if (hudBadge) hudBadge.style.display = "none";
        const banner = document.getElementById("obstacle-warning-banner");
        if (banner) banner.style.display = "none";

        this.currentDetections = [];
        if (this.onDetectionsChange) {
            this.onDetectionsChange([]);
        }
    }

    toggle() {
        if (this.isActive) {
            this.stop();
            return false;
        } else {
            this.start();
            return true;
        }
    }

    _loop() {
        if (!this.isActive) return;

        this._updateFps();

        if (!this.isProcessingFrame) {
            this._processCurrentFrame();
        }

        this.animationFrameId = requestAnimationFrame(() => this._loop());
    }

    _updateFps() {
        this.fpsCounter++;
        const now = performance.now();
        if (now - this.lastFpsUpdateTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFpsUpdateTime = now;
        }
    }

    async _processCurrentFrame() {
        if (!this.isActive || !this.videoElement || this.videoElement.readyState < 2) {
            return;
        }

        this.isProcessingFrame = true;

        try {
            if (this.model && !this.useBackendFallback) {
                // Client-side inference via COCO-SSD
                await this._detectWithBrowserModel();
            } else {
                // Server-side inference via /api/detect
                await this._detectWithBackend();
            }
        } catch (err) {
            console.error("Frame detection error:", err);
        } finally {
            this.isProcessingFrame = false;
        }
    }

    async _detectWithBrowserModel() {
        const v = this.videoElement;
        if (!v || v.videoWidth === 0 || v.videoHeight === 0) return;

        this._syncCanvasSize(v.videoWidth, v.videoHeight);

        // Run prediction
        const predictions = await this.model.detect(v, 6, 0.40);
        const vw = v.videoWidth;
        const vh = v.videoHeight;

        const objects = predictions.map(p => {
            const [x, y, bw, bh] = p.bbox;
            const ymin = y / vh;
            const xmin = x / vw;
            const ymax = (y + bh) / vh;
            const xmax = (x + bw) / vw;
            const centerX = (xmin + xmax) / 2;
            const heightNorm = ymax - ymin;

            const clockDir = this._calculateClock(centerX);
            const dist = this._estimateDistance(heightNorm, ymax);
            const isHazard = (clockDir === "12 o'clock" || clockDir === "11 o'clock" || clockDir === "1 o'clock") && 
                             (dist.includes("2 steps") || dist.includes("1 step"));

            return {
                name: p.class,
                confidence: Math.round(p.score * 100) / 100,
                bbox: [ymin, xmin, ymax, xmax],
                raw_bbox: [x, y, bw, bh],
                direction_clock: clockDir,
                distance: dist,
                is_hazard: isHazard
            };
        });

        this.currentDetections = objects;
        this._renderVisualHUD(objects, vw, vh);
        this._handleAudioGuidance(objects);

        if (this.onDetectionsChange) {
            this.onDetectionsChange(objects);
        }
    }

    async _detectWithBackend() {
        const now = performance.now();
        if (now - this.lastBackendCallTime < this.backendCallIntervalMs) {
            return;
        }
        this.lastBackendCallTime = now;

        const frameB64 = window.camera ? window.camera.captureFrameBase64() : null;
        if (!frameB64) return;

        const v = this.videoElement;
        const vw = v && v.videoWidth ? v.videoWidth : 640;
        const vh = v && v.videoHeight ? v.videoHeight : 480;
        this._syncCanvasSize(vw, vh);

        try {
            const resp = await fetch("/api/detect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_base64: frameB64,
                    obstacles_enabled: true,
                    confidence_threshold: 0.35
                })
            });

            if (!resp.ok) return;
            const data = await resp.json();

            const objects = (data.objects || []).map(o => {
                const [ymin, xmin, ymax, xmax] = o.bbox || [0.2, 0.2, 0.8, 0.8];
                const x = xmin * vw;
                const y = ymin * vh;
                const bw = (xmax - xmin) * vw;
                const bh = (ymax - ymin) * vh;
                return {
                    ...o,
                    raw_bbox: [x, y, bw, bh]
                };
            });

            this.currentDetections = objects;
            this._renderVisualHUD(objects, vw, vh);
            this._handleAudioGuidance(objects, data.speech);

            if (this.onDetectionsChange) {
                this.onDetectionsChange(objects);
            }
        } catch (e) {
            console.warn("Backend detection call failed:", e);
        }
    }

    _syncCanvasSize(vw, vh) {
        if (!this.canvas) return;
        if (this.canvas.width !== vw || this.canvas.height !== vh) {
            this.canvas.width = vw;
            this.canvas.height = vh;
        }
    }

    _calculateClock(centerXNorm) {
        if (centerXNorm < 0.28) return "10 o'clock";
        if (centerXNorm < 0.42) return "11 o'clock";
        if (centerXNorm <= 0.58) return "12 o'clock";
        if (centerXNorm <= 0.72) return "1 o'clock";
        return "2 o'clock";
    }

    _estimateDistance(heightNorm, ymaxNorm) {
        if (heightNorm >= 0.50 || ymaxNorm >= 0.85) return "about 2 steps away";
        if (heightNorm >= 0.32 || ymaxNorm >= 0.70) return "about 4 steps away";
        if (heightNorm >= 0.18) return "about 6 steps away";
        return "about 8 steps away";
    }

    _renderVisualHUD(objects, width, height) {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, width, height);

        // 1. Draw subtle center navigational corridor (12 o'clock guidance zone)
        const corridorLeft = width * 0.38;
        const corridorRight = width * 0.62;
        ctx.save();
        ctx.strokeStyle = "rgba(6, 182, 212, 0.18)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(corridorLeft, height * 0.25);
        ctx.lineTo(corridorLeft, height);
        ctx.moveTo(corridorRight, height * 0.25);
        ctx.lineTo(corridorRight, height);
        ctx.stroke();

        // Central crosshair marker
        const cx = width / 2;
        const cy = height * 0.65;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        let hasHazard = false;
        let closestHazardText = "";

        // 2. Draw Object Bounding Boxes
        for (const obj of objects) {
            const [x, y, bw, bh] = obj.raw_bbox || [0, 0, 0, 0];
            if (bw <= 0 || bh <= 0) continue;

            const isHazard = obj.is_hazard;
            if (isHazard) {
                hasHazard = true;
                closestHazardText = `${obj.name.toUpperCase()} at ${obj.direction_clock} (${obj.distance})`;
            }

            // Colors: hazard = bright coral red, standard = neon cyan
            const strokeColor = isHazard ? "#f43f5e" : "#06b6d4";
            const fillColor = isHazard ? "rgba(244, 63, 94, 0.15)" : "rgba(6, 182, 212, 0.08)";
            const shadowColor = isHazard ? "rgba(244, 63, 94, 0.7)" : "rgba(6, 182, 212, 0.6)";

            ctx.save();
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = isHazard ? 16 : 8;
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isHazard ? 3.5 : 2.5;

            // Rounded rectangle
            this._roundRect(ctx, x, y, bw, bh, 8);
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Label pill badge
            ctx.save();
            const label = `${obj.name.toUpperCase()} · ${obj.direction_clock} · ${obj.distance}`;
            ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            const textMetrics = ctx.measureText(label);
            const pillW = textMetrics.width + 18;
            const pillH = 24;
            const pillX = Math.max(x, 4);
            const pillY = Math.max(y - pillH - 4, 4);

            // Badge background
            ctx.fillStyle = isHazard ? "rgba(180, 20, 50, 0.95)" : "rgba(10, 14, 23, 0.90)";
            this._roundRect(ctx, pillX, pillY, pillW, pillH, 6);
            ctx.fill();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.fillStyle = "#ffffff";
            ctx.fillText(label, pillX + 9, pillY + 16);
            ctx.restore();
        }

        // 3. Update DOM HUD
        const hudBadgeText = document.getElementById("live-hud-text");
        if (hudBadgeText) {
            const fpsText = this.fps ? ` · ${this.fps} FPS` : "";
            hudBadgeText.textContent = `LIVE: ${objects.length} object${objects.length === 1 ? '' : 's'}${fpsText}`;
        }

        const warningBanner = document.getElementById("obstacle-warning-banner");
        const warningText = document.getElementById("obstacle-warning-text");
        if (warningBanner && warningText) {
            if (hasHazard) {
                warningBanner.style.display = "flex";
                warningText.textContent = `⚠️ CAUTION: ${closestHazardText}`;
            } else {
                warningBanner.style.display = "none";
            }
        }
    }

    _roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    _handleAudioGuidance(objects, serverSpeech = null) {
        if (!this.speechEnabled || !window.speechEngine) return;
        const now = Date.now();

        // 1. Immediate priority: Hazard Alerts
        const hazard = objects.find(o => o.is_hazard);
        if (hazard) {
            if (now - this.lastHazardSpoken > 3500) {
                this.lastHazardSpoken = now;
                this.lastSpokenTime = now;
                if (window.haptics) window.haptics.hazardAlert();
                if (window.earcues) window.earcues.playHazardAlert();

                const hazardMsg = `Caution: ${hazard.name} directly ahead at ${hazard.direction_clock}, ${hazard.distance}.`;
                window.speechEngine.speak(hazardMsg);
                return;
            }
        }

        // 2. Regular Spoken Updates (debounced)
        if (now - this.lastSpokenTime < this.minSpeechIntervalMs) {
            return;
        }

        if (serverSpeech && serverSpeech.length > 5) {
            this.lastSpokenTime = now;
            window.speechEngine.speak(serverSpeech);
            return;
        }

        // Find candidate objects that have not been spoken recently
        const candidate = objects.find(o => {
            const key = `${o.name}_${o.direction_clock}`;
            const lastSpoke = this.recentAnnouncements.get(key) || 0;
            return (now - lastSpoke > 7000);
        });

        if (candidate) {
            const key = `${candidate.name}_${candidate.direction_clock}`;
            this.recentAnnouncements.set(key, now);
            this.lastSpokenTime = now;

            const speechText = `${candidate.name.charAt(0).toUpperCase() + candidate.name.slice(1)} at ${candidate.direction_clock}, ${candidate.distance}.`;
            window.speechEngine.speak(speechText);
        }
    }
}

window.liveDetector = new LiveObjectDetector();
