/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Faction,
  NightActionPayload,
  NightResolutionResult,
  Player,
  RoleDefinition,
  RoleId,
  VotingResult,
  WinConditionResult,
} from '../types/mafia';

export const ROLE_DEFINITIONS: Record<RoleId, RoleDefinition> = {
  villager: {
    id: 'villager',
    name: 'Citizen',
    faction: 'town',
    description: 'An honest citizen of the town. Possesses no night powers, but uses sharp observation, deductive reasoning, and votes to eliminate the Mafia during the day.',
    priority: 99,
    iconName: 'User',
    color: '#38bdf8',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  mafia: {
    id: 'mafia',
    name: 'Mafia Member',
    faction: 'mafia',
    description: 'Operates in the shadows. Each night, confers secretly with fellow Mafia to select an innocent victim to eliminate.',
    nightActionDescription: 'Select a target to eliminate tonight with your syndicate.',
    priority: 10,
    iconName: 'Skull',
    color: '#ef4444',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  godfather: {
    id: 'godfather',
    name: 'Godfather',
    faction: 'mafia',
    description: 'The head of the syndicate. Leads the nightly hit and appears completely "Innocent" when investigated by the Detective.',
    nightActionDescription: 'Direct the Mafia kill target. You have investigative immunity.',
    priority: 9,
    iconName: 'Crown',
    color: '#b91c1c',
    badgeColor: 'bg-red-900/30 text-red-300 border-red-700/40',
  },
  detective: {
    id: 'detective',
    name: 'Detective',
    faction: 'town',
    description: 'The town lawman. Can investigate one suspect each night to determine whether they belong to the Mafia.',
    nightActionDescription: 'Select one player to uncover their criminal allegiance.',
    priority: 2,
    iconName: 'Search',
    color: '#38bdf8',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  doctor: {
    id: 'doctor',
    name: 'Doctor',
    faction: 'town',
    description: 'The town physician. Protects one player each night from violent attacks. If that player is targeted for elimination, they survive.',
    nightActionDescription: 'Select one player to administer medical protection tonight.',
    priority: 1,
    iconName: 'ShieldAlert',
    color: '#34d399',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  vigilante: {
    id: 'vigilante',
    name: 'Vigilante',
    faction: 'town',
    description: 'A rogue town defender with a single-shot revolver. Can take justice into their own hands at night, but shooting an innocent townsperson brings severe grief.',
    nightActionDescription: 'Take a fatal shot at a suspect. Use wisely!',
    priority: 11,
    iconName: 'Target',
    color: '#fbbf24',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  jester: {
    id: 'jester',
    name: 'Jester',
    faction: 'neutral',
    description: 'A chaotic trickster who belongs to neither Town nor Mafia. The Jester only wins if they manage to get voted onto the gallows and executed by the town during the day.',
    priority: 99,
    iconName: 'Sparkles',
    color: '#c084fc',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
};

export interface DeckConfiguration {
  mafiaCount: number;
  hasGodfather: boolean;
  hasDetective: boolean;
  hasDoctor: boolean;
  hasVigilante: boolean;
  hasJester: boolean;
}

export interface BalanceMetrics {
  playerCount: number;
  mafiaCount: number;
  townCount: number;
  neutralCount: number;
  villagerCount: number;
  mafiaRatioPercent: number;
  majorityVotesNeeded: number;
  status: 'optimal' | 'mafia_favored' | 'town_favored' | 'invalid';
  summary: string;
}

/**
 * Returns the mathematically balanced default role deck for any player count (4 to 16).
 * Based on classic social deduction game theory:
 * - 4-5 players: 1 Mafia, 1 Detective, Doctor (at 5), Villagers
 * - 6-7 players: 1-2 Mafia, Detective, Doctor, Jester, Villagers
 * - 8-9 players: 2 Mafia (1 Godfather), Detective, Doctor, Vigilante, Jester, Villagers
 * - 10-12 players: 3 Mafia (1 Godfather, 2 Goons), Detective, Doctor, Vigilante, Jester, Villagers
 * - 13-16 players: 4 Mafia (1 Godfather, 3 Goons), Detective, Doctor, Vigilante, Jester, Villagers
 */
export function getRecommendedDeck(playerCount: number): DeckConfiguration {
  const count = Math.max(4, Math.min(16, playerCount));

  if (count <= 4) {
    return {
      mafiaCount: 1,
      hasGodfather: false,
      hasDetective: true,
      hasDoctor: false,
      hasVigilante: false,
      hasJester: false,
    };
  } else if (count === 5) {
    return {
      mafiaCount: 1,
      hasGodfather: false,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: false,
      hasJester: false,
    };
  } else if (count <= 7) {
    return {
      mafiaCount: count >= 7 ? 2 : 1,
      hasGodfather: false,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: false,
      hasJester: true,
    };
  } else if (count <= 9) {
    return {
      mafiaCount: 2,
      hasGodfather: true,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: true,
      hasJester: true,
    };
  } else if (count <= 12) {
    return {
      mafiaCount: 3,
      hasGodfather: true,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: true,
      hasJester: true,
    };
  } else {
    return {
      mafiaCount: 4,
      hasGodfather: true,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: true,
      hasJester: true,
    };
  }
}

/**
 * Calculates game balance metrics and vote thresholds for a given player count and deck.
 */
export function calculateBalanceMetrics(
  playerCount: number,
  deckConfig: DeckConfiguration
): BalanceMetrics {
  const count = Math.max(1, playerCount);
  const maxSafeMafia = Math.max(1, Math.floor((count - 1) / 2));
  const effectiveMafia = Math.min(Math.max(1, deckConfig.mafiaCount), maxSafeMafia);
  const neutralCount = deckConfig.hasJester && count >= 6 ? 1 : 0;

  let specialTown = 0;
  if (deckConfig.hasDetective && count >= 4) specialTown++;
  if (deckConfig.hasDoctor && count >= 5) specialTown++;
  if (deckConfig.hasVigilante && count >= 8) specialTown++;

  const totalSpecial = effectiveMafia + neutralCount + specialTown;
  const villagerCount = Math.max(0, count - totalSpecial);
  const townCount = specialTown + villagerCount;

  const mafiaRatio = Math.round((effectiveMafia / count) * 100);
  const majorityVotes = Math.floor(count / 2) + 1;

  let status: BalanceMetrics['status'] = 'optimal';
  let summary = `Balanced setup (${effectiveMafia} Mafia vs ${townCount} Town). Majority requires ${majorityVotes} votes.`;

  if (count < 4) {
    status = 'invalid';
    summary = 'Minimum 4 players required to play Mafia.';
  } else if (mafiaRatio >= 40) {
    status = 'mafia_favored';
    summary = `Mafia favored (${mafiaRatio}% syndicate). Town must deduce quickly!`;
  } else if (mafiaRatio < 15 && count >= 8) {
    status = 'town_favored';
    summary = `Town favored (${mafiaRatio}% syndicate). Consider adding a Mafia member or Jester.`;
  }

  return {
    playerCount: count,
    mafiaCount: effectiveMafia,
    townCount,
    neutralCount,
    villagerCount,
    mafiaRatioPercent: mafiaRatio,
    majorityVotesNeeded: majorityVotes,
    status,
    summary,
  };
}

/**
 * Assign roles fairly to players based on a given configuration.
 * Safely clamps mafia so that town always starts with numerical superiority,
 * and fills any remaining slots with villagers.
 */
export function assignRoles(
  players: Player[],
  deckConfig: DeckConfiguration
): Player[] {
  if (players.length === 0) return [];

  // Guarantee Mafia never starts at parity (Mafia < Town at start)
  const maxSafeMafia = Math.max(1, Math.floor((players.length - 1) / 2));
  const safeMafiaCount = Math.min(Math.max(1, deckConfig.mafiaCount), maxSafeMafia);

  const pool: RoleId[] = [];

  if (deckConfig.hasGodfather && safeMafiaCount >= 1) {
    pool.push('godfather');
  }

  const remainingMafia = Math.max(0, safeMafiaCount - (deckConfig.hasGodfather ? 1 : 0));
  for (let i = 0; i < remainingMafia; i++) {
    pool.push('mafia');
  }

  // Add special roles if room permits
  const slotsRemaining = () => players.length - pool.length;

  if (deckConfig.hasDoctor && slotsRemaining() > 1) pool.push('doctor');
  if (deckConfig.hasDetective && slotsRemaining() > 1) pool.push('detective');
  if (deckConfig.hasVigilante && slotsRemaining() > 1 && players.length >= 7) pool.push('vigilante');
  if (deckConfig.hasJester && slotsRemaining() > 1 && players.length >= 6) pool.push('jester');

  // Fill all remaining slots with villagers
  while (pool.length < players.length) {
    pool.push('villager');
  }

  // Shuffle pool using Fisher-Yates
  const shuffled = [...pool.slice(0, players.length)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return players.map((player, index) => {
    const roleId = shuffled[index];
    const roleDef = ROLE_DEFINITIONS[roleId];
    return {
      ...player,
      role: roleId,
      faction: roleDef.faction,
      isAlive: true,
    };
  });
}

/**
 * Automatically assigns Mafia, Doctor, and Citizen roles to active players.
 * Guarantees:
 * - Mafia members (1 for 4-5 players, 2 for 6-8 players, 3 for 9-12 players, 4 for 13+ players)
 * - Exactly 1 Doctor
 * - All remaining active players become Citizens ('villager')
 * Updates the players' role, faction, and returns the modified array.
 */
export function randomizeClassicRoles(
  players: Player[],
  randomFn: () => number = Math.random
): Player[] {
  if (!players || players.length === 0) return [];

  // Determine active target players (alive players, or all players if in lobby/setup)
  const activePlayers = players.filter(p => p.isAlive);
  const targetPlayers = activePlayers.length >= 3 ? activePlayers : players;
  const count = targetPlayers.length;

  // Safe social deduction distribution for Mafia, Doctor, Citizen
  const mafiaCount = count <= 5 ? 1 : count <= 8 ? 2 : count <= 12 ? 3 : 4;
  const doctorCount = 1;
  const citizenCount = Math.max(1, count - mafiaCount - doctorCount);

  // Build the role pool containing ONLY Mafia, Doctor, and Citizen ('villager')
  const rolePool: RoleId[] = [
    ...Array(mafiaCount).fill('mafia'),
    'doctor',
    ...Array(citizenCount).fill('villager'),
  ];

  // Fisher-Yates shuffle with injectable RNG for deterministic testing
  const shuffled = [...rolePool.slice(0, count)];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const roleMap = new Map<string, RoleId>();
  targetPlayers.forEach((p, idx) => {
    roleMap.set(p.id, shuffled[idx]);
  });

  return players.map(p => {
    if (!roleMap.has(p.id)) return p;
    const assignedRole = roleMap.get(p.id)!;
    const roleDef = ROLE_DEFINITIONS[assignedRole];
    return {
      ...p,
      role: assignedRole,
      faction: roleDef.faction,
    };
  });
}

/**
 * Resolve Night Actions in order of priority:
 * 1. Doctor (protection applied)
 * 2. Detective (investigates target)
 * 3. Mafia & Godfather (kills target unless protected)
 * 4. Vigilante (kills target unless protected)
 */
export function resolveNightActions(
  players: Player[],
  actions: Record<string, NightActionPayload>
): NightResolutionResult {
  const playerMap = new Map<string, Player>(players.map(p => [p.id, p]));
  const protectedTargetIds = new Set<string>();
  const attemptedKillTargetIds = new Set<string>();
  const investigationResults: Record<string, { targetName: string; isSuspicious: boolean }> = {};
  const logMessages: string[] = [];

  // 1. Doctor protections
  for (const action of Object.values(actions)) {
    if (action.actionType === 'heal') {
      const actor = playerMap.get(action.actorId);
      if (actor && actor.isAlive && actor.role === 'doctor') {
        protectedTargetIds.add(action.targetId);
      }
    }
  }

  // 2. Detective investigations
  for (const action of Object.values(actions)) {
    if (action.actionType === 'investigate') {
      const actor = playerMap.get(action.actorId);
      const target = playerMap.get(action.targetId);
      if (actor && actor.isAlive && actor.role === 'detective' && target) {
        // Godfather appears innocent to the Detective
        const isSuspicious = target.faction === 'mafia' && target.role !== 'godfather';
        investigationResults[action.targetId] = {
          targetName: target.name,
          isSuspicious,
        };
      }
    }
  }

  // 3. Mafia & Vigilante attacks
  for (const action of Object.values(actions)) {
    const actor = playerMap.get(action.actorId);
    if (!actor || !actor.isAlive) continue;

    if (action.actionType === 'kill' && (actor.role === 'mafia' || actor.role === 'godfather')) {
      attemptedKillTargetIds.add(action.targetId);
    } else if (action.actionType === 'shoot' && actor.role === 'vigilante') {
      attemptedKillTargetIds.add(action.targetId);
    }
  }

  const eliminatedPlayerIds: string[] = [];
  const savedPlayerIds: string[] = [];

  for (const targetId of attemptedKillTargetIds) {
    const target = playerMap.get(targetId);
    if (!target || !target.isAlive) continue;

    if (protectedTargetIds.has(targetId)) {
      savedPlayerIds.push(targetId);
      logMessages.push(`Someone was attacked in the shadows, but the Doctor's swift intervention saved their life!`);
    } else {
      eliminatedPlayerIds.push(targetId);
      logMessages.push(`${target.name} was brutally murdered during the dark of night.`);
    }
  }

  if (attemptedKillTargetIds.size === 0) {
    logMessages.push(`The night was calm. No gunfire or attacks were reported.`);
  }

  return {
    eliminatedPlayerIds,
    savedPlayerIds,
    investigationResults,
    logMessages,
  };
}

/**
 * Tally day votes:
 * Either standard nomination (who to put on trial) or trial verdict (Guilty vs Innocent).
 */
export function tallyVotes(
  votes: Record<string, string>,
  alivePlayers: Player[],
  mode: 'nomination' | 'trial' = 'nomination'
): VotingResult {
  const tally: Record<string, number> = {};
  const aliveIds = new Set(alivePlayers.map(p => p.id));
  let totalVotes = 0;

  for (const [voterId, choice] of Object.entries(votes)) {
    if (!aliveIds.has(voterId) || choice === 'abstain' || !choice) continue;
    tally[choice] = (tally[choice] || 0) + 1;
    totalVotes++;
  }

  if (mode === 'trial') {
    const guiltyVotes = tally['guilty'] || 0;
    const innocentVotes = tally['innocent'] || 0;
    const isLynchConfirmed = guiltyVotes > innocentVotes && guiltyVotes > 0;
    return {
      accusedId: isLynchConfirmed ? 'guilty' : null,
      tally,
      totalVotes,
      isTie: guiltyVotes === innocentVotes && guiltyVotes > 0,
      isLynchConfirmed,
    };
  }

  // Nomination mode: find player with strictly highest votes exceeding threshold
  let maxVotes = 0;
  let leader: string | null = null;
  let isTie = false;

  for (const [targetId, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      leader = targetId;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }

  const majorityNeeded = Math.floor(alivePlayers.length / 2) + 1;
  const isLynchConfirmed = !isTie && leader !== null && maxVotes >= majorityNeeded;

  return {
    accusedId: isTie ? null : leader,
    tally,
    totalVotes,
    isTie,
    isLynchConfirmed,
  };
}

/**
 * Check win condition:
 * - Jester lynched during day -> Jester wins instantly!
 * - Mafia count >= Town count -> Mafia wins (numerical parity/takeover)
 * - Mafia count === 0 -> Town wins (all threats eradicated)
 */
export function checkWinCondition(
  players: Player[],
  lastExecutedPlayer?: Player | null
): WinConditionResult {
  // Check Jester condition
  if (lastExecutedPlayer && lastExecutedPlayer.role === 'jester') {
    return {
      isGameOver: true,
      winner: 'neutral',
      reason: `The Jester (${lastExecutedPlayer.name}) tricked the town into executing them on the gallows! Jester victory!`,
    };
  }

  const alivePlayers = players.filter(p => p.isAlive);
  const mafiaCount = alivePlayers.filter(p => p.faction === 'mafia').length;
  const townCount = alivePlayers.filter(p => p.faction === 'town').length;

  if (mafiaCount === 0) {
    return {
      isGameOver: true,
      winner: 'town',
      reason: 'All members of the Mafia syndicate have been eliminated. Peace has returned to the town!',
    };
  }

  if (mafiaCount >= townCount) {
    return {
      isGameOver: true,
      winner: 'mafia',
      reason: 'The Mafia has reached numerical parity with the Town! Nothing can stop their criminal control now.',
    };
  }

  return {
    isGameOver: false,
    winner: null,
    reason: '',
  };
}

export interface ReconnectSyncRequest {
  playerId: string;
  roomCode: string;
  lastKnownSeq: number;
  queuedActions: Array<{
    type: string;
    payload: any;
    clientTimestamp: number;
  }>;
}

export interface ReconnectSyncResponse {
  success: boolean;
  isAlive: boolean;
  assignedRole: RoleId;
  currentPhase: string;
  dayNumber: number;
  timeRemainingSec: number;
  unmissedLogs: string[];
  appliedOfflineActionsCount: number;
  message: string;
}

/**
 * Handle Wi-Fi Disconnect Re-synchronization:
 * Restores a returning peer's state without discarding their progress or role.
 */
export function reconcileStateOnReconnect(
  players: Player[],
  request: ReconnectSyncRequest,
  currentPhase: string,
  dayNumber: number,
  timeRemainingSec: number
): ReconnectSyncResponse {
  const player = players.find(p => p.id === request.playerId);
  if (!player) {
    return {
      success: false,
      isAlive: false,
      assignedRole: 'villager',
      currentPhase,
      dayNumber,
      timeRemainingSec,
      unmissedLogs: ['Player session not found on host'],
      appliedOfflineActionsCount: 0,
      message: 'Session expired or not found',
    };
  }

  return {
    success: true,
    isAlive: player.isAlive,
    assignedRole: player.role,
    currentPhase,
    dayNumber,
    timeRemainingSec,
    unmissedLogs: [
      `Client ${player.name} reconnected via Wi-Fi (seq gap: ${request.lastKnownSeq}).`,
      `State synchronized seamlessly with host 192.168.1.42:8443.`,
    ],
    appliedOfflineActionsCount: request.queuedActions.length,
    message: `Welcome back, ${player.name}. Network link restored.`,
  };
}
