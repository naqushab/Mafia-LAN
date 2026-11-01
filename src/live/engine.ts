/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authoritative game engine for live LAN play.
 *
 * Pure, framework-free and synchronous: `tick(now)` advances the state machine
 * when a phase deadline expires, and every mutator validates that the caller is
 * actually allowed to do that right now. The host device runs exactly one
 * instance; guests only ever receive filtered snapshots from it.
 */

import {
  DeckConfiguration,
  ROLE_DEFINITIONS,
  assignRoles,
  checkWinCondition,
  getRecommendedDeck,
  resolveNightActions,
  tallyVotes,
} from '../game/rules';
import { Faction, NightActionPayload, Player, RoleId } from '../types/mafia';
import {
  DEFAULT_TIMINGS,
  FeedItem,
  LiveSettings,
  LiveTimings,
  PrivateState,
  PublicPlayer,
  PublicState,
} from './protocol';

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

export interface EnginePlayer {
  id: string;
  name: string;
  role: RoleId;
  faction: Faction;
  isAlive: boolean;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  ready: boolean;
}

const ACTION_BY_ROLE: Partial<Record<RoleId, NightActionPayload['actionType']>> = {
  mafia: 'kill',
  godfather: 'kill',
  doctor: 'heal',
  detective: 'investigate',
  vigilante: 'shoot',
};

export const MAX_PLAYERS = 16;
export const MIN_PLAYERS = 4;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function actionTypeForRole(role: RoleId): NightActionPayload['actionType'] | null {
  return ACTION_BY_ROLE[role] ?? null;
}

export interface EngineInit {
  roomCode?: string;
  roomName?: string;
  settings?: Partial<LiveSettings>;
  hostName?: string;
}

export class GameEngine {
  readonly roomCode: string;
  readonly hostId: string;
  settings: LiveSettings;

  phase: LivePhase = 'lobby';
  dayNumber = 0;
  deadlineAt = 0;

  players: EnginePlayer[] = [];
  nightActions: Record<string, NightActionPayload> = {};
  votes: Record<string, string> = {};
  trialSuspectId: string | null = null;
  trialVerdict: 'executed' | 'pardoned' | null = null;
  lastDawnEliminated: string[] = [];
  lastDawnSaved: string[] = [];
  executedId: string | null = null;
  winner: Faction | null = null;
  winnerReason = '';
  feed: FeedItem[] = [];

  /** Roles that are public knowledge (death reveals + game over). */
  private revealed = new Set<string>();
  /** Per-detective last investigation result. */
  private investigations: Record<string, { targetName: string; isSuspicious: boolean; day: number }> = {};

  constructor(init: EngineInit = {}) {
    this.roomCode = init.roomCode ?? uid('room').toUpperCase().slice(-6);
    this.hostId = 'host';
    this.settings = {
      roomName: init.roomName ?? 'Midnight Syndicate',
      timings: { ...DEFAULT_TIMINGS, ...(init.settings?.timings ?? {}) },
      deck: init.settings?.deck ?? getRecommendedDeck(MIN_PLAYERS),
      revealRolesOnDeath: init.settings?.revealRolesOnDeath ?? true,
    };
    this.addPlayer({ name: init.hostName ?? 'Host', isHost: true, forcedId: this.hostId });
  }

  /* ---------------------------------------------------------------- */
  /* Lobby                                                            */
  /* ---------------------------------------------------------------- */

  addPlayer(input: { name: string; isHost?: boolean; isBot?: boolean; forcedId?: string }): EnginePlayer {
    if (this.phase !== 'lobby') throw new Error('The game has already started');
    if (this.players.length >= MAX_PLAYERS) throw new Error('Table is full (16 players max)');

    const name = (input.name || '').trim().slice(0, 20) || `Player ${this.players.length + 1}`;
    const player: EnginePlayer = {
      id: input.forcedId ?? uid('p'),
      name: this.uniqueName(name),
      role: 'villager',
      faction: 'town',
      isAlive: true,
      isHost: !!input.isHost,
      isBot: !!input.isBot,
      connected: true,
      ready: false,
    };
    this.players.push(player);
    this.pushFeed(`${player.name} joined the table.`, 'system');
    return player;
  }

  private uniqueName(name: string): string {
    let candidate = name;
    let n = 2;
    while (this.players.some(p => p.name.toLowerCase() === candidate.toLowerCase())) {
      candidate = `${name} ${n++}`;
    }
    return candidate;
  }

