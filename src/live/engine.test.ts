/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from './engine.ts';
import { RoleId } from '../types/mafia.ts';

/** Engine with fixed roles and zero-length phases, so only actions drive it. */
function makeGame(roles: RoleId[]) {
  const engine = new GameEngine({ hostName: 'Host' });
  engine.setSettings({
    timings: { revealSec: 0, nightSec: 0, dawnSec: 0, daySec: 0, votingSec: 0, trialSec: 0, verdictSec: 0 },
    deck: {
      mafiaCount: 1,
      hasGodfather: false,
      hasDetective: true,
      hasDoctor: true,
      hasVigilante: false,
      hasJester: false,
    },
  });
  for (let i = 1; i < roles.length; i++) engine.addPlayer({ name: `P${i + 1}` });
  engine.startGame(0);
  engine.players.forEach((player, index) => {
    const role = roles[index];
    player.role = role;
    player.faction =
      role === 'mafia' || role === 'godfather' ? 'mafia' : role === 'jester' ? 'neutral' : 'town';
    player.isAlive = true;
    player.ready = false;
  });
  return engine;
}

const ids = (engine: GameEngine) => engine.players.map(p => p.id);

function everyoneReady(engine: GameEngine) {
  for (const id of ids(engine)) engine.setReady(id);
}

function act(engine: GameEngine, actions: Array<[actor: string, target: string]>) {
  for (const [actorId, targetId] of actions) engine.submitNightAction(actorId, targetId);
}

/** Dawn -> day -> nomination vote with a forced majority on `suspectId`. */
function lynch(engine: GameEngine, suspectId: string, verdict: 'guilty' | 'innocent') {
  engine.forceAdvance(0); // dawn -> day
  engine.startVoting(0);
  // Every living player votes — the accused abstains — because the nomination
  // only resolves once the whole table has been heard.
  for (const voter of engine.players.filter(p => p.isAlive)) {
    engine.submitVote(voter.id, voter.id === suspectId ? 'abstain' : suspectId);
  }
  if (engine.phase === 'trial') {
    for (const p of engine.players.filter(x => x.isAlive)) engine.submitVote(p.id, verdict);
  }
  // The trial result now gets its own short phase before nightfall.
  if (engine.phase === 'verdict') engine.forceAdvance(0);
}

test('lobby refuses to start with fewer than four players', () => {
  const engine = new GameEngine({ hostName: 'Host' });
  engine.addPlayer({ name: 'B' });
  engine.addPlayer({ name: 'C' });
  assert.throws(() => engine.startGame(0), /at least 4/);
  assert.equal(engine.phase, 'lobby');
});

test('starting deals every player a role and opens the reveal phase', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  assert.equal(engine.phase, 'role_reveal');
  assert.equal(engine.dayNumber, 1);
  assert.ok(engine.players.every(p => p.isAlive));
});

test('reveal advances to night once every player is ready', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  assert.equal(engine.phase, 'night');
});

test('the mafia hit resolves at dawn and the victim is out', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, detective.id],
    [detective.id, mafia.id],
    [doctor.id, doctor.id],
  ]);

  assert.equal(engine.phase, 'dawn');
  assert.deepEqual(engine.lastDawnEliminated, [detective.id]);
  assert.equal(engine.player(detective.id)?.isAlive, false);
  assert.equal(engine.player(villager.id)?.isAlive, true);
});

test('doctor protection prevents the night kill', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, detective.id],
    [detective.id, mafia.id],
    [doctor.id, detective.id],
  ]);

  assert.deepEqual(engine.lastDawnEliminated, []);
  assert.deepEqual(engine.lastDawnSaved, [detective.id]);
  assert.equal(engine.player(detective.id)?.isAlive, true);
});

test('night resolves by itself once every acting role has chosen', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [, mafia, detective, doctor] = engine.players;

  engine.submitNightAction(mafia.id, detective.id);
  engine.submitNightAction(detective.id, mafia.id);
  assert.equal(engine.phase, 'night', 'still waiting on the doctor');
  engine.submitNightAction(doctor.id, doctor.id);
  assert.equal(engine.phase, 'dawn');
});

test('detective results are private and the godfather reads as innocent', () => {
  const engine = makeGame(['villager', 'godfather', 'detective', 'doctor']);
  everyoneReady(engine);
  const [, boss, detective, doctor] = engine.players;

  act(engine, [
    [detective.id, boss.id],
    [boss.id, detective.id],
    [doctor.id, doctor.id],
  ]);

  const result = engine.privateState(detective.id)?.investigation;
  assert.equal(result?.isSuspicious, false);
  assert.equal(engine.privateState(boss.id)?.investigation, null);
  assert.equal(engine.privateState(ids(engine)[0])?.investigation, null);
});

test('plain villagers have no night action', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager] = engine.players;
  assert.match(engine.submitNightAction(villager.id, ids(engine)[1]) ?? '', /no night action/);
});

test('the syndicate shares one hit and the godfather may overrule it', () => {
  const engine = makeGame(['villager', 'godfather', 'mafia', 'doctor', 'detective']);
  everyoneReady(engine);
  const [villager, boss, goon] = engine.players;

  engine.submitNightAction(goon.id, ids(engine)[3]);
  engine.submitNightAction(boss.id, villager.id);

  const kills = Object.values(engine.nightActions).filter(a => a.actionType === 'kill');
  assert.equal(kills.length, 1, 'only one hit exists for the whole syndicate');
  assert.equal(kills[0].targetId, villager.id, 'the godfather overruled the goon');
});

