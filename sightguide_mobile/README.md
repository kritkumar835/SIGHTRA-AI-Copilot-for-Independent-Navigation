# SightGuide Mobile 👁️🎙️
> **Accessible Mobile App for Visually Impaired Users (Built with Flutter & Native Mobile Architecture)**

This is the mobile application conversion of the SightGuide AI Vision Copilot. It converts the HTML5/JS web application into a cross-platform mobile app targeting **Android** and **iOS** using **Flutter (Dart)**, along with native reference implementations in **Kotlin (Jetpack Compose)**, **Swift (SwiftUI)**, and **React Native (TypeScript)**.

---

## 🌟 Key Features & Parity with Web App

1. **Obsidian High-Contrast Accessible Design**:
   - High-contrast obsidian dark palette (`#0A0E17`, `#131B2E`) with neon cyan (`#00D2FF`), amber (`#FFAA00`), and hazard red (`#FF3B30`).
   - Massive touch targets (minimum 64dp–76dp height) designed specifically for blind and low-vision accessibility.
   - Screen reader semantics for Android TalkBack and iOS VoiceOver.

2. **Camera Stream & Client-Side 640px Downscaler**:
   - Live camera viewfinder with reticle corner markers.
   - Rear camera lens selection by default with quick camera-flip button.
   - Automatically downscales captured frames to max 640px JPEG (quality 82) before sending to Gemini, exactly matching `camera.js` for fast network transmission and low latency.

3. **Audio-First Voice Control & Speech Recognition**:
   - Central glowing push-to-talk microphone button.
   - **Full-screen tap anywhere** gesture: double-tap or tap anywhere to trigger listening or cancel current audio.
   - Natural language voice commands:
     - *"Describe"* / *"What's around me"*
     - *"Read this"* / *"Read sign"*
     - *"Find washroom"* / *"Find exit"* / *"Find <target>"*
     - *"Obstacles"* / *"Hazard warnings"*
     - *"Repeat"* (re-speaks last announcement)
     - *"Stop"* (halts active scan and speech immediately)
     - *"Help"* (audio guide of commands)

4. **Interruptible Text-To-Speech (TTS) & Waveform Visualizer**:
   - Real-time animated waveform bars (`Speaking...`) when TTS is active.
   - Any new command or "Stop" button tap immediately cuts ongoing audio (`tts.stop()`).

5. **Audio Earcues & Haptic Pulse Patterns**:
   - Listening start chime + light haptic buzz.
   - Command acknowledged click + selection tick.
   - Scan step tick during FIND mode scanning cadence.
   - Target found triumph chime + double buzz (`HapticFeedback.heavyImpact()`).
   - Hazard warning alarm + 3 rapid urgent pulses for drop-offs, downward stairs, and obstacles.

6. **Hero Feature: Guided FIND Scanning Loop**:
   - Turn-by-turn auditory guidance: *"Finding washroom. Slowly turn left."*
   - Animated cyan radar sweep overlay across the camera preview.
   - Periodic frame capture every 2.5 seconds (up to 8 scans max).
   - Announces clock position and step distance (e.g. *"Restroom sign at 2 o'clock, pointing right, about 5 steps away"*).
   - Graceful 8-scan timeout fallback suggesting sighted assistance.

7. **Backend Connectivity & Built-In Offline Demo Fallback**:
   - Connects to the local FastAPI backend (`POST /api/analyze`) with customizable URL in settings (`http://10.0.2.2:8000` for Android emulator, or `http://<local-ip>:8000` for physical phone).
   - **Built-in Offline Demo Mode**: Runs 100% offline without needing a backend server, using exact realistic datasets mirroring `backend/demo_data/*.json`.
   - Optional direct client-side Gemini 2.5 Flash API invocation when an API key is entered in the mobile settings modal.

---

## 📁 Mobile Project Structure

