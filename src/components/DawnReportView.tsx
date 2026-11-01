/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sun, ShieldCheck, Skull, ArrowRight, Newspaper } from 'lucide-react';
import { Player } from '../types/mafia';
import { ROLE_DEFINITIONS } from '../game/rules';

interface DawnReportViewProps {
  dayNumber: number;
  eliminatedPlayerIds: string[];
  savedPlayerIds: string[];
  players: Player[];
  onProceedToDay: () => void;
}

export const DawnReportView: React.FC<DawnReportViewProps> = ({
  dayNumber,
  eliminatedPlayerIds,
  savedPlayerIds,
  players,
  onProceedToDay,
}) => {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const eliminatedPlayers = eliminatedPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];
  const savedPlayers = savedPlayerIds.map(id => playerMap.get(id)).filter(Boolean) as Player[];

  return (
    <div className="flex flex-col h-full p-4 justify-between bg-gradient-to-b from-[#13110e] via-[#090a0f] to-black text-center">
      {/* Top Header: Dawn Announcement */}
      <div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-300 font-cinzel">
            Daybreak — Morning {dayNumber}
          </span>
        </div>
        <h2 className="text-xl font-extrabold text-white font-cinzel tracking-tight">
          The Town Awakens
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          The sun rises over the town. Here is the coroner's morning bulletin.
        </p>
      </div>

      {/* Main Newspaper / Bulletin Card */}
      <div className="my-auto p-4 rounded-2xl bg-slate-900/90 border border-slate-700/60 shadow-2xl flex flex-col items-center">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 border-b border-slate-800 pb-2 w-full justify-center font-mono">
          <Newspaper className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-semibold uppercase tracking-wider">Morning Gazette</span>
        </div>

        <div className="py-4 w-full">
          {eliminatedPlayers.length > 0 ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-800 flex items-center justify-center mx-auto text-rose-500">
                <Skull className="w-6 h-6" />
              </div>

              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-rose-400">
                  Casualties Reported
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5 font-cinzel">
                  {eliminatedPlayers.map(p => p.name).join(', ')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  was murdered in cold blood while the town slept.
                </p>
              </div>

              {/* Reveal role of fallen if configured */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {eliminatedPlayers.map(p => {
                  const roleDef = ROLE_DEFINITIONS[p.role];
                  return (
                    <span
                      key={p.id}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${roleDef.badgeColor}`}
                    >
                      {p.name}: {roleDef.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white font-cinzel">
                A Miracle in the Shadows!
              </h3>
              <p className="text-xs text-slate-300">
                No casualties were sustained last night.
              </p>
            </div>
          )}

          {/* Doctor saves callout */}
          {savedPlayers.length > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              <span className="font-bold">Doctor's Protection:</span> {savedPlayers.map(p => p.name).join(', ')} was attacked, but saved in time!
            </div>
          )}
        </div>

        {/* Living players tally */}
        <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 w-full">
          {players.filter(p => p.isAlive).length} citizens remain alive.
        </div>
      </div>

      {/* Action: Open Day Discussion */}
      <div>
        <button
          onClick={onProceedToDay}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <span>Begin Town Discussion</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
