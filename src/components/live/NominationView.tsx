/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Nomination screen for live play: everyone alive picks a suspect (or skips).
 * Built for phones — big tap targets, no hover-only affordances.
 */

import React from 'react';
import { Ban, Clock, Gavel, Users } from 'lucide-react';
import { Player } from '../../types/mafia';
import { RolePortrait } from '../RolePortraits';

interface NominationViewProps {
  dayNumber: number;
  timeRemainingSec: number;
  myPlayer: Player;
  alivePlayers: Player[];
  onVote: (targetIdOrAbstain: string) => void;
  votedCount: number;
  hasVoted: boolean;
}

export const NominationView: React.FC<NominationViewProps> = ({
  dayNumber,
  timeRemainingSec,
  myPlayer,
  alivePlayers,
  onVote,
  votedCount,
  hasVoted,
}) => {
  const targets = alivePlayers.filter(p => p.id !== myPlayer.id);
  const majority = Math.floor(alivePlayers.length / 2) + 1;

  return (
    <div className="flex h-full flex-col justify-between bg-gradient-to-b from-[#10131c] via-[#090a0f] to-black p-4 text-center">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/60 p-1.5 text-amber-400">
              <Gavel className="h-4 w-4" />
            </div>
            <div className="text-left">
              <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-amber-300">
                Day {dayNumber} · Nomination
              </span>
              <p className="text-[10px] text-slate-500">
                {majority} of {alivePlayers.length} votes needed to stand trial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono text-xs text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeRemainingSec}s</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
          <Users className="h-3.5 w-3.5" />
          <span>
            {votedCount}/{alivePlayers.length} votes in
            {hasVoted ? ' · your vote is locked' : ''}
          </span>
        </div>
      </div>

      <div className="my-auto grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto py-3">
        {targets.map(player => (
          <button
            key={player.id}
            type="button"
            disabled={hasVoted || !myPlayer.isAlive}
            onClick={() => onVote(player.id)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5 transition-all ${
              hasVoted || !myPlayer.isAlive
                ? 'cursor-not-allowed opacity-50'
                : 'hover:border-rose-700 hover:bg-slate-800 active:scale-[0.98]'
            }`}
          >
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-700">
              <RolePortrait roleId="villager" size="md" />
            </div>
            <span className="line-clamp-1 text-xs font-semibold text-slate-200">{player.name}</span>
            {player.isBot && <span className="text-[9px] font-mono text-slate-500">BOT</span>}
          </button>
        ))}
      </div>

      <div className="pt-2">
        <button
          type="button"
          disabled={hasVoted || !myPlayer.isAlive}
          onClick={() => onVote('abstain')}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-medium transition-colors ${
            hasVoted || !myPlayer.isAlive
              ? 'cursor-not-allowed border-slate-800 bg-slate-900/60 text-slate-500'
              : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Ban className="h-3.5 w-3.5" />
          Abstain from nominating
        </button>
        {!myPlayer.isAlive && (
          <p className="mt-2 text-[11px] text-slate-500">The dead may only watch.</p>
        )}
      </div>
    </div>
  );
};
