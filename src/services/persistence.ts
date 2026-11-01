/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from '../types/mafia';

const STORAGE_KEY = 'MAFIA_LAN_ACTIVE_SESSION_V2';

export interface PersistentSession {
  roomCode: string;
  roomName: string;
  myPlayerId: string;
  phase: string;
  dayNumber: number;
  players: any[];
  savedAt: number;
  seq: number;
  votes: Record<string, string>;
  nightActions: Record<string, any>;
  pendingOfflineActions: any[];
}

export function saveGameSession(state: GameState, pendingQueue: any[] = []): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload: PersistentSession = {
      roomCode: state.roomCode,
      roomName: state.roomName,
      myPlayerId: state.myPlayerId,
      phase: state.phase,
      dayNumber: state.dayNumber,
      players: state.players,
      savedAt: Date.now(),
      seq: state.packetHistory.length,
      votes: state.votes,
      nightActions: state.nightActions,
      pendingOfflineActions: pendingQueue,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to persist session to localStorage', err);
  }
}

export function loadGameSession(): PersistentSession | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistentSession;
    // Expire sessions older than 2 hours
    if (Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGameSession(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}
