/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRoles,
  resolveNightActions,
  tallyVotes,
  checkWinCondition,
  reconcileStateOnReconnect,
  getRecommendedDeck,
  calculateBalanceMetrics,
  randomizeClassicRoles,
  ROLE_DEFINITIONS,
} from './rules.ts';
import { Player } from '../types/mafia.ts';

function createMockPlayer(id: string, name: string, role: any, faction: any, isAlive = true): Player {
  return {
    id,
    name,
    avatar: 'avatar.png',
    role,
    faction,
    isAlive,
    isHost: id === 'p1',
    deviceType: 'ios',
    ipAddress: `192.168.1.${10 + Number(id.replace(/\D/g, '') || 1)}`,
    lastPingMs: 12,
  };
}

test('Role assignments correctly distributes roles and aligns factions', () => {
  const initialPlayers = [
    createMockPlayer('p1', 'Alice', 'villager', 'town'),
    createMockPlayer('p2', 'Bob', 'villager', 'town'),
    createMockPlayer('p3', 'Charlie', 'villager', 'town'),
    createMockPlayer('p4', 'Dave', 'villager', 'town'),
    createMockPlayer('p5', 'Eve', 'villager', 'town'),
  ];

  const assigned = assignRoles(initialPlayers, {
    mafiaCount: 1,
    hasGodfather: false,
    hasDetective: true,
    hasDoctor: true,
    hasVigilante: false,
    hasJester: false,
  });

  assert.equal(assigned.length, 5);
  const mafiaMembers = assigned.filter(p => p.role === 'mafia');
  const detectives = assigned.filter(p => p.role === 'detective');
  const doctors = assigned.filter(p => p.role === 'doctor');
  const villagers = assigned.filter(p => p.role === 'villager');

  assert.equal(mafiaMembers.length, 1);
  assert.equal(detectives.length, 1);
  assert.equal(doctors.length, 1);
  assert.equal(villagers.length, 2);
  assert.equal(mafiaMembers[0].faction, 'mafia');
  assert.equal(detectives[0].faction, 'town');
});

test('Night resolution: Mafia eliminates target if not healed', () => {
  const players = [
    createMockPlayer('p1', 'MafiaDon', 'mafia', 'mafia'),
    createMockPlayer('p2', 'DoctorWho', 'doctor', 'town'),
    createMockPlayer('p3', 'VictimBob', 'villager', 'town'),
  ];

  const actions = {
    p1: { actorId: 'p1', targetId: 'p3', actionType: 'kill' as const },
    p2: { actorId: 'p2', targetId: 'p2', actionType: 'heal' as const }, // Doctor heals himself
  };

  const result = resolveNightActions(players, actions);
  assert.deepEqual(result.eliminatedPlayerIds, ['p3']);
  assert.equal(result.savedPlayerIds.length, 0);
});

test('Night resolution: Doctor saves target attacked by Mafia', () => {
  const players = [
    createMockPlayer('p1', 'MafiaDon', 'mafia', 'mafia'),
    createMockPlayer('p2', 'DoctorWho', 'doctor', 'town'),
    createMockPlayer('p3', 'VictimBob', 'villager', 'town'),
  ];

  const actions = {
    p1: { actorId: 'p1', targetId: 'p3', actionType: 'kill' as const },
    p2: { actorId: 'p2', targetId: 'p3', actionType: 'heal' as const }, // Doctor successfully predicts and heals p3!
  };

  const result = resolveNightActions(players, actions);
  assert.equal(result.eliminatedPlayerIds.length, 0);
  assert.deepEqual(result.savedPlayerIds, ['p3']);
});

test('Night resolution: Detective uncovers regular Mafia vs Godfather immunity', () => {
  const players = [
    createMockPlayer('p1', 'DetectiveDan', 'detective', 'town'),
    createMockPlayer('p2', 'RegularGoon', 'mafia', 'mafia'),
    createMockPlayer('p3', 'GodfatherBoss', 'godfather', 'mafia'),
    createMockPlayer('p4', 'InnocentCitizen', 'villager', 'town'),
  ];

  // Test Detective checking Regular Mafia -> Suspicious (true)
  const result1 = resolveNightActions(players, {
    p1: { actorId: 'p1', targetId: 'p2', actionType: 'investigate' },
  });
  assert.equal(result1.investigationResults['p2'].isSuspicious, true);

  // Test Detective checking Godfather -> Appears Innocent (false)
  const result2 = resolveNightActions(players, {
    p1: { actorId: 'p1', targetId: 'p3', actionType: 'investigate' },
  });
  assert.equal(result2.investigationResults['p3'].isSuspicious, false);

  // Test Detective checking Villager -> Innocent (false)
  const result3 = resolveNightActions(players, {
    p1: { actorId: 'p1', targetId: 'p4', actionType: 'investigate' },
  });
  assert.equal(result3.investigationResults['p4'].isSuspicious, false);
});

