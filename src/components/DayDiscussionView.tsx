/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sun, Clock, MessageSquare, AlertTriangle, Send, Gavel } from 'lucide-react';
import { Player } from '../types/mafia';
import { sounds } from '../services/soundEffects';

interface DayDiscussionViewProps {
  dayNumber: number;
  timeRemainingSec: number;
  myPlayer: Player;
  players: Player[];
  onAccusePlayer: (targetId: string) => void;
  onSendChatMessage: (text: string) => void;
  chatMessages: Array<{ id: string; senderName: string; text: string; isSystem?: boolean }>;
  onCallVote: () => void;
  isHost: boolean;
}

export const DayDiscussionView: React.FC<DayDiscussionViewProps> = ({
  dayNumber,
  timeRemainingSec,
  myPlayer,
  players,
  onAccusePlayer,
  onSendChatMessage,
  chatMessages,
  onCallVote,
  isHost,
}) => {
  const [inputText, setInputText] = useState('');
  const [accusedId, setAccusedId] = useState<string | null>(null);

  const alivePlayers = players.filter(p => p.isAlive);
  const otherAlivePlayers = alivePlayers.filter(p => p.id !== myPlayer.id);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendChatMessage(inputText.trim());
    setInputText('');
  };

  const handleNominate = (targetId: string) => {
    sounds.playVoteClick();
    setAccusedId(targetId);
    onAccusePlayer(targetId);
  };

  return (
    <div className="flex flex-col h-full p-4 justify-between bg-gradient-to-b from-[#0b0d14] via-[#08090d] to-black">
      {/* Header: Day number & Timer */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-cinzel">
                Day {dayNumber} Discussion
              </span>
              <p className="text-[10px] text-slate-500">Share alibis, suspect behaviors</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 font-mono text-xs text-amber-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeRemainingSec}s</span>
          </div>
        </div>

        {/* Accuse Quick Picker */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" /> Nominate Suspect for Trial
            </span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
            {otherAlivePlayers.map(p => {
              const isSelected = accusedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleNominate(p.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discussion Chat Transcript Area */}
      <div className="flex-1 my-2 min-h-0 bg-slate-950/60 rounded-xl border border-slate-800/80 p-2.5 flex flex-col justify-between overflow-hidden">
        <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
          {chatMessages.length === 0 ? (
            <div className="text-center py-6 text-slate-600">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-50" />
              <span>No accusations spoken yet. Type below to present evidence.</span>
            </div>
          ) : (
            chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg text-left ${
                  msg.isSystem
                    ? 'bg-amber-950/20 border border-amber-900/40 text-amber-300 font-mono text-[11px]'
                    : msg.senderName === myPlayer.name
                    ? 'bg-slate-800/80 border border-slate-700/60 text-slate-200 ml-4'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-300 mr-4'
                }`}
              >
                {!msg.isSystem && (
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                    {msg.senderName}
                  </span>
                )}
                <p className="leading-snug break-words">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-1.5">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type your argument or alibi..."
            className="flex-1 bg-slate-900 border border-slate-700/70 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Footer: Proceed to Trial Button */}
      <div className="pt-1">
        <button
          onClick={onCallVote}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-700 hover:to-rose-600 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-rose-950/40 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>Call Town to Gallows Trial</span>
        </button>
      </div>
    </div>
  );
};
