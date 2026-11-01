/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Live LAN play — real peer-to-peer games over a WebRTC DataChannel.
 *
 * Nothing here touches a server: the host device runs the authoritative engine,
 * guests connect directly to it, and the handshake is exchanged as a QR code or
 * share link. It works with the phone on aeroplane mode joined to a hotspot.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Check,
  Crown,
  Link2,
  Loader2,
  LogOut,
  Play,
  Plus,
  QrCode,
  Radio,
  SkipForward,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { buildShareLink } from '../live/protocol';
import { LiveGuest, LiveHost, LiveSession, LiveSnapshot, phaseLabel } from '../live/session';
import { secondsLeft, syntheticVotes, uiPlayers } from '../live/viewModel';
import { isWebRtcSupported } from '../live/transport';
import { RoleCard } from './RoleCard';
import { NightPhaseView } from './NightPhaseView';
import { DawnReportView } from './DawnReportView';
import { DayDiscussionView } from './DayDiscussionView';
import { TrialVotingView } from './TrialVotingView';
import { GameOverView } from './GameOverView';
import { NominationView } from './live/NominationView';
import { CameraButton, CopyButton, QrDisplay, QrScanner, ShareButton } from './live/QrTools';
import { ROLE_DEFINITIONS } from '../game/rules';

const NAME_KEY = 'MAFIA_LAN_PLAYER_NAME';

const EMPTY_SNAPSHOT: LiveSnapshot = {
  side: 'guest',
  status: 'idle',
  myPlayerId: null,
  publicState: null,
  privateState: null,
  roomCode: null,
  error: null,
  answerToken: null,
  pendingOfferToken: null,
  peerStates: {},
  latencyMs: null,
  clockOffsetMs: 0,
};

function useLiveSnapshot(session: LiveSession | null): LiveSnapshot {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(session?.getSnapshot() ?? EMPTY_SNAPSHOT);
  useEffect(() => {
    if (!session) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }
    setSnapshot(session.getSnapshot());
    return session.subscribe(setSnapshot);
  }, [session]);
  return snapshot;
}

/** Re-render once a second so countdowns tick. */
function useTicker(enabled: boolean): void {
  const [, force] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
}

/* ================================================================== */
/* Root                                                                */
/* ================================================================== */

type Mode = 'home' | 'host' | 'join';

