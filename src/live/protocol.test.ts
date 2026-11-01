/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROTOCOL_VERSION,
  SignalToken,
  buildShareLink,
  decodeSignal,
  encodeSignal,
} from './protocol.ts';

const offer: SignalToken = {
  v: PROTOCOL_VERSION,
  k: 'offer',
  sdp: 'v=0\r\no=- 42 2 IN IP4 127.0.0.1\r\ns=-\r\n',
  room: 'ABC123',
  name: 'Host',
};

test('signaling tokens survive an encode/decode round-trip', () => {
  const decoded = decodeSignal(encodeSignal(offer));
  assert.deepEqual(decoded, offer);
});

test('a shared join link can be pasted directly into the guest screen', () => {
  const token = encodeSignal(offer);
  const link = buildShareLink('https://example.test/Mafia-LAN/', 'join', token);
  assert.deepEqual(decodeSignal(link), offer);
});

test('answer links decode to their answer token', () => {
  const answer: SignalToken = { ...offer, k: 'answer', name: undefined };
  const token = encodeSignal(answer);
  assert.equal(decodeSignal(buildShareLink('https://example.test/', 'answer', token)).k, 'answer');
});

test('non-invite text is rejected with a helpful error', () => {
  assert.throws(() => decodeSignal('definitely-not-a-code'), /Not a Mafia LAN invite code|Invalid/);
});
