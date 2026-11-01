/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RoleId = 'villager' | 'mafia' | 'godfather' | 'detective' | 'doctor' | 'vigilante' | 'jester';

export type Faction = 'town' | 'mafia' | 'neutral';

export interface RoleDefinition {
  id: RoleId;
  name: string;
  faction: Faction;
  description: string;
  nightActionDescription?: string;
  priority: number; // Order of action resolution at night
  iconName: string;
  color: string;
  badgeColor: string;
}

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'night'
  | 'dawn'
  | 'day_discussion'
  | 'trial'
  | 'voting'
  | 'verdict'
  | 'game_over';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  role: RoleId;
  faction: Faction;
  isAlive: boolean;
  isHost: boolean;
  isBot?: boolean;
  deviceType: 'ios' | 'android' | 'web';
  ipAddress: string;
  lastPingMs: number;
  voteCount?: number;
}

export interface NightActionPayload {
  actorId: string;
  targetId: string;
  actionType: 'kill' | 'heal' | 'investigate' | 'shoot';
}

export interface NightResolutionResult {
  eliminatedPlayerIds: string[];
  savedPlayerIds: string[];
  investigationResults: Record<string, { targetName: string; isSuspicious: boolean }>;
  logMessages: string[];
}

export interface VotingResult {
  accusedId: string | null;
  tally: Record<string, number>;
  totalVotes: number;
  isTie: boolean;
  isLynchConfirmed: boolean;
}

export interface WinConditionResult {
  isGameOver: boolean;
  winner: Faction | null;
  reason: string;
}

export interface RoleDeckConfig {
  villagers: number;
  mafia: number;
  godfather: boolean;
  detective: boolean;
  doctor: boolean;
  vigilante: boolean;
  jester: boolean;
}

export interface GameSettings {
  nightDurationSec: number;
  dayDiscussionSec: number;
  trialDurationSec: number;
  votingDurationSec: number;
  revealRolesOnDeath: boolean;
  enableVoiceDiscussionTimer: boolean;
  roomCode: string;
  roomName: string;
  hostIp: string;
  port: number;
  deckConfig: RoleDeckConfig;
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  phase: GamePhase;
  dayNumber: number;
  text: string;
  type: 'system' | 'night' | 'day' | 'death' | 'verdict' | 'network';
}

export interface NetworkPacket {
  packetId: string;
  timestamp: number;
  sourceIp: string;
  destinationIp: string;
  protocol: 'mDNS' | 'WSS' | 'WebRTC-DataChannel';
  type:
    | 'DISCOVERY_BEACON'
    | 'JOIN_REQUEST'
    | 'JOIN_ACK'
    | 'ROLE_HANDSHAKE_ENCRYPTED'
    | 'PHASE_CHANGE'
    | 'NIGHT_ACTION'
    | 'VOTE_SUBMIT'
    | 'STATE_SYNC'
    | 'HEARTBEAT';
  encrypted: boolean;
  payloadSummary: string;
}

export interface GameState {
  roomCode: string;
  roomName: string;
  phase: GamePhase;
  dayNumber: number;
  timeRemainingSec: number;
  players: Player[];
  myPlayerId: string;
  settings: GameSettings;
  nightActions: Record<string, NightActionPayload>;
  votes: Record<string, string>; // voterId -> targetId / 'guilty' / 'innocent' / 'abstain'
  trialSuspectId: string | null;
  lastDawnEliminated: string[];
  lastDawnSaved: string[];
  lastExecutedPlayerId: string | null;
  investigationCache: Record<string, boolean>; // suspectId -> isSuspicious
  logs: GameLogEntry[];
  winner: Faction | null;
  winnerReason: string;
  packetHistory: NetworkPacket[];
}
