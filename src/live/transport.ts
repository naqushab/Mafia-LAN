/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WebRTC transport for live LAN games.
 *
 * No signaling server and no STUN: the SDP for each peer is exchanged by hand
 * (QR code, share link or copy/paste), and ICE only produces host candidates —
 * which is exactly what two devices on the same Wi-Fi need. The result is a
 * real peer-to-peer DataChannel that works with no internet at all.
 */

import { SignalToken, decodeSignal, encodeSignal, PROTOCOL_VERSION } from './protocol';

const ICE_GATHER_TIMEOUT_MS = 4000;

export interface PeerHandlers {
  onOpen: () => void;
  onMessage: (data: unknown) => void;
  onClose: (reason: string) => void;
  onStateChange?: (state: RTCPeerConnectionState) => void;
}

export interface HostPeer {
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
  offerToken: string;
  applyAnswer: (answerToken: string) => Promise<void>;
  send: (payload: unknown) => void;
  close: () => void;
}

export interface GuestPeer {
  pc: RTCPeerConnection;
  answerToken: string;
  /** Resolves once the host's DataChannel arrives and opens. */
  whenOpen: Promise<RTCDataChannel>;
  send: (payload: unknown) => void;
  close: () => void;
}

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise<void>(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    const timer = setTimeout(finish, ICE_GATHER_TIMEOUT_MS);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

function newPeerConnection(handlers: PeerHandlers): RTCPeerConnection {
  const pc = new RTCPeerConnection({ iceServers: [] });
  pc.addEventListener('connectionstatechange', () => {
    handlers.onStateChange?.(pc.connectionState);
    if (pc.connectionState === 'failed') handlers.onClose('Connection failed');
    if (pc.connectionState === 'closed') handlers.onClose('Connection closed');
  });
  return pc;
}

function wireChannel(channel: RTCDataChannel, handlers: PeerHandlers): void {
  channel.binaryType = 'arraybuffer';
  channel.addEventListener('open', handlers.onOpen);
  channel.addEventListener('close', () => handlers.onClose('Peer disconnected'));
  channel.addEventListener('message', event => {
    try {
      handlers.onMessage(JSON.parse(String(event.data)));
    } catch {
      /* ignore malformed frames */
    }
  });
}

function sendOn(channel: RTCDataChannel, payload: unknown): void {
  if (channel.readyState !== 'open') return;
  try {
    channel.send(JSON.stringify(payload));
  } catch {
    /* channel died between the check and the send */
  }
}

/* ------------------------------------------------------------------ */
/* Host side                                                           */
/* ------------------------------------------------------------------ */

export async function createHostPeer(
  handlers: PeerHandlers,
  meta: { room: string; name: string }
): Promise<HostPeer> {
  const pc = newPeerConnection(handlers);
  const channel = pc.createDataChannel('mafia-lan', { ordered: true });
  wireChannel(channel, handlers);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceGathering(pc);

  const offerToken = encodeSignal({
    v: PROTOCOL_VERSION,
    k: 'offer',
    sdp: pc.localDescription?.sdp ?? '',
    room: meta.room,
    name: meta.name,
  });

  return {
    pc,
    channel,
    offerToken,
    send: payload => sendOn(channel, payload),
    applyAnswer: async (answerToken: string) => {
      const token = decodeSignal(answerToken);
      if (token.k !== 'answer') throw new Error('That is not an answer code — scan the guest\'s reply instead');
      await pc.setRemoteDescription({ type: 'answer', sdp: token.sdp });
    },
    close: () => {
      try {
        channel.close();
      } catch {
        /* already closed */
      }
      pc.close();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Guest side                                                          */
/* ------------------------------------------------------------------ */

export async function createGuestPeer(
  offerToken: string,
  handlers: PeerHandlers
): Promise<GuestPeer> {
  const token: SignalToken = decodeSignal(offerToken);
  if (token.k !== 'offer') throw new Error('That code is an answer, not an invite');

  const pc = newPeerConnection(handlers);
  let opened: RTCDataChannel | null = null;
  const pending: unknown[] = [];

  const channelPromise = new Promise<RTCDataChannel>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('The host never answered. Ask them to scan again.')),
      45000
    );
    pc.addEventListener('datachannel', event => {
      clearTimeout(timeout);
      opened = event.channel;
      wireChannel(event.channel, handlers);
      event.channel.addEventListener('open', () => {
        // Anything queued before the channel opened (the hello frame) goes out now.
        for (const payload of pending.splice(0)) sendOn(event.channel, payload);
        resolve(event.channel);
      });
    });
  });

  await pc.setRemoteDescription({ type: 'offer', sdp: token.sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceGathering(pc);

  const answerToken = encodeSignal({
    v: PROTOCOL_VERSION,
    k: 'answer',
    sdp: pc.localDescription?.sdp ?? '',
    room: token.room,
  });

  return {
    pc,
    answerToken,
    whenOpen: channelPromise,
    send: payload => {
      if (opened && opened.readyState === 'open') sendOn(opened, payload);
      else pending.push(payload);
    },
    close: () => pc.close(),
  };
}

/* ------------------------------------------------------------------ */
/* Environment helpers                                                 */
/* ------------------------------------------------------------------ */

export function isWebRtcSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function';
}

export function isSecureContextForLan(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}
