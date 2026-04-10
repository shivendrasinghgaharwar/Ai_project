import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CircularProgressProps {
  score: number;   // 0-100
  label?: string;
}

export function CircularProgress({ score, label = 'Overall Score' }: CircularProgressProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <motion.div
      className="card-glass"
      style={{
        padding: 28, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5, delay: 0.4 }}
    >
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={70} cy={70} r={radius}
            fill="none" stroke="var(--surface-high)" strokeWidth={10} />
          {/* Progress */}
          <circle cx={70} cy={70} r={radius}
            fill="none" stroke="var(--primary)" strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            {animatedScore}%
          </span>
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface-variant)' }}>{label}</span>
    </motion.div>
  );
}
