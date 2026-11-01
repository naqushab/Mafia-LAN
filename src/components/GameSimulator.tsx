/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Users,
  Play,
  RotateCcw,
  Activity,
  QrCode,
  Smartphone,
  Layers,
  Settings,
  Plus,
  Minus,
  Trash2,
  Lock,
  WifiOff,
  AlertCircle,
  CheckCircle,
  Vibrate,
  Sliders,
  Pencil,
  Check,
  X,
  UserPlus,
  Scale,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shuffle,
} from 'lucide-react';
import { DeviceFrame } from './DeviceFrame';
import { RoleCard } from './RoleCard';
import { NightPhaseView } from './NightPhaseView';
import { DawnReportView } from './DawnReportView';
import { DayDiscussionView } from './DayDiscussionView';
import { TrialVotingView } from './TrialVotingView';
import { GameOverView } from './GameOverView';
import { NetworkInspectorModal } from './NetworkInspectorModal';
import { UserSettingsModal } from './UserSettingsModal';
import { RolePortrait } from './RolePortraits';
import {
  GamePhase,
  GameState,
  NetworkPacket,
  NightActionPayload,
  Player,
  RoleId,
} from '../types/mafia';
import {
  assignRoles,
  checkWinCondition,
  resolveNightActions,
  reconcileStateOnReconnect,
  getRecommendedDeck,
  calculateBalanceMetrics,
  randomizeClassicRoles,
  DeckConfiguration,
  ROLE_DEFINITIONS,
  tallyVotes,
} from '../game/rules';
import { sounds } from '../services/soundEffects';
import { saveGameSession, loadGameSession } from '../services/persistence';

const INITIAL_PLAYERS: Player[] = [
  {
    id: 'p1',
    name: 'You (Alex)',
    avatar: 'p1',
    role: 'doctor',
    faction: 'town',
    isAlive: true,
    isHost: true,
    deviceType: 'ios',
    ipAddress: '192.168.1.42',
    lastPingMs: 11,
  },
  {
    id: 'p2',
    name: 'Sophia',
    avatar: 'p2',
    role: 'mafia',
    faction: 'mafia',
    isAlive: true,
    isHost: false,
    isBot: true,
    deviceType: 'android',
    ipAddress: '192.168.1.58',
    lastPingMs: 14,
  },
  {
    id: 'p3',
    name: 'Marcus',
    avatar: 'p3',
    role: 'detective',
    faction: 'town',
    isAlive: true,
    isHost: false,
    isBot: true,
    deviceType: 'ios',
    ipAddress: '192.168.1.63',
    lastPingMs: 18,
  },
  {
    id: 'p4',
    name: 'Elena',
    avatar: 'p4',
    role: 'villager',
    faction: 'town',
    isAlive: true,
    isHost: false,
    isBot: true,
    deviceType: 'android',
    ipAddress: '192.168.1.72',
    lastPingMs: 15,
  },
  {
    id: 'p5',
    name: 'Liam',
    avatar: 'p5',
    role: 'villager',
    faction: 'town',
    isAlive: true,
    isHost: false,
    isBot: true,
    deviceType: 'ios',
    ipAddress: '192.168.1.88',
    lastPingMs: 22,
  },
  {
    id: 'p6',
    name: 'Chloe',
    avatar: 'p6',
    role: 'jester',
    faction: 'neutral',
    isAlive: true,
    isHost: false,
    isBot: true,
    deviceType: 'android',
    ipAddress: '192.168.1.91',
    lastPingMs: 13,
  },
];

