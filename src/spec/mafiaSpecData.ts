/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SpecSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  contentMarkdown: string;
}

export const SPEC_METADATA = {
  title: 'MAFIA LAN: Cross-Platform Android & iOS Local Network Engineering Specification',
  version: '2.4.0-PROD',
  lastUpdated: 'October 2026',
  authors: ['System Architecture Group', 'Mobile Network Protocols Engineering', 'UI/UX Human Interface Team'],
  status: 'Ready for Native Implementation (Swift / Kotlin / Rust Core)',
};

export const SPEC_SECTIONS: SpecSection[] = [
  {
    id: 'game-mechanics',
    title: '1. Mafia Rules & Game Engine Mechanics',
    subtitle: 'Mathematical balance, phase state machines, role deck permutations, and win criteria',
    icon: 'Shield',
    contentMarkdown: `### 1.1 Overview & Origins
Mafia (also known as Werewolf) is an asymmetric social deduction game designed in 1986 by Dimitry Davidoff. It models a conflict between two distinct factions:
- **The Informed Minority (Mafia):** Possesses knowledge of each other's identities and coordinates in secret.
- **The Uninformed Majority (The Town / Innocents):** Initially only aware of their own identity and must deduce allegiance through behavior, accusations, voting trends, and investigative leads.

---

### 1.2 Mathematical Balance & Player Counts
The game scales dynamically from **5 to 18 players**. Game theory establishes optimal stability when Mafia represents **22% to 28%** of the total player pool:

| Player Count | Mafia Syndicate | Special Roles (Doctor, Detective) | Townspeople |
|---|---|---|---|
| **5 - 6** | 1 Mafia | 1 Detective, 1 Doctor | 2 - 3 Villagers |
| **7 - 8** | 2 Mafia (1 Godfather) | 1 Detective, 1 Doctor | 3 - 4 Villagers |
| **9 - 11** | 3 Mafia (1 Godfather) | 1 Detective, 1 Doctor, 1 Vigilante | 4 - 6 Villagers |
| **12 - 15** | 3 - 4 Mafia | 1 Detective, 1 Doctor, 1 Vigilante, 1 Jester | 5 - 8 Villagers |

---

### 1.3 Strict Role Hierarchy & Night Action Priority
To eliminate race conditions in the local network state machine, night resolutions execute in strict mathematical order:
1. **Priority 1 — Doctor Protection (Heal):** The Doctor selects one target (or themselves, max once per game). The selected player is granted a \`SHIELD_ACTIVE\` flag for that night cycle.
2. **Priority 2 — Detective Inquiry (Investigate):** The Detective interrogates a target. Returns \`SUSPICIOUS\` (Mafia) or \`INNOCENT\` (Town / Godfather). The Godfather possesses investigative immunity and registers as \`INNOCENT\`.
3. **Priority 3 — Mafia Syndicate Kill:** The Mafia votes collectively or the Godfather has tie-breaker priority. If the targeted player possesses \`SHIELD_ACTIVE\`, the attack is absorbed and the player survives with a dawn log event \`SAVED_BY_DOCTOR\`.
4. **Priority 4 — Vigilante Shot:** A rogue townsman with a single bullet. If they fire upon the same target healed by the Doctor, the shot is absorbed.

---

### 1.4 Phase State Machine
\`\`\`
[LOBBY] ---> [ROLE_DISTRIBUTION & ZERO-KNOWLEDGE KEY EXCHANGE]
                  |
                  v
             [NIGHT START] (Audio Ambiance & Haptic Cue)
                  |
                  v
             [NIGHT ACTIONS] (Mafia / Detective / Doctor / Vigilante)
                  |
                  v
             [DAWN ANNOUNCEMENT] (Casualties & Doctor Saves Revealed)
                  |
                  v
             [DAY DISCUSSION] (Synchronized LAN Timer: 60s - 180s)
                  |
                  v
             [ACCUSATIONS & TRIAL] (Suspect placed on defense stand)
                  |
                  v
             [VOTING PHASE] (Guilty vs Innocent or Majority Lynch)
                  |
                  v
             [VERDICT & EXECUTION / PARDON]
                  |
                  v
             [CHECK WIN CONDITION] ---> YES ---> [GAME OVER & ROLE REVEAL]
                  |
                  +--- NO ---> Loop back to [NIGHT START]
\`\`\`

---

### 1.5 Win Conditions
- **Mafia Victory:** When the number of living Mafia members is greater than or equal to living Town members (\`Mafia >= Town\`).
- **Town Victory:** When all Mafia syndicate members are eliminated (\`Mafia == 0\`).
- **Neutral (Jester) Victory:** If the Jester is voted onto the gallows and executed by Town vote during the Day phase.
`,
  },
  {
    id: 'local-network',
    title: '2. Local Network Discovery & Cross-Platform Transport',
    subtitle: 'Zero-configuration LAN discovery using mDNS/Bonjour, UDP broadcast, and WebSockets',
    icon: 'Radio',
    contentMarkdown: `### 2.1 The Cross-Platform LAN Challenge
Connecting Android and iOS devices over a shared local Wi-Fi router (or a mobile Wi-Fi hotspot) without any cloud relay or internet connection requires zero-configuration service discovery:
- **iOS:** Strict sandbox requiring \`NSLocalNetworkUsageDescription\` and Bonjour service registration (\`NWBrowser\` / \`NWListener\`).
- **Android:** Requires \`WifiManager.MulticastLock\` to receive mDNS multicast packets on devices that filter broadcast traffic in low-power modes.

---

### 2.2 Discovery Protocol: \`_mafia-lan._tcp\`
The Host device publishes a DNS-SD service over mDNS:
- **Service Type:** \`_mafia-lan._tcp.local.\`
- **Domain:** \`local.\`
- **Port:** \`8443\` (TLS WebSocket) / \`8080\` (Plaintext dev)
- **TXT Records (Key-Value Metadata):**
  - \`room_code=MAFIA-729\`
  - \`room_name="Midnight Lounge"\`
  - \`current_players=4\`
  - \`max_players=10\`
  - \`state=LOBBY\`
  - \`protocol_ver=2\`
  - \`host_device="iPhone 16 Pro"\`

---

### 2.3 Network Architecture Diagram
\`\`\`
       +-------------------------------------------------------------+
       |                  Local Wi-Fi Subnet (LAN)                   |
       |                   e.g. 192.168.1.0/24                       |
       +-------------------------------------------------------------+
                     |                                 |
                     v                                 v
        +-------------------------+       +-------------------------+
        |   HOST DEVICE (Server)   |       |   CLIENT DEVICE (Peer)  |
        |  Android or iOS Device   |       |  Android or iOS Device  |
        +-------------------------+       +-------------------------+
        | - NsdManager / Bonjour   |       | - NsdManager / Bonjour   |
        |   Advertiser (mDNS)      |  <--  |   Browser (Discovery)   |
        | - Embedded TLS WebSocket |       | - WebSocket Client      |
        |   Server (Ktor/NWListener|  <==  |   (OkHttp/URLSession)   |
        | - Game State Master      |  ==>  | - State Replica Engine  |
        | - Ephemeral Key Store    |  <->  | - Local Secret Decryptor|
        +-------------------------+       +-------------------------+
\`\`\`

---

### 2.4 Transport Layer: Low-Latency TLS WebSocket
Once discovered, client phones establish an authenticated persistent WebSocket connection directly to the host's LAN IP:
- **Ping/Pong Heartbeat:** Every 2,000ms. If 3 consecutive beats are missed (6,000ms), player enters \`DISCONNECTED_PENDING_RECONNECT\` state.
- **State Delta Synchronization:** Instead of sending whole objects, host emits monotonic sequence-numbered deltas (\`seq: 142\`), ensuring zero packet reordering bugs.
- **Reconnection Window:** 45-second reconnect window preserves assigned role and votes during app switches.
`,
  },
  {
    id: 'security-crypto',
    title: '3. Security, Encryption & Anti-Cheat on LAN',
    subtitle: 'Zero-knowledge role secrecy, Ephemeral Diffie-Hellman, and MITM prevention',
    icon: 'Lock',
    contentMarkdown: `### 3.1 The Local Wi-Fi Vulnerability
In standard local multiplayer games, any tech-savvy player with Wireshark, tcpdump, or a rooted Android phone can inspect unencrypted Wi-Fi packets to discover who the Mafia, Detective, and Doctor are before round one starts. Even with basic HTTPS, the Host player could dump local memory to inspect peer roles!

---

### 3.2 Zero-Knowledge Role Secrecy Protocol (ZkRS)
To make the game 100% tamper-proof even against a cheating Host:

1. **Ephemeral Key Generation:**
   During the lobby handshake, every client device generates an ephemeral \`X25519\` public/private key pair:
   \`\`\`
   Client A: (PrivKey_A, PubKey_A)
   \`\`\`
2. **Public Key Exchange:**
   All public keys are broadcast to the room.
3. **Sealed Role Envelopes:**
   The role distribution engine on the Host generates the shuffled deck. For each player, the role payload is encrypted with the recipient's \`PubKey_A\` using **ChaCha20-Poly1305** or **AES-256-GCM**.
4. **Blind Commitment:**
   The host publishes a SHA-256 hash commitment of the complete role permutation (\`Hash(Permutation + Nonce)\`).
   Only Player A can decrypt Player A's role. Even if the Host inspects network traffic, the encrypted envelope is computationally indistinguishable from random bytes!

---

### 3.3 PIN / QR Code Pairing & Certificate Pinning
To prevent malicious devices on university, cafe, or hotel Wi-Fi from executing Man-in-the-Middle (MitM) attacks:
- The Host displays an on-screen **4-Digit Room PIN** and a **QR Code**.
- The QR code contains: \`mafia://join?ip=192.168.1.42&port=8443&cert_fingerprint=a4f9b2...\`
- Connecting peers verify the self-signed TLS certificate fingerprint against the QR code / PIN before sending any player credentials.
`,
  },
  {
    id: 'native-stack',
    title: '4. Android & iOS Native Technical Implementations',
    subtitle: 'Production code templates for Swift Network.framework and Kotlin NsdManager',
    icon: 'Smartphone',
    contentMarkdown: `### 4.1 iOS Implementation (Swift 6 & SwiftUI)

#### 4.1.1 Info.plist Requirements
\`\`\`xml
<key>NSLocalNetworkUsageDescription</key>
<string>Mafia LAN requires access to the local network to discover and connect to nearby game rooms.</string>
<key>NSBonjourServices</key>
<array>
  <string>_mafia-lan._tcp</string>
</array>
\`\`\`

#### 4.1.2 Bonjour Discovery with Network.framework
\`\`\`swift
import Network
import Combine

final class LocalRoomBrowser: ObservableObject {
    @Published var discoveredRooms: [DiscoveredRoom] = []
    private var browser: NWBrowser?

    func startBrowsing() {
        let descriptor = NWBrowser.Descriptor.bonjour(type: "_mafia-lan._tcp", domain: "local.")
        let parameters = NWParameters()
        parameters.includePeerToPeer = true
        
        browser = NWBrowser(for: descriptor, using: parameters)
        browser?.browseResultsChangedHandler = { [weak self] results, changes in
            DispatchQueue.main.async {
                self?.handleResults(results)
            }
        }
        browser?.start(queue: .main)
    }

    private func handleResults(_ results: Set<NWBrowser.Result>) {
        self.discoveredRooms = results.compactMap { result in
            guard case let .service(name, type, domain, interface) = result.endpoint else { return nil }
            return DiscoveredRoom(name: name, endpoint: result.endpoint)
        }
    }
}
\`\`\`

---

### 4.2 Android Implementation (Kotlin & Jetpack Compose)

- **Application Label / Name:** \`Mafia LAN: Local WiFi Party Game\`
- **Package:** \`com.mafialan.game\`

#### 4.2.1 AndroidManifest.xml Permissions
\`\`\`xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
\`\`\`

#### 4.2.2 MulticastLock & NsdManager Registration
\`\`\`kotlin
class AndroidNsdService(private val context: Context) {
    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private var multicastLock: WifiManager.MulticastLock? = null

    fun acquireMulticastLock() {
        val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        multicastLock = wifiManager.createMulticastLock("MafiaMulticastLock").apply {
            setReferenceCounted(true)
            acquire()
        }
    }

    fun registerRoom(roomName: String, port: Int) {
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = "Mafia-$roomName"
            serviceType = "_mafia-lan._tcp."
            setPort(port)
            setAttribute("ver", "2")
            setAttribute("slots", "10")
        }

        nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(info: NsdServiceInfo) {
                Log.d("MafiaLAN", "Room successfully registered: \${info.serviceName}")
            }
            override fun onRegistrationFailed(info: NsdServiceInfo, errorCode: Int) {
                Log.e("MafiaLAN", "Registration failed with code: $errorCode")
            }
            override fun onServiceUnregistered(info: NsdServiceInfo) {}
            override fun onUnregistrationFailed(info: NsdServiceInfo, errorCode: Int) {}
        })
    }
}
\`\`\`
`,
  },
  {
    id: 'ui-design-system',
    title: '5. UI/UX Design System & Human Interface Guidelines',
    subtitle: 'Minimalist Dark Noir aesthetic, fluid physics, and tactile haptic feedback matrix',
    icon: 'Palette',
    contentMarkdown: `### 5.1 Design Philosophy: "Minimalist Scandinavian Noir"
Unlike cluttered party game interfaces with cartoon clowns and overwhelming popups, Mafia LAN embodies a **sophisticated, atmospheric psychological crime aesthetic**:
- **Palette:** Deep pitch-black base (\`#090A0F\`), muted charcoal card surfaces (\`#131722\`), accented with subtle crimson (\`#EF4444\`) for Mafia, cold surgical cyan (\`#38BDF8\`) for Detective, and emerald mist (\`#34D399\`) for Doctor.
- **Typography:** Architectural serif headers (**Cinzel** or **Playfair**) paired with ultra-legible, geometric body (**Inter**) and monospaced cryptographic metrics (**JetBrains Mono**).
- **Physicality:** Role cards have true 3D spatial inertia. Tapping to reveal requires a continuous finger hold or flip gesture to prevent curious neighbors from peeking over your shoulder!

---

### 5.2 Haptic Feedback Matrix (iOS CoreHaptics / Android VibrationEffect)

| Game Event | iOS CoreHaptics Pattern | Android VibrationEffect |
|---|---|---|
| **Secret Card Flip** | Soft crisp tap (0.05s, 40% intensity) | \`createPredefined(EFFECT_TICK)\` |
| **Nightfall Descends** | Low deep rumble: 3-step frequency drop | \`createWaveform([60, 40, 80], -1)\` |
| **Detective Inquiry Result** | Double pulse if Suspicious, single pleasant pulse if Innocent | \`createWaveform([40, 50, 40], -1)\` |
| **Gavel Verdict / Lynch** | Heavy impact strike (0.25s, 100% sharp drop) | \`createPredefined(EFFECT_HEAVY_CLICK)\` |
| **Countdown Final 5s** | Subtle heartbeat pulse every 1,000ms | \`createWaveform([15], -1)\` |

---

### 5.3 Motion & Transitions
- **Spring Parameters:** \`stiffness: 300, damping: 28, mass: 0.9\` for snappiest native 120Hz ProMotion / Smooth Display response.
- **Privacy Shield:** During role reveal, background lighting dims by 80% and a high-contrast privacy border illuminates to signal that private information is currently visible.
`,
  },
  {
    id: 'packet-protocols',
    title: '6. Message Schemas & Packet Protocol',
    subtitle: 'Strict JSON & Protobuf schema definitions for real-time multiplayer synchronization',
    icon: 'Cpu',
    contentMarkdown: `### 6.1 Packet Envelope Specification
Every message transmitted across the local WebSocket follows a unified envelope structure:

\`\`\`json
{
  "seq": 1042,
  "type": "NIGHT_ACTION",
  "timestamp": 1793452814230,
  "roomId": "MAFIA-729",
  "senderId": "player_ios_948",
  "encrypted": true,
  "payload": {
    "actionType": "investigate",
    "targetId": "player_android_102"
  },
  "sig": "3045022100e791b8..."
}
\`\`\`

---

### 6.2 Key Message Types
1. \`DISCOVERY_BEACON\` — Sent via mDNS / UDP broadcast every 1.5s while room is in LOBBY.
2. \`JOIN_REQUEST\` — Client initiates handshake with device specs and generated public key.
3. \`JOIN_ACK\` — Host accepts client, returns current lobby roster, assigned player slot, and TLS certificate fingerprint.
4. \`ROLE_HANDSHAKE_ENCRYPTED\` — Unicast payload containing recipient's sealed role envelope.
5. \`PHASE_TRANSITION\` — Host broadcasts phase changes with synchronized epoch target timestamp for lag-free countdown timers.
6. \`VOTE_SUBMIT\` — Client transmits nomination or guilt/innocence verdict.
7. \`HEARTBEAT\` — Ping/pong keepalive packet measuring local LAN RTT latency.
`,
  },
];
