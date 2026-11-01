/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Radio, Lock, ShieldCheck, ArrowRightLeft, Activity } from 'lucide-react';
import { NetworkPacket } from '../types/mafia';

interface NetworkInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  packets: NetworkPacket[];
  roomCode: string;
  hostIp: string;
}

export const NetworkInspectorModal: React.FC<NetworkInspectorModalProps> = ({
  isOpen,
  onClose,
  packets,
  roomCode,
  hostIp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/70 border border-indigo-800/50 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">
                  Local Network Protocol Inspector
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE LAN
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                mDNS Service: _mafia-lan._tcp.local. • Subnet: {hostIp.substring(0, 11)}.x:8443
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LAN Security Banner */}
        <div className="px-4 py-2.5 bg-slate-900/30 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero-Knowledge X25519 Ephemeral Handshake</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>AES-256-GCM Pinning Active</span>
          </div>
        </div>

        {/* Packet Stream Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs custom-scrollbar">
          {packets.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Radio className="w-8 h-8 mx-auto mb-2 opacity-40 animate-pulse" />
              <span>Listening for mDNS and TLS WebSocket frame traffic...</span>
            </div>
          ) : (
            packets.map(pkt => (
              <div
                key={pkt.packetId}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                      {pkt.protocol}
                    </span>
                    <span className="font-bold text-white tracking-wide">
                      {pkt.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                    {pkt.encrypted && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Lock className="w-2.5 h-2.5" /> Encrypted
                      </span>
                    )}
                    <span>{new Date(pkt.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="text-slate-300">{pkt.sourceIp}</span>
                  <ArrowRightLeft className="w-3 h-3 text-slate-600" />
                  <span className="text-slate-300">{pkt.destinationIp}</span>
                </div>

                <div className="text-[11px] text-slate-300 bg-black/40 p-2 rounded-lg border border-slate-800/80 break-all">
                  {pkt.payloadSummary}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Packets Captured: {packets.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