export const GameSimulator: React.FC = () => {
  // Device view modes: 'single' (one mobile phone) or 'multi' (dual side-by-side)
  const [viewMode, setViewMode] = useState<'single' | 'multi'>('single');
  const [deviceModel, setDeviceModel] = useState<'ios' | 'android'>('ios');
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Local Wi-Fi Connection & Disconnect Resilience Simulator
  const [isWifiConnected, setIsWifiConnected] = useState<boolean>(true);
  const [offlinePendingQueue, setOfflinePendingQueue] = useState<Array<any>>([]);
  const [reconnectToast, setReconnectToast] = useState<string | null>(null);

  // Main simulated game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const cached = loadGameSession();
    if (cached && cached.players && cached.players.length > 0) {
      return {
        roomCode: cached.roomCode || 'MAFIA-729',
        roomName: cached.roomName || 'Midnight Syndicate',
        phase: (cached.phase as GamePhase) || 'lobby',
        dayNumber: cached.dayNumber || 1,
        timeRemainingSec: 30,
        players: cached.players,
        myPlayerId: cached.myPlayerId || 'p1',
        settings: {
          nightDurationSec: 25,
          dayDiscussionSec: 45,
          trialDurationSec: 20,
          votingDurationSec: 15,
          revealRolesOnDeath: true,
          enableVoiceDiscussionTimer: true,
          roomCode: 'MAFIA-729',
          roomName: 'Midnight Syndicate',
          hostIp: '192.168.1.42',
          port: 8443,
          deckConfig: {
            villagers: 2,
            mafia: 1,
            godfather: false,
            detective: true,
            doctor: true,
            vigilante: false,
            jester: true,
          },
        },
        nightActions: cached.nightActions || {},
        votes: cached.votes || {},
        trialSuspectId: null,
        lastDawnEliminated: [],
        lastDawnSaved: [],
        lastExecutedPlayerId: null,
        investigationCache: {},
        logs: [],
        winner: null,
        winnerReason: '',
        packetHistory: [],
      };
    }

    return {
      roomCode: 'MAFIA-729',
      roomName: 'Midnight Syndicate',
      phase: 'lobby',
      dayNumber: 1,
      timeRemainingSec: 30,
      players: INITIAL_PLAYERS,
      myPlayerId: 'p1',
    settings: {
      nightDurationSec: 25,
      dayDiscussionSec: 45,
      trialDurationSec: 20,
      votingDurationSec: 15,
      revealRolesOnDeath: true,
      enableVoiceDiscussionTimer: true,
      roomCode: 'MAFIA-729',
      roomName: 'Midnight Syndicate',
      hostIp: '192.168.1.42',
      port: 8443,
      deckConfig: {
        villagers: 2,
        mafia: 1,
        godfather: false,
        detective: true,
        doctor: true,
        vigilante: false,
        jester: true,
      },
    },
    nightActions: {},
    votes: {},
    trialSuspectId: null,
    lastDawnEliminated: [],
    lastDawnSaved: [],
    lastExecutedPlayerId: null,
    investigationCache: {},
    logs: [],
    winner: null,
    winnerReason: '',
    packetHistory: [
      {
        packetId: 'pkt_init_1',
        timestamp: Date.now() - 4000,
        sourceIp: '192.168.1.42',
        destinationIp: '224.0.0.251',
        protocol: 'mDNS',
        type: 'DISCOVERY_BEACON',
        encrypted: false,
        payloadSummary: 'mDNS DNS-SD: _mafia-lan._tcp.local. PTR -> Mafia-729 [Slots: 6/10, Port: 8443]',
      },
      {
        packetId: 'pkt_init_2',
        timestamp: Date.now() - 2800,
        sourceIp: '192.168.1.58',
        destinationIp: '192.168.1.42',
        protocol: 'WSS',
        type: 'JOIN_REQUEST',
        encrypted: true,
        payloadSummary: 'Client Sophia (Pixel 9 Pro) TLS 1.3 Handshake + Ephemeral X25519 PubKey exchanged',
      },
      {
        packetId: 'pkt_init_3',
        timestamp: Date.now() - 1200,
        sourceIp: '192.168.1.42',
        destinationIp: '192.168.1.58',
        protocol: 'WSS',
        type: 'STATE_SYNC',
        encrypted: true,
        payloadSummary: 'Room lobby state delta synced (seq: 1, players: 6)',
      },
    ],
    };
  });

  // Simulated peer player state for multi-device view
  const [peerPlayerId, setPeerPlayerId] = useState<string>('p2');

  // Dynamic Role Deck & Player Customization
  const [deckConfig, setDeckConfig] = useState<DeckConfiguration>(() =>
    getRecommendedDeck(INITIAL_PLAYERS.length)
  );
  const [isAutoBalance, setIsAutoBalance] = useState<boolean>(true);
  const [isDeckDrawerOpen, setIsDeckDrawerOpen] = useState<boolean>(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerDevice, setNewPlayerDevice] = useState<'ios' | 'android' | 'web'>('android');

  const BOT_NAME_POOL = [
    'Vincent',
    'Cassidy',
    'Sterling',
    'Valeria',
    'Dante',
    'Nadia',
    'Silas',
    'Rowan',
    'Leon',
    'Julian',
    'Greta',
    'Milo',
    'Kiran',
    'Orion',
    'Beatrix',
    'Felix',
    'Arthur',
    'Selena',
    'Vesper',
    'Gideon',
  ];

  // Add member (bot or custom peer)
  const handleAddPlayer = (customName?: string, deviceType: 'ios' | 'android' | 'web' = 'android') => {
    if (gameState.players.length >= 16) return;

    let candidateName = customName?.trim();
    if (!candidateName) {
      const existingNames = new Set(gameState.players.map(p => p.name.toLowerCase()));
      const available = BOT_NAME_POOL.filter(n => !existingNames.has(n.toLowerCase()));
      candidateName = available.length > 0 ? available[0] : `Operative ${gameState.players.length + 1}`;
    }

    const newId = `p${Date.now().toString(36)}`;
    const newIp = `192.168.1.${50 + gameState.players.length * 3}`;
    const newPlayer: Player = {
      id: newId,
      name: candidateName,
      avatar: newId,
      role: 'villager',
      faction: 'town',
      isAlive: true,
      isHost: false,
      isBot: true,
      deviceType,
      ipAddress: newIp,
      lastPingMs: Math.floor(Math.random() * 12) + 10,
    };

    const nextPlayers = [...gameState.players, newPlayer];

    emitPacket(
      'JOIN_REQUEST',
      'WSS',
      `Peer ${newPlayer.name} (${deviceType.toUpperCase()}) joined local session over mDNS [${newIp}]`
    );

    if (isAutoBalance) {
      setDeckConfig(getRecommendedDeck(nextPlayers.length));
    }

    setGameState(prev => ({
      ...prev,
      players: nextPlayers,
    }));

    setNewPlayerName('');
    setIsAddModalOpen(false);
  };

  // Remove / Kick member (preserves min 4 players, cannot kick host)
  const handleRemovePlayer = (playerId: string) => {
    if (gameState.players.length <= 4) return;
    const target = gameState.players.find(p => p.id === playerId);
    if (!target || target.isHost) return;

    const nextPlayers = gameState.players.filter(p => p.id !== playerId);

    emitPacket(
      'DISCOVERY_BEACON',
      'mDNS',
      `Peer ${target.name} left local session. Slots updated: ${nextPlayers.length}/16`
    );

    if (peerPlayerId === playerId) {
      const fallbackPeer = nextPlayers.find(p => !p.isHost) || nextPlayers[0];
      setPeerPlayerId(fallbackPeer.id);
    }

    if (isAutoBalance) {
      setDeckConfig(getRecommendedDeck(nextPlayers.length));
    }

    setGameState(prev => ({
      ...prev,
      players: nextPlayers,
    }));
  };

  // Edit player name
  const handleSavePlayerName = (playerId: string) => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setEditingPlayerId(null);
      return;
    }

    const prevPlayer = gameState.players.find(p => p.id === playerId);
    if (prevPlayer && prevPlayer.name !== trimmed) {
      emitPacket(
        'STATE_SYNC',
        'WSS',
        `Peer renamed: "${prevPlayer.name}" -> "${trimmed}" (ID: ${playerId})`
      );

      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, name: trimmed } : p
        ),
      }));
    }

    setEditingPlayerId(null);
    setEditingNameValue('');
  };

  // Set preset player count (4, 6, 8, 10, 12, 16)
  const handleSetPlayerCountPreset = (targetCount: number) => {
    const count = Math.max(4, Math.min(16, targetCount));
    let nextPlayers = [...gameState.players];

    if (nextPlayers.length < count) {
      const needed = count - nextPlayers.length;
      const existingNames = new Set(nextPlayers.map(p => p.name.toLowerCase()));
      const available = BOT_NAME_POOL.filter(n => !existingNames.has(n.toLowerCase()));

      for (let i = 0; i < needed; i++) {
        const name = available[i] || `Operative ${nextPlayers.length + 1}`;
        const newId = `p${Date.now().toString(36)}_${i}`;
        const devType: 'ios' | 'android' = i % 2 === 0 ? 'android' : 'ios';
        nextPlayers.push({
          id: newId,
          name,
          avatar: newId,
          role: 'villager',
          faction: 'town',
          isAlive: true,
          isHost: false,
          isBot: true,
          deviceType: devType,
          ipAddress: `192.168.1.${60 + nextPlayers.length * 2}`,
          lastPingMs: 14 + (i % 6),
        });
      }
    } else if (nextPlayers.length > count) {
      // Keep host and remove non-hosts from the tail
      const host = nextPlayers.find(p => p.isHost) || nextPlayers[0];
      const nonHosts = nextPlayers.filter(p => p.id !== host.id);
      nextPlayers = [host, ...nonHosts.slice(0, count - 1)];
      if (!nextPlayers.some(p => p.id === peerPlayerId)) {
        setPeerPlayerId(nextPlayers[1]?.id || nextPlayers[0].id);
      }
    }

    const newDeck = getRecommendedDeck(nextPlayers.length);
    setDeckConfig(newDeck);
    setIsAutoBalance(true);

    emitPacket(
      'STATE_SYNC',
      'WSS',
      `Session reconfigured to ${count} players. Mathematical role balance applied.`
    );

    setGameState(prev => ({
      ...prev,
      players: nextPlayers,
    }));
  };

  // Toggle role in custom deck
  const handleToggleDeckRole = (key: keyof DeckConfiguration, value: any) => {
    setIsAutoBalance(false);
    setDeckConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Automatically randomize Mafia, Doctor, and Citizen roles across active players and update status cards
  const handleRandomizeRoles = () => {
    const updatedPlayers = randomizeClassicRoles(gameState.players);
    const activeList = updatedPlayers.filter(p => p.isAlive);
    const mafiaCount = activeList.filter(p => p.role === 'mafia').length;
    const doctorCount = activeList.filter(p => p.role === 'doctor').length;
    const citizenCount = activeList.filter(p => p.role === 'villager').length;

    // Update active deck configuration to reflect classic trio
    setDeckConfig({
      mafiaCount,
      hasGodfather: false,
      hasDetective: false,
      hasDoctor: true,
      hasVigilante: false,
      hasJester: false,
    });
    setIsAutoBalance(false);

    // Provide haptic feedback and chimes
    sounds.playRoleChosenHaptic();
    sounds.playDawnChime();

    emitPacket(
      'ROLE_HANDSHAKE_ENCRYPTED',
      'WSS',
      `🎲 Roles Randomized: ${mafiaCount} Mafia, ${doctorCount} Doctor, ${citizenCount} Citizens assigned across ${activeList.length} active players.`
    );

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
    }));

    setReconnectToast(`🎲 Roles Randomized! ${mafiaCount} Mafia • ${doctorCount} Doctor • ${citizenCount} Citizens`);
    setTimeout(() => setReconnectToast(null), 3500);
  };

  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; senderName: string; text: string; isSystem?: boolean }>
  >([
    {
      id: 'm1',
      senderName: 'System',
      text: 'Local WebSocket session established on 192.168.1.42:8443 via mDNS _mafia-lan._tcp',
      isSystem: true,
    },
  ]);

  // Helper to log network packets
  const emitPacket = (
    type: NetworkPacket['type'],
    protocol: NetworkPacket['protocol'],
    summary: string,
    encrypted = true
  ) => {
    const packet: NetworkPacket = {
      packetId: `pkt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      sourceIp: '192.168.1.42',
      destinationIp: '192.168.1.255',
      protocol,
      type,
      encrypted,
      payloadSummary: summary,
    };

    setGameState(prev => ({
      ...prev,
      packetHistory: [packet, ...prev.packetHistory.slice(0, 49)],
    }));
  };

  // Auto persist on state changes
  useEffect(() => {
    saveGameSession(gameState, offlinePendingQueue);
  }, [gameState, offlinePendingQueue]);

  const handleToggleWifi = () => {
    if (isWifiConnected) {
      // Simulate Wi-Fi drop
      setIsWifiConnected(false);
      emitPacket(
        'HEARTBEAT',
        'WSS',
        '⚠️ Wi-Fi Link Lost: Heartbeat timeout on client (192.168.1.42:8443). Entering 45s grace window.',
        false
      );
      sounds.playTick();
    } else {
      // Restore Wi-Fi & Reconcile
      setIsWifiConnected(true);
      sounds.playDawnChime();
      emitPacket(
        'STATE_SYNC',
        'WSS',
        `RECONNECT_SYNC: Client Alex restored LAN link. Replaying ${offlinePendingQueue.length} buffered actions.`
      );

      // Reconcile state
      const recon = reconcileStateOnReconnect(
        gameState.players,
        {
          playerId: gameState.myPlayerId,
          roomCode: gameState.roomCode,
          lastKnownSeq: gameState.packetHistory.length,
          queuedActions: offlinePendingQueue,
        },
        gameState.phase,
        gameState.dayNumber,
        gameState.timeRemainingSec
      );

      setOfflinePendingQueue([]);
      setReconnectToast(recon.message);
      setTimeout(() => setReconnectToast(null), 4000);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (gameState.phase === 'lobby' || gameState.phase === 'game_over') return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemainingSec <= 1) {
          // Auto advance phase when timer hits zero
          return handlePhaseTimeout(prev);
        }
        return { ...prev, timeRemainingSec: prev.timeRemainingSec - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase, gameState.timeRemainingSec]);

  // Handle phase timeouts
  const handlePhaseTimeout = (state: GameState): GameState => {
    if (state.phase === 'night') {
      return executeNightResolution(state);
    }
    if (state.phase === 'day_discussion') {
      // Pick random suspect for trial if none nominated
      const aliveOthers = state.players.filter(p => p.isAlive && p.id !== state.myPlayerId);
      const suspect = aliveOthers[0];
      return {
        ...state,
        phase: 'trial',
        trialSuspectId: suspect ? suspect.id : null,
        timeRemainingSec: state.settings.trialDurationSec,
        votes: {},
      };
    }
    if (state.phase === 'voting' || state.phase === 'trial') {
      return executeTrialVerdict(state);
    }
    return state;
  };

  // Start game from lobby
  const handleStartGame = () => {
    sounds.playDawnChime();
    sounds.playRoleChosenHaptic();
    emitPacket('ROLE_HANDSHAKE_ENCRYPTED', 'WSS', `Sealed ZkRS role envelopes dispatched to ${gameState.players.length} connected peers`);

    // Assign roles using game engine with active deck configuration
    const assignedPlayers = assignRoles(gameState.players, deckConfig);

    setGameState(prev => ({
      ...prev,
      phase: 'role_reveal',
      players: assignedPlayers,
      timeRemainingSec: 15,
      nightActions: {},
      votes: {},
    }));
  };

  // Acknowledge role and enter night
  const handleAcknowledgeRole = () => {
    sounds.playNightEnter();
    emitPacket('PHASE_CHANGE', 'WSS', 'BROADCAST: Phase transition -> NIGHT_1. Timers synchronized.');

    setGameState(prev => ({
      ...prev,
      phase: 'night',
      timeRemainingSec: prev.settings.nightDurationSec,
    }));
  };

  // Submit night action
  const handleSubmitNightAction = (
    targetId: string,
    actionType: 'kill' | 'heal' | 'investigate' | 'shoot'
  ) => {
    emitPacket('NIGHT_ACTION', 'WSS', `Player action commit: [${actionType}] -> target:${targetId}`);

    setGameState(prev => {
      const actions = {
        ...prev.nightActions,
        [prev.myPlayerId]: {
          actorId: prev.myPlayerId,
          targetId,
          actionType,
        },
      };

      // Also simulate AI bots night actions
      prev.players.forEach(p => {
        if (p.isBot && p.isAlive) {
          const targets = prev.players.filter(t => t.isAlive && t.id !== p.id);
          const randomTarget = targets[Math.floor(Math.random() * targets.length)];
          if (p.role === 'mafia') {
            actions[p.id] = { actorId: p.id, targetId: randomTarget.id, actionType: 'kill' };
          } else if (p.role === 'doctor') {
            actions[p.id] = { actorId: p.id, targetId: randomTarget.id, actionType: 'heal' };
          } else if (p.role === 'detective') {
            actions[p.id] = { actorId: p.id, targetId: randomTarget.id, actionType: 'investigate' };
          }
        }
      });

      return {
        ...prev,
        nightActions: actions,
      };
    });
  };

  // Execute night resolution
  const executeNightResolution = (state: GameState): GameState => {
    sounds.playDawnChime();
    const resolution = resolveNightActions(state.players, state.nightActions);

    const updatedPlayers = state.players.map(p => {
      if (resolution.eliminatedPlayerIds.includes(p.id)) {
        return { ...p, isAlive: false };
      }
      return p;
    });

    emitPacket('PHASE_CHANGE', 'WSS', `BROADCAST: DAWN_${state.dayNumber} - Casualties: ${resolution.eliminatedPlayerIds.length}`);

    // Check win conditions
    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isGameOver) {
      sounds.playVictoryFanfare(winCheck.winner === 'mafia');
      return {
        ...state,
        phase: 'game_over',
        players: updatedPlayers,
        winner: winCheck.winner,
        winnerReason: winCheck.reason,
      };
    }

    return {
      ...state,
      phase: 'dawn',
      players: updatedPlayers,
      lastDawnEliminated: resolution.eliminatedPlayerIds,
      lastDawnSaved: resolution.savedPlayerIds,
      nightActions: {},
      timeRemainingSec: 20,
    };
  };

  // Proceed from Dawn to Day Discussion
  const handleProceedToDay = () => {
    sounds.playDawnChime();
    emitPacket('PHASE_CHANGE', 'WSS', `BROADCAST: DAY_${gameState.dayNumber}_DISCUSSION open.`);

    setGameState(prev => ({
      ...prev,
      phase: 'day_discussion',
      timeRemainingSec: prev.settings.dayDiscussionSec,
    }));
  };

  // Accuse suspect
  const handleAccusePlayer = (targetId: string) => {
    const target = gameState.players.find(p => p.id === targetId);
    if (!target) return;

    emitPacket('VOTE_SUBMIT', 'WSS', `Nomination registered: ${target.name} for trial`);

    setChatMessages(prev => [
      ...prev,
      {
        id: `chat_${Date.now()}`,
        senderName: 'Alex',
        text: `I suspect ${target.name}! Look at how silent they were during night one!`,
      },
    ]);
  };

  // Call town to trial
  const handleCallVote = () => {
    sounds.playGavelStrike();
    const aliveOthers = gameState.players.filter(p => p.isAlive && p.id !== gameState.myPlayerId);
    const suspect = aliveOthers[0] || gameState.players[1];

    emitPacket('PHASE_CHANGE', 'WSS', `BROADCAST: TRIAL initiated for suspect ${suspect.name}`);

    setGameState(prev => ({
      ...prev,
      phase: 'trial',
      trialSuspectId: suspect.id,
      timeRemainingSec: prev.settings.trialDurationSec,
      votes: {},
    }));
  };

  // Cast vote on trial
  const handleCastVote = (choice: 'guilty' | 'innocent' | 'abstain') => {
    emitPacket('VOTE_SUBMIT', 'WSS', `Trial ballot cast: ${choice.toUpperCase()}`);

    setGameState(prev => {
      const votes: Record<string, string> = {
        ...prev.votes,
        [prev.myPlayerId]: choice,
      };

      // Simulate bot votes
      prev.players.forEach(p => {
        if (p.isBot && p.isAlive && p.id !== prev.trialSuspectId) {
          const choices: Array<'guilty' | 'innocent' | 'abstain'> = ['guilty', 'guilty', 'innocent'];
          votes[p.id] = choices[Math.floor(Math.random() * choices.length)];
        }
      });

      return {
        ...prev,
        votes,
      };
    });
  };

  // Execute trial verdict
  const executeTrialVerdict = (state: GameState): GameState => {
    sounds.playGavelStrike();
    const suspect = state.players.find(p => p.id === state.trialSuspectId);
    const alivePlayers = state.players.filter(p => p.isAlive);
    const votingResult = tallyVotes(state.votes, alivePlayers, 'trial');

    let updatedPlayers = state.players;
    let lastExecuted: Player | null = null;

    if (votingResult.isLynchConfirmed && suspect) {
      lastExecuted = suspect;
      updatedPlayers = state.players.map(p =>
        p.id === suspect.id ? { ...p, isAlive: false } : p
      );
      emitPacket('PHASE_CHANGE', 'WSS', `VERDICT: ${suspect.name} executed by majority vote.`);
    } else {
      emitPacket('PHASE_CHANGE', 'WSS', `VERDICT: ${suspect?.name || 'Suspect'} pardoned.`);
    }

    // Check win condition
    const winCheck = checkWinCondition(updatedPlayers, lastExecuted);
    if (winCheck.isGameOver) {
      sounds.playVictoryFanfare(winCheck.winner === 'mafia');
      return {
        ...state,
        phase: 'game_over',
        players: updatedPlayers,
        winner: winCheck.winner,
        winnerReason: winCheck.reason,
      };
    }

    return {
      ...state,
      phase: 'verdict',
      players: updatedPlayers,
      lastExecutedPlayerId: lastExecuted ? lastExecuted.id : null,
      timeRemainingSec: 5,
    };
  };

  // Proceed after verdict back to nightfall
  const handleProceedAfterVerdict = () => {
    sounds.playNightEnter();
    emitPacket('PHASE_CHANGE', 'WSS', `BROADCAST: Nightfall descends for Night ${gameState.dayNumber + 1}`);

    setGameState(prev => ({
      ...prev,
      phase: 'night',
      dayNumber: prev.dayNumber + 1,
      timeRemainingSec: prev.settings.nightDurationSec,
      nightActions: {},
      votes: {},
      trialSuspectId: null,
    }));
  };

  // Restart match (preserves customized players and edited names)
  const handleRestartGame = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'lobby',
      dayNumber: 1,
      timeRemainingSec: 30,
      players: prev.players.map(p => ({ ...p, isAlive: true })),
      nightActions: {},
      votes: {},
      trialSuspectId: null,
      lastDawnEliminated: [],
      lastDawnSaved: [],
      winner: null,
      winnerReason: '',
    }));
  };

  const myPlayer = gameState.players.find(p => p.id === gameState.myPlayerId) || gameState.players[0];
  const peerPlayer = gameState.players.find(p => p.id === peerPlayerId) || gameState.players[1];
  const suspectPlayer = gameState.players.find(p => p.id === gameState.trialSuspectId) || gameState.players[1];

  // Render individual screen inside a device frame
  const renderScreenContent = (player: Player) => {
    let screen = null;
    switch (gameState.phase) {
      case 'lobby': {
        const metrics = calculateBalanceMetrics(gameState.players.length, deckConfig);
        const maxSafeMafia = Math.max(1, Math.floor((gameState.players.length - 1) / 2));

        screen = (
          <div className="flex flex-col h-full p-3.5 sm:p-4 justify-between bg-gradient-to-b from-[#090b14] via-[#06070a] to-black overflow-y-auto custom-scrollbar">
            {/* Lobby Header */}
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-950/70 border border-rose-800/50 text-rose-500">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white font-cinzel">
                      {gameState.roomName}
                    </h2>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      _mafia-lan._tcp • {gameState.settings.hostIp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-xs text-rose-400 font-bold">
                  {gameState.roomCode}
                </div>
              </div>

              {/* QR Code / Local Wi-Fi Quick Banner */}
              <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <div className="p-1.5 rounded-lg bg-slate-800 text-rose-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block text-white text-xs">
                      Instant LAN Pairing
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Subnet: 192.168.1.0/24
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  mDNS ACTIVE
                </span>
              </div>

              {/* Roster Controls & Player Count Presets */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-rose-400" />
                    <span>Peers ({gameState.players.length}/16)</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleRandomizeRoles}
                      className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 transition-all shadow-sm active:scale-95"
                      title="Randomly assign Mafia, Doctor, and Citizen roles to active players"
                    >
                      <Shuffle className="w-3 h-3 text-purple-400" />
                      <span>Randomize</span>
                    </button>

                    <button
                      onClick={() => setIsDeckDrawerOpen(!isDeckDrawerOpen)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors ${
                        isDeckDrawerOpen
                          ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title="Inspect and customize role deck and mathematical balance"
                    >
                      <Scale className="w-3 h-3 text-rose-400" />
                      <span>Roles</span>
                      {isDeckDrawerOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsAddModalOpen(!isAddModalOpen)}
                      disabled={gameState.players.length >= 16}
                      className="px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 disabled:opacity-40 transition-colors"
                      title="Add a new member or simulated bot"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Quick Player Count Presets */}
                <div className="flex items-center gap-1 mb-2 px-0.5 overflow-x-auto py-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase mr-0.5">Scale:</span>
                  {[4, 6, 8, 10, 12, 16].map(count => (
                    <button
                      key={count}
                      onClick={() => handleSetPlayerCountPreset(count)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        gameState.players.length === count
                          ? 'bg-rose-600 text-white font-bold shadow'
                          : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                      title={`Configure exactly ${count} players with balanced roles`}
                    >
                      {count}P
                    </button>
                  ))}
                </div>

                {/* Role Deck & Balance Drawer */}
                {isDeckDrawerOpen && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-2 text-xs animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          metrics.status === 'optimal'
                            ? 'bg-emerald-400'
                            : metrics.status === 'mafia_favored'
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                        }`}></span>
                        <span className="font-semibold text-[11px] text-white">
                          {metrics.status === 'optimal' ? 'Optimal Balance' : metrics.status === 'mafia_favored' ? 'Mafia Favored' : 'Town Favored'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setDeckConfig(getRecommendedDeck(gameState.players.length));
                          setIsAutoBalance(true);
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 border transition-colors ${
                          isAutoBalance
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                        }`}
                        title="Auto-balance role counts according to classic social deduction balance theory"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Auto-Balanced</span>
                      </button>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400 leading-tight">
                      {metrics.summary}
                    </p>

                    {/* Role Toggles Grid */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      {/* Mafia Count Stepper */}
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span className="text-rose-400 font-medium">Mafia</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleDeckRole('mafiaCount', Math.max(1, deckConfig.mafiaCount - 1))}
                            disabled={deckConfig.mafiaCount <= 1}
                            className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono font-bold text-white px-1">
                            {deckConfig.mafiaCount}
                          </span>
                          <button
                            onClick={() => handleToggleDeckRole('mafiaCount', Math.min(maxSafeMafia, deckConfig.mafiaCount + 1))}
                            disabled={deckConfig.mafiaCount >= maxSafeMafia}
                            className="p-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Detective Toggle */}
                      <button
                        onClick={() => handleToggleDeckRole('hasDetective', !deckConfig.hasDetective)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          deckConfig.hasDetective
                            ? 'bg-sky-950/60 border-sky-700/60 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Detective</span>
                        <span className="text-[9px] font-mono">{deckConfig.hasDetective ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Doctor Toggle */}
                      <button
                        onClick={() => handleToggleDeckRole('hasDoctor', !deckConfig.hasDoctor)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          deckConfig.hasDoctor
                            ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Doctor</span>
                        <span className="text-[9px] font-mono">{deckConfig.hasDoctor ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Godfather Toggle */}
                      <button
                        onClick={() => handleToggleDeckRole('hasGodfather', !deckConfig.hasGodfather)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          deckConfig.hasGodfather
                            ? 'bg-red-950/60 border-red-700/60 text-red-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Godfather</span>
                        <span className="text-[9px] font-mono">{deckConfig.hasGodfather ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Vigilante Toggle */}
                      <button
                        onClick={() => handleToggleDeckRole('hasVigilante', !deckConfig.hasVigilante)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          deckConfig.hasVigilante
                            ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Vigilante</span>
                        <span className="text-[9px] font-mono">{deckConfig.hasVigilante ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Jester Toggle */}
                      <button
                        onClick={() => handleToggleDeckRole('hasJester', !deckConfig.hasJester)}
                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          deckConfig.hasJester
                            ? 'bg-purple-950/60 border-purple-700/60 text-purple-300'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Jester</span>
                        <span className="text-[9px] font-mono">{deckConfig.hasJester ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Member Quick Card */}
                {isAddModalOpen && (
                  <div className="mb-2.5 p-2.5 rounded-xl bg-slate-950 border border-emerald-800/70 space-y-2 text-xs animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add New Operative</span>
                      </span>
                      <button
                        onClick={() => setIsAddModalOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Name (or leave blank for bot)..."
                        value={newPlayerName}
                        onChange={e => setNewPlayerName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddPlayer(newPlayerName, newPlayerDevice);
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />

                      <select
                        value={newPlayerDevice}
                        onChange={e => setNewPlayerDevice(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-300"
                      >
                        <option value="android">Android</option>
                        <option value="ios">iOS</option>
                        <option value="web">Web</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <button
                        onClick={() => handleAddPlayer(undefined, newPlayerDevice)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        + Random Bot
                      </button>
                      <button
                        onClick={() => handleAddPlayer(newPlayerName, newPlayerDevice)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                      >
                        Add to Room
                      </button>
                    </div>
                  </div>
                )}

                {/* Connected Players Roster with Inline Name Editing & Kick Actions */}
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {gameState.players.map(p => {
                    const isEditing = editingPlayerId === p.id;

                    return (
                      <div
                        key={p.id}
                        className="p-2 rounded-xl bg-slate-900/70 border border-slate-800/90 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <RolePortrait roleId={p.role} size="sm" />
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 py-0.5">
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={e => setEditingNameValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSavePlayerName(p.id);
                                    if (e.key === 'Escape') setEditingPlayerId(null);
                                  }}
                                  className="w-full bg-slate-950 border border-rose-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSavePlayerName(p.id)}
                                  className="p-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white shrink-0"
                                  title="Save name"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingPlayerId(null)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-white truncate block">
                                  {p.name} {p.id === player.id && '(You)'}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingPlayerId(p.id);
                                    setEditingNameValue(p.name);
                                  }}
                                  className="p-0.5 rounded text-slate-500 hover:text-slate-200 transition-colors"
                                  title="Edit player name"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}

                            <span className="text-[10px] text-slate-500 font-mono block">
                              {p.deviceType.toUpperCase()} • {p.ipAddress} • {p.lastPingMs}ms
                            </span>
                          </div>
                        </div>

                        {/* Badges: Role Status Card Badge + Host + Kick button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Role Status Badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tracking-wide uppercase border transition-all ${
                              p.role === 'mafia'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-xs'
                                : p.role === 'doctor'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-xs'
                                : p.role === 'villager'
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                : ROLE_DEFINITIONS[p.role]?.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {p.role === 'villager' ? 'Citizen' : ROLE_DEFINITIONS[p.role]?.name || p.role}
                          </span>

                          {p.isHost && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              HOST
                            </span>
                          )}

                          {!p.isHost && gameState.players.length > 4 && (
                            <button
                              onClick={() => handleRemovePlayer(p.id)}
                              className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                              title={`Remove ${p.name} from session`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Section with Live Balance and Start Button */}
            <div className="pt-2">
              <div className="mb-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-400 text-center truncate">
                ⚖️ {deckConfig.mafiaCount} Mafia • {gameState.players.length - deckConfig.mafiaCount - (deckConfig.hasJester && gameState.players.length >= 6 ? 1 : 0)} Town {deckConfig.hasJester && gameState.players.length >= 6 && '• 1 Jester'} • Conviction needs {metrics.majorityVotesNeeded} votes
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Launch Mafia Session ({gameState.players.length} Players)</span>
              </button>
            </div>
          </div>
        );
        break;
      }

      case 'role_reveal':
        screen = (
          <RoleCard
            roleId={player.role}
            playerName={player.name}
            onAcknowledged={handleAcknowledgeRole}
          />
        );
        break;

      case 'night':
        screen = (
          <NightPhaseView
            myPlayer={player}
            players={gameState.players}
            timeRemainingSec={gameState.timeRemainingSec}
            onSubmitAction={handleSubmitNightAction}
          />
        );
        break;

      case 'dawn':
        screen = (
          <DawnReportView
            dayNumber={gameState.dayNumber}
            eliminatedPlayerIds={gameState.lastDawnEliminated}
            savedPlayerIds={gameState.lastDawnSaved}
            players={gameState.players}
            onProceedToDay={handleProceedToDay}
          />
        );
        break;

      case 'day_discussion':
        screen = (
          <DayDiscussionView
            dayNumber={gameState.dayNumber}
            timeRemainingSec={gameState.timeRemainingSec}
            myPlayer={player}
            players={gameState.players}
            onAccusePlayer={handleAccusePlayer}
            onSendChatMessage={text => {
              setChatMessages(prev => [
                ...prev,
                { id: `chat_${Date.now()}`, senderName: player.name, text },
              ]);
            }}
            chatMessages={chatMessages}
            onCallVote={handleCallVote}
            isHost={player.isHost}
          />
        );
        break;

      case 'trial':
      case 'voting':
      case 'verdict':
        screen = (
          <TrialVotingView
            suspect={suspectPlayer}
            timeRemainingSec={gameState.timeRemainingSec}
            myPlayer={player}
            alivePlayers={gameState.players.filter(p => p.isAlive)}
            onCastVote={handleCastVote}
            votes={gameState.votes}
            isVerdictConfirmed={gameState.phase === 'verdict'}
            verdictResult={gameState.lastExecutedPlayerId ? 'executed' : 'pardoned'}
            onProceedAfterVerdict={handleProceedAfterVerdict}
          />
        );
        break;

      case 'game_over':
        screen = (
          <GameOverView
            winner={gameState.winner}
            winnerReason={gameState.winnerReason}
            players={gameState.players}
            onRestartGame={handleRestartGame}
          />
        );
        break;

      default:
        screen = null;
    }

    return (
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Offline Disconnect Alert Banner */}
        {!isWifiConnected && (
          <div className="bg-amber-950/95 border-b border-amber-600/70 px-3 py-1.5 text-[10px] font-mono text-amber-200 flex items-center justify-between z-30 shrink-0 shadow-lg">
            <span className="flex items-center gap-1.5 truncate">
              <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
              <span className="truncate">Offline • LAN link lost. Actions buffered.</span>
            </span>
            <button
              onClick={handleToggleWifi}
              className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-700 text-white font-bold shrink-0 ml-2 shadow"
            >
              Reconnect
            </button>
          </div>
        )}

        {/* Reconnect Success Banner */}
        {reconnectToast && (
          <div className="bg-emerald-950/95 border-b border-emerald-600/70 px-3 py-1.5 text-[10px] font-mono text-emerald-200 flex items-center gap-1.5 z-30 shrink-0 shadow-lg animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{reconnectToast}</span>
          </div>
        )}

        {/* Primary Screen Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {screen}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Simulator Control Bar */}
      <div className="w-full max-w-4xl px-4 py-3 mb-6 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isWifiConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="font-mono text-slate-300 font-medium">
              {isWifiConnected ? 'LAN Active' : 'LAN Offline'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-rose-400">{gameState.roomCode}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                viewMode === 'single'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Phone
            </button>
            <button
              onClick={() => setViewMode('multi')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'multi'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multi-Device LAN (Dual)</span>
            </button>
          </div>

          {/* Wi-Fi Disconnect Simulation Toggle */}
          <button
            onClick={handleToggleWifi}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-[11px] transition-all shadow-sm ${
              isWifiConnected
                ? 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-700/80 hover:text-white'
                : 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-600 text-amber-300 animate-pulse font-bold'
            }`}
            title="Simulate Wi-Fi disconnection to test offline buffering and state recovery"
          >
            {isWifiConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulate Wi-Fi Drop</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Restore Wi-Fi</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Quick Jump Indicator */}
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
            Phase: <strong className="text-white">{gameState.phase.replace('_', ' ')}</strong>
          </span>

          {/* Randomize Roles Button */}
          <button
            onClick={handleRandomizeRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-700/60 text-purple-200 hover:text-white transition-all font-mono text-xs shadow-sm active:scale-95"
            title="Automatically assign Mafia, Doctor, and Citizen roles to active players"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
            <span>Randomize Roles</span>
          </button>

          {/* Haptics & User Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 hover:text-white transition-colors font-mono text-xs"
            title="Configure haptic vibrations, frame rumble, and game audio"
          >
            <Vibrate className="w-3.5 h-3.5 text-rose-400" />
            <span>Haptics & Settings</span>
          </button>

          {/* Network Inspector Trigger */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-300 transition-colors font-mono text-xs"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>LAN Inspector ({gameState.packetHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Device Viewports */}
      <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12 w-full pb-8">
        {/* Device 1: Host Device (iPhone 16 Pro / Pixel 9 Pro) */}
        <DeviceFrame
          deviceType={deviceModel}
          onToggleDevice={() =>
            setDeviceModel(deviceModel === 'ios' ? 'android' : 'ios')
          }
          isHostDevice={myPlayer.isHost}
          ipAddress={myPlayer.ipAddress}
          pingMs={myPlayer.lastPingMs}
          onOpenSettings={() => setIsSettingsOpen(true)}
        >
          {renderScreenContent(myPlayer)}
        </DeviceFrame>

        {/* Device 2: Peer Device (Visible in Multi-Device Mode) */}
        {viewMode === 'multi' && (
          <div className="relative">
            {/* Peer Device Label & Selector */}
            <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></span>
                <span className="truncate">
                  Client 2: <strong className="text-white">{peerPlayer.name}</strong>
                </span>
              </div>

              {gameState.players.length > 2 && (
                <select
                  value={peerPlayer.id}
                  onChange={e => setPeerPlayerId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-indigo-300 text-[10px] rounded px-1.5 py-0.5 font-mono cursor-pointer hover:border-indigo-500 max-w-[140px] truncate"
                  title="Switch simulated peer device screen"
                >
                  {gameState.players
                    .filter(p => p.id !== gameState.myPlayerId)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.deviceType.toUpperCase()})
                      </option>
                    ))}
                </select>
              )}
            </div>

            <DeviceFrame
              deviceType={peerPlayer.deviceType === 'ios' ? 'ios' : 'android'}
              onToggleDevice={() => {
                const nextType = peerPlayer.deviceType === 'ios' ? 'android' : 'ios';
                setGameState(prev => ({
                  ...prev,
                  players: prev.players.map(p =>
                    p.id === peerPlayer.id ? { ...p, deviceType: nextType } : p
                  ),
                }));
              }}
              isHostDevice={false}
              ipAddress={peerPlayer.ipAddress}
              pingMs={peerPlayer.lastPingMs}
              onOpenSettings={() => setIsSettingsOpen(true)}
            >
              {renderScreenContent(peerPlayer)}
            </DeviceFrame>
          </div>
        )}
      </div>

      {/* Network Inspector Modal */}
      <NetworkInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        packets={gameState.packetHistory}
        roomCode={gameState.roomCode}
        hostIp={gameState.settings.hostIp}
      />

      {/* User Settings & Haptics Feedback Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
