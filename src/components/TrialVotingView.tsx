/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gavel, Clock, ThumbsDown, ThumbsUp, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { Player } from '../types/mafia';
import { sounds } from '../services/soundEffects';
import { RolePortrait } from './RolePortraits';

interface TrialVotingViewProps {
  suspect: Player;
  timeRemainingSec: number;
  myPlayer: Player;
  alivePlayers: Player[];
  onCastVote: (vote: 'guilty' | 'innocent' | 'abstain') => void;
  votes: Record<string, string>;
  isVerdictConfirmed?: boolean;
  verdictResult?: 'executed' | 'pardoned' | null;
  onProceedAfterVerdict?: () => void;
}

export const TrialVotingView: React.FC<TrialVotingViewProps> = ({
  suspect,
  timeRemainingSec,
  myPlayer,
  alivePlayers,
  onCastVote,
  votes,
  isVerdictConfirmed = false,
  verdictResult = null,
  onProceedAfterVerdict,
}) => {
  const [myVote, setMyVote] = useState<'guilty' | 'innocent' | 'abstain' | null>(null);

  const handleVote = (choice: 'guilty' | 'innocent' | 'abstain') => {
    if (isVerdictConfirmed) return;
    sounds.playVoteClick();
    setMyVote(choice);
    onCastVote(choice);
  };

  const guiltyCount = Object.values(votes).filter(v => v === 'guilty').length;
  const innocentCount = Object.values(votes).filter(v => v === 'innocent').length;
  const abstainCount = Object.values(votes).filter(v => v === 'abstain').length;
  const totalCast = guiltyCount + innocentCount + abstainCount;
  const totalEligible = alivePlayers.length;

  return (
    <div className="flex flex-col h-full p-4 justify-between bg-gradient-to-b from-[#140b0b] via-[#090a0f] to-black text-center">
      {/* Header: Gallows Trial Notice & Timer */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-500">
              <Gavel className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-cinzel">
                Town Gallows Trial
              </span>
              <p className="text-[10px] text-slate-500">Vote to hang or pardon the accused</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-xs text-amber-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeRemainingSec}s</span>
          </div>
        </div>

        {/* Suspect On Trial Spotlight Card */}
        <div className="mt-2.5 p-3.5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-rose-900/40 shadow-xl flex flex-col items-center">
          <div className="mb-1.5 p-1 rounded-2xl bg-slate-800/80 border border-rose-700/50 shadow-lg">
            <RolePortrait roleId={suspect.role} size="md" />
          </div>
          <span className="text-[10px] font-semibold text-rose-400 tracking-wider uppercase font-mono">
            Accused On The Stand
          </span>
          <h3 className="text-lg font-bold text-white font-cinzel mt-0.5">
            {suspect.name}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] italic leading-tight">
            "I swear before this town that I am innocent of the murders. Do not send an honest soul to the noose!"
          </p>
        </div>
      </div>

      {/* Live Vote Tally Visualization */}
      <div className="my-auto py-2">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 px-1 font-mono">
          <span>TALLY: {totalCast}/{totalEligible} VOTED</span>
          <span className="text-rose-400 font-bold">{guiltyCount} GUILTY</span>
        </div>

        {/* Progress Bar Tally */}
        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="bg-rose-600 transition-all duration-300"
            style={{ width: `${(guiltyCount / (totalEligible || 1)) * 100}%` }}
          ></div>
          <div
            className="bg-emerald-600 transition-all duration-300"
            style={{ width: `${(innocentCount / (totalEligible || 1)) * 100}%` }}
          ></div>
          <div
            className="bg-slate-700 transition-all duration-300"
            style={{ width: `${(abstainCount / (totalEligible || 1)) * 100}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span className="text-rose-400 font-semibold">🔴 Guilty: {guiltyCount}</span>
          <span className="text-slate-500">⚪ Abstain: {abstainCount}</span>
          <span className="text-emerald-400 font-semibold">🟢 Pardon: {innocentCount}</span>
        </div>

        {/* Verdict Announcement if confirmed */}
        {isVerdictConfirmed && (
          <div className={`mt-4 p-3.5 rounded-xl border flex items-center gap-3 ${
            verdictResult === 'executed'
              ? 'bg-rose-950/60 border-rose-600 text-rose-300'
              : 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
          }`}>
            {verdictResult === 'executed' ? (
              <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            )}
            <div className="text-left text-xs leading-snug">
              <span className="font-bold text-sm block">
                {verdictResult === 'executed' ? 'VERDICT: CONDEMNED' : 'VERDICT: PARDONED'}
              </span>
              <span>
                {verdictResult === 'executed'
                  ? `${suspect.name} has been sentenced to the gallows by majority vote!`
                  : `The town lacked conviction. ${suspect.name} walks free.`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Voting Control Buttons (or Next button if verdict decided) */}
      <div className="pt-2">
        {!isVerdictConfirmed ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleVote('guilty')}
                className={`py-3 rounded-xl border font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                  myVote === 'guilty'
                    ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/50 scale-[1.02]'
                    : 'bg-rose-950/40 hover:bg-rose-900/50 border-rose-800 text-rose-300'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Vote Guilty</span>
              </button>

              <button
                onClick={() => handleVote('innocent')}
                className={`py-3 rounded-xl border font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                  myVote === 'innocent'
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/50 scale-[1.02]'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800 text-emerald-300'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Pardon</span>
              </button>
            </div>

            <button
              onClick={() => handleVote('abstain')}
              className={`w-full py-2 rounded-lg border text-xs font-medium transition-colors ${
                myVote === 'abstain'
                  ? 'bg-slate-700 border-slate-500 text-white'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-400'
              }`}
            >
              Abstain from Voting
            </button>
          </div>
        ) : (
          <button
            onClick={onProceedAfterVerdict}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-semibold text-xs tracking-wider uppercase shadow-lg active:scale-[0.98] transition-all"
          >
            Proceed to Nightfall
          </button>
        )}
      </div>
    </div>
  );
};
