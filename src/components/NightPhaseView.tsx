/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Moon, Clock, Skull, ShieldCheck, Search, Crosshair, Check, AlertCircle } from 'lucide-react';
import { Player, RoleId } from '../types/mafia';
import { ROLE_DEFINITIONS } from '../game/rules';
import { sounds } from '../services/soundEffects';

interface NightPhaseViewProps {
  myPlayer: Player;
  players: Player[];
  timeRemainingSec: number;
  onSubmitAction: (targetId: string, actionType: 'kill' | 'heal' | 'investigate' | 'shoot') => void;
  investigationResult?: { targetName: string; isSuspicious: boolean } | null;
}

export const NightPhaseView: React.FC<NightPhaseViewProps> = ({
  myPlayer,
  players,
  timeRemainingSec,
  onSubmitAction,
  investigationResult,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isActionSubmitted, setIsActionSubmitted] = useState(false);

  const alivePlayers = players.filter(p => p.isAlive);
  const roleDef = ROLE_DEFINITIONS[myPlayer.role];

  const canAct = myPlayer.role === 'mafia' ||
                 myPlayer.role === 'godfather' ||
                 myPlayer.role === 'doctor' ||
                 myPlayer.role === 'detective' ||
                 myPlayer.role === 'vigilante';

  // Eligible targets:
  // - Mafia cannot target fellow Mafia
  // - Detective cannot target themselves
  // - Doctor can target anyone (or themselves)
  const eligibleTargets = alivePlayers.filter(p => {
    if (myPlayer.role === 'mafia' || myPlayer.role === 'godfather') {
      return p.faction !== 'mafia';
    }
    if (myPlayer.role === 'detective') {
      return p.id !== myPlayer.id;
    }
    return true;
  });

  const handleSelectTarget = (id: string) => {
    if (isActionSubmitted) return;
    sounds.playVoteClick();
    setSelectedTargetId(id);
  };

  const handleConfirm = () => {
    if (!selectedTargetId) return;
    let actionType: 'kill' | 'heal' | 'investigate' | 'shoot' = 'kill';
    if (myPlayer.role === 'doctor') {
      actionType = 'heal';
      sounds.playDoctorSaveHaptic();
    } else if (myPlayer.role === 'detective') {
      actionType = 'investigate';
      sounds.playDetectiveHaptic(false);
    } else if (myPlayer.role === 'vigilante') {
      actionType = 'shoot';
      sounds.triggerHaptic([60, 40, 80], 'Vigilante Shot');
    } else {
      sounds.triggerHaptic([60, 40, 80], 'Mafia Strike');
    }

    sounds.playVoteClick();
    setIsActionSubmitted(true);
    onSubmitAction(selectedTargetId, actionType);
  };

  const getActionTitle = () => {
    switch (myPlayer.role) {
      case 'mafia':
      case 'godfather':
        return { title: 'Select Elimination Target', icon: <Skull className="w-4 h-4 text-rose-500" /> };
      case 'doctor':
        return { title: 'Select Player to Protect', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> };
      case 'detective':
        return { title: 'Select Suspect to Interrogate', icon: <Search className="w-4 h-4 text-sky-400" /> };
      case 'vigilante':
        return { title: 'Select Target to Shoot', icon: <Crosshair className="w-4 h-4 text-amber-400" /> };
      default:
        return { title: 'Night in Progress', icon: <Moon className="w-4 h-4 text-indigo-400" /> };
    }
  };

  const actionMeta = getActionTitle();

  return (
    <div className="flex flex-col h-full p-4 justify-between bg-gradient-to-b from-[#090b14] via-[#06070a] to-black">
      {/* Top Banner: Night header & Timer */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-cinzel">
                Night Phase
              </span>
              <p className="text-[10px] text-slate-500">The town sleeps in fear</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-xs text-amber-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeRemainingSec}s</span>
          </div>
        </div>

        {/* Role Briefing Card */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-800/80 shrink-0">
            {actionMeta.icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">
                {myPlayer.name} ({roleDef.name})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              {canAct
                ? roleDef.nightActionDescription
                : 'You have no night actions. Remain silent while special roles carry out their assignments.'}
            </p>
          </div>
        </div>

        {/* Detective Real-Time Result Alert */}
        {investigationResult && (
          <div className={`mt-3 p-3 rounded-xl border flex items-center gap-2.5 ${
            investigationResult.isSuspicious
              ? 'bg-rose-950/40 border-rose-700/60 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div className="text-left text-xs leading-tight">
              <span className="font-bold">Investigation Report:</span>
              <p className="mt-0.5 text-[11px]">
                {investigationResult.targetName} is registered as{' '}
                <span className="font-bold underline uppercase">
                  {investigationResult.isSuspicious ? 'Guilty (Mafia)' : 'Innocent'}
                </span>
                .
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Center Target Selection Grid (if role can act) */}
      <div className="my-auto py-2">
        {canAct ? (
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                {actionMeta.title}
              </span>
              {isActionSubmitted && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" /> Action Locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-0.5">
              {eligibleTargets.map(player => {
                const isSelected = selectedTargetId === player.id;
                return (
                  <button
                    key={player.id}
                    disabled={isActionSubmitted}
                    onClick={() => handleSelectTarget(player.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/40 text-white ring-1 ring-rose-500/50'
                        : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
                    } ${isActionSubmitted ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold truncate">
                        {player.name}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">
                      {player.ipAddress}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center animate-pulse">
              <Moon className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-xs text-slate-400 max-w-[240px]">
              The shadows are restless. Await the break of dawn to see who survived.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Confirm Action Button */}
      {canAct && !isActionSubmitted && (
        <div className="pt-2">
          <button
            disabled={!selectedTargetId}
            onClick={handleConfirm}
            className={`w-full py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-lg ${
              selectedTargetId
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm Night Action
          </button>
        </div>
      )}
    </div>
  );
};
