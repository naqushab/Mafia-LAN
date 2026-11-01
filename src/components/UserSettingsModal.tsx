/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Smartphone,
  Vibrate,
  Sliders,
  Sparkles,
  Check,
  Moon,
  Search,
  Gavel,
  ShieldAlert,
  ThumbsUp,
} from 'lucide-react';
import { sounds, HapticIntensity } from '../services/soundEffects';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose }) => {
  const [hapticsEnabled, setHapticsEnabled] = useState(sounds.getIsHapticsEnabled());
  const [intensity, setIntensity] = useState<HapticIntensity>(sounds.getHapticIntensity());
  const [soundEnabled, setSoundEnabled] = useState(!sounds.getIsMuted());
  const [visualSimulation, setVisualSimulation] = useState(sounds.getVisualHapticSimulation());
  const [activeTestPattern, setActiveTestPattern] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHapticsEnabled(sounds.getIsHapticsEnabled());
      setIntensity(sounds.getHapticIntensity());
      setSoundEnabled(!sounds.getIsMuted());
      setVisualSimulation(sounds.getVisualHapticSimulation());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    sounds.setHapticsEnabled(next);
    if (next) {
      sounds.triggerHaptic(40, 'Haptics Enabled');
    }
  };

  const handleIntensityChange = (val: HapticIntensity) => {
    setIntensity(val);
    sounds.setHapticIntensity(val);
    sounds.triggerHaptic(50, `Intensity: ${val}`);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setMuted(!next);
  };

  const handleToggleVisualSimulation = () => {
    const next = !visualSimulation;
    setVisualSimulation(next);
    sounds.setVisualHapticSimulation(next);
  };

  const testHapticPattern = (name: string, pattern: number[], soundTrigger?: () => void) => {
    setActiveTestPattern(name);
    sounds.triggerHaptic(pattern, name);
    if (soundTrigger) {
      soundTrigger();
    }
    setTimeout(() => setActiveTestPattern(null), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-950/70 border border-rose-800/50 text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-cinzel">
                User Settings & Feedback
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Configure vibration haptics, tactile simulation, and sound
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar text-xs">
          {/* Section 1: Haptic Vibration Toggle */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors ${
                  hapticsEnabled
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}>
                  <Vibrate className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">
                    Haptic Vibration Feedback
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Vibrates device during role assignment, nightfall, and trial verdicts
                  </span>
                </div>
              </div>

              {/* iOS style toggle switch */}
              <button
                onClick={handleToggleHaptics}
                role="switch"
                aria-checked={hapticsEnabled}
                aria-label="Toggle haptic vibration feedback"
                className={`w-12 h-6.5 rounded-full p-1 transition-colors relative focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                  hapticsEnabled ? 'bg-rose-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                    hapticsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Haptic Intensity Selector (Active when enabled) */}
            {hapticsEnabled && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
                  Haptic Intensity Profile
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['soft', 'medium', 'heavy'] as const).map(level => {
                    const isSelected = intensity === level;
                    return (
                      <button
                        key={level}
                        onClick={() => handleIntensityChange(level)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-rose-950/60 border-rose-500 text-white font-bold shadow-md shadow-rose-950/40'
                            : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="capitalize block text-xs">{level}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {level === 'soft' ? 'Crisp (0.7x)' : level === 'medium' ? 'Standard (1.0x)' : 'Deep (1.4x)'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Visual Tactile Simulation */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-800/40 text-indigo-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white text-xs block">
                  Simulated Frame Rumble & Pulse
                </span>
                <span className="text-[11px] text-slate-400">
                  Visually shakes phone frame & triggers on-screen tactile ripples during testing
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleVisualSimulation}
              role="switch"
              aria-checked={visualSimulation}
              aria-label="Toggle simulated frame rumble"
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative focus:outline-none ${
                visualSimulation ? 'bg-indigo-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                  visualSimulation ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 3: Audio Sound Effects */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-rose-400" />}
              </div>
              <div>
                <span className="font-bold text-white text-xs block">
                  Synthesized Sound Effects
                </span>
                <span className="text-[11px] text-slate-400">
                  Web Audio chimes, heartbeats, clocks, and gavel thuds
                </span>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Toggle sound effects"
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative focus:outline-none ${
                soundEnabled ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                  soundEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 4: Interactive Vibration Pattern Test Bench */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Vibration Pattern Test Bench
              </span>
              {activeTestPattern && (
                <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
                  Testing: {activeTestPattern}...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Tap any trigger below to immediately simulate the exact mobile vibration waveform:
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <button
                onClick={() => testHapticPattern('Role Assigned', [40, 60, 40], () => sounds.playCardFlip())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">1. Role Assigned</span>
                  <span className="text-[10px] text-slate-500">[40, 60, 40ms]</span>
                </div>
              </button>

              <button
                onClick={() => testHapticPattern('Nightfall Descends', [80, 50, 100, 50, 150], () => sounds.playNightEnter())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">2. Night Phase</span>
                  <span className="text-[10px] text-slate-500">[80, 50, 100, 150ms]</span>
                </div>
              </button>

              <button
                onClick={() => testHapticPattern('Detective Inquiry', [100, 50, 100], () => sounds.playVoteClick())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <Search className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">3. Detective Alert</span>
                  <span className="text-[10px] text-slate-500">[100, 50, 100ms]</span>
                </div>
              </button>

              <button
                onClick={() => testHapticPattern('Gavel Verdict', [120, 60, 140], () => sounds.playGavelStrike())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <Gavel className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">4. Gavel Verdict</span>
                  <span className="text-[10px] text-slate-500">[120, 60, 140ms]</span>
                </div>
              </button>

              <button
                onClick={() => testHapticPattern('Doctor Shield Save', [30, 40, 30], () => sounds.playDawnChime())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">5. Doctor Save</span>
                  <span className="text-[10px] text-slate-500">[30, 40, 30ms]</span>
                </div>
              </button>

              <button
                onClick={() => testHapticPattern('Ballot Cast', [30], () => sounds.playVoteClick())}
                className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors flex items-center gap-2 text-slate-200"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold block truncate">6. Vote Cast</span>
                  <span className="text-[10px] text-slate-500">[30ms]</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span className="text-[11px] text-slate-500">
            {hapticsEnabled ? 'Haptics Active' : 'Haptics Muted'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
          >
            Save & Return
          </button>
        </div>
      </div>
    </div>
  );
};
