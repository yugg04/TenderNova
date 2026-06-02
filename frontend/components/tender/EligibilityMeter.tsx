'use client';

import { motion } from 'framer-motion';

export function EligibilityMeter({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        <defs>
          <linearGradient id="eligibilityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#eligibilityGradient)"
          strokeLinecap="round"
          strokeWidth="12"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold">{clamped}</div>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">score</div>
      </div>
    </div>
  );
}