  removePlayer(id: string): void {
    if (this.phase === 'lobby') {
      const player = this.player(id);
      if (!player || player.isHost) return;
      this.players = this.players.filter(p => p.id !== id);
      this.pushFeed(`${player.name} left the table.`, 'system');
      return;
    }
    this.setConnected(id, false);
  }

  setConnected(id: string, connected: boolean): void {
    const player = this.player(id);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    if (!connected) this.pushFeed(`${player.name} lost connection.`, 'system');
  }

  renamePlayer(id: string, name: string): void {
    const player = this.player(id);
    if (!player || this.phase !== 'lobby') return;
    player.name = this.uniqueName((name || '').trim().slice(0, 20) || player.name);
  }

  addBot(name = 'Bot'): EnginePlayer | null {
    if (this.phase !== 'lobby' || this.players.length >= MAX_PLAYERS) return null;
    return this.addPlayer({ name, isBot: true });
  }

  setSettings(partial: Partial<LiveSettings>): void {
    if (this.phase !== 'lobby') return;
    this.settings = {
      ...this.settings,
      ...partial,
      timings: { ...this.settings.timings, ...(partial.timings ?? {}) },
      deck: { ...this.settings.deck, ...(partial.deck ?? {}) },
    };
  }

  startGame(now = Date.now()): void {
    if (this.phase !== 'lobby') return;
    if (this.players.length < MIN_PLAYERS) {
      throw new Error(`Mafia needs at least ${MIN_PLAYERS} players (have ${this.players.length})`);
    }

    const deck: DeckConfiguration = this.settings.deck.mafiaCount
      ? this.settings.deck
      : getRecommendedDeck(this.players.length);

    const cast = assignRoles(this.players.map(p => this.asPlayer(p)), deck);
    const byId = new Map(cast.map(p => [p.id, p]));
    for (const player of this.players) {
      const assigned = byId.get(player.id);
      if (!assigned) continue;
      player.role = assigned.role;
      player.faction = assigned.faction;
      player.isAlive = true;
      player.ready = false;
    }

    this.dayNumber = 1;
    this.winner = null;
    this.winnerReason = '';
    this.trialSuspectId = null;
    this.trialVerdict = null;
    this.votes = {};
    this.nightActions = {};
    this.revealed.clear();
    this.investigations = {};
    this.pushFeed('The game begins. Roles have been dealt in secret.', 'system');
    this.enterPhase('role_reveal', now);
  }

  setReady(id: string): void {
    const player = this.player(id);
    if (!player) return;
    player.ready = true;
    if (this.phase === 'role_reveal' && this.players.every(p => p.ready)) {
      this.enterPhase('night', Date.now());
    }
  }

  /* ---------------------------------------------------------------- */
  /* Player actions                                                   */
  /* ---------------------------------------------------------------- */

  submitNightAction(actorId: string, targetId: string, now = Date.now()): string | null {
    if (this.phase !== 'night') return 'No night action is expected right now';
    const actor = this.player(actorId);
    const target = this.player(targetId);
    if (!actor) return 'Unknown player';
    if (!actor.isAlive) return 'The dead cannot act';
    if (!target) return 'Unknown target';
    if (!target.isAlive) return 'That player is already dead';

    const actionType = actionTypeForRole(actor.role);
    if (!actionType) return 'Your role has no night action';
    if (targetId === actorId && actionType !== 'heal') return 'You cannot target yourself';

    // The syndicate gets exactly one shared hit: the first mafioso to choose
    // sets the target, and only the Godfather may overrule it.
    if (actionType === 'kill') {
      const otherKills = Object.entries(this.nightActions).filter(
        ([id, a]) => a.actionType === 'kill' && id !== actorId
      );
      if (otherKills.length > 0) {
        const godfatherAlreadyChose = otherKills.some(
          ([id]) => this.player(id)?.role === 'godfather'
        );
        if (actor.role !== 'godfather' || godfatherAlreadyChose) return null;
        for (const [id] of otherKills) delete this.nightActions[id];
      }
    }

    this.nightActions[actorId] = { actorId, targetId, actionType };
    this.pushFeed(`${actor.name} has chosen their night action.`, 'system', { silent: true });
    if (this.allNightActorsDone()) this.resolveNight(now);
    return null;
  }

