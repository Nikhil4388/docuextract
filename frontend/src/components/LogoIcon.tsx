import React from 'react';

interface LogoIconProps {
  size?: number;
  borderRadius?: number;
}

export default function LogoIcon({ size = 40, borderRadius }: LogoIconProps) {
  const r = borderRadius ?? Math.round(size * 0.22);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="lb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="55%" stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#06b6d4"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={r} fill="url(#lb)"/>
      {/* Grid lines */}
      <line x1="0" y1="38" x2="100" y2="38" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <line x1="0" y1="62" x2="100" y2="62" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <line x1="38" y1="0" x2="38" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      <line x1="62" y1="0" x2="62" y2="100" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
      {/* PDF doc */}
      <rect x="12" y="22" width="28" height="36" rx="4" fill="white" opacity="0.95"/>
      <path d="M32 22 L40 30 L32 30 Z" fill="rgba(99,102,241,0.45)"/>
      <path d="M32 22 L40 30" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
      <rect x="16" y="36" width="18" height="3" rx="1.5" fill="#818cf8" opacity="0.9"/>
      <rect x="16" y="42" width="15" height="2.5" rx="1.2" fill="#818cf8" opacity="0.6"/>
      <rect x="16" y="47.5" width="18" height="2.5" rx="1.2" fill="#818cf8" opacity="0.4"/>
      {/* Arrow */}
      <path d="M43 50 L55 50" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M52 43 L60 50 L52 57" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Excel table */}
      <rect x="60" y="26" width="28" height="30" rx="4" fill="white" opacity="0.95"/>
      <rect x="60" y="26" width="28" height="9" rx="4" fill="#06b6d4" opacity="0.25"/>
      <line x1="60" y1="35" x2="88" y2="35" stroke="#06b6d4" strokeWidth="1" opacity="0.5"/>
      <line x1="60" y1="42" x2="88" y2="42" stroke="#06b6d4" strokeWidth="1" opacity="0.4"/>
      <line x1="60" y1="49" x2="88" y2="49" stroke="#06b6d4" strokeWidth="1" opacity="0.3"/>
      <line x1="74" y1="26" x2="74" y2="56" stroke="#06b6d4" strokeWidth="1" opacity="0.45"/>
      <rect x="63" y="37.5" width="8" height="2.5" rx="1" fill="#6366f1" opacity="0.5"/>
      <rect x="77" y="37.5" width="8" height="2.5" rx="1" fill="#06b6d4" opacity="0.5"/>
      <rect x="63" y="44.5" width="7" height="2.5" rx="1" fill="#6366f1" opacity="0.35"/>
      <rect x="77" y="44.5" width="9" height="2.5" rx="1" fill="#06b6d4" opacity="0.35"/>
      {/* Bottom dots */}
      <circle cx="38" cy="78" r="3.5" fill="white" opacity="0.45"/>
      <circle cx="50" cy="78" r="3.5" fill="white" opacity="0.3"/>
      <circle cx="62" cy="78" r="3.5" fill="white" opacity="0.2"/>
    </svg>
  );
}
