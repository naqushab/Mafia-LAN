/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Host and guest sessions: the React-facing layer over the engine and the
 * WebRTC transport. Both expose the same shape so the UI never branches on
 * which side of the table it is.
 */

import { Faction, RoleId } from '../types/mafia';
import { GameEngine, actionTypeForRole } from './engine';
import {
  ClientMessage,
  HostMessage,
  LiveSettings,
  PrivateState,
  PublicState,
  PROTOCOL_VERSION,
} from './protocol';
import { GuestPeer, HostPeer, createGuestPeer, createHostPeer } from './transport';

export type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface LiveSnapshot {
  side: 'host' | 'guest';
  status: SessionStatus;
  myPlayerId: string | null;
  publicState: PublicState | null;
  privateState: PrivateState | null;
  roomCode: string | null;
  error: string | null;
  /** Guest side only: the reply code the host still has to scan. */
  answerToken: string | null;
  /** Host side only: the invite currently waiting for an answer. */
  pendingOfferToken: string | null;
  /** Host side only: transport state per guest player id. */
  peerStates: Record<string, string>;
  latencyMs: number | null;
  /** Guest side only: host clock minus local clock (ms), so timers agree. */
  clockOffsetMs: number;
}

type Listener = (snapshot: LiveSnapshot) => void;

const STATE_BROADCAST_MS = 400;

abstract class Emitter {
  private listeners = new Set<Listener>();
  protected snapshot: LiveSnapshot;

