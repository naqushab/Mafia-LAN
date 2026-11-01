/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Volume2, VolumeX, Smartphone, Sliders, Vibrate } from 'lucide-react';
import { sounds, HapticEvent } from '../services/soundEffects';

interface DeviceFrameProps {
  deviceType: 'ios' | 'android';
  onToggleDevice?: () => void;
  children: React.ReactNode;
  title?: string;
  isHostDevice?: boolean;
  ipAddress?: string;
  pingMs?: number;
  onOpenSettings?: () => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  deviceType,
  onToggleDevice,
  children,
  title = 'Mafia LAN: Local WiFi Party Game',
  isHostDevice = false,
  ipAddress = '192.168.1.42',
  pingMs = 12,
  onOpenSettings,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getIsMuted());
  const [isRumbling, setIsRumbling] = useState(false);
  const [activeHapticPulse, setActiveHapticPulse] = useState<HapticEvent | null>(null);

  useEffect(() => {
    const unsubscribe = sounds.subscribeHaptic((event: HapticEvent) => {
      setIsRumbling(true);
      setActiveHapticPulse(event);

      const rumbleTimer = setTimeout(() => {
        setIsRumbling(false);
      }, 320);

      const toastTimer = setTimeout(() => {
        setActiveHapticPulse(current => (current?.timestamp === event.timestamp ? null : current));
      }, 1600);

      return () => {
        clearTimeout(rumbleTimer);
        clearTimeout(toastTimer);
      };
    });

    return unsubscribe;
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.setMuted(next);
  };

  const isIOS = deviceType === 'ios';

  return (
    <div className="flex flex-col items-center select-none">
      {/* Device Header Info bar */}
      <div className="flex items-center justify-between w-[380px] sm:w-[400px] mb-2 px-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDevice}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 transition-colors"
            title="Switch device model frame"
          >
            <Smartphone className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium text-[11px]">
              {isIOS ? 'iPhone 16 Pro' : 'Pixel 9 Pro'}
            </span>
          </button>
          {isHostDevice && (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Host (WSS:8443)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {pingMs}ms
          </span>
          <span className="text-slate-500">•</span>
          
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              aria-label="Open User Settings & Haptics"
              title="Open User Settings & Haptics"
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors rounded hover:bg-slate-800"
            >
              <Sliders className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}

          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hardware Frame Shell with Haptic Rumble Animation */}
      <div
        className={`relative w-[360px] sm:w-[380px] h-[690px] bg-slate-950 rounded-[44px] p-2.5 shadow-2xl border transition-all duration-75 ${
          isRumbling ? 'animate-haptic-rumble ring-2 ring-rose-500/60 shadow-rose-950/80' : ''
        } ${
          isIOS
            ? 'border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10'
            : 'border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-slate-700/40 rounded-[38px]'
        }`}
      >
        {/* Screen Display Container */}
        <div className="relative w-full h-full bg-[#08090d] rounded-[36px] overflow-hidden flex flex-col border border-slate-800/80">
          {/* Mobile Status Bar */}
          <div className="h-9 px-5 flex items-center justify-between text-xs text-slate-300 shrink-0 z-30 pointer-events-none">
            {/* Clock */}
            <span className="font-semibold tracking-tight text-[11px] font-mono">
              21:42
            </span>

            {/* Dynamic Island (iOS) or Camera Hole Punch (Android) */}
            {isIOS ? (
              <div className="w-24 h-6 bg-black rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 ml-auto mr-2.5"></div>
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800"></div>
            )}

            {/* Icons: Wi-Fi, Signal, Battery */}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Floating Tactile Haptic Notification Banner */}
          {activeHapticPulse && (
            <div className="absolute top-10 left-3 right-3 z-40 bg-slate-950/95 border border-rose-500/60 text-white rounded-xl px-3 py-1.5 shadow-2xl flex items-center justify-between pointer-events-none animate-fade-in backdrop-blur-md">
              <div className="flex items-center gap-2 truncate">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="font-bold text-[10px] text-rose-400 uppercase tracking-wider font-mono shrink-0">
                  📳 Haptic
                </span>
                <span className="text-[11px] text-slate-200 truncate font-medium">
                  {activeHapticPulse.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                {activeHapticPulse.pattern.map(p => `${p}ms`).join('-')}
              </span>
            </div>
          )}

          {/* Screen Content Viewport */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative z-10 custom-scrollbar">
            {children}
          </div>

          {/* Mobile Home Bar / Gesture Pill */}
          <div className="h-5 flex items-center justify-center shrink-0 z-30 pointer-events-none">
            <div
              className={`h-1 rounded-full bg-slate-600/60 ${
                isIOS ? 'w-32' : 'w-20'
              }`}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
