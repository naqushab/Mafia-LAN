/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoleId } from '../types/mafia';

interface RolePortraitProps {
  roleId: RoleId;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const RolePortrait: React.FC<RolePortraitProps> = ({
  roleId,
  className = '',
  size = 'md',
  showBadge = false,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44',
  }[size];

  const renderSvgPortrait = () => {
    switch (roleId) {
      case 'godfather':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="gf-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#2a0808" />
                <stop offset="60%" stopColor="#140404" />
                <stop offset="100%" stopColor="#050101" />
              </radialGradient>
              <linearGradient id="gf-rim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#dc2626" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="gf-gold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#gf-bg)" />
            {/* Ambient vignette particles */}
            <circle cx="40" cy="50" r="1.5" fill="#f87171" opacity="0.3" />
            <circle cx="160" cy="70" r="1" fill="#fbbf24" opacity="0.3" />
            {/* Shoulders / Tuxedo */}
            <path d="M20 200 L55 130 L100 155 L145 130 L180 200 Z" fill="#0c0d12" stroke="#262a36" strokeWidth="1.5" />
            {/* Red Rose on Lapel */}
            <circle cx="68" cy="148" r="7" fill="#ef4444" />
            <circle cx="68" cy="148" r="4" fill="#991b1b" />
            {/* Gold Lapel Pin */}
            <circle cx="68" cy="160" r="2" fill="url(#gf-gold)" />
            {/* Shirt collar & Bowtie */}
            <polygon points="90,145 100,165 110,145" fill="#e2e8f0" opacity="0.9" />
            <polygon points="93,148 100,154 107,148 107,156 100,152 93,156" fill="#1e293b" />
            {/* Head & Neck silhouette */}
            <path d="M85 145 L85 125 L115 125 L115 145 Z" fill="#181a20" />
            <ellipse cx="100" cy="100" rx="32" ry="38" fill="#1e2129" />
            {/* Sharp jawline shadow */}
            <path d="M72 105 Q100 142 128 105 Z" fill="#13151b" />
            {/* Fedora Hat */}
            <path d="M50 78 Q100 70 150 78 Q130 73 100 74 Q70 73 50 78 Z" fill="#2d3342" />
            <ellipse cx="100" cy="74" rx="55" ry="10" fill="#171922" stroke="url(#gf-rim)" strokeWidth="1" />
            <path d="M68 74 C66 42 75 35 100 34 C125 35 134 42 132 74 Z" fill="#12141c" stroke="#2d3342" strokeWidth="1.5" />
            {/* Crimson Hat Ribbon */}
            <path d="M68 68 C78 65 122 65 132 68 L132 74 C122 71 78 71 68 74 Z" fill="#dc2626" opacity="0.9" />
            {/* Crimson Rim Light Edge */}
            <path d="M132 40 C140 60 142 90 135 115 C130 130 120 140 115 145" fill="none" stroke="url(#gf-rim)" strokeWidth="2.5" opacity="0.8" />
            {/* Cigar Glow */}
            <line x1="102" y1="120" x2="118" y2="128" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <circle cx="118" cy="128" r="2.5" fill="#f97316" />
            <circle cx="118" cy="128" r="5" fill="#ef4444" opacity="0.3" />
          </svg>
        );

      case 'mafia':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="mafia-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#220a0a" />
                <stop offset="60%" stopColor="#110505" />
                <stop offset="100%" stopColor="#040202" />
              </radialGradient>
              <linearGradient id="mafia-rim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#mafia-bg)" />
            {/* Overcoat with high popped collar */}
            <path d="M15 200 L45 135 L65 115 L85 145 L115 145 L135 115 L155 135 L185 200 Z" fill="#0f1117" stroke="#252936" strokeWidth="1.5" />
            {/* Raised collar points */}
            <polygon points="65,115 78,140 60,145" fill="#1b1e28" stroke="url(#mafia-rim)" strokeWidth="1" />
            <polygon points="135,115 122,140 140,145" fill="#1b1e28" />
            {/* Head & Face in shadow */}
            <ellipse cx="100" cy="98" rx="28" ry="34" fill="#161820" />
            {/* Fedora tilted menacingly */}
            <ellipse cx="100" cy="75" rx="52" ry="11" fill="#141720" stroke="#333947" strokeWidth="1" />
            <path d="M70 75 C68 46 76 38 100 37 C124 38 132 46 130 75 Z" fill="#0d0f15" />
            {/* Fedora creased indent */}
            <path d="M88 44 Q100 52 112 44" fill="none" stroke="#242836" strokeWidth="2" />
            {/* Dark shadow veil across eyes */}
            <path d="M68 76 Q100 88 132 76 L130 92 Q100 102 70 92 Z" fill="#07080b" />
            {/* Gun barrel silhouette in corner */}
            <path d="M28 175 L52 165 L54 185 L35 195 Z" fill="#08090d" stroke="#2f3542" strokeWidth="1" />
            {/* Crimson edge glow */}
            <path d="M66 50 C58 75 58 115 65 145" fill="none" stroke="url(#mafia-rim)" strokeWidth="2" />
          </svg>
        );

      case 'detective':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="det-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#081e2e" />
                <stop offset="60%" stopColor="#040e17" />
                <stop offset="100%" stopColor="#020508" />
              </radialGradient>
              <linearGradient id="det-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#det-bg)" />
            {/* Rain streaks background */}
            <line x1="30" y1="20" x2="20" y2="50" stroke="#0ea5e9" opacity="0.15" strokeWidth="1" />
            <line x1="170" y1="40" x2="160" y2="70" stroke="#0ea5e9" opacity="0.15" strokeWidth="1" />
            {/* Trench coat with wide notched lapels */}
            <path d="M20 200 L55 130 L85 145 L100 135 L115 145 L145 130 L180 200 Z" fill="#131722" stroke="#283244" strokeWidth="1.5" />
            {/* Necktie */}
            <polygon points="96,140 104,140 102,175 98,175" fill="#0369a1" />
            {/* Head & Face */}
            <ellipse cx="100" cy="98" rx="29" ry="35" fill="#1b212f" />
            {/* Fedora with wide brim */}
            <ellipse cx="100" cy="74" rx="54" ry="11" fill="#171d2a" stroke="url(#det-cyan)" strokeWidth="1" />
            <path d="M70 74 C68 44 76 36 100 35 C124 36 132 44 130 74 Z" fill="#0f131c" />
            {/* Cyan rim lighting on coat & hat */}
            <path d="M130 45 C142 65 146 100 138 128 L148 150" fill="none" stroke="url(#det-cyan)" strokeWidth="2.5" />
            {/* Magnifying Glass Emblem */}
            <circle cx="145" cy="155" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" opacity="0.8" />
            <circle cx="145" cy="155" r="10" fill="#38bdf8" opacity="0.15" />
            <line x1="155" y1="165" x2="170" y2="180" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'doctor':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="doc-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#062418" />
                <stop offset="60%" stopColor="#03130d" />
                <stop offset="100%" stopColor="#010604" />
              </radialGradient>
              <linearGradient id="doc-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#doc-bg)" />
            {/* White/grey physician coat */}
            <path d="M25 200 L58 135 L90 145 L100 140 L110 145 L142 135 L175 200 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
            {/* Stethoscope around neck */}
            <path d="M78 135 C75 165 85 185 100 185 C115 185 125 165 122 135" fill="none" stroke="#64748b" strokeWidth="2.5" />
            <circle cx="100" cy="186" r="6" fill="#34d399" stroke="#10b981" strokeWidth="1.5" />
            {/* Head & round vintage spectacles */}
            <ellipse cx="100" cy="98" rx="29" ry="35" fill="#1b242e" />
            {/* Round spectacles */}
            <circle cx="90" cy="95" r="7" fill="none" stroke="#34d399" strokeWidth="1.5" />
            <circle cx="110" cy="95" r="7" fill="none" stroke="#34d399" strokeWidth="1.5" />
            <line x1="97" y1="95" x2="103" y2="95" stroke="#34d399" strokeWidth="1.5" />
            {/* Doctor hair / cap */}
            <path d="M72 88 C70 55 80 48 100 48 C120 48 130 55 128 88 Z" fill="#0f172a" />
            {/* Medical Cross Emblem */}
            <rect x="52" y="165" width="14" height="4" fill="#34d399" rx="1" />
            <rect x="57" y="160" width="4" height="14" fill="#34d399" rx="1" />
            {/* Emerald Mist Rim */}
            <path d="M128 55 C138 75 142 105 135 130" fill="none" stroke="url(#doc-emerald)" strokeWidth="2.5" />
          </svg>
        );

