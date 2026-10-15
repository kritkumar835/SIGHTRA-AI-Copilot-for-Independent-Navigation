// frontend/js/speech.js - Voice recognition and Text-To-Speech engine
class SpeechEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.recognition = null;
        this.isListening = false;
        this.isSpeaking = false;
        this.lastSpokenText = "Welcome to SightGuide. Tap anywhere and say describe, read, or find washroom.";
        this.onCommandCallback = null;
        this.onListeningChangeCallback = null;
        this.onSpeechStateCallback = null;
        this.preferredVoice = null;

        this._initSynthesis();
        this._initRecognition();
    }

    _initSynthesis() {
        if (!this.synth) {
            console.warn("speechSynthesis is not available in this environment.");
            return;
        }

        const pickVoice = () => {
            const voices = this.synth.getVoices();
            if (!voices || voices.length === 0) return;
            // Prefer high-quality English voice
            this.preferredVoice = voices.find(v => (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Enhanced") || v.name.includes("Samantha")) && v.lang.startsWith("en")) 
                || voices.find(v => v.lang.startsWith("en"))
                || voices[0];
        };

        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = pickVoice;
        }
        pickVoice();
    }

    _initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("SpeechRecognition is not supported in this browser.");
            return;
        }

        try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false; // Push-to-talk style or single-phrase turn
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 3;

            this.recognition.onstart = () => {
                this.isListening = true;
                if (window.earcues) window.earcues.playListeningStart();
                if (this.onListeningChangeCallback) this.onListeningChangeCallback(true);
            };

            this.recognition.onresult = (event) => {
                const results = event.results[0];
                if (!results) return;
                
                // Collect transcript
                const transcript = results[0].transcript.trim();
                const confidence = results[0].confidence;
                console.log(`Speech heard: "${transcript}" (confidence: ${confidence})`);

                if (window.haptics) window.haptics.commandRecognized();
                if (window.earcues) window.earcues.playCommandAcknowledged();

                if (this.onCommandCallback) {
                    this.onCommandCallback(transcript, confidence);
                }
            };

            this.recognition.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                this.isListening = false;
                if (this.onListeningChangeCallback) this.onListeningChangeCallback(false);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (this.onListeningChangeCallback) this.onListeningChangeCallback(false);
            };
        } catch (e) {
            console.error("Failed to initialize SpeechRecognition:", e);
        }
    }

    startListening() {
        // Interrupt current speech whenever user starts talking
        this.stopSpeaking();

        if (!this.recognition) {
            console.info("Speech recognition not supported; voice input unavailable.");
            return false;
        }

        if (this.isListening) {
            return true;
        }

        try {
            this.recognition.start();
            return true;
        } catch (e) {
            console.warn("SpeechRecognition start failed:", e);
            return false;
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                console.warn("SpeechRecognition stop error:", e);
            }
        }
        this.isListening = false;
        if (this.onListeningChangeCallback) this.onListeningChangeCallback(false);
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
            return false;
        } else {
            return this.startListening();
        }
    }

    // Always interruptible text-to-speech
    speak(text, options = {}) {
        if (!this.synth || !text) return;

        // Cancel any active utterance immediately
        this.stopSpeaking();

        this.lastSpokenText = text;
        const utterance = new SpeechSynthesisUtterance(text);
        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }
        utterance.rate = options.rate || 1.05; // Slightly brisk for efficient listening
        utterance.pitch = options.pitch || 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
            if (this.onSpeechStateCallback) this.onSpeechStateCallback(true, text);
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            if (this.onSpeechStateCallback) this.onSpeechStateCallback(false, text);
            if (options.onComplete) options.onComplete();
        };

        utterance.onerror = (e) => {
            console.warn("Speech synthesis error:", e);
            this.isSpeaking = false;
            if (this.onSpeechStateCallback) this.onSpeechStateCallback(false, text);
        };

        this.synth.speak(utterance);
    }

    stopSpeaking() {
        if (this.synth) {
            this.synth.cancel();
        }
        this.isSpeaking = false;
        if (this.onSpeechStateCallback) this.onSpeechStateCallback(false, "");
    }

    repeatLast() {
        if (this.lastSpokenText) {
            this.speak(this.lastSpokenText);
        } else {
            this.speak("Nothing to repeat yet.");
        }
    }
}

window.speechEngine = new SpeechEngine();