  submitVote(voterId: string, choice: string, now = Date.now()): string | null {
    if (this.phase !== 'voting' && this.phase !== 'trial') return 'There is no vote in progress';
    const voter = this.player(voterId);
    if (!voter) return 'Unknown player';
    if (!voter.isAlive) return 'The dead cannot vote';

    if (this.phase === 'trial') {
      if (!['guilty', 'innocent', 'abstain'].includes(choice)) return 'Invalid verdict';
    } else if (choice !== 'abstain') {
      const target = this.player(choice);
      if (!target || !target.isAlive) return 'That player cannot be nominated';
    }

    this.votes[voterId] = choice;
    if (this.allAliveVoted()) {
      if (this.phase === 'voting') this.resolveVoting(now);
      else this.resolveTrial(now);
    }
    return null;
  }

  accuse(actorId: string, targetId: string): void {
    if (this.phase !== 'day') return;
    const actor = this.player(actorId);
    const target = this.player(targetId);
    if (!actor || !target || !actor.isAlive) return;
    this.pushFeed(`${actor.name} accuses ${target.name}.`, 'chat');
  }

  postChat(authorId: string, text: string): void {
    const author = this.player(authorId);
    const clean = (text || '').trim().slice(0, 280);
    if (!author || !clean) return;
    if (!author.isAlive) return;
    this.pushFeed(clean, 'chat', { author });
  }

  /* ---------------------------------------------------------------- */
  /* Phase machine                                                    */
  /* ---------------------------------------------------------------- */

  tick(now = Date.now()): void {
    if (this.phase === 'lobby' || this.phase === 'game_over') return;

    const expired = this.deadlineAt > 0 && now >= this.deadlineAt;

    switch (this.phase) {
      case 'role_reveal':
        if (expired) this.enterPhase('night', now);
        break;
      case 'night':
        if (expired || this.allNightActorsDone()) this.resolveNight(now);
        break;
      case 'dawn':
        if (expired) this.enterPhase('day', now);
        break;
      case 'day':
        if (expired) this.startVoting(now);
        break;
      case 'voting':
        if (expired || this.allAliveVoted()) this.resolveVoting(now);
        break;
      case 'trial':
        if (expired || this.allAliveVoted()) this.resolveTrial(now);
        break;
      case 'verdict':
        if (expired) this.nextNight(now);
        break;
    }
  }

  /** Host-driven "skip now" for the current timed phase. */
  forceAdvance(now = Date.now()): void {
    if (this.phase === 'lobby' || this.phase === 'game_over') return;
    switch (this.phase) {
      case 'role_reveal':
        this.enterPhase('night', now);
        break;
      case 'night':
        this.resolveNight(now);
        break;
      case 'dawn':
        this.enterPhase('day', now);
        break;
      case 'day':
        this.startVoting(now);
        break;
      case 'voting':
        this.resolveVoting(now);
        break;
      case 'trial':
        this.resolveTrial(now);
        break;
      case 'verdict':
        this.nextNight(now);
        break;
    }
  }

  startVoting(now = Date.now()): void {
    if (this.phase !== 'day') return;
    this.votes = {};
    this.pushFeed('The town calls a vote.', 'system');
    this.enterPhase('voting', now);
  }

  private resolveNight(now: number): void {
    const cast = this.players.map(p => this.asPlayer(p));
    const result = resolveNightActions(cast, this.nightActions);

    this.lastDawnEliminated = result.eliminatedPlayerIds;
    this.lastDawnSaved = result.savedPlayerIds;

    for (const id of result.eliminatedPlayerIds) {
      const player = this.player(id);
      if (!player) continue;
      player.isAlive = false;
      this.revealIfConfigured(id);
      this.pushFeed(`${player.name} was murdered in the night.`, 'system');
    }

    if (result.savedPlayerIds.length > 0) {
      this.pushFeed(`Someone was attacked but the Doctor saved them.`, 'system');
    }
    if (result.eliminatedPlayerIds.length === 0 && result.savedPlayerIds.length === 0) {
      this.pushFeed('The night passed without a single casualty.', 'system');
    }

    // Detective results stay private.
    for (const [detectiveId, action] of Object.entries(this.nightActions)) {
      const actor = this.player(detectiveId);
      if (!actor || actor.role !== 'detective') continue;
      const info = result.investigationResults[action.targetId];
      if (info) {
        this.investigations[detectiveId] = { ...info, day: this.dayNumber };
      }
    }

    this.nightActions = {};
    this.enterPhase('dawn', now);

    const win = checkWinCondition(this.players.map(p => this.asPlayer(p)));
    if (win.isGameOver) this.endGame(win.winner, win.reason);
  }

