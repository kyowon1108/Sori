import Foundation
import Speech
import AVFoundation

/// Speech recognition service using SFSpeechRecognizer
final class SpeechService: NSObject, ObservableObject {
    static let shared = SpeechService()

    // MARK: - Published Properties

    @Published private(set) var isListening = false
    @Published private(set) var transcribedText = ""
    @Published private(set) var partialText = ""
    @Published private(set) var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined
    @Published private(set) var microphonePermission: AVAudioApplication.recordPermission = .undetermined

    // MARK: - Private Properties

    private let speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    // Callbacks
    private var onPartialResult: ((String) -> Void)?
    private var onFinalResult: ((String) -> Void)?
    private var onError: ((Error) -> Void)?

    // Silence detection
    private var silenceTimer: Timer?
    private let silenceThreshold: TimeInterval = 2.0

    override private init() {
        self.speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "ko-KR"))
        super.init()

        // Check initial authorization
        authorizationStatus = SFSpeechRecognizer.authorizationStatus()
        microphonePermission = AVAudioApplication.shared.recordPermission
    }

    // MARK: - Permission Handling

    /// Request speech recognition permission
    func requestSpeechPermission(completion: @escaping (Bool) -> Void) {
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                self?.authorizationStatus = status
                completion(status == .authorized)
            }
        }
    }

    /// Request microphone permission
    func requestMicrophonePermission(completion: @escaping (Bool) -> Void) {
        AVAudioApplication.requestRecordPermission { [weak self] granted in
            DispatchQueue.main.async {
                self?.microphonePermission = granted ? .granted : .denied
                completion(granted)
            }
        }
    }

    /// Request all required permissions
    func requestAllPermissions(completion: @escaping (Bool, Bool) -> Void) {
        requestMicrophonePermission { [weak self] micGranted in
            self?.requestSpeechPermission { speechGranted in
                completion(micGranted, speechGranted)
            }
        }
    }

    /// Check if all permissions are granted
    var hasAllPermissions: Bool {
        return authorizationStatus == .authorized && microphonePermission == .granted
    }

    /// Check if speech recognition is available (locale supported + permission)
    var isAvailable: Bool {
        guard let recognizer = speechRecognizer else { return false }
        return recognizer.isAvailable && hasAllPermissions
    }

    // MARK: - Speech Recognition

    /// Start listening for speech
    /// - Parameters:
    ///   - onPartial: Called with partial transcription results
    ///   - onFinal: Called when final result is ready (after silence detected)
    ///   - onError: Called on error
    func startListening(
        onPartial: @escaping (String) -> Void,
        onFinal: @escaping (String) -> Void,
        onError: @escaping (Error) -> Void
    ) {
        guard let recognizer = speechRecognizer, recognizer.isAvailable else {
            onError(SpeechError.recognizerNotAvailable)
            return
        }

        guard hasAllPermissions else {
            onError(SpeechError.permissionDenied)
            return
        }

        // Stop any existing recognition
        stopListening()

        self.onPartialResult = onPartial
        self.onFinalResult = onFinal
        self.onError = onError

        do {
            try startRecognition()
        } catch {
            onError(error)
        }
    }

    private func startRecognition() throws {
        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            throw SpeechError.requestCreationFailed
        }

        recognitionRequest.shouldReportPartialResults = true

        // For on-device recognition (iOS 13+), use if available
        if #available(iOS 13, *) {
            recognitionRequest.requiresOnDeviceRecognition = false // Allow network if needed
        }

        // Get input node
        let inputNode = audioEngine.inputNode

        // Create recognition task
        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let error = error {
                self.handleRecognitionError(error)
                return
            }

            if let result = result {
                let transcription = result.bestTranscription.formattedString

                DispatchQueue.main.async {
                    self.partialText = transcription
                    self.onPartialResult?(transcription)
                }

                // Reset silence timer on each result
                self.resetSilenceTimer()

                if result.isFinal {
                    self.handleFinalResult(transcription)
                }
            }
        }

        // Configure audio input
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Remove existing tap if any
        inputNode.removeTap(onBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()

        DispatchQueue.main.async {
            self.isListening = true
            self.transcribedText = ""
            self.partialText = ""
        }

        // Start silence timer
        resetSilenceTimer()

        print("[Speech] Started listening")
    }

    /// Stop listening and clean up
    func stopListening() {
        silenceTimer?.invalidate()
        silenceTimer = nil

        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        recognitionTask?.cancel()
        recognitionTask = nil

        DispatchQueue.main.async {
            self.isListening = false
        }

        print("[Speech] Stopped listening")
    }

    // MARK: - Silence Detection

    private func resetSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: silenceThreshold, repeats: false) { [weak self] _ in
            self?.handleSilenceTimeout()
        }
    }

    private func handleSilenceTimeout() {
        guard isListening, !partialText.isEmpty else { return }

        print("[Speech] Silence detected, finalizing...")
        handleFinalResult(partialText)
    }

    private func handleFinalResult(_ text: String) {
        stopListening()

        DispatchQueue.main.async {
            self.transcribedText = text
            self.onFinalResult?(text)
        }
    }

    private func handleRecognitionError(_ error: Error) {
        // Check if it's a cancellation (not a real error)
        let nsError = error as NSError
        if nsError.domain == "kAFAssistantErrorDomain" && nsError.code == 216 {
            // User cancelled or no speech detected - not an error
            print("[Speech] Recognition cancelled")
            return
        }

        if nsError.domain == "kAFAssistantErrorDomain" && nsError.code == 1110 {
            // No speech detected
            print("[Speech] No speech detected")
            stopListening()
            return
        }

        print("[Speech] Recognition error: \(error.localizedDescription)")
        stopListening()

        DispatchQueue.main.async {
            self.onError?(error)
        }
    }

    // MARK: - Simulator Support

    #if targetEnvironment(simulator)
    /// Simulate speech input for testing on simulator
    func simulateSpeechInput(_ text: String) {
        DispatchQueue.main.async {
            self.partialText = text
            self.transcribedText = text
            self.onPartialResult?(text)
            self.onFinalResult?(text)
        }
    }
    #endif
}

// MARK: - Speech Errors

enum SpeechError: Error, LocalizedError {
    case recognizerNotAvailable
    case permissionDenied
    case requestCreationFailed
    case audioSessionError
    case noSpeechDetected

    var errorDescription: String? {
        switch self {
        case .recognizerNotAvailable:
            return "음성 인식을 사용할 수 없습니다"
        case .permissionDenied:
            return "음성 인식 권한이 필요합니다"
        case .requestCreationFailed:
            return "음성 인식을 시작할 수 없습니다"
        case .audioSessionError:
            return "오디오 설정 오류"
        case .noSpeechDetected:
            return "음성이 감지되지 않았습니다"
        }
    }
}