test('Win Condition: Mafia victory when Mafia equals or exceeds Town', () => {
  const players = [
    createMockPlayer('p1', 'M1', 'mafia', 'mafia', true),
    createMockPlayer('p2', 'M2', 'mafia', 'mafia', true),
    createMockPlayer('p3', 'T1', 'villager', 'town', true),
    createMockPlayer('p4', 'T2', 'villager', 'town', true),
    createMockPlayer('p5', 'DeadT3', 'villager', 'town', false),
  ];
  // 2 Mafia vs 2 Town alive -> parity reached!
  const win = checkWinCondition(players);
  assert.equal(win.isGameOver, true);
  assert.equal(win.winner, 'mafia');
});

test('Win Condition: Town victory when all Mafia eliminated', () => {
  const players = [
    createMockPlayer('p1', 'DeadM1', 'mafia', 'mafia', false),
    createMockPlayer('p2', 'T1', 'detective', 'town', true),
    createMockPlayer('p3', 'T2', 'doctor', 'town', true),
    createMockPlayer('p4', 'T3', 'villager', 'town', true),
  ];
  const win = checkWinCondition(players);
  assert.equal(win.isGameOver, true);
  assert.equal(win.winner, 'town');
});

test('Win Condition: Jester victory when Jester is executed by town vote', () => {
  const jester = createMockPlayer('p4', 'JesterJ', 'jester', 'neutral', false);
  const players = [
    createMockPlayer('p1', 'M1', 'mafia', 'mafia', true),
    createMockPlayer('p2', 'T1', 'villager', 'town', true),
    createMockPlayer('p3', 'T2', 'villager', 'town', true),
    jester,
  ];

  const win = checkWinCondition(players, jester);
  assert.equal(win.isGameOver, true);
  assert.equal(win.winner, 'neutral');
});

test('Voting Tally: Majority required for nomination', () => {
  const alivePlayers = [
    createMockPlayer('p1', 'A', 'villager', 'town'),
    createMockPlayer('p2', 'B', 'villager', 'town'),
    createMockPlayer('p3', 'C', 'villager', 'town'),
    createMockPlayer('p4', 'D', 'villager', 'town'),
    createMockPlayer('p5', 'E', 'villager', 'town'),
  ];
  // 5 alive players -> majority is 3 votes
  const votes = {
    p1: 'p3',
    p2: 'p3',
    p4: 'p3',
    p5: 'p2',
  };

  const result = tallyVotes(votes, alivePlayers, 'nomination');
  assert.equal(result.accusedId, 'p3');
  assert.equal(result.isLynchConfirmed, true);
});

test('Edge Case: Doctor shield absorbs simultaneous multi-attacks from Mafia and Vigilante', () => {
  const players = [
    createMockPlayer('p1', 'MafiaDon', 'mafia', 'mafia'),
    createMockPlayer('p2', 'VigilanteDan', 'vigilante', 'town'),
    createMockPlayer('p3', 'DoctorWho', 'doctor', 'town'),
    createMockPlayer('p4', 'TargetCitizen', 'villager', 'town'),
  ];

  const actions = {
    p1: { actorId: 'p1', targetId: 'p4', actionType: 'kill' as const },
    p2: { actorId: 'p2', targetId: 'p4', actionType: 'shoot' as const },
    p3: { actorId: 'p3', targetId: 'p4', actionType: 'heal' as const },
  };

  const result = resolveNightActions(players, actions);
  // TargetCitizen was attacked by both Mafia and Vigilante, but Doctor shielded them -> 0 deaths!
  assert.equal(result.eliminatedPlayerIds.length, 0);
  assert.deepEqual(result.savedPlayerIds, ['p4']);
});

test('Edge Case: Gallows trial tie vote defaults to innocent / pardon', () => {
  const alivePlayers = [
    createMockPlayer('p1', 'A', 'villager', 'town'),
    createMockPlayer('p2', 'B', 'villager', 'town'),
    createMockPlayer('p3', 'C', 'villager', 'town'),
    createMockPlayer('p4', 'D', 'villager', 'town'),
  ];

  // 2 Guilty vs 2 Innocent -> Exactly tied
  const trialVotes = {
    p1: 'guilty',
    p2: 'guilty',
    p3: 'innocent',
    p4: 'innocent',
  };

  const result = tallyVotes(trialVotes, alivePlayers, 'trial');
  assert.equal(result.isTie, true);
  assert.equal(result.isLynchConfirmed, false);
  assert.equal(result.accusedId, null);
});

test('Edge Case: Wi-Fi Disconnect state reconciliation restores player status and role without loss', () => {
  const players = [
    createMockPlayer('p1', 'Alex', 'doctor', 'town', true),
    createMockPlayer('p2', 'Sophia', 'mafia', 'mafia', true),
  ];

  const syncReq = {
    playerId: 'p1',
    roomCode: 'MAFIA-729',
    lastKnownSeq: 12,
    queuedActions: [
      {
        type: 'VOTE_SUBMIT',
        payload: { choice: 'innocent' },
        clientTimestamp: Date.now() - 5000,
      },
    ],
  };

  const res = reconcileStateOnReconnect(players, syncReq, 'day_discussion', 2, 45);
  assert.equal(res.success, true);
  assert.equal(res.isAlive, true);
  assert.equal(res.assignedRole, 'doctor');
  assert.equal(res.appliedOfflineActionsCount, 1);
});