      case 'vigilante':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="vig-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#291a05" />
                <stop offset="60%" stopColor="#140d02" />
                <stop offset="100%" stopColor="#050300" />
              </radialGradient>
              <linearGradient id="vig-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#vig-bg)" />
            {/* Dark rugged leather jacket */}
            <path d="M20 200 L55 135 L80 145 L100 138 L120 145 L145 135 L180 200 Z" fill="#18130e" stroke="#3d2c16" strokeWidth="1.5" />
            {/* Bandana covering lower face */}
            <polygon points="76,105 100,132 124,105" fill="#2d1b0d" stroke="#54371a" strokeWidth="1" />
            {/* Head & hooded/knit cap */}
            <ellipse cx="100" cy="95" rx="28" ry="34" fill="#1f1812" />
            <path d="M72 85 C70 52 80 44 100 44 C120 44 130 52 128 85 Z" fill="#0d0905" />
            {/* Intense Eyes */}
            <circle cx="89" cy="94" r="2" fill="#fbbf24" />
            <circle cx="111" cy="94" r="2" fill="#fbbf24" />
            {/* Crosshair Target Reticle */}
            <circle cx="145" cy="65" r="14" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.8" />
            <line x1="145" y1="46" x2="145" y2="84" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
            <line x1="126" y1="65" x2="164" y2="65" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
            {/* Amber rim light */}
            <path d="M128 50 C140 70 144 105 138 135" fill="none" stroke="url(#vig-amber)" strokeWidth="2.5" />
          </svg>
        );

      case 'jester':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="jes-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#250930" />
                <stop offset="60%" stopColor="#120417" />
                <stop offset="100%" stopColor="#040105" />
              </radialGradient>
              <linearGradient id="jes-purple" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#jes-bg)" />
            {/* Harlequin dual collar */}
            <path d="M25 200 L60 135 L80 150 L100 135 L120 150 L140 135 L175 200 Z" fill="#150a1c" stroke="#3b1b4d" strokeWidth="1.5" />
            {/* Split harlequin mask */}
            <ellipse cx="100" cy="100" rx="30" ry="36" fill="#1d0e26" />
            <path d="M100 64 C116 64 130 80 130 100 C130 120 116 136 100 136 Z" fill="#3b1550" />
            {/* Creepy sly smile */}
            <path d="M85 116 Q100 132 115 116" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
            {/* Jester 2-horned cowl with bells */}
            <path d="M72 80 C60 55 45 60 48 78 C52 90 70 88 72 88" fill="#581c87" />
            <circle cx="46" cy="74" r="3.5" fill="#fbbf24" />
            <path d="M128 80 C140 55 155 60 152 78 C148 90 130 88 128 88" fill="#7e22ce" />
            <circle cx="154" cy="74" r="3.5" fill="#fbbf24" />
            {/* Mystic purple sparkles */}
            <circle cx="155" cy="140" r="1.5" fill="#e879f9" />
            <circle cx="45" cy="130" r="1.5" fill="#e879f9" />
            {/* Glowing rim */}
            <path d="M130 65 C142 85 145 115 138 140" fill="none" stroke="url(#jes-purple)" strokeWidth="2.5" />
          </svg>
        );

      default: // villager / townsperson
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
            <defs>
              <radialGradient id="vil-bg" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#0d1b2a" />
                <stop offset="60%" stopColor="#08101a" />
                <stop offset="100%" stopColor="#030508" />
              </radialGradient>
              <linearGradient id="vil-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="200" height="200" fill="url(#vil-bg)" />
            {/* Sturdy town coat & vest */}
            <path d="M22 200 L56 135 L85 145 L100 138 L115 145 L144 135 L178 200 Z" fill="#141c2b" stroke="#25354e" strokeWidth="1.5" />
            <polygon points="90,145 100,165 110,145" fill="#334155" />
            {/* Head & Flat Working Cap */}
            <ellipse cx="100" cy="98" rx="28" ry="34" fill="#1b2434" />
            {/* Flat cap */}
            <ellipse cx="100" cy="74" rx="46" ry="10" fill="#162030" stroke="#3b5275" strokeWidth="1" />
            <path d="M68 74 C66 52 76 46 100 46 C124 46 134 52 132 74 Z" fill="#101724" />
            <path d="M72 74 Q100 80 128 74" fill="none" stroke="#475569" strokeWidth="2" />
            {/* Warm Lantern Glow in Corner */}
            <circle cx="152" cy="160" r="12" fill="#78350f" opacity="0.4" />
            <circle cx="152" cy="160" r="6" fill="#f59e0b" opacity="0.8" />
            {/* Blue rim lighting */}
            <path d="M128 52 C138 72 142 105 135 130" fill="none" stroke="url(#vil-blue)" strokeWidth="2.5" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative ${sizeClasses} shrink-0 ${className}`}>
      {renderSvgPortrait()}
      {showBadge && (
        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase bg-slate-900 border border-slate-700 text-slate-300 shadow">
          {roleId}
        </span>
      )}
    </div>
  );
};
