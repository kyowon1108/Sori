import Foundation
import AVFoundation

/// Text-to-Speech service using AVSpeechSynthesizer
final class TTSService: NSObject, ObservableObject {
    static let shared = TTSService()

    // MARK: - Published Properties

    @Published private(set) var isSpeaking = false

    // MARK: - Private Properties

    private let synthesizer = AVSpeechSynthesizer()
    private var pendingUtterances: [String] = []
    private var completionHandler: (() -> Void)?

    // Korean voice preference
    private let koreanVoiceIdentifier = "com.apple.voice.compact.ko-KR.Yuna"

    override private init() {
        super.init()
        synthesizer.delegate = self
    }

    // MARK: - Public Methods

    /// Speak the given text in Korean
    /// - Parameters:
    ///   - text: Text to speak
    ///   - completion: Called when speech finishes (optional)
    func speak(_ text: String, completion: (() -> Void)? = nil) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            completion?()
            return
        }

        // Configure audio session for playback
        configureAudioSession()

        let utterance = AVSpeechUtterance(string: text)

        // Use Korean voice if available
        if let voice = AVSpeechSynthesisVoice(identifier: koreanVoiceIdentifier) {
            utterance.voice = voice
        } else if let voice = AVSpeechSynthesisVoice(language: "ko-KR") {
            utterance.voice = voice
        }

        // Natural speech rate
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9
        utterance.pitchMultiplier = 1.0
        utterance.volume = 1.0

        // Store completion handler
        self.completionHandler = completion

        DispatchQueue.main.async {
            self.isSpeaking = true
        }

        synthesizer.speak(utterance)
        print("[TTS] Speaking: \(text.prefix(50))...")
    }

    /// Queue text for speaking (adds to pending if already speaking)
    func queueText(_ text: String) {
        if isSpeaking {
            pendingUtterances.append(text)
        } else {
            speak(text)
        }
    }

    /// Stop any ongoing speech
    func stop() {
        synthesizer.stopSpeaking(at: .immediate)
        pendingUtterances.removeAll()
        completionHandler = nil

        DispatchQueue.main.async {
            self.isSpeaking = false
        }

        print("[TTS] Stopped")
    }

    /// Pause speech
    func pause() {
        synthesizer.pauseSpeaking(at: .immediate)
    }

    /// Resume paused speech
    func resume() {
        synthesizer.continueSpeaking()
    }

    // MARK: - Audio Session

    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetoothHFP])
            try session.setActive(true)
        } catch {
            print("[TTS] Audio session configuration failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Voice Availability

    /// Check if Korean voice is available
    var isKoreanVoiceAvailable: Bool {
        return AVSpeechSynthesisVoice(language: "ko-KR") != nil
    }

    /// List available Korean voices
    var availableKoreanVoices: [AVSpeechSynthesisVoice] {
        return AVSpeechSynthesisVoice.speechVoices().filter { $0.language.starts(with: "ko") }
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension TTSService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        print("[TTS] Finished speaking")

        // Check for pending utterances
        if let nextText = pendingUtterances.first {
            pendingUtterances.removeFirst()
            speak(nextText, completion: completionHandler)
        } else {
            DispatchQueue.main.async {
                self.isSpeaking = false
            }
            completionHandler?()
            completionHandler = nil
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        print("[TTS] Cancelled")
        DispatchQueue.main.async {
            self.isSpeaking = false
        }
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            self.isSpeaking = true
        }
    }
}
