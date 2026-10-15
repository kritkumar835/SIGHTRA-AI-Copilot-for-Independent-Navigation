import SwiftUI
import AVFoundation
import Speech

// Obsidian Theme Colors
let bgDark = Color(red: 10/255, green: 14/255, blue: 23/255)
let bgSurface = Color(red: 19/255, green: 27/255, blue: 46/255)
let accentCyan = Color(red: 0/255, green: 210/255, blue: 255/255)
let accentAmber = Color(red: 255/255, green: 170/255, blue: 0/255)
let accentHazard = Color(red: 255/255, green: 59/255, blue: 48/255)

enum NavMode {
    case describe, read, find
}

struct TranscriptEntry: Identifiable {
    let id = UUID()
    let speaker: String
    let text: String
    let isHazard: Bool
}

class SpeechManager: ObservableObject {
    private let synthesizer = AVSpeechSynthesizer()
    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let feedbackGenerator = UINotificationFeedbackGenerator()
    private let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)

    @Published var isSpeaking: Bool = false
    @Published var isListening: Bool = false

    func speak(_ text: String) {
        synthesizer.stopSpeaking(at: .immediate) // Instant interruption
        let utterance = AVSpeechUtterance(string: text)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        utterance.pitchMultiplier = 1.0
        synthesizer.speak(utterance)
    }

    func triggerHaptic(type: String) {
        switch type {
        case "target_found":
            feedbackGenerator.notificationOccurred(.success)
        case "hazard":
            feedbackGenerator.notificationOccurred(.error)
        default:
            impactGenerator.impactOccurred()
        }
    }
}

struct SightGuideView: View {
    @StateObject private var speechManager = SpeechManager()
    @State private var mode: NavMode = .describe
    @State private var isScanning: Bool = false
    @State private var obstaclesActive: Bool = false
    @State private var transcript: [TranscriptEntry] = [
        TranscriptEntry(speaker: "SYSTEM", text: "SightGuide ready. Tap anywhere or say describe, read, or find washroom.", isHazard: false)
    ]

    var body: some View {
        ZStack {
            bgDark.ignoresSafeArea()

            VStack(spacing: 16) {
                // Top Header
                HStack {
                    HStack(spacing: 8) {
                        Text("S")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(accentCyan)
                            .frame(width: 36, height: 36)
                            .background(accentCyan.opacity(0.15))
                            .cornerRadius(8)

                        Text("SightGuide")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }

                    Spacer()

                    Text(isScanning ? "Scanning" : "Ready")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(accentCyan)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(accentCyan.opacity(0.2))
                        .cornerRadius(12)
                }
                .padding(.horizontal)

                // AVFoundation Camera Reticle
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.black)
                        .frame(height: 220)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(isScanning ? accentCyan : Color.gray.opacity(0.3), lineWidth: 2)
                        )

                    Text("AVCaptureSession Feed (640px JPEG Downscaler)")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
                .padding(.horizontal)

                // Scrollable Transcript Log
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(transcript) { item in
                            HStack(alignment: .top) {
                                Text("[\(item.speaker)]")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(item.isHazard ? accentHazard : accentCyan)

                                Text(item.text)
                                    .font(.subheadline)
                                    .foregroundColor(.white)
                            }
                        }
                    }
                    .padding()
                }
                .frame(maxHeight: 140)
                .background(bgSurface)
                .cornerRadius(12)
                .padding(.horizontal)

                // Big Glowing Microphone
                Button(action: {
                    speechManager.triggerHaptic(type: "tap")
                    speechManager.speak("Listening for commands...")
                }) {
                    ZStack {
                        Circle()
                            .fill(accentCyan)
                            .frame(width: 72, height: 72)
                            .shadow(color: accentCyan.opacity(0.5), radius: 12)
                        Image(systemName: "mic.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.black)
                    }
                }

                // Accessible Action Buttons (Min 64pt Touch Targets)
                VStack(spacing: 10) {
                    HStack(spacing: 10) {
                        ActionButton(title: "👁️ Describe", bg: bgSurface, fg: .white) {
                            mode = .describe
                            speechManager.speak("Describing scene...")
                        }
                        ActionButton(title: "📖 Read Sign", bg: bgSurface, fg: .white) {
                            mode = .read
                            speechManager.speak("Reading sign...")
                        }
                    }

                    HStack(spacing: 10) {
                        ActionButton(title: "🚻 Find Washroom", bg: bgSurface, fg: accentCyan) {
                            mode = .find
                            isScanning = true
                            speechManager.speak("Finding washroom. Slowly turn left.")
                        }
                        ActionButton(title: "⚠️ Obstacles", bg: obstaclesActive ? accentHazard.opacity(0.2) : bgSurface, fg: accentHazard) {
                            obstaclesActive.toggle()
                            let msg = obstaclesActive ? "Obstacle warnings enabled." : "Obstacle warnings disabled."
                            speechManager.speak(msg)
                        }
                    }
                }
                .padding(.horizontal)

                Spacer()
            }
        }
        .onAppear {
            speechManager.speak("SightGuide ready. Tap anywhere or say describe, read, or find washroom.")
        }
    }
}

struct ActionButton: View {
    let title: String
    let bg: Color
    let fg: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.headline)
                .foregroundColor(fg)
                .frame(maxWidth: .infinity)
                .frame(height: 64)
                .background(bg)
                .cornerRadius(16)
        }
    }
}
