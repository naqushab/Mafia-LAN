/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, Skull, ShieldCheck, Sparkles, RotateCcw, Award } from 'lucide-react';
import { Faction, Player } from '../types/mafia';
import { ROLE_DEFINITIONS } from '../game/rules';

interface GameOverViewProps {
  winner: Faction | null;
  winnerReason: string;
  players: Player[];
  onRestartGame: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({
  winner,
  winnerReason,
  players,
  onRestartGame,
}) => {
  const getWinnerMeta = () => {
    switch (winner) {
      case 'mafia':
        return {
          title: 'MAFIA SYNDICATE WINS',
          icon: <Skull className="w-10 h-10 text-rose-500" />,
          colorClass: 'text-rose-400 border-rose-800 bg-rose-950/40',
        };
      case 'town':
        return {
          title: 'TOWN CITIZENS VICTORIOUS',
          icon: <ShieldCheck className="w-10 h-10 text-emerald-400" />,
          colorClass: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
        };
      case 'neutral':
        return {
          title: 'JESTER OUTSMARTED THE TOWN',
          icon: <Sparkles className="w-10 h-10 text-purple-400" />,
          colorClass: 'text-purple-400 border-purple-800 bg-purple-950/40',
        };
      default:
        return {
          title: 'GAME CONCLUDED',
          icon: <Trophy className="w-10 h-10 text-amber-400" />,
          colorClass: 'text-amber-400 border-amber-800 bg-amber-950/40',
        };
    }
  };

  const meta = getWinnerMeta();

  return (
    <div className="flex flex-col h-full p-4 justify-between bg-gradient-to-b from-[#110e17] via-[#090a0f] to-black text-center">
      {/* Header: Trophy & Victory Callout */}
      <div>
        <div className="flex items-center justify-center gap-1.5 mb-1 text-xs font-mono uppercase tracking-widest text-slate-400">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Match Conclusion</span>
        </div>

        <div className={`p-4 rounded-2xl border ${meta.colorClass} shadow-2xl flex flex-col items-center mt-2`}>
          <div className="p-3 rounded-full bg-slate-900/80 mb-2 border border-slate-700/50">
            {meta.icon}
          </div>
          <h2 className="text-xl font-black font-cinzel tracking-tight text-white">
            {meta.title}
          </h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            {winnerReason}
          </p>
        </div>
      </div>

      {/* Role Disclosure Roster (All secrets revealed!) */}
      <div className="my-3 flex-1 min-h-0 flex flex-col">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 mb-2 block font-mono text-left px-1">
          Complete Identity Disclosure
        </span>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {players.map(p => {
            const roleDef = ROLE_DEFINITIONS[p.role];
            return (
              <div
                key={p.id}
                className="p-2 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.isAlive ? 'bg-emerald-400' : 'bg-rose-500'}`}></div>
                  <div className="text-left">
                    <span className="font-semibold text-white block">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {p.isAlive ? 'Survived' : 'Eliminated'} • {p.deviceType.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleDef.badgeColor}`}>
                    {roleDef.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Play Again Button */}
      <div className="pt-2">
        <button
          onClick={onRestartGame}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Room Lobby</span>
        </button>
      </div>
    </div>
  );
};
