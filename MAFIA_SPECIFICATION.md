# MAFIA LAN - Play Mafia with friends over Wifi/LAN: Cross-Platform Engineering Specification

**Document Version:** 2.5.0-PROD  
**Target Runtimes:** iOS 17+ (Swift 6 / SwiftUI), Android 12+ (Kotlin / Jetpack Compose)  
**Android App Name:** Mafia LAN: Local WiFi Party Game (`com.mafialan.game`)  
**Transport:** Local Wi-Fi Subnet / Mobile Hotspot (mDNS / Bonjour DNS-SD + TLS WebSocket)  
**Status:** Architecture Blueprint & Implementation Standard  

---

## 1. Executive Summary & Product Objective
The goal is to deliver a zero-friction, cross-platform mobile Mafia / Werewolf experience that allows groups of 4 to 16 players to connect seamlessly over a local Wi-Fi router or peer hotspot without requiring any cloud servers, user accounts, or internet connectivity.

The system guarantees:
1. **Zero-Configuration Discovery:** mDNS/Bonjour service advertising discovers local matches in < 500ms.
2. **Deterministic Cryptographic Privacy:** Zero-Knowledge Role Secrecy ensures players on the shared Wi-Fi cannot snoop unencrypted packets or dump host RAM to uncover roles.
3. **Fluid Native Design System:** A minimalist film-noir aesthetic crafted with 120Hz spring physics, tactile haptic feedback, and anti-peeking privacy shields.

---

## 2. Mafia Game Engine & Phase Mechanics

### 2.1 Standard Roles
- **Townsperson (Villager):** Solves murders during day discussions and votes on the gallows.
- **Mafia Syndicate:** Eliminates an innocent citizen each night.
- **Godfather:** Syndicate leader with investigative immunity (appears innocent to Detective).
- **Detective (Sheriff):** Investigates one player per night to detect Mafia allegiance.
- **Doctor (Medic):** Protects one player each night from violent elimination.
- **Vigilante:** Town sharpshooter with limited nightly bullets.
- **Jester (Neutral):** Deceptive lone player who wins solely by being convicted and executed on the gallows.

### 2.2 Night Action Priority Order
To prevent race conditions on local mesh networks, night action results execute in monotonic priority:
1. \`Doctor\` heal applied -> \`SHIELD_ACTIVE\` on target.
2. \`Detective\` inquiry registered -> Target alignment checked.
3. \`Mafia\` attack executed -> Target eliminated unless \`SHIELD_ACTIVE\` is present.
4. \`Vigilante\` attack executed -> Target eliminated unless \`SHIELD_ACTIVE\` is present.

---

## 3. Local Network Discovery & Cross-Platform Transport

### 3.1 Service Identifier
- **Service Name:** \`_mafia-lan._tcp.local.\`
- **Port:** \`8443\`
- **TXT Records:**
  - \`code\`: Room PIN (e.g., \`M-482\`)
  - \`name\`: Human-readable room title
  - \`players\`: Current player count
  - \`max\`: Maximum player capacity
  - \`state\`: \`LOBBY\` | \`IN_GAME\`

### 3.2 Discovery Mechanics
- **iOS:** \`Network.framework\` with \`NWBrowser\` and \`NWListener\` utilizing \`includePeerToPeer = true\`. Requires \`NSLocalNetworkUsageDescription\` in \`Info.plist\`.
- **Android:** \`NsdManager\` utilizing \`WifiManager.MulticastLock\` to ensure background and low-power modes do not filter multicast mDNS packets.

---

## 4. Zero-Knowledge Cryptography & Anti-Cheat
1. Every peer generates an ephemeral \`X25519\` key pair on room join.
2. Roles are encrypted on the host using the recipient's public key with **AES-256-GCM** / **ChaCha20-Poly1305**.
3. Host cannot peek at the contents once sealed, and network sniffers see only authenticated ciphertext.

---

## 5. UI/UX Minimalist Film-Noir Design System
- **Theme Palette:** Pitch Noir (`#090A0F`), Charcoal Glass (`#131722`), Blood Crimson (`#EF4444`), Cyan Detective (`#38BDF8`), Emerald Doctor (`#34D399`).
- **Interactive Role Card:** 3D physics-based card flip with continuous finger-hold privacy guard.
- **Synchronized Haptics:** Distinct tactile waveforms for nightfall, detective revelations, heartbeat timer countdowns, and gavel verdicts.

---

## 6. Continuous Integration & Multiplatform CI/CD Architecture (GitHub Actions)

### 6.1 Multiplatform Build Matrix
The build automation pipeline (`.github/workflows/ci-cd.yml`) executes parallel target jobs on every `push` and `pull_request` to `main` and `master`:

1. **Job `build-web` (Ubuntu + Node.js 20):**
   - Runs `rules.test.ts` unit tests asserting 100% pass on 13 state machine edge cases.
   - Executes TypeScript compiler check (`tsc --noEmit`).
   - Compiles Vite production static web application.
   - Exports `mafia-lan-web-production` (`dist/`) artifact.

2. **Job `build-android` (Ubuntu + Temurin JDK 17 + Android SDK 35):**
   - Caches Gradle dependencies and wrappers.
   - Executes `./gradlew assembleDebug` compiling standalone native APK.
   - Executes `./gradlew assembleRelease` with optional Base64 keystore injection.
   - Computes SHA-256 binary integrity checksums.
   - Exports `mafia-lan-android-debug-apk` (`app-debug.apk`) artifact.

3. **Job `build-ios` (macOS 14 Apple Silicon + Xcode 16):**
   - Selects Xcode build toolchain.
   - Validates Bonjour `_mafia-lan._tcp` keys in `Info.plist`.
   - Executes `xcodebuild` targeting iOS Simulator / Ad-Hoc device without requiring paid signing certificates for CI validation.
   - Exports `mafia-lan-ios-simulator-app` (`MafiaLAN-iOS-Simulator.zip`) artifact.

4. **Job `build-summary`:**
   - Publishes unified Markdown release card directly into the GitHub Actions Step Summary with artifact links and verification metrics.

