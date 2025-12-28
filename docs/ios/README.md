# iOS Documentation

**Generated**: 2024-12-28  
**Source**: `iOS/Sori/**`  
**Project**: Sori (renamed from Somi)

## Overview

SwiftUI-based iOS app for elderly users to receive AI care calls.

## Project Structure

```
iOS/Sori/
├── SoriApp.swift           # App entry point
├── Models/                 # Data models
├── Views/                  # SwiftUI views
├── ViewModels/            # View models
├── Services/              # API/WebSocket services
└── Utils/                 # Utilities
```

## Key Components

### App Entry
**File**: `iOS/Sori/SoriApp.swift`

SwiftUI app lifecycle with AppDelegate for push notifications.

### Views
| View | File | Description |
|------|------|-------------|
| ContentView | `Views/ContentView.swift` | Root view |
| VoiceCallView | `Views/Call/VoiceCallView.swift` | Call interface |
| PairingView | `Views/Pairing/PairingView.swift` | Device pairing |
| ElderlyHomeView | `Views/Elderly/ElderlyHomeView.swift` | Elderly home |

### Services
| Service | File | Description |
|---------|------|-------------|
| APIService | `Services/APIService.swift` | REST API client |
| WebSocketService | `Services/WebSocketService.swift` | WS connection |
| SpeechService | `Services/SpeechService.swift` | STT/TTS |
| TTSService | `Services/TTSService.swift` | Text-to-speech |

### ViewModels
| ViewModel | File | Description |
|-----------|------|-------------|
| VoiceCallViewModel | `ViewModels/VoiceCallViewModel.swift` | Call logic |
| AuthViewModel | `ViewModels/AuthViewModel.swift` | Authentication |
| PairingViewModel | `ViewModels/PairingViewModel.swift` | Pairing flow |

## Features

- Voice-based AI conversations
- Push notification for scheduled calls
- Device pairing with caregiver dashboard
- Speech-to-text input
- Text-to-speech output

## Configuration

**File**: `iOS/Sori/Utils/Constants.swift`

- API base URL
- WebSocket URL
- App configuration

## Recent Changes (2024-12-28)

### iOS 17+ API Updates
Fixed deprecated AVAudioSession APIs:

**File**: Likely in `Services/SpeechService.swift` or `Services/TTSService.swift`

- Migrated from deprecated AVAudioSession methods to iOS 17+ compatible APIs
- **Commit**: `0d2a565 fix(iOS): update deprecated AVAudioSession APIs for iOS 17+`

## Notes

- Project renamed from "Somi" to "Sori"
- iOS directory structure updated to reflect new name
- Compatible with iOS 17+

---
**Note**: All paths relative to project root