  private resolveVoting(now: number): void {
    const alive = this.players.filter(p => p.isAlive).map(p => this.asPlayer(p));
    const result = tallyVotes(this.votes, alive, 'nomination');

    if (result.isLynchConfirmed && result.accusedId) {
      this.trialSuspectId = result.accusedId;
      this.votes = {};
      const suspect = this.player(result.accusedId);
      this.pushFeed(`${suspect?.name ?? 'The accused'} was put on trial.`, 'system');
      this.enterPhase('trial', now);
      return;
    }

    const accused = this.trialSuspectId ? this.player(this.trialSuspectId) : null;
    this.trialSuspectId = null;
    this.votes = {};
    this.pushFeed(
      accused
        ? 'The vote was split. Nobody is executed today.'
        : 'The vote failed to reach a majority. Nobody is executed today.',
      'system'
    );
    this.nextNight(now);
  }

  private resolveTrial(now: number): void {
    const alive = this.players.filter(p => p.isAlive).map(p => this.asPlayer(p));
    const result = tallyVotes(this.votes, alive, 'trial');
    const suspectId = this.trialSuspectId;
    const suspect = suspectId ? this.player(suspectId) : null;

    this.votes = {};

    if (result.isLynchConfirmed && suspect) {
      suspect.isAlive = false;
      this.executedId = suspect.id;
      this.revealIfConfigured(suspect.id);
      this.pushFeed(`${suspect.name} was executed by the town.`, 'system');

      const win = checkWinCondition(
        this.players.map(p => this.asPlayer(p)),
        this.asPlayer(suspect)
      );
      if (win.isGameOver) {
        this.endGame(win.winner, win.reason);
        return;
      }

      this.trialVerdict = 'executed';
      this.enterPhase('verdict', now);
      return;
    }

    this.trialVerdict = 'pardoned';
    this.pushFeed(suspect ? `${suspect.name} was pardoned.` : 'The town spared the accused.', 'system');
    this.enterPhase('verdict', now);
  }

  private nextNight(now: number): void {
    this.dayNumber += 1;
    this.nightActions = {};
    this.votes = {};
    this.trialSuspectId = null;
    this.trialVerdict = null;
    this.enterPhase('night', now);
  }

  private enterPhase(phase: LivePhase, now: number): void {
    this.phase = phase;
    const t = this.settings.timings;
    const seconds: Record<LivePhase, number> = {
      lobby: 0,
      role_reveal: t.revealSec,
      night: t.nightSec,
      dawn: t.dawnSec,
      day: t.daySec,
      voting: t.votingSec,
      trial: t.trialSec,
      verdict: t.verdictSec,
      game_over: 0,
    };
    const span = seconds[phase];
    this.deadlineAt = span > 0 ? now + span * 1000 : 0;

    if (phase === 'dawn' && this.dayNumber === 0) this.dayNumber = 1;
    if (phase === 'night' && this.dayNumber === 0) this.dayNumber = 1;
  }

  private endGame(winner: Faction | null, reason: string): void {
    this.winner = winner;
    this.winnerReason = reason;
    for (const p of this.players) this.revealed.add(p.id);
    this.enterPhase('game_over', Date.now());
    this.pushFeed(reason, 'system');
  }

  restart(now = Date.now()): void {
    this.phase = 'lobby';
    this.dayNumber = 0;
    this.deadlineAt = 0;
    this.votes = {};
    this.nightActions = {};
    this.trialSuspectId = null;
    this.trialVerdict = null;
    this.lastDawnEliminated = [];
    this.lastDawnSaved = [];
    this.executedId = null;
    this.winner = null;
    this.winnerReason = '';
    this.revealed.clear();
    this.investigations = {};
    for (const p of this.players) {
      p.isAlive = true;
      p.ready = false;
      p.role = 'villager';
      p.faction = 'town';
    }
    this.pushFeed('Returning to the lobby for a new game.', 'system', { silent: true });
    this.enterPhase('lobby', now);
  }

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */

  player(id: string): EnginePlayer | undefined {
    return this.players.find(p => p.id === id);
  }

  private alivePlayers(): EnginePlayer[] {
    return this.players.filter(p => p.isAlive);
  }

  private allNightActorsDone(): boolean {
    const actors = this.alivePlayers().filter(p => actionTypeForRole(p.role) !== null);
    if (actors.length === 0) return true;

    // The syndicate acts as one: any submitted mafia hit counts for all of them.
    const syndicate = actors.filter(p => p.faction === 'mafia');
    const syndicateDone =
      syndicate.length === 0 ||
      syndicate.some(p => this.nightActions[p.id]?.actionType === 'kill');

    const independent = actors.filter(p => p.faction !== 'mafia');
    return syndicateDone && independent.every(p => Boolean(this.nightActions[p.id]));
  }