```text
sightguide_mobile/
├── android/                             # Android Native project (Gradle, Kotlin, Manifest)
│   └── app/src/main/
│       └── AndroidManifest.xml          # CAMERA, RECORD_AUDIO, INTERNET, VIBRATE permissions
├── ios/                                 # iOS Native project (Xcode, Swift, Info.plist)
│   └── Runner/
│       └── Info.plist                   # NSCameraUsageDescription, NSMicrophoneUsageDescription
├── lib/
│   ├── main.dart                        # Main app orchestrator & layout
│   ├── models/
│   │   └── analyze_models.dart          # AnalyzeRequest, AnalyzeResponse, TranscriptItem
│   ├── services/
│   │   ├── audio_service.dart           # Earcues and haptic feedback
│   │   ├── camera_service.dart          # Camera controller & 640px frame downscaler
│   │   ├── mode_controller.dart         # Describe, Read, and Guided FIND state machine
│   │   ├── speech_service.dart          # Interruptible TTS & voice recognition parser
│   │   └── vision_api_service.dart      # HTTP API client, Gemini direct & offline fallback
│   ├── theme/
│   │   └── app_theme.dart               # High-contrast obsidian design tokens
│   └── widgets/
│       ├── camera_viewport.dart         # Reticle, radar sweep, and audio waveform
│       ├── controls_bottom_sheet.dart   # Big tactile action grid & microphone
│       ├── help_dialog.dart             # Voice command help modal
│       ├── mode_selector_bar.dart       # Describe / Read / Find pill switcher
│       ├── settings_dialog.dart         # Server URL, Demo Mode & Gemini API settings
│       └── transcript_view.dart         # Real-time spoken dialogue feed
├── native_reference/                    # Native implementations across mobile languages
│   ├── android_kotlin/
│   │   └── SightGuideCompose.kt         # Android Native (Kotlin + Jetpack Compose)
│   ├── ios_swift/
│   │   └── SightGuideSwiftUI.swift      # iOS Native (Swift + SwiftUI + AVFoundation)
│   └── react_native/
│       └── SightGuideScreen.tsx         # React Native (TypeScript + Voice + TTS)
├── test/
│   └── widget_test.dart                 # Smoke tests
└── pubspec.yaml                         # Dependencies (camera, speech_to_text, flutter_tts, etc.)
```

---

## 🚀 How to Run the Flutter Mobile App

### Prerequisites
- Flutter SDK 3.x+ (installed at `C:\Users\avina\Downloads\flutter`)
- Android Studio / Android SDK (for Android device or emulator)
- Xcode (for iOS device or simulator on macOS)

### 1. Start the Backend Server (Optional)
If you want to use the live Python backend, start it from the project root:
```bash
cd ..
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
*(Note: If the backend is not running, the mobile app automatically falls back to its built-in offline demo mode!)*

### 2. Run on a Connected Phone or Emulator
Navigate into `sightguide_mobile` and execute:
```bash
cd sightguide_mobile
flutter run
```

To list connected devices:
```bash
flutter devices
```

To target a specific device:
```bash
flutter run -d <device-id>
```

### 3. Build Production Binaries
- **Android APK**:
  ```bash
  flutter build apk --release
  ```
  Output APK: `build/app/outputs/flutter-apk/app-release.apk`
- **Android App Bundle (for Google Play Store)**:
  ```bash
  flutter build appbundle --release
  ```
- **iOS App (on macOS)**:
  ```bash
  flutter build ipa --release
  ```

---

## 📱 Mobile Architecture Comparison

| Feature | Flutter (Dart) | Android Native (Kotlin) | iOS Native (Swift) | React Native (TS) |
|---|---|---|---|---|
| **UI Framework** | Flutter Widgets | Jetpack Compose | SwiftUI | React Native JSX |
| **Camera Feed** | `camera` plugin + `img.copyResize` | CameraX `PreviewView` | `AVCaptureSession` | `react-native-vision-camera` |
| **Speech Recognition** | `speech_to_text` | `SpeechRecognizer` | `SFSpeechRecognizer` | `@react-native-voice/voice` |
| **Text-to-Speech** | `flutter_tts` | `android.speech.tts.TextToSpeech` | `AVSpeechSynthesizer` | `react-native-tts` |
| **Haptics** | `HapticFeedback` | `Vibrator` / `VibrationEffect` | `UIImpactFeedbackGenerator` | `Vibration.vibrate()` |
| **Status** | **Complete & Verified** | Reference Provided | Reference Provided | Reference Provided |
