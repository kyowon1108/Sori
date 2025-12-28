# iOS Documentation

**Generated**: 2024-12-28
**Source**: `iOS/Somi/**`

## Overview

SwiftUI-based iOS app for elderly users to receive AI care calls.

## Project Structure

```
iOS/Somi/
├── SomiApp.swift           # App entry point
├── Models/                 # Data models
├── Views/                  # SwiftUI views
├── ViewModels/            # View models
├── Services/              # API/WebSocket services
└── Utils/                 # Utilities
```

## Key Components

### App Entry
**File**: `iOS/Somi/SomiApp.swift`

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

**File**: `iOS/Somi/Utils/Constants.swift`

- API base URL
- WebSocket URL
- App configuration

---
**Note**: All paths relative to project root
