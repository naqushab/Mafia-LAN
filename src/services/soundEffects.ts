/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HapticIntensity = 'soft' | 'medium' | 'heavy';

export interface HapticEvent {
  name: string;
  pattern: number[];
  timestamp: number;
}

type HapticListener = (event: HapticEvent) => void;

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isHapticsEnabled: boolean = true;
  private hapticIntensity: HapticIntensity = 'medium';
  private visualHapticSimulation: boolean = true;
  private listeners: Set<HapticListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedHaptics = window.localStorage.getItem('MAFIA_HAPTICS_ENABLED');
        if (savedHaptics !== null) {
          this.isHapticsEnabled = savedHaptics === 'true';
        }
        const savedIntensity = window.localStorage.getItem('MAFIA_HAPTIC_INTENSITY') as HapticIntensity;
        if (savedIntensity && ['soft', 'medium', 'heavy'].includes(savedIntensity)) {
          this.hapticIntensity = savedIntensity;
        }
        const savedMute = window.localStorage.getItem('MAFIA_SOUND_MUTED');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
      } catch {}
    }
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- Sound controls ---
  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('MAFIA_SOUND_MUTED', String(muted));
      }
    } catch {}
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // --- Haptic controls ---
  public setHapticsEnabled(enabled: boolean) {
    this.isHapticsEnabled = enabled;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('MAFIA_HAPTICS_ENABLED', String(enabled));
      }
    } catch {}
  }

  public getIsHapticsEnabled(): boolean {
    return this.isHapticsEnabled;
  }

  public setHapticIntensity(intensity: HapticIntensity) {
    this.hapticIntensity = intensity;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('MAFIA_HAPTIC_INTENSITY', intensity);
      }
    } catch {}
  }

  public getHapticIntensity(): HapticIntensity {
    return this.hapticIntensity;
  }

  public setVisualHapticSimulation(enabled: boolean) {
    this.visualHapticSimulation = enabled;
  }

  public getVisualHapticSimulation(): boolean {
    return this.visualHapticSimulation;
  }

  public subscribeHaptic(listener: HapticListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Main vibration execution method
   */
  public triggerHaptic(rawPattern: number | number[] = 40, eventName: string = 'Haptic Pulse') {
    if (!this.isHapticsEnabled) return;

    // Apply intensity multiplier
    const multiplier = this.hapticIntensity === 'soft' ? 0.7 : this.hapticIntensity === 'heavy' ? 1.4 : 1.0;
    const patternArr = Array.isArray(rawPattern) ? rawPattern : [rawPattern];
    const scaledPattern = patternArr.map(duration => Math.max(10, Math.round(duration * multiplier)));

    // 1. Hardware mobile vibration via Web Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(scaledPattern);
      } catch {
        // Ignored if unsupported
      }
    }

    // 2. Notify subscribers for visual feedback (screen ripple / device frame rumble)
    if (this.visualHapticSimulation) {
      const event: HapticEvent = {
        name: eventName,
        pattern: scaledPattern,
        timestamp: Date.now(),
      };
      this.listeners.forEach(cb => {
        try {
          cb(event);
        } catch {}
      });
    }
  }

  // --- Dedicated game event haptic triggers ---
  public playRoleChosenHaptic() {
    this.triggerHaptic([40, 60, 40], 'Role Assigned');
  }

  public playNightPhaseHaptic() {
    this.triggerHaptic([80, 50, 100, 50, 150], 'Nightfall Descends');
  }

  public playDetectiveHaptic(isSuspicious: boolean) {
    this.triggerHaptic(
      isSuspicious ? [120, 60, 120] : [40],
      isSuspicious ? 'Detective: Suspect Guilty' : 'Detective: Suspect Innocent'
    );
  }

  public playGavelHaptic() {
    this.triggerHaptic([120, 60, 140], 'Gavel Verdict');
  }

  public playDoctorSaveHaptic() {
    this.triggerHaptic([30, 40, 30], 'Doctor Healed');
  }

  // --- Audio Sound Synthesis ---
  public playCardFlip() {
    this.playRoleChosenHaptic();
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playNightEnter() {
    this.playNightPhaseHaptic();
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Low atmospheric minor chord
    [110, 130.81, 164.81].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.12, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + 1.2);
    });
  }

  public playDawnChime() {
    this.triggerHaptic([40, 30, 40], 'Dawn Chime');
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Bright bell chord
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.8);
    });
  }

  public playGavelStrike() {
    this.playGavelHaptic();
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playTick() {
    this.triggerHaptic(15, 'Timer Tick');
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  public playVoteClick() {
    this.triggerHaptic(30, 'Vote Cast');
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playVictoryFanfare(isMafiaWin: boolean) {
    this.triggerHaptic([80, 50, 100, 50, 150], 'Victory Fanfare');
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = isMafiaWin ? [220, 261.63, 246.94, 207.65] : [440, 554.37, 659.25, 880];

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isMafiaWin ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);

      gain.gain.setValueAtTime(0.2, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.6);
    });
  }
}

export const sounds = new SoundEffectsService();