export const LiveGame: React.FC = () => {
  const [mode, setMode] = useState<Mode>('home');
  const [playerName, setPlayerName] = useState<string>(
    () => (typeof window !== 'undefined' && localStorage.getItem(NAME_KEY)) || ''
  );
  const [session, setSession] = useState<LiveSession | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);
  const snapshot = useLiveSnapshot(session);

  // A shared invite link lands here as #join=<token> and drops the guest
  // straight into the join flow.
  useEffect(() => {
    const match = window.location.hash.match(/#join=([^&]+)/);
    if (!match) return;
    const invite = decodeURIComponent(match[1]);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setPendingInvite(invite);
    setSession(new LiveGuest(localStorage.getItem(NAME_KEY)?.trim() || 'Guest'));
    setMode('join');
  }, []);

  useEffect(() => {
    if (playerName.trim()) localStorage.setItem(NAME_KEY, playerName.trim());
  }, [playerName]);

  const leave = useCallback(
    (to: Mode = 'home') => {
      if (session instanceof LiveHost) session.destroy();
      if (session instanceof LiveGuest) session.destroy();
      setSession(null);
      setPendingInvite(null);
      setMode(to);
    },
    [session]
  );

  const startHosting = useCallback(() => {
    const host = new LiveHost(playerName.trim() || 'Host');
    setSession(host);
    setMode('host');
  }, [playerName]);

  const startJoining = useCallback(() => {
    const guest = new LiveGuest(playerName.trim() || 'Guest');
    setSession(guest);
    setMode('join');
  }, [playerName]);

  if (!isWebRtcSupported()) {
    return (
      <Shell>
        <div className="m-auto max-w-sm p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h2 className="font-cinzel text-lg font-bold text-white">Browser not supported</h2>
          <p className="mt-2 text-xs text-slate-400">
            Live play needs WebRTC. Use Chrome, Safari, Edge or Firefox (a recent version), and make
            sure you are on <code className="text-slate-300">https://</code> or localhost.
          </p>
        </div>
      </Shell>
    );
  }

  if (mode === 'home' || !session) {
    return (
      <Shell>
        <HomeScreen
          playerName={playerName}
          onNameChange={setPlayerName}
          onHost={startHosting}
          onJoin={startJoining}
        />
      </Shell>
    );
  }

  if (session instanceof LiveHost) {
    return (
      <Shell>
        <HostExperience host={session} snapshot={snapshot} onLeave={() => leave('home')} />
      </Shell>
    );
  }

  const guest = session as LiveGuest;
  return (
    <Shell>
      <GuestExperience
        guest={guest}
        snapshot={snapshot}
        initialInvite={pendingInvite}
        playerName={playerName}
        onNameChange={setPlayerName}
        onLeave={() => leave('home')}
      />
    </Shell>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-auto w-full max-w-md">
    <div className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-[#0d1017] via-[#090a0f] to-black shadow-2xl shadow-black/60">
      {children}
    </div>
  </div>
);

/* ================================================================== */
/* Home                                                                */
/* ================================================================== */

const HomeScreen: React.FC<{
  playerName: string;
  onNameChange: (value: string) => void;
  onHost: () => void;
  onJoin: () => void;
}> = ({ playerName, onNameChange, onHost, onJoin }) => (
  <div className="flex flex-1 flex-col justify-between p-5">
    <div>
      <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-emerald-400">
        <Radio className="h-3.5 w-3.5" />
        Peer-to-peer · no server
      </div>
      <h1 className="mt-3 font-cinzel text-2xl font-extrabold text-white">
        Play a real game
      </h1>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        Host on one phone, everyone else joins over the same Wi-Fi. Roles travel directly between
        devices — no internet, no accounts, no relay.
      </p>

      <label className="mt-6 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Your name
      </label>
      <input
        value={playerName}
        onChange={event => onNameChange(event.target.value)}
        placeholder="e.g. Alex"
        maxLength={20}
        className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-rose-500"
      />
    </div>

    <div className="space-y-3 pb-2">
      <button
        type="button"
        onClick={onHost}
        className="flex w-full items-center gap-3 rounded-2xl border border-rose-600/50 bg-gradient-to-r from-rose-600 to-red-800 px-4 py-3.5 text-left shadow-lg shadow-rose-950/50 transition-transform active:scale-[0.99]"
      >
        <div className="rounded-xl bg-black/25 p-2">
          <Crown className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Host a table</div>
          <div className="text-[11px] text-rose-100/80">Your device runs the game and deals roles</div>
        </div>
      </button>

      <button
        type="button"
        onClick={onJoin}
        className="flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3.5 text-left transition-colors hover:border-slate-500 hover:bg-slate-800/80"
      >
        <div className="rounded-xl bg-slate-800 p-2">
          <QrCode className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">Join a table</div>
          <div className="text-[11px] text-slate-400">Scan the host's invite or paste a link</div>
        </div>
      </button>
    </div>
  </div>
);

/* ================================================================== */
/* Shared chrome                                                       */
/* ================================================================== */

const TopBar: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}> = ({ title, subtitle, right }) => (
  <div className="flex items-center justify-between border-b border-slate-800 bg-black/40 px-4 py-2.5">
    <div>
      <div className="font-cinzel text-sm font-bold text-white">{title}</div>
      {subtitle && <div className="text-[10px] font-mono text-slate-500">{subtitle}</div>}
    </div>
    {right}
  </div>
);

const ConnectionPill: React.FC<{ online: boolean; label: string }> = ({ online, label }) => (
  <div
    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono ${
      online
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    }`}
  >
    {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
    {label}
  </div>
);

/* ================================================================== */
/* Host                                                                */
/* ================================================================== */

const HostExperience: React.FC<{
  host: LiveHost;
  snapshot: LiveSnapshot;
  onLeave: () => void;
}> = ({ host, snapshot, onLeave }) => {
  useTicker(Boolean(snapshot.publicState?.deadlineAt));

  if (!snapshot.publicState) {
    return <div className="m-auto text-slate-400">Starting table…</div>;
  }

  if (snapshot.publicState.phase === 'lobby') {
    return <HostLobby host={host} snapshot={snapshot} onLeave={onLeave} />;
  }

  return (
    <GameView
      snapshot={snapshot}
      onLeave={onLeave}
      onNightAction={id => host.nightsAction(id)}
      onVote={choice => host.vote(choice)}
      onAccuse={id => host.accuse(id)}
      onChat={text => host.chat(text)}
      onReady={() => host.setReady()}
      onSkip={() => host.forceAdvance()}
      onCallVote={() => host.startVoting()}
      onRestart={() => host.restart()}
      isHost
    />
  );
};

const HostLobby: React.FC<{
  host: LiveHost;
  snapshot: LiveSnapshot;
  onLeave: () => void;
}> = ({ host, snapshot, onLeave }) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pace, setPace] = useState<'quick' | 'normal' | 'deliberate'>('normal');

  const pub = snapshot.publicState!;
  const seated = pub.players.filter(p => p.isHost || p.isBot || p.connected);
  const canStart = seated.length >= 4;
  const seatsNeeded = Math.max(0, 4 - seated.length);
  const shareUrl = snapshot.pendingOfferToken
    ? buildShareLink(window.location.origin + window.location.pathname, 'join', snapshot.pendingOfferToken)
    : '';

  const openInvite = async () => {
    setError(null);
    setBusy(true);
    try {
      await host.createInvite();
      setInviteOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite');
    } finally {
      setBusy(false);
    }
  };

  const applyAnswer = async (token: string) => {
    setError(null);
    setBusy(true);
    try {
      await host.acceptAnswer(token);
      setInviteOpen(false);
      setAnswerText('');
      setScannerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept the answer');
    } finally {
      setBusy(false);
    }
  };

  const changePace = (next: 'quick' | 'normal' | 'deliberate') => {
    setPace(next);
    const timings =
      next === 'quick'
        ? { revealSec: 30, nightSec: 30, dawnSec: 8, daySec: 90, votingSec: 30, trialSec: 30, verdictSec: 8 }
        : next === 'deliberate'
          ? { revealSec: 60, nightSec: 60, dawnSec: 15, daySec: 240, votingSec: 60, trialSec: 60, verdictSec: 15 }
          : { revealSec: 45, nightSec: 45, dawnSec: 12, daySec: 150, votingSec: 45, trialSec: 45, verdictSec: 10 };
    host.setSettings({ timings });
  };

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title="Your table"
        subtitle={`Room ${pub.roomCode}`}
        right={
          <button
            onClick={onLeave}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
            aria-label="Leave table"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Players ({pub.players.length}/16)
          </span>
          <ConnectionPill online label={`${Object.keys(snapshot.peerStates).length} linked`} />
        </div>

        <ul className="space-y-1.5">
          {pub.players.map(player => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {player.isHost ? (
                  <Crown className="h-3.5 w-3.5 text-rose-400" />
                ) : player.isBot ? (
                  <Bot className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <Wifi
                    className={`h-3.5 w-3.5 ${
                      snapshot.peerStates[player.id] === 'connected'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  />
                )}
                <span className="text-sm text-slate-200">{player.name}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {player.isHost ? 'HOST' : player.isBot ? 'BOT' : player.connected ? 'LAN' : '…'}
              </span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openInvite}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-600/50 bg-emerald-600/15 px-3 py-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-600/25 disabled:opacity-50"
          >
            <QrCode className="h-3.5 w-3.5" />
            Invite player
          </button>
          <button
            type="button"
            onClick={() => host.addBot()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add bot
          </button>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pace
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {(['quick', 'normal', 'deliberate'] as const).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => changePace(option)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                  pace === option
                    ? 'border-rose-500/60 bg-rose-600/20 text-rose-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-700/50 bg-rose-950/40 p-2.5 text-[11px] text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {inviteOpen && snapshot.pendingOfferToken && (
          <div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950/80 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Invite · player {pub.players.length > 0 ? pub.players.length : 1}
              </span>
              <button
                onClick={() => {
                  host.cancelInvite();
                  setInviteOpen(false);
                }}
                className="text-slate-500 hover:text-white"
                aria-label="Cancel invite"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <QrDisplay
              value={shareUrl}
              size={240}
              label="Guest scans this, then shows you their reply code."
            />

            <div className="flex flex-wrap gap-2">
              <ShareButton
                url={shareUrl}
                title="Join my Mafia table"
                text="Scan or open this to join the game"
              />
              <CopyButton value={shareUrl} label="Copy link" />
              <CopyButton value={snapshot.pendingOfferToken} label="Copy code" />
            </div>

            <div className="border-t border-slate-800 pt-2.5">
              <span className="text-[11px] font-semibold text-slate-400">
                Step 2 · their reply code
              </span>
              {scannerOpen ? (
                <div className="mt-2">
                  <QrScanner
                    onResult={text => {
                      setScannerOpen(false);
                      void applyAnswer(text);
                    }}
                    onClose={() => setScannerOpen(false)}
                  />
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <CameraButton label="Scan reply" onClick={() => setScannerOpen(true)} />
                  <input
                    value={answerText}
                    onChange={event => setAnswerText(event.target.value)}
                    placeholder="or paste reply link"
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-[11px] text-white outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    disabled={!answerText.trim() || busy}
                    onClick={() => void applyAnswer(answerText)}
                    className="rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-40"
                  >
                    Link
                  </button>
                </div>
              )}
              {busy && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 p-4">
        {!canStart && (
          <p className="mb-2 text-center text-[11px] text-amber-300/90">
            {seatsNeeded} more player{seatsNeeded === 1 ? '' : 's'} needed (or add bots)
          </p>
        )}
        <button
          type="button"
          disabled={!canStart}
          onClick={() => host.startGame()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-800 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-950/50 transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          Deal roles & start
        </button>
      </div>
    </div>
  );
};

/* ================================================================== */
/* Guest                                                               */
/* ================================================================== */

const GuestExperience: React.FC<{
  guest: LiveGuest;
  snapshot: LiveSnapshot;
  initialInvite: string | null;
  playerName: string;
  onNameChange: (value: string) => void;
  onLeave: () => void;
}> = ({ guest, snapshot, initialInvite, playerName, onNameChange, onLeave }) => {
  useTicker(Boolean(snapshot.publicState?.deadlineAt));

  const [inviteInput, setInviteInput] = useState(initialInvite ?? '');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const doJoin = useCallback(
    async (token: string) => {
      setJoinError(null);
      setJoining(true);
      try {
        await guest.join(token, playerName);
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : 'Could not read that invite');
      } finally {
        setJoining(false);
      }
    },
    [guest, playerName]
  );

  const connected = snapshot.status === 'connected' && snapshot.publicState;

  if (connected && snapshot.publicState) {
    return (
      <GameView
        snapshot={snapshot}
        onLeave={onLeave}
        onNightAction={id => guest.nightAction(id)}
        onVote={choice => guest.vote(choice)}
        onAccuse={id => guest.accuse(id)}
        onChat={text => guest.chat(text)}
        onReady={() => guest.ready()}
        isHost={false}
      />
    );
  }

  if (snapshot.answerToken) {
    const answerUrl = buildShareLink(
      window.location.origin + window.location.pathname,
      'answer',
      snapshot.answerToken
    );
    return (
      <div className="flex flex-1 flex-col">
        <TopBar title="Waiting for the host" subtitle={`Hi ${playerName || 'player'}`} />
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-center">
          <p className="text-xs text-slate-400">
            Show this reply code to the host — they scan it and you are in.
          </p>
          <QrDisplay value={answerUrl} size={250} label="" />
          <div className="flex justify-center gap-2">
            <CopyButton value={answerUrl} label="Copy reply link" />
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Waiting for the host to scan…
          </p>
          {snapshot.error && (
            <p className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-2 text-[11px] text-rose-200">
              {snapshot.error}
            </p>
          )}
        </div>
        <div className="border-t border-slate-800 p-4">
          <button
            onClick={onLeave}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 text-xs font-semibold text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title="Join a table"
        subtitle="Same Wi-Fi · direct connection"
        right={
          <button
            onClick={onLeave}
            className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        }
      />

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-xs leading-relaxed text-slate-400">
          Scan the host's invite QR, or open their invite link on this device.
        </p>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Your name at the table
          </label>
          <input
            value={playerName}
            onChange={event => onNameChange(event.target.value)}
            placeholder="e.g. Alex"
            maxLength={20}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
          />
        </div>

        {scannerOpen ? (
          <QrScanner
            onResult={text => {
              setScannerOpen(false);
              setInviteInput(text);
              void doJoin(text);
            }}
            onClose={() => setScannerOpen(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 py-8 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            <QrCode className="h-5 w-5 text-emerald-400" />
            Scan invite QR
          </button>
        )}

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Or paste the invite link / code
          </label>
          <textarea
            value={inviteInput}
            onChange={event => setInviteInput(event.target.value)}
            rows={3}
            placeholder="mafia-lan… or https://…/#join=…"
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 font-mono text-[11px] text-slate-200 outline-none focus:border-rose-500"
          />
          <button
            type="button"
            disabled={!inviteInput.trim() || joining}
            onClick={() => void doJoin(inviteInput)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-40"
          >
            {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Connect
          </button>
        </div>

        {joinError && (
          <p className="rounded-xl border border-rose-700/50 bg-rose-950/40 p-2.5 text-[11px] text-rose-200">
            {joinError}
          </p>
        )}
      </div>
    </div>
  );
};

/* ================================================================== */
/* In-game                                                             */
/* ================================================================== */

const GameView: React.FC<{
  snapshot: LiveSnapshot;
  onLeave: () => void;
  onNightAction: (targetId: string) => unknown;
  onVote: (choice: string) => unknown;
  onAccuse: (targetId: string) => void;
  onChat: (text: string) => void;
  onReady: () => void;
  onSkip?: () => void;
  onCallVote?: () => void;
  onRestart?: () => void;
  isHost: boolean;
}> = ({
  snapshot,
  onLeave,
  onNightAction,
  onVote,
  onAccuse,
  onChat,
  onReady,
  onSkip,
  onCallVote,
  onRestart,
  isHost,
}) => {
  const pub = snapshot.publicState!;
  const priv = snapshot.privateState;
  const myId = snapshot.myPlayerId;
  const players = useMemo(() => uiPlayers(pub, priv, myId), [pub, priv, myId]);
  const me = players.find(p => p.id === myId);
  const alive = players.filter(p => p.isAlive);

  const remaining = secondsLeft(pub.deadlineAt, Date.now() + snapshot.clockOffsetMs);

  const suspect = pub.trialSuspectId ? players.find(p => p.id === pub.trialSuspectId) : undefined;

  const roleDef = priv ? ROLE_DEFINITIONS[priv.role] : null;

  if (!me || !priv) {
    return (
      <div className="m-auto flex flex-col items-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-xs">Syncing with the host…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title={`${phaseLabel(pub.phase)} · Day ${Math.max(1, pub.dayNumber)}`}
        subtitle={`${pub.roomName} · ${pub.roomCode}`}
        right={
          <div className="flex items-center gap-1.5">
            {roleDef && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${roleDef.badgeColor}`}
              >
                {roleDef.name}
              </span>
            )}
            <button
              onClick={onLeave}
              className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white"
              aria-label="Leave game"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        }
      />

      {pub.phase === 'lobby' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <h2 className="font-cinzel text-lg font-bold text-white">You're at the table</h2>
          <p className="max-w-[16rem] text-xs leading-relaxed text-slate-400">
            Waiting for {pub.players.find(p => p.isHost)?.name ?? 'the host'} to deal roles and
            start the game.
          </p>
          <ul className="mt-2 w-full max-w-[16rem] space-y-1 text-left">
            {pub.players.map(p => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px] text-slate-300"
              >
                <span>{p.name}{p.id === myId ? ' (you)' : ''}</span>
                <span className="font-mono text-[9px] text-slate-500">
                  {p.isHost ? 'HOST' : p.isBot ? 'BOT' : p.connected ? 'LAN' : '…'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pub.phase === 'role_reveal' && (
        <div className="flex-1 overflow-y-auto p-4">
          <RoleCard roleId={priv.role} playerName={me.name} />
          <div className="mt-4 space-y-2">
            {priv.teammates.length > 0 && (
              <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-3 text-[11px] text-rose-200">
                <span className="font-bold uppercase tracking-wider">Your syndicate:</span>{' '}
                {priv.teammates.map(t => `${t.name}${t.isAlive ? '' : ' (dead)'}`).join(', ')}
              </div>
            )}
            <button
              type="button"
              onClick={onReady}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white active:scale-[0.99]"
            >
              <Check className="h-4 w-4" />
              I know my role
            </button>
            <p className="text-center text-[11px] text-slate-500">
              The game starts when everyone is ready ({pub.players.filter(p => p.ready).length}/
              {pub.players.length}).
            </p>
          </div>
        </div>
      )}

      {pub.phase === 'night' && (
        <NightPhaseView
          myPlayer={me}
          players={players}
          timeRemainingSec={remaining}
          investigationResult={priv.investigation}
          onSubmitAction={targetId => {
            void onNightAction(targetId);
          }}
        />
      )}

      {pub.phase === 'dawn' && (
        <DawnReportView
          dayNumber={pub.dayNumber}
          eliminatedPlayerIds={pub.lastDawnEliminated}
          savedPlayerIds={pub.lastDawnSaved}
          players={players}
          onProceedToDay={() => (isHost ? onSkip?.() : undefined)}
        />
      )}

      {pub.phase === 'day' && (
        <DayDiscussionView
          dayNumber={pub.dayNumber}
          timeRemainingSec={remaining}
          myPlayer={me}
          players={players}
          onAccusePlayer={onAccuse}
          onSendChatMessage={onChat}
          chatMessages={pub.feed.map(item => ({
            id: item.id,
            senderName: item.senderName,
            text: item.text,
            isSystem: item.isSystem,
          }))}
          onCallVote={() => onCallVote?.()}
          isHost={isHost}
        />
      )}

      {pub.phase === 'voting' && (
        <NominationView
          dayNumber={pub.dayNumber}
          timeRemainingSec={remaining}
          myPlayer={me}
          alivePlayers={players.filter(p => p.isAlive)}
          votedCount={pub.votedCount}
          hasVoted={priv.hasVoted}
          onVote={choice => {
            void onVote(choice);
          }}
        />
      )}

      {pub.phase === 'trial' && suspect && (
        <TrialVotingView
          suspect={{ ...suspect, role: 'villager' }}
          timeRemainingSec={remaining}
          myPlayer={me}
          alivePlayers={alive}
          votes={syntheticVotes(pub.voteTally)}
          onCastVote={choice => {
            void onVote(choice);
          }}
        />
      )}

      {pub.phase === 'verdict' && suspect && (
        <TrialVotingView
          suspect={suspect}
          timeRemainingSec={remaining}
          myPlayer={me}
          alivePlayers={alive}
          votes={syntheticVotes(pub.voteTally)}
          isVerdictConfirmed
          verdictResult={pub.trialVerdict}
          onCastVote={() => undefined}
          onProceedAfterVerdict={() => (isHost ? onSkip?.() : undefined)}
        />
      )}

      {pub.phase === 'game_over' && (
        <GameOverView
          winner={pub.winner}
          winnerReason={pub.winnerReason}
          players={players}
          onRestartGame={() => onRestart?.()}
        />
      )}

      {isHost && pub.phase !== 'game_over' && (
        <div className="flex items-center gap-2 border-t border-slate-800 bg-black/50 px-3 py-2">
          <span className="text-[10px] font-mono text-slate-500">
            {remaining > 0 ? `${remaining}s` : 'host control'}
          </span>
          <div className="ml-auto flex gap-2">
            {pub.phase === 'day' && (
              <button
                type="button"
                onClick={() => onCallVote?.()}
                className="rounded-lg border border-amber-600/50 bg-amber-600/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                Call vote
              </button>
            )}
            <button
              type="button"
              onClick={() => onSkip?.()}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"
            >
              <SkipForward className="h-3 w-3" />
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
