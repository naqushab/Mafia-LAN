/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Projects networked snapshots into the plain `Player` shape the existing
 * view components expect — while keeping hidden roles hidden.
 */

import { Player } from '../types/mafia';
import { PrivateState, PublicState } from './protocol';

export function uiPlayers(
  pub: PublicState | null,
  priv: PrivateState | null,
  myId: string | null
): Player[] {
  if (!pub) return [];
  const teammates = new Set((priv?.teammates ?? []).map(t => t.id));

  return pub.players.map(p => {
    const isMe = p.id === myId;
    const role = p.role ?? (isMe && priv ? priv.role : 'villager');
    let faction = p.faction ?? 'town';
    if (isMe && priv) faction = priv.faction;
    else if (teammates.has(p.id)) faction = 'mafia';

    return {
      id: p.id,
      name: p.name,
      avatar: p.id,
      role,
      faction,
      isAlive: p.isAlive,
      isHost: p.isHost,
      isBot: p.isBot,
      deviceType: 'web',
      ipAddress: 'LAN',
      lastPingMs: 0,
    };
  });
}

/** Seconds left in the current phase, using the host's clock. */
export function secondsLeft(deadlineAt: number, hostNow: number): number {
  if (!deadlineAt) return 0;
  return Math.max(0, Math.ceil((deadlineAt - hostNow) / 1000));
}

/** Rebuild a per-choice vote map from the public tally (verdict votes only). */
export function syntheticVotes(tally: Record<string, number> | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!tally) return out;
  for (const [choice, count] of Object.entries(tally)) {
    for (let i = 0; i < count; i++) out[`${choice}_${i}`] = choice;
  }
  return out;
}
