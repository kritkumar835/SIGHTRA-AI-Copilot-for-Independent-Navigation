// frontend/js/haptics.js - Tactile vibration feedback
class HapticsManager {
    constructor() {
        this.supported = 'vibrate' in navigator;
    }

    _vibrate(pattern) {
        if (!this.supported) return;
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.debug("Vibration not triggered:", e);
        }
    }

    // Short buzz (50ms) on command recognized
    commandRecognized() {
        this._vibrate(50);
    }

    // Double buzz ([100, 80, 100]) when target found
    targetFound() {
        this._vibrate([100, 80, 100]);
    }

    // Long urgent buzz on hazard/obstacle ([300, 100, 400])
    hazardAlert() {
        this._vibrate([300, 100, 400]);
    }

    // Gentle pulse on scan cycle
    scanTick() {
        this._vibrate(30);
    }
}

window.haptics = new HapticsManager();