  private allAliveVoted(): boolean {
    const alive = this.alivePlayers();
    if (alive.length === 0) return true;
    return alive.every(p => Boolean(this.votes[p.id]));
  }

  private revealIfConfigured(id: string): void {
    if (this.settings.revealRolesOnDeath) this.revealed.add(id);
  }

  private pushFeed(text: string, kind: 'system' | 'chat', opts: { author?: EnginePlayer; silent?: boolean } = {}): void {
    if (opts.silent) return;
    this.feed.push({
      id: uid('f'),
      senderName: kind === 'chat' ? opts.author?.name ?? 'Player' : 'Dealer',
      text,
      isSystem: kind === 'system',
      ts: Date.now(),
    });
    if (this.feed.length > 200) this.feed = this.feed.slice(-200);
  }

  /** Convert an engine player into the UI `Player` shape used by the view components. */
  asPlayer(p: EnginePlayer): Player {
    return {
      id: p.id,
      name: p.name,
      avatar: p.id,
      role: p.role,
      faction: p.faction,
      isAlive: p.isAlive,
      isHost: p.isHost,
      isBot: p.isBot,
      deviceType: 'web',
      ipAddress: 'LAN',
      lastPingMs: 0,
    };
  }

  /**
   * UI-safe projection for a specific viewer.
   * Roles stay hidden unless public; factions are only visible between mafia.
   */
  toUiPlayers(viewerId: string): Player[] {
    const viewer = this.player(viewerId);
    const viewerIsMafia = viewer?.faction === 'mafia';
    return this.players.map(p => {
      const base = this.asPlayer(p);
      const revealRole = this.revealed.has(p.id) || p.id === viewerId;
      const mafiaPeek = viewerIsMafia && p.faction === 'mafia';
      return {
        ...base,
        role: revealRole ? p.role : 'villager',
        faction: p.id === viewerId || mafiaPeek ? p.faction : 'town',
      };
    });
  }

  teammateList(playerId: string): Array<{ id: string; name: string; isAlive: boolean }> {
    const me = this.player(playerId);
    if (!me || me.faction !== 'mafia') return [];
    return this.players
      .filter(p => p.faction === 'mafia' && p.id !== playerId)
      .map(p => ({ id: p.id, name: p.name, isAlive: p.isAlive }));
  }

  publicState(now = Date.now()): PublicState {
    const alive = this.alivePlayers();
    return {
      roomCode: this.roomCode,
      roomName: this.settings.roomName,
      phase: this.phase,
      dayNumber: this.dayNumber,
      deadlineAt: this.deadlineAt,
      now,
      players: this.players.map<PublicPlayer>(p => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isHost: p.isHost,
        isBot: p.isBot,
        connected: p.connected,
        ready: p.ready,
        role: this.revealed.has(p.id) ? p.role : undefined,
        faction: this.revealed.has(p.id) ? p.faction : undefined,
        // Individual nominations stay secret until the tally is resolved.
        voteCount: undefined,
      })),
      hostId: this.hostId,
      trialSuspectId: this.trialSuspectId,
      trialVerdict: this.trialVerdict,
      lastDawnEliminated: this.lastDawnEliminated,
      lastDawnSaved: this.lastDawnSaved,
      feed: this.feed.slice(-80),
      winner: this.winner,
      winnerReason: this.winnerReason,
      votedCount: Object.keys(this.votes).filter(id => this.player(id)?.isAlive).length,
      aliveCount: alive.length,
      // Verdict tallies are public; nominations stay secret until resolved.
      voteTally: this.phase === 'trial' ? this.voteTally() : null,
      settings: this.settings,
    };
  }

  private voteTally(): Record<string, number> {
    const tally: Record<string, number> = {};
    for (const choice of Object.values(this.votes)) {
      tally[choice] = (tally[choice] ?? 0) + 1;
    }
    return tally;
  }

  /** Per-recipient private view. Public because the host layer filters every unit. */
  privateState(playerId: string): PrivateState | null {
    const player = this.player(playerId);
    if (!player) return null;
    const acted = Boolean(this.nightActions[playerId]);
    const voted = Boolean(this.votes[playerId]);
    return {
      playerId,
      role: player.role,
      faction: player.faction,
      isAlive: player.isAlive,
      teammates: this.teammateList(playerId),
      investigation: this.investigations[playerId] ?? null,
      hasActed: acted,
      hasVoted: voted,
    };
  }
}

export type { LiveTimings };