test('a majority nomination leads to trial, and a guilty verdict executes', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, villager.id],
    [detective.id, mafia.id],
    [doctor.id, doctor.id],
  ]);
  assert.equal(engine.phase, 'dawn');

  lynch(engine, mafia.id, 'guilty');

  assert.equal(engine.player(mafia.id)?.isAlive, false);
  assert.equal(engine.winner, 'town');
  assert.equal(engine.phase, 'game_over');
});

test('a split nomination sends nobody to trial and night returns', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, villager.id],
    [detective.id, mafia.id],
    [doctor.id, doctor.id],
  ]);
  engine.forceAdvance(0);
  engine.startVoting(0);

  const alive = engine.players.filter(p => p.isAlive);
  engine.submitVote(alive[0].id, alive[1].id);
  engine.submitVote(alive[1].id, alive[0].id);
  engine.submitVote(alive[2].id, 'abstain');

  assert.equal(engine.phase, 'night');
  assert.equal(engine.dayNumber, 2);
  assert.equal(engine.trialSuspectId, null);
});

test('a pardoned suspect survives and the night follows', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, villager.id],
    [detective.id, mafia.id],
    [doctor.id, doctor.id],
  ]);

  lynch(engine, mafia.id, 'innocent');

  assert.equal(engine.player(mafia.id)?.isAlive, true);
  assert.equal(engine.phase, 'night');
  assert.equal(engine.dayNumber, 2);
});

test('the trial verdict is announced before the night returns', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  const [villager, mafia, detective, doctor] = engine.players;

  act(engine, [
    [mafia.id, villager.id],
    [detective.id, mafia.id],
    [doctor.id, doctor.id],
  ]);
  engine.forceAdvance(0); // dawn -> day
  engine.startVoting(0);

  for (const voter of engine.players.filter(p => p.isAlive)) {
    engine.submitVote(voter.id, voter.id === mafia.id ? 'abstain' : mafia.id);
  }
  assert.equal(engine.phase, 'trial');

  for (const voter of engine.players.filter(p => p.isAlive)) {
    engine.submitVote(voter.id, 'innocent');
  }

  assert.equal(engine.phase, 'verdict');
  assert.equal(engine.trialVerdict, 'pardoned');
  assert.equal(engine.trialSuspectId, mafia.id);
  assert.equal(engine.publicState().trialVerdict, 'pardoned');

  engine.forceAdvance(0);
  assert.equal(engine.phase, 'night');
  assert.equal(engine.trialVerdict, null);
  assert.equal(engine.trialSuspectId, null);
  assert.equal(engine.dayNumber, 2);
});

test('lynching the jester hands the win to the neutral faction', () => {
  const engine = makeGame(['jester', 'mafia', 'villager', 'villager', 'villager']);
  everyoneReady(engine);
  const [jester, mafia] = engine.players;

  engine.submitNightAction(mafia.id, ids(engine)[2]);
  assert.equal(engine.phase, 'dawn');

  lynch(engine, jester.id, 'guilty');

  assert.equal(engine.winner, 'neutral');
  assert.equal(engine.phase, 'game_over');
});

test('hidden roles never leak through the per-viewer projection', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  const [villager, mafia] = engine.players;

  const villagerView = engine.toUiPlayers(villager.id);
  const seenMafia = villagerView.find(p => p.id === mafia.id)!;
  assert.equal(seenMafia.role, 'villager');
  assert.equal(seenMafia.faction, 'town');

  const mafiaView = engine.toUiPlayers(mafia.id);
  assert.equal(mafiaView.find(p => p.id === mafia.id)!.faction, 'mafia');

  assert.equal(engine.privateState(villager.id)?.role, 'villager');
  assert.equal(engine.privateState(mafia.id)?.role, 'mafia');
  assert.equal(engine.privateState('nobody'), null);
});

test('public snapshots never carry a hidden role', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  const snapshot = engine.publicState();
  assert.ok(snapshot.players.every(p => p.role === undefined));
});

test('phase timers advance the game without any player input', () => {
  const engine = new GameEngine({ hostName: 'Host' });
  engine.setSettings({
    timings: { revealSec: 1, nightSec: 1, dawnSec: 1, daySec: 1, votingSec: 1, trialSec: 1, verdictSec: 1 },
  });
  engine.addPlayer({ name: 'B' });
  engine.addPlayer({ name: 'C' });
  engine.addPlayer({ name: 'D' });
  engine.startGame(0);

  assert.equal(engine.phase, 'role_reveal');
  engine.tick(2000);
  assert.equal(engine.phase, 'night');
  engine.tick(engine.deadlineAt + 1);
  assert.equal(engine.phase, 'dawn');
  engine.tick(engine.deadlineAt + 1);
  assert.equal(engine.phase, 'day');
  engine.tick(engine.deadlineAt + 1);
  assert.equal(engine.phase, 'voting');
});

test('restart clears the board and returns everyone to the lobby', () => {
  const engine = makeGame(['villager', 'mafia', 'detective', 'doctor']);
  everyoneReady(engine);
  engine.restart(0);
  assert.equal(engine.phase, 'lobby');
  assert.equal(engine.dayNumber, 0);
  assert.ok(engine.players.every(p => p.isAlive && p.role === 'villager'));
});
