# AGENTS.md — System Guidelines & Operational Blueprint for AI Agents

> This document defines architectural principles, state machine contracts, testing workflows, and constraints for AI agents modifying or extending the **Mafia LAN** codebase.

---

## 1. Project Philosophy & Architecture Overview

**Mafia LAN** is a zero-configuration cross-platform local network social deduction game for Android, iOS, and Web. It is built as both a **working, high-fidelity interactive simulation client** and an **engineering architectural specification** for native mobile developers.

### Core Non-Negotiables
1. **Decoupled Logic First:** All game calculations, night resolutions, voting tallies, win condition verifications, and reconnection reconciliations MUST reside in `src/game/rules.ts`. UI components (`src/components/*`) must remain strictly declarative view layers.
2. **Deterministic Automated Tests:** Any modification to game rules or edge cases MUST be tested in `src/game/rules.test.ts` using Node's built-in test runner (`node:test` + `node:assert/strict`) via `npx --yes tsx --test src/game/rules.test.ts`.
3. **No External Mocking Compromise:** Do not substitute mock or hardcoded state when real algorithmic solutions are defined.
4. **Minimalist Scandinavian Noir Aesthetic:** Maintain consistent visual discipline: deep charcoal/pitch black backgrounds (`#07080c`, `#090a0f`), subtle accent badges (crimson for Mafia, cold cyan for Detective, emerald for Doctor, amber for Vigilante, purple for Jester), and sharp typography (Cinzel headers, Inter body, JetBrains Mono metrics).

---

## 2. Directory Structure & Key Responsibilities

```
/
├── README.md                      # Primary documentation, gameplay guide & build instructions
├── AGENTS.md                      # Guidelines and state machine contracts for AI agents (this file)
├── MAFIA_SPECIFICATION.md         # Full cross-platform native engineering spec
├── docs/screenshots/              # Visual captures for documentation and validation
├── src/
│   ├── types/mafia.ts             # Source of truth for TypeScript interfaces and enums
│   ├── game/
│   │   ├── rules.ts               # Pure deterministic Mafia engine & state reconciliation
│   │   └── rules.test.ts          # Automated unit test suite (11+ tests)
│   ├── services/
│   │   ├── soundEffects.ts        # Synthesized Web Audio API sound effects and haptic pulses
│   │   └── persistence.ts         # LocalStorage session caching & offline action queue
│   ├── spec/
│   │   └── mafiaSpecData.ts       # Specification text, diagrams, and packet definitions
│   └── components/
│       ├── DeviceFrame.tsx        # Realistic iPhone 16 Pro & Pixel 9 Pro device shells
│       ├── GameSimulator.tsx      # Multi-device & single-device virtual local LAN emulator
│       ├── RoleCard.tsx           # 3D secret card flip with anti-shoulder-surfing shield
│       ├── RolePortraits.tsx      # Vector SVG portraits for all roles
│       ├── NightPhaseView.tsx     # Night action targeting, countdown & detective clues
│       ├── DawnReportView.tsx     # Morning incident bulletin and saved casualties
│       ├── DayDiscussionView.tsx  # Town debate, accusations, and chat transcript
│       ├── TrialVotingView.tsx    # Suspect defense stand & live vote tally bar
│       ├── GameOverView.tsx       # Post-match celebration & complete role disclosure
│       ├── ApkBuildCenter.tsx     # Android Gradle CLI, AndroidManifest & PWA guide
│       ├── SpecificationView.tsx  # Interactive spec document browser & calculators
│       └── NetworkInspectorModal.tsx # Live mDNS and WebSocket packet inspector
```

---

## 3. Game State Machine & Phase Lifecycle

```
[lobby]
   │
   ▼ (Host launches session -> assignRoles() -> ZkRS Key Exchange)
[role_reveal]
   │
   ▼ (Player taps "I Understand My Role" -> playNightEnter())
[night]
   │
   ▼ (Timer expires or actions locked -> resolveNightActions())
[dawn]
   │
   ▼ (Casualties / Doctor saves announced -> onProceedToDay())
[day_discussion]
   │
   ▼ (Player nominated with majority or host calls trial -> onCallVote())
[trial]
   │
   ▼ (Suspect delivers 20s defense -> voting open)
[voting]
   │
   ▼ (Votes cast -> tallyVotes(mode = 'trial') -> executeTrialVerdict())
[verdict]
   │
   ├── (checkWinCondition() returns isGameOver == true) ──► [game_over]
   │
   └── (checkWinCondition() returns isGameOver == false) ──► [night] (dayNumber + 1)
```

---

## 4. Handling Critical Edge Cases

When editing game mechanics, ensure these scenarios behave according to spec:

1. **Simultaneous Attacks & Doctor Protection:**
   - If both the Mafia and the Vigilante attack Target X, and the Doctor heals Target X, the Doctor absorbs *all* violent attacks that night. Zero casualties occur (`savedPlayerIds: ['X']`).
2. **Godfather Investigative Immunity:**
   - The Godfather has `faction: 'mafia'` and `role: 'godfather'`. When interrogated by the Detective, the system MUST return `isSuspicious = false` (`Innocent`).
3. **Trial Vote Tie:**
   - In `tallyVotes(..., 'trial')`, if `guiltyVotes == innocentVotes`, `isLynchConfirmed` MUST be `false`. Ties result in a **Pardon**; the defendant walks free.
4. **Jester Win Condition:**
   - If the player executed on the gallows is a `jester`, the game terminates immediately with `winner: 'neutral'`, regardless of how many Mafia or Town members remain alive.
5. **Numerical Parity (Mafia Victory):**
   - If living Mafia count >= living Town count (`Mafia >= Town`), the Mafia syndicate immediately wins.
6. **Town Peace (Town Victory):**
   - If living Mafia count == 0 (`Mafia == 0`), the Town immediately wins.

---

## 5. Local Network Protocol & Reconnection Contracts

### 5.1 Service Discovery
- Service type: `_mafia-lan._tcp.local.`
- Transport: Embedded TLS 1.3 WebSocket on host (`192.168.1.X:8443`).
- Host advertises room code, occupancy, and status in DNS-SD TXT records.

### 5.2 Wi-Fi Disconnection & State Reconciliation
When a client temporarily loses Wi-Fi connection:
1. Client UI enters offline state (`isWifiConnected: false`).
2. User actions (votes, night attacks) are appended to `offlinePendingQueue` in `localStorage`.
3. Client displays a 45-second reconnection grace countdown.
4. Upon restoring connection, client sends `RECONNECT_SYNC` with `lastKnownSeq`.
5. Host invokes `reconcileStateOnReconnect(players, request, currentPhase, dayNumber, timeRemainingSec)`:
   - Validates player identity.
   - Preserves `isAlive` status.
   - Flushes and applies queued offline actions.
   - Responds with `appliedOfflineActionsCount` and status message.

---

## 6. Testing & Build Workflows

Before completing any task, run the automated test suite and compilation checks:

```bash
# 1. Run pure logic unit tests
npx --yes tsx --test src/game/rules.test.ts

# 2. Check full application compilation
npm run build
```

### 6.1 GitHub Actions CI/CD Pipeline
The repository maintains a multiplatform matrix at `.github/workflows/ci-cd.yml` which executes automatically on `push` and `pull_request` to `main` and `master`:
- **Web App:** Node 20, runs `rules.test.ts` (11/11 tests), `tsc --noEmit`, compiles `dist/` production web bundle.
- **Android Standalone APK:** Ubuntu + Temurin JDK 17 + Android SDK, executes `./gradlew assembleDebug` in `/android`, computes SHA-256 checksums, and uploads `mafia-lan-android-debug-apk`.
- **iOS Native:** macOS 14 (Apple Silicon) + Xcode 16, validates `Info.plist` Bonjour keys, builds iOS Simulator/Ad-Hoc archive via `xcodebuild`, and uploads `mafia-lan-ios-simulator-app`.
- **CI/CD Summary:** Aggregates multiplatform build outcomes directly in `$GITHUB_STEP_SUMMARY`.

### Dev Server & Browser Verification
- **Hot Module Reloading (HMR) is disabled** in the AI Studio container environment.
- Always restart the development server via the `restart_dev_server` tool before validating UI changes in the browser.
- Use `playwright-cli` for visual regression checks:
  ```bash
  playwright-cli open --browser=chromium http://localhost:3000
  playwright-cli resize 1440 900
  playwright-cli screenshot --filename=.playwright-cli/verification.png
  ```
- Always read captured screenshots via `view_file` to evaluate visual hierarchy, alignment, and responsiveness.

---

## 7. Native Mobile Implementation References

When guiding native mobile developers:
- **Android:** Direct developers to `src/components/ApkBuildCenter.tsx` and the `android/` directory for `build.gradle.kts`, `AndroidManifest.xml` (with `CHANGE_WIFI_MULTICAST_STATE`), and Kotlin `MulticastLock` snippets.
- **iOS:** Direct developers to `MAFIA_SPECIFICATION.md` Section 4.1 and the `ios/` directory for `Info.plist` Bonjour keys (`NSLocalNetworkUsageDescription`, `_mafia-lan._tcp`) and Swift `Network.framework` `NWBrowser`/`NWListener` templates.
- **CI/CD:** Refer to `.github/workflows/ci-cd.yml` for automated matrix builds and artifact generation.

