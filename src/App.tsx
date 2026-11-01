/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Gamepad2,
  FileText,
  BookOpen,
  Wifi,
  Shield,
  Volume2,
  VolumeX,
  Smartphone,
  ExternalLink,
  Code2,
  Sliders,
  Vibrate,
} from 'lucide-react';
import { GameSimulator } from './components/GameSimulator';
import { LiveGame } from './components/LiveGame';
import { SpecificationView } from './components/SpecificationView';
import { ApkBuildCenter } from './components/ApkBuildCenter';
import { RolePortrait } from './components/RolePortraits';
import { UserSettingsModal } from './components/UserSettingsModal';
import { ROLE_DEFINITIONS } from './game/rules';
import { sounds } from './services/soundEffects';

type NavTab = 'live' | 'simulator' | 'specification' | 'rulebook' | 'apk';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('live');
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans selection:bg-rose-900 selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-[#07080c]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-950 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-950/60 text-white">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white font-cinzel text-base sm:text-lg">
                MAFIA LAN
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                PROD SPEC & APP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Play Mafia with friends over Wifi/LAN
            </p>
          </div>
        </div>

        {/* Primary View Switcher Navigation */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Play Live</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Mobile Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('specification')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'specification'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Technical Spec</span>
          </button>

          <button
            onClick={() => setActiveTab('rulebook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'rulebook'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Role Dossier</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'apk'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>APK & Native Build</span>
          </button>
        </nav>

        {/* Quick Utilities */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>_mafia-lan._tcp:8443</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="User Settings & Haptic Feedback"
            title="User Settings & Haptic Feedback"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
          >
            <Sliders className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Settings & Haptics</span>
          </button>

          <button
            onClick={handleToggleSound}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start py-6 sm:py-8 px-4">
        {/* Keep the live session mounted so switching tabs never drops a table. */}
        <div className={activeTab === 'live' ? 'w-full' : 'hidden'}>
          <LiveGame />
        </div>
        {activeTab === 'simulator' && <GameSimulator />}
        {activeTab === 'specification' && <SpecificationView />}
        {activeTab === 'apk' && <ApkBuildCenter />}
        {activeTab === 'rulebook' && (
          <div className="w-full max-w-5xl mx-auto space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-mono text-rose-400 uppercase tracking-widest font-semibold">
                Intelligence Briefing
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel mt-1">
                Mafia Roles & Allegiance Dossier
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">
                Atmospheric film-noir portrait dossiers and operational powers for all factions in the local network simulation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.values(ROLE_DEFINITIONS).map(role => (
                <div
                  key={role.id}
                  className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 flex flex-col sm:flex-row gap-4 hover:border-slate-700 transition-all shadow-xl group"
                >
                  {/* Portrait Placeholder Container */}
                  <div className="sm:w-32 sm:h-32 w-28 h-28 mx-auto sm:mx-0 shrink-0 rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner group-hover:scale-[1.03] transition-transform">
                    <RolePortrait roleId={role.id} size="lg" />
                  </div>

                  {/* Role Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${role.badgeColor}`}>
                          {role.faction}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          Priority #{role.priority}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white font-cinzel">
                        {role.name}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    {role.nightActionDescription && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300/90 font-mono">
                        🌙 Night Power: {role.nightActionDescription}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#050608] py-4 px-6 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>MAFIA LAN Mobile Specification v2.4</span>
          <span>•</span>
          <span className="text-slate-400">Zero-Config mDNS + TLS WebSockets</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">Targeting Swift 6 & Kotlin Compose</span>
        </div>
      </footer>

      {/* User Settings & Haptics Feedback Modal */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
