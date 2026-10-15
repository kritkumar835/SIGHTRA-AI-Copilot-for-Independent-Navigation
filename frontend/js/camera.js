// frontend/js/camera.js - Camera preview and client-side frame downscaler
class CameraManager {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isActive = false;
        this.facingMode = "environment"; // Rear camera preferred
        this.isFallback = false;
        this.fallbackImageBase64 = null;
    }

    async init(videoElement) {
        this.videoElement = videoElement;
        return this.startCamera();
    }

    async startCamera() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("getUserMedia is not supported on this browser/insecure context.");
            this._setupFallback("Camera API requires HTTPS or localhost.");
            return false;
        }

        try {
            // Stop previous stream if active
            this.stopCamera();

            const constraints = {
                audio: false,
                video: {
                    facingMode: { ideal: this.facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (this.videoElement) {
                this.videoElement.srcObject = this.stream;
                await this.videoElement.play();
            }
            this.isActive = true;
            this.isFallback = false;
            return true;
        } catch (err) {
            console.warn("Camera start failed, trying basic video constraints:", err);
            try {
                // Secondary attempt without strict facingMode
                this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (this.videoElement) {
                    this.videoElement.srcObject = this.stream;
                    await this.videoElement.play();
                }
                this.isActive = true;
                this.isFallback = false;
                return true;
            } catch (fallbackErr) {
                console.error("Camera completely inaccessible:", fallbackErr);
                this._setupFallback(fallbackErr.message);
                return false;
            }
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isActive = false;
    }

    toggleFacingMode() {
        this.facingMode = (this.facingMode === "environment") ? "user" : "environment";
        return this.startCamera();
    }

    _setupFallback(reason) {
        this.isFallback = true;
        this.isActive = false;
        console.info("Using simulated camera/fallback mode. Reason:", reason);
    }

    setFallbackImage(base64Data) {
        this.fallbackImageBase64 = base64Data;
        this.isFallback = true;
    }

    // Capture downscaled JPEG frame (~640px wide, quality ~0.6) to keep latency low (<100KB)
    captureFrameBase64() {
        if (this.isFallback && this.fallbackImageBase64) {
            return this.fallbackImageBase64;
        }

        if (!this.videoElement || !this.isActive || !this.videoElement.videoWidth) {
            // Generate a synthetic test frame if camera is not producing video
            return this._generateBlankFrame();
        }

        const v = this.videoElement;
        const targetWidth = 640;
        const scale = targetWidth / v.videoWidth;
        const targetHeight = Math.round(v.videoHeight * scale);

        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;

        this.ctx.drawImage(v, 0, 0, targetWidth, targetHeight);
        // Export as JPEG with 0.6 quality for minimal payload and lightning fast upload
        return this.canvas.toDataURL('image/jpeg', 0.6);
    }

    _generateBlankFrame() {
        this.canvas.width = 640;
        this.canvas.height = 480;
        this.ctx.fillStyle = "#1e293b";
        this.ctx.fillRect(0, 0, 640, 480);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 24px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText("SightGuide Frame Placeholder", 320, 240);
        return this.canvas.toDataURL('image/jpeg', 0.6);
    }
}

window.camera = new CameraManager();
