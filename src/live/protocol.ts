/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wire protocol for live LAN games.
 *
 * Transport is a WebRTC DataChannel (peer-to-peer, no server, no internet).
 * Topology is a star: the host device owns the authoritative engine, every
 * guest holds a single DataChannel to the host. Guests never see another
 * guest's role — the host filters every payload per recipient.
 */

import { Faction, RoleId } from '../types/mafia';
import { DeckConfiguration } from '../game/rules';

export const PROTOCOL_VERSION = 1;

export type LivePhase =
  | 'lobby'
  | 'role_reveal'
  | 'night'
  | 'dawn'
  | 'day'
  | 'voting'
  | 'trial'
  | 'verdict'
  | 'game_over';

export interface LiveTimings {
  revealSec: number;
  nightSec: number;
  dawnSec: number;
  daySec: number;
  votingSec: number;
  trialSec: number;
  verdictSec: number;
}

export interface LiveSettings {
  roomName: string;
  timings: LiveTimings;
  deck: DeckConfiguration;
  revealRolesOnDeath: boolean;
}

export const DEFAULT_TIMINGS: LiveTimings = {
  revealSec: 45,
  nightSec: 45,
  dawnSec: 12,
  daySec: 150,
  votingSec: 45,
  trialSec: 45,
  verdictSec: 10,
};

export interface PublicPlayer {
  id: string;
  name: string;
  isAlive: boolean;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
  /** Only set once the role is public (death reveal or game over). */
  role?: RoleId;
  faction?: Faction;
  voteCount?: number;
}

export interface FeedItem {
  id: string;
  senderName: string;
  text: string;
  isSystem: boolean;
  ts: number;
}

export interface PublicState {
  roomCode: string;
  roomName: string;
  phase: LivePhase;
  dayNumber: number;
  /** Epoch ms when the current phase auto-advances (0 = no timer). */
  deadlineAt: number;
  /** Host clock at the moment of the snapshot, for client-side clock skew correction. */
  now: number;
  players: PublicPlayer[];
  hostId: string;
  trialSuspectId: string | null;
  /** Result of the most recent gallows trial, shown during the `verdict` phase. */
  trialVerdict: 'executed' | 'pardoned' | null;
  lastDawnEliminated: string[];
  lastDawnSaved: string[];
  feed: FeedItem[];
  winner: Faction | null;
  winnerReason: string;
  votedCount: number;
  aliveCount: number;
  voteTally: Record<string, number> | null;
  settings: LiveSettings;
}

export interface PrivateState {
  playerId: string;
  role: RoleId;
  faction: Faction;
  isAlive: boolean;
  /** Fellow mafia (empty for non-mafia). */
  teammates: Array<{ id: string; name: string; isAlive: boolean }>;
  investigation: { targetName: string; isSuspicious: boolean; day: number } | null;
  hasActed: boolean;
  hasVoted: boolean;
}

/** host -> guest */
export type HostMessage =
  | { t: 'hello_ack'; protocol: number; playerId: string; roomCode: string; roomName: string }
  | { t: 'state'; pub: PublicState; priv: PrivateState | null }
  | { t: 'rejected'; reason: string }
  | { t: 'pong'; at: number };

/** guest -> host */
export type ClientMessage =
  | { t: 'hello'; protocol: number; playerId: string | null; name: string }
  | { t: 'night_action'; targetId: string }
  | { t: 'vote'; choice: string }
  | { t: 'accuse'; targetId: string }
  | { t: 'chat'; text: string }
  | { t: 'ready' }
  | { t: 'ping'; at: number };

/* ------------------------------------------------------------------ */
/* Signaling tokens                                                    */
/* ------------------------------------------------------------------ */

export interface SignalToken {
  v: number;
  k: 'offer' | 'answer';
  /** Session Description (SDP) — plain text, compressed on the wire by base64. */
  sdp: string;
  /** Room code, so a scanned token can be sanity-checked against the table. */
  room: string;
  /** Host display name (offers only). */
  name?: string;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encode a signaling token as a URL-safe string (QR / clipboard friendly). */
export function encodeSignal(token: SignalToken): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(token)));
}

/** Parse a token from a bare code or from a full share link containing `#join=` / `#answer=`. */
export function decodeSignal(raw: string): SignalToken {
  try {
    let text = (raw || '').trim();
    const hashIdx = text.indexOf('#');
    if (hashIdx >= 0) text = text.slice(hashIdx + 1);
    const eqIdx = text.indexOf('=');
    if (eqIdx > 0 && /^[a-z]+=/i.test(text.slice(0, eqIdx + 1))) text = text.slice(eqIdx + 1);
    text = text.replace(/\s+/g, '');
    const json = new TextDecoder().decode(fromBase64Url(text));
    const parsed = JSON.parse(json) as SignalToken;
    if (!parsed || typeof parsed.sdp !== 'string' || (parsed.k !== 'offer' && parsed.k !== 'answer')) {
      throw new Error('bad shape');
    }
    if (parsed.v !== PROTOCOL_VERSION) throw new Error('version mismatch');
    return parsed;
  } catch {
    throw new Error('Not a Mafia LAN invite code');
  }
}

export function buildShareLink(base: string, kind: 'join' | 'answer', token: string): string {
  const clean = base.split('#')[0];
  return `${clean}#${kind}=${token}`;
}
