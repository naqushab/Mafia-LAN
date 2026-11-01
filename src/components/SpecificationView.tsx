/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Radio,
  Lock,
  Smartphone,
  Palette,
  Cpu,
  Copy,
  Check,
  Download,
  Users,
  Terminal,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { SPEC_METADATA, SPEC_SECTIONS } from '../spec/mafiaSpecData';

export const SpecificationView: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState(SPEC_SECTIONS[0].id);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  // Interactive Role Balance Calculator State
  const [calculatorPlayers, setCalculatorPlayers] = useState(8);

  // Interactive Packet Tester State
  const [selectedPacketType, setSelectedPacketType] = useState<'mDNS' | 'JOIN' | 'ROLE_SEALED' | 'NIGHT_KILL'>('ROLE_SEALED');

  const activeSection = SPEC_SECTIONS.find(s => s.id === activeSectionId) || SPEC_SECTIONS[0];

  const handleCopySection = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSectionId(id);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  const handleDownloadSpec = () => {
    const fullDoc = `# ${SPEC_METADATA.title}\n\n**Version:** ${SPEC_METADATA.version} | **Last Updated:** ${SPEC_METADATA.lastUpdated}\n\n` +
      SPEC_SECTIONS.map(s => `## ${s.title}\n*${s.subtitle}*\n\n${s.contentMarkdown}\n\n`).join('\n---\n\n');
    const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MAFIA_LAN_ENGINEERING_SPEC.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  const getSectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'Radio':
        return <Radio className="w-4 h-4" />;
      case 'Lock':
        return <Lock className="w-4 h-4" />;
      case 'Smartphone':
        return <Smartphone className="w-4 h-4" />;
      case 'Palette':
        return <Palette className="w-4 h-4" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  // Dynamic balance formula for calculator
  const calculateBalance = (count: number) => {
    const mafiaCount = count <= 6 ? 1 : count <= 9 ? 2 : count <= 12 ? 3 : 4;
    const hasGodfather = count >= 7;
    const hasDetective = true;
    const hasDoctor = true;
    const hasVigilante = count >= 9;
    const hasJester = count >= 11;
    const specials = (hasGodfather ? 0 : 0) + (hasDetective ? 1 : 0) + (hasDoctor ? 1 : 0) + (hasVigilante ? 1 : 0) + (hasJester ? 1 : 0);
    const villagers = Math.max(1, count - mafiaCount - specials);
    return {
      mafiaCount,
      hasGodfather,
      hasDetective,
      hasDoctor,
      hasVigilante,
      hasJester,
      villagers,
      mafiaRatio: ((mafiaCount / count) * 100).toFixed(1),
    };
  };

  const balance = calculateBalance(calculatorPlayers);

  const getSamplePacketData = () => {
    switch (selectedPacketType) {
      case 'mDNS':
        return {
          protocol: 'mDNS (UDP 5353)',
          target: '224.0.0.251:5353 (Multicast)',
          payload: {
            service: '_mafia-lan._tcp.local.',
            host: 'iPhone16Pro.local',
            port: 8443,
            txtRecord: {
              code: 'MAFIA-882',
              name: 'Midnight Syndicate Lounge',
              players: '4/10',
              status: 'LOBBY',
              proto_ver: 2,
            },
          },
        };
      case 'JOIN':
        return {
          protocol: 'WSS TLS 1.3 (TCP 8443)',
          target: '192.168.1.42:8443',
          payload: {
            seq: 1,
            type: 'JOIN_REQUEST',
            sender: {
              id: 'client_pixel9_771',
              name: 'Sophia',
              deviceType: 'android',
              ephemeralPublicKey: '9f83a42b10e... (X25519)',
            },
          },
        };
      case 'ROLE_SEALED':
        return {
          protocol: 'ZkRS Sealed Envelope (AES-256-GCM)',
          target: 'Unicast to Client Sophia',
          payload: {
            seq: 14,
            type: 'ROLE_HANDSHAKE_ENCRYPTED',
            iv: '3a0b82f14e7a',
            ciphertext: '98e2a1490bd819a... (Doctor Role Card)',
            authTag: '84b029ff10a9',
            hostCommitmentHash: 'sha256:7b29a... (Prevents Host Tampering)',
          },
        };
      case 'NIGHT_KILL':
        return {
          protocol: 'WSS Encrypted Action',
          target: 'Host State Master',
          payload: {
            seq: 28,
            type: 'NIGHT_ACTION',
            actionType: 'kill',
            targetPlayerId: 'client_iphone_302',
            timestamp: 1793452901200,
            signature: 'ed25519:55a02...',
          },
        };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Spec Header Banner */}
      <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-[#0d101d] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold">
              SPECIFICATION ARCHITECTURE
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-400">v{SPEC_METADATA.version}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-cinzel tracking-tight">
            Android & iOS Local Network Mafia Architecture
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Technical blueprint for cross-platform zero-configuration mDNS discovery, TLS WebSockets, Zero-Knowledge role cryptography, and unified minimalist UI/UX design.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadSpec}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-all shadow-md active:scale-95"
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>Download Spec (.md)</span>
          </button>
        </div>
      </div>

      {/* Main Spec Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 sticky top-6">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-3 py-1 block font-mono">
              Table of Contents
            </span>

            <nav className="space-y-1 mt-1">
              {SPEC_SECTIONS.map(section => {
                const isActive = activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-rose-950/40 text-rose-300 border border-rose-800/60 shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-rose-400' : 'text-slate-500'}>
                        {getSectionIcon(section.icon)}
                      </span>
                      <span className="truncate">{section.title}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Interactive Tool 1: Role Balance Matrix Calculator */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Dynamic Role Balance Calculator
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-300 font-mono text-[11px] mb-1">
                  <span>Player Count</span>
                  <span className="font-bold text-rose-400">{calculatorPlayers} Players</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="16"
                  value={calculatorPlayers}
                  onChange={e => setCalculatorPlayers(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-rose-400 font-bold">Mafia Syndicate:</span>
                  <span>{balance.mafiaCount} ({balance.hasGodfather ? '1 Godfather, ' : ''}{balance.mafiaCount - (balance.hasGodfather ? 1 : 0)} Goons)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sky-400">Detective:</span>
                  <span>{balance.hasDetective ? '1 Active' : '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400">Doctor:</span>
                  <span>{balance.hasDoctor ? '1 Active' : '0'}</span>
                </div>
                {balance.hasVigilante && (
                  <div className="flex justify-between">
                    <span className="text-amber-400">Vigilante:</span>
                    <span>1 (1 Bullet)</span>
                  </div>
                )}
                {balance.hasJester && (
                  <div className="flex justify-between">
                    <span className="text-purple-400">Jester:</span>
                    <span>1 Neutral</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Townspeople:</span>
                  <span>{balance.villagers} Citizens</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Mafia Ratio:</span>
                  <span>{balance.mafiaRatio}% of room</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Tool 2: LAN Protocol Wire Inspector */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                Wire Protocol Packet Inspector
              </h3>
            </div>

            <div className="flex gap-1 mb-2.5 overflow-x-auto pb-1 text-[10px] font-mono">
              {(['mDNS', 'JOIN', 'ROLE_SEALED', 'NIGHT_KILL'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedPacketType(type)}
                  className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                    selectedPacketType === type
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <pre className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-[160px] custom-scrollbar">
              {JSON.stringify(getSamplePacketData(), null, 2)}
            </pre>
          </div>
        </div>

        {/* Section Reading Pane */}
        <div className="lg:col-span-8">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
            {/* Active Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4 mb-6">
              <div>
                <span className="text-xs font-mono text-rose-400 uppercase tracking-wider font-semibold">
                  Section {activeSection.id}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-cinzel mt-1">
                  {activeSection.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {activeSection.subtitle}
                </p>
              </div>

              <button
                onClick={() => handleCopySection(activeSection.contentMarkdown, activeSection.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors self-start sm:self-auto shrink-0"
              >
                {copiedSectionId === activeSection.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Section</span>
                  </>
                )}
              </button>
            </div>

            {/* Markdown Rendered Content */}
            <div className="prose prose-invert max-w-none text-slate-300 text-xs sm:text-sm leading-relaxed space-y-4">
              {activeSection.contentMarkdown.split('\n\n').map((paragraph, idx) => {
                // Table rendering
                if (paragraph.includes('|---')) {
                  const lines = paragraph.trim().split('\n');
                  const headers = lines[0].split('|').map(s => s.trim()).filter(Boolean);
                  const rows = lines.slice(2).map(line => line.split('|').map(s => s.trim()).filter(Boolean));

                  return (
                    <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950 border-b border-slate-800 text-slate-200">
                            {headers.map((h, i) => (
                              <th key={i} className="p-3 font-semibold font-mono">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-800/40">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-3 font-mono text-slate-300">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                // Code block rendering
                if (paragraph.startsWith('```')) {
                  const lines = paragraph.split('\n');
                  const lang = lines[0].replace('```', '') || 'code';
                  const codeContent = lines.slice(1, -1).join('\n');

                  return (
                    <div key={idx} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center text-[11px] font-mono text-slate-400">
                        <span className="uppercase">{lang}</span>
                        <span>LAN Architecture</span>
                      </div>
                      <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto custom-scrollbar">
                        <code>{codeContent}</code>
                      </pre>
                    </div>
                  );
                }

                // Horizontal separator
                if (paragraph.trim() === '---') {
                  return <hr key={idx} className="border-slate-800/80 my-4" />;
                }

                // Header 3 with optional subsequent lines
                if (paragraph.startsWith('### ')) {
                  const lines = paragraph.split('\n');
                  const headerTitle = lines[0].replace('### ', '');
                  const bodyLines = lines.slice(1).join('\n').trim();

                  return (
                    <div key={idx} className="space-y-2 pt-2">
                      <h3 className="text-base sm:text-lg font-bold text-white font-cinzel border-b border-slate-800/80 pb-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>{headerTitle}</span>
                      </h3>
                      {bodyLines && (
                        <p
                          className="text-slate-300 leading-relaxed text-xs sm:text-sm"
                          dangerouslySetInnerHTML={{
                            __html: bodyLines
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                              .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300 font-mono text-xs">$1</code>')
                          }}
                        />
                      )}
                    </div>
                  );
                }

                // Bullet points
                if (paragraph.startsWith('- ')) {
                  return (
                    <ul key={idx} className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 text-xs sm:text-sm">
                      {paragraph.split('\n').map((item, itemIdx) => (
                        <li key={itemIdx} className="leading-relaxed">
                          <span dangerouslySetInnerHTML={{
                            __html: item
                              .replace(/^- /, '')
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                              .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300 font-mono text-xs">$1</code>')
                          }} />
                        </li>
                      ))}
                    </ul>
                  );
                }

                // Standard paragraph
                return (
                  <p
                    key={idx}
                    className="leading-relaxed text-slate-300 text-xs sm:text-sm"
                    dangerouslySetInnerHTML={{
                      __html: paragraph
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                        .replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-rose-300 font-mono text-xs">$1</code>')
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