  constructor(snapshot: LiveSnapshot) {
    this.snapshot = snapshot;
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LiveSnapshot => this.snapshot;

  protected emit(patch: Partial<LiveSnapshot> = {}): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

/* ================================================================== */
/* Host                                                                */
/* ================================================================== */

export class LiveHost extends Emitter {
  readonly engine: GameEngine;
  private peers = new Map<string, HostPeer>();
  private pending: { playerId: string; peer: HostPeer } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastBroadcast = 0;
  private clockOffset = 0;

  constructor(hostName: string) {
    super({
      side: 'host',
      status: 'connected',
      myPlayerId: null,
      publicState: null,
      privateState: null,
      roomCode: null,
      error: null,
      answerToken: null,
      pendingOfferToken: null,
      peerStates: {},
      latencyMs: null,
      clockOffsetMs: 0,
    });

    this.engine = new GameEngine({ hostName });
    this.emit({
      myPlayerId: this.engine.hostId,
      roomCode: this.engine.roomCode,
      publicState: this.engine.publicState(),
      privateState: this.engine.privateState(this.engine.hostId) as PrivateState,
    });
    this.startLoop();
  }

  /* ---------------- invites ---------------- */

  /** Create a fresh one-time invite for the next guest. */
  async createInvite(): Promise<string> {
    if (this.engine.phase !== 'lobby') throw new Error('Invites are closed once the game starts');
    if (this.pending) {
      this.pending.peer.close();
      this.engine.removePlayer(this.pending.playerId);
      this.pending = null;
    }
    if (this.engine.players.length >= 16) throw new Error('Table is full');

    const placeholder = this.engine.addPlayer({ name: 'Guest', isBot: false });
    // Not seated until the handshake completes, so the lobby can tell the
    // difference between "invite pending" and "player connected".
    placeholder.connected = false;
    const peer = await createHostPeer(
      {
        onOpen: () => this.onPeerOpen(placeholder.id),
        onMessage: data => this.onPeerMessage(placeholder.id, data),
        onClose: () => this.onPeerClose(placeholder.id),
        onStateChange: state => {
          this.emit({ peerStates: { ...this.snapshot.peerStates, [placeholder.id]: state } });
        },
      },
      { room: this.engine.roomCode, name: this.engine.players.find(p => p.isHost)?.name ?? 'Host' }
    );

    this.pending = { playerId: placeholder.id, peer };
    this.emit({ pendingOfferToken: peer.offerToken, error: null });
    this.broadcast();
    return peer.offerToken;
  }

  async acceptAnswer(answerToken: string): Promise<void> {
    if (!this.pending) throw new Error('Generate an invite first');
    await this.pending.peer.applyAnswer(answerToken);
  }

  cancelInvite(): void {
    if (!this.pending) return;
    this.pending.peer.close();
    this.engine.removePlayer(this.pending.playerId);
    this.pending = null;
    this.emit({ pendingOfferToken: null });
    this.broadcast();
  }

  private onPeerOpen(playerId: string): void {
    if (!this.pending || this.pending.playerId !== playerId) return;
    this.peers.set(playerId, this.pending.peer);
    this.pending = null;
    this.emit({ pendingOfferToken: null });
    this.sendStateTo(playerId);
  }

  private onPeerClose(playerId: string): void {
    if (this.pending?.playerId === playerId) {
      this.engine.removePlayer(playerId);
      this.pending = null;
      this.emit({
        pendingOfferToken: null,
        publicState: this.engine.publicState(),
        peerStates: { ...this.snapshot.peerStates, [playerId]: 'closed' },
      });
      this.broadcast();
      return;
    }
    this.peers.delete(playerId);
    this.engine.removePlayer(playerId);
    this.broadcast();
    this.emit({
      publicState: this.engine.publicState(),
      peerStates: { ...this.snapshot.peerStates, [playerId]: 'closed' },
    });
  }

  private onPeerMessage(playerId: string, data: unknown): void {
    const msg = data as ClientMessage;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.t) {
      case 'hello': {
        if (msg.protocol !== PROTOCOL_VERSION) {
          this.sendTo(playerId, { t: 'rejected', reason: 'Version mismatch — reload the app' });
          return;
        }
        this.engine.renamePlayer(playerId, msg.name || 'Guest');
        this.engine.setConnected(playerId, true);
        this.sendTo(playerId, {
          t: 'hello_ack',
          protocol: PROTOCOL_VERSION,
          playerId,
          roomCode: this.engine.roomCode,
          roomName: this.engine.settings.roomName,
        });
        this.broadcast();
        break;
      }
      case 'night_action': {
        const error = this.engine.submitNightAction(playerId, msg.targetId);
        if (error) this.sendTo(playerId, { t: 'rejected', reason: error });
        this.broadcast(true);
        break;
      }
      case 'vote': {
        const error = this.engine.submitVote(playerId, msg.choice);
        if (error) this.sendTo(playerId, { t: 'rejected', reason: error });
        this.broadcast(true);
        break;
      }
      case 'accuse':
        this.engine.accuse(playerId, msg.targetId);
        this.broadcast(true);
        break;
      case 'chat':
        this.engine.postChat(playerId, msg.text);
        this.broadcast(true);
        break;
      case 'ready':
        this.engine.setReady(playerId);
        this.broadcast(true);
        break;
      case 'ping':
        this.sendTo(playerId, { t: 'pong', at: msg.at });
        break;
    }
  }

  /* ---------------- host-as-player actions ---------------- */

  startGame(): void {
    // A half-finished invite would otherwise be dealt a role it can never play.
    if (this.pending) this.cancelInvite();
    this.engine.startGame();
    this.broadcast(true);
  }

  setReady(): void {
    this.engine.setReady(this.engine.hostId);
    this.broadcast(true);
  }

  addBot(): void {
    this.engine.addBot();
    this.broadcast(true);
  }

  setSettings(settings: Partial<LiveSettings>): void {
    this.engine.setSettings(settings);
    this.broadcast(true);
  }

  nightsAction(targetId: string): string | null {
    const error = this.engine.submitNightAction(this.engine.hostId, targetId);
    this.broadcast(true);
    return error;
  }

  vote(choice: string): string | null {
    const error = this.engine.submitVote(this.engine.hostId, choice);
    this.broadcast(true);
    return error;
  }

  accuse(targetId: string): void {
    this.engine.accuse(this.engine.hostId, targetId);
    this.broadcast(true);
  }

  chat(text: string): void {
    this.engine.postChat(this.engine.hostId, text);
    this.broadcast(true);
  }

  forceAdvance(): void {
    this.engine.forceAdvance();
    this.broadcast(true);
  }

  startVoting(): void {
    this.engine.startVoting();
    this.broadcast(true);
  }

  restart(): void {
    this.engine.restart();
    this.broadcast(true);
  }

  /* ---------------- loop ---------------- */

  private startLoop(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const before = this.engine.phase;
      this.engine.tick();
      this.autoPlayBots();
      const phaseChanged = before !== this.engine.phase;
      const now = Date.now();
      if (phaseChanged || now - this.lastBroadcast > STATE_BROADCAST_MS) {
        this.broadcast(phaseChanged);
      }
    }, 250);
  }

  /** Bots act after a short, human-ish delay so the table can follow along. */
  private autoPlayBots(): void {
    const engine = this.engine;
    const bots = engine.players.filter(p => p.isBot && p.isAlive);
    if (bots.length === 0) return;
    const phaseStarted = engine.deadlineAt > 0;

    if (engine.phase === 'role_reveal') {
      for (const bot of bots) engine.setReady(bot.id);
      return;
    }

    // A zero-length phase has no deadline, so bots should act immediately.
    const elapsed = phaseStarted
      ? Date.now() - (engine.deadlineAt - this.phaseDurationMs())
      : Number.POSITIVE_INFINITY;
    if (elapsed < 1200) return;

    if (engine.phase === 'night') {
      for (const bot of bots) {
        if (!actionTypeForRole(bot.role)) continue;
        const targets = engine.players.filter(p => p.isAlive && p.id !== bot.id);
        // Mafia never hits their own syndicate.
        const pool =
          bot.faction === 'mafia' ? targets.filter(p => p.faction !== 'mafia') : targets;
        const target = this.pickRandom(pool.length > 0 ? pool : targets);
        if (target) engine.submitNightAction(bot.id, target.id);
      }
    } else if (engine.phase === 'voting') {
      for (const bot of bots) {
        const targets = engine.players.filter(p => p.isAlive && p.id !== bot.id);
        const target = this.pickRandom(targets);
        engine.submitVote(bot.id, target ? target.id : 'abstain');
      }
    } else if (engine.phase === 'trial') {
      for (const bot of bots) {
        engine.submitVote(bot.id, Math.random() > 0.3 ? 'guilty' : 'innocent');
      }
    }
  }

  private phaseDurationMs(): number {
    const t = this.engine.settings.timings;
    switch (this.engine.phase) {
      case 'night':
        return t.nightSec * 1000;
      case 'day':
        return t.daySec * 1000;
      case 'voting':
        return t.votingSec * 1000;
      case 'trial':
        return t.trialSec * 1000;
      default:
        return 3000;
    }
  }

  private pickRandom<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  /* ---------------- broadcasting ---------------- */

  private broadcast(force = false): void {
    this.lastBroadcast = Date.now();
    const pub = this.engine.publicState();
    const me = this.engine.privateState(this.engine.hostId) as PrivateState;
    this.emit({ publicState: pub, privateState: me, status: this.snapshot.status });

    for (const playerId of this.peers.keys()) {
      this.sendStateTo(playerId, pub);
    }
    void force;
  }

  private sendStateTo(playerId: string, pub?: PublicState): void {
    const peer = this.peers.get(playerId);
    if (!peer) return;
    const priv = this.engine.privateState(playerId) as PrivateState | null;
    const message: HostMessage = { t: 'state', pub: pub ?? this.engine.publicState(), priv };
    peer.send(message);
  }

  private sendTo(playerId: string, message: HostMessage): void {
    this.peers.get(playerId)?.send(message);
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.pending) this.pending.peer.close();
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
  }
}