test('Dynamic Player Scaling: 4 to 16 players correctly balances deck and prevents opening parity', () => {
  // Test small game: 4 players
  const players4 = Array.from({ length: 4 }, (_, i) =>
    createMockPlayer(`p${i + 1}`, `Player ${i + 1}`, 'villager', 'town')
  );
  const deck4 = getRecommendedDeck(4);
  assert.equal(deck4.mafiaCount, 1);
  const assigned4 = assignRoles(players4, deck4);
  assert.equal(assigned4.length, 4);
  const mafia4 = assigned4.filter(p => p.faction === 'mafia');
  const town4 = assigned4.filter(p => p.faction === 'town');
  assert.equal(mafia4.length, 1);
  assert.equal(town4.length, 3);
  // Town outnumbers mafia at start
  assert.ok(town4.length > mafia4.length);

  // Test large game: 12 players
  const players12 = Array.from({ length: 12 }, (_, i) =>
    createMockPlayer(`p${i + 1}`, `Player ${i + 1}`, 'villager', 'town')
  );
  const deck12 = getRecommendedDeck(12);
  assert.equal(deck12.mafiaCount, 3);
  assert.equal(deck12.hasGodfather, true);
  assert.equal(deck12.hasDoctor, true);
  assert.equal(deck12.hasDetective, true);
  assert.equal(deck12.hasVigilante, true);
  assert.equal(deck12.hasJester, true);

  const assigned12 = assignRoles(players12, deck12);
  assert.equal(assigned12.length, 12);
  const mafia12 = assigned12.filter(p => p.faction === 'mafia');
  assert.equal(mafia12.length, 3);
  assert.ok(assigned12.some(p => p.role === 'godfather'));
  assert.ok(assigned12.some(p => p.role === 'doctor'));
  assert.ok(assigned12.some(p => p.role === 'detective'));
  assert.ok(assigned12.some(p => p.role === 'vigilante'));
  assert.ok(assigned12.some(p => p.role === 'jester'));

  // Test Balance Metrics calculations
  const metrics6 = calculateBalanceMetrics(6, getRecommendedDeck(6));
  assert.equal(metrics6.majorityVotesNeeded, 4); // 4 out of 6 needed
  assert.equal(metrics6.status, 'optimal');

  const metrics4 = calculateBalanceMetrics(4, getRecommendedDeck(4));
  assert.equal(metrics4.majorityVotesNeeded, 3); // 3 out of 4 needed
});

test('randomizeClassicRoles distributes only Mafia, Doctor, and Citizen roles to active players', () => {
  const players = [
    createMockPlayer('p1', 'Alex', 'jester', 'neutral'),
    createMockPlayer('p2', 'Sophia', 'vigilante', 'town'),
    createMockPlayer('p3', 'Marcus', 'detective', 'town'),
    createMockPlayer('p4', 'Elena', 'villager', 'town'),
    createMockPlayer('p5', 'Liam', 'villager', 'town'),
    createMockPlayer('p6', 'Chloe', 'godfather', 'mafia'),
  ];

  const randomized = randomizeClassicRoles(players);

  // All 6 players must now only have 'mafia', 'doctor', or 'villager' (Citizen)
  const validRoles = new Set(['mafia', 'doctor', 'villager']);
  randomized.forEach(p => {
    assert.ok(validRoles.has(p.role), `Player ${p.name} has unexpected role: ${p.role}`);
    if (p.role === 'mafia') {
      assert.equal(p.faction, 'mafia');
    } else {
      assert.equal(p.faction, 'town');
    }
  });

  const mafia = randomized.filter(p => p.role === 'mafia');
  const doctor = randomized.filter(p => p.role === 'doctor');
  const citizens = randomized.filter(p => p.role === 'villager');

  assert.equal(mafia.length, 2);
  assert.equal(doctor.length, 1);
  assert.equal(citizens.length, 3);
  assert.equal(randomized.length, 6);

  // Verify Citizen role definition has name 'Citizen'
  assert.equal(ROLE_DEFINITIONS.villager.name, 'Citizen');

  // Test 4-player minimum game
  const players4 = [
    createMockPlayer('p1', 'A', 'villager', 'town'),
    createMockPlayer('p2', 'B', 'villager', 'town'),
    createMockPlayer('p3', 'C', 'villager', 'town'),
    createMockPlayer('p4', 'D', 'villager', 'town'),
  ];
  const rand4 = randomizeClassicRoles(players4);
  assert.equal(rand4.filter(p => p.role === 'mafia').length, 1);
  assert.equal(rand4.filter(p => p.role === 'doctor').length, 1);
  assert.equal(rand4.filter(p => p.role === 'villager').length, 2);
});


