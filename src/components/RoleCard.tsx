/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Skull, Crown, Search, ShieldAlert, Target, Sparkles, User, Lock } from 'lucide-react';
import { ROLE_DEFINITIONS } from '../game/rules';
import { RoleId } from '../types/mafia';
import { sounds } from '../services/soundEffects';
import { RolePortrait } from './RolePortraits';

interface RoleCardProps {
  roleId: RoleId;
  playerName: string;
  onAcknowledged?: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ roleId, playerName, onAcknowledged }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const roleDef = ROLE_DEFINITIONS[roleId] || ROLE_DEFINITIONS.villager;

  const handleFlip = () => {
    sounds.playCardFlip();
    setIsFlipped(!isFlipped);
  };

  const getRoleIcon = () => {
    switch (roleId) {
      case 'mafia':
        return <Skull className="w-12 h-12 text-rose-500" />;
      case 'godfather':
        return <Crown className="w-12 h-12 text-amber-500" />;
      case 'detective':
        return <Search className="w-12 h-12 text-sky-400" />;
      case 'doctor':
        return <ShieldAlert className="w-12 h-12 text-emerald-400" />;
      case 'vigilante':
        return <Target className="w-12 h-12 text-amber-400" />;
      case 'jester':
        return <Sparkles className="w-12 h-12 text-purple-400" />;
      default:
        return <User className="w-12 h-12 text-slate-300" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 text-center">
      <div className="mt-2 mb-3">
        <h2 className="text-xl font-bold tracking-tight text-white font-cinzel">
          Secret Identity
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Hold card or tap to reveal your assigned role. Guard your screen!
        </p>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? `Hide role: ${roleDef.name}` : 'Reveal secret role card'}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
        className="w-full max-w-[280px] h-[360px] perspective-1000 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/50 rounded-2xl group"
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d rounded-2xl shadow-2xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT: Masked / Obscured Face */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-neutral-900 border-2 border-slate-800 p-5 flex flex-col items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
            <div className="w-full flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-500" />
                <span>CONFIDENTIAL</span>
              </span>
              <span>LAN_ZkRS</span>
            </div>

            <div className="my-auto flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Shield className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {playerName}
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40 text-[11px] text-slate-400">
                <Eye className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>Tap to flip and reveal</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
              Zero-Knowledge AES Encrypted
            </div>
          </div>

          {/* BACK: Revealed Secret Role */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-b from-slate-900 to-black border-2 border-slate-700/80 p-5 flex flex-col items-center justify-between shadow-[0_15px_40px_rgba(0,0,0,0.9)]">
            <div className="w-full flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${roleDef.badgeColor}`}>
                {roleDef.faction}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlip();
                }}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Hide role"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 my-auto">
              <div className="p-1 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-xl overflow-hidden">
                <RolePortrait roleId={roleId} size="lg" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white font-cinzel mt-1">
                {roleDef.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-1">
                {roleDef.description}
              </p>
              {roleDef.nightActionDescription && (
                <div className="mt-1 p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-[11px] text-amber-300 font-medium">
                  🌙 Night Action: {roleDef.nightActionDescription}
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 font-mono">
              Do not disclose to other players!
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Button */}
      <div className="w-full max-w-[280px] mt-4">
        <button
          onClick={onAcknowledged}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-rose-900/40 active:scale-[0.98] transition-all"
        >
          I Understand My Role
        </button>
      </div>
    </div>
  );
};