/* ================================================================== */
/* Guest                                                               */
/* ================================================================== */

export class LiveGuest extends Emitter {
  private peer: GuestPeer | null = null;
  private hostOffset = 0;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private playerName: string) {
    super({
      side: 'guest',
      status: 'idle',
      myPlayerId: null,
      publicState: null,
      privateState: null,
      roomCode: null,
      error: null,
      answerToken: null,
      pendingOfferToken: null,
      peerStates: {},
      latencyMs: null,
      clockOffsetMs: 0,
    });
  }

  /** Connect to a host invite. Resolves as soon as the answer code exists. */
  async join(offerToken: string, displayName?: string): Promise<string> {
    if (displayName?.trim()) this.playerName = displayName.trim().slice(0, 20);
    this.emit({ status: 'connecting', error: null });
    try {
      const holder: { peer: GuestPeer | null } = { peer: null };
      const peer = await createGuestPeer(offerToken, {
        onOpen: () => {
          holder.peer?.send({ t: 'hello', protocol: PROTOCOL_VERSION, playerId: null, name: this.playerName });
          this.emit({ status: 'connected' });
          this.startPing();
        },
        onMessage: data => this.onMessage(data),
        onClose: reason => {
          this.emit({ status: 'error', error: reason });
          this.stopPing();
        },
      });
      this.peer = peer;
      holder.peer = peer;
      this.emit({ answerToken: peer.answerToken });
      peer.whenOpen.catch(err => this.emit({ status: 'error', error: err.message }));
      return peer.answerToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not join';
      this.emit({ status: 'error', error: message });
      throw error;
    }
  }

  private onMessage(data: unknown): void {
    const msg = data as HostMessage;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.t) {
      case 'hello_ack':
        this.emit({
          myPlayerId: msg.playerId,
          roomCode: msg.roomCode,
          status: 'connected',
          error: null,
          answerToken: null,
        });
        break;
      case 'state':
        this.hostOffset = msg.pub.now - Date.now();
        this.emit({
          publicState: msg.pub,
          privateState: msg.priv,
          myPlayerId: this.snapshot.myPlayerId ?? msg.priv?.playerId ?? null,
          roomCode: msg.pub.roomCode,
          status: 'connected',
          answerToken: null,
          clockOffsetMs: this.hostOffset,
        });
        break;
      case 'rejected':
        this.emit({ error: msg.reason });
        break;
      case 'pong':
        this.emit({ latencyMs: Date.now() - msg.at });
        break;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.peer?.send({ t: 'ping', at: Date.now() });
    }, 5000);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  serverNow(): number {
    return Date.now() + this.hostOffset;
  }

  nightAction(targetId: string): void {
    this.peer?.send({ t: 'night_action', targetId });
  }

  vote(choice: string): void {
    this.peer?.send({ t: 'vote', choice });
  }

  accuse(targetId: string): void {
    this.peer?.send({ t: 'accuse', targetId });
  }

  chat(text: string): void {
    this.peer?.send({ t: 'chat', text });
  }

  ready(): void {
    this.peer?.send({ t: 'ready' });
  }

  destroy(): void {
    this.stopPing();
    this.peer?.close();
    this.peer = null;
  }
}

export type LiveSession = LiveHost | LiveGuest;

export function phaseLabel(phase: PublicState['phase']): string {
  switch (phase) {
    case 'lobby':
      return 'Lobby';
    case 'role_reveal':
      return 'Role Reveal';
    case 'night':
      return 'Night';
    case 'dawn':
      return 'Dawn';
    case 'day':
      return 'Discussion';
    case 'voting':
      return 'Nomination Vote';
    case 'trial':
      return 'Trial Verdict';
    case 'verdict':
      return 'Verdict';
    case 'game_over':
      return 'Game Over';
  }
}

export function roleLabel(role: RoleId | undefined): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
}

export function factionLabel(faction: Faction | null | undefined): string {
  if (faction === 'mafia') return 'Mafia';
  if (faction === 'neutral') return 'Neutral';
  if (faction === 'town') return 'Town';
  return 'Unknown';
}
