import { motion } from 'framer-motion';
import { BookOpen, Target, Zap, Brain, CheckCircle, BarChart3, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onSignup: () => void;
  onLogin: () => void;
}

const floatingIcons = [
  { Icon: BookOpen, color: '#5B8C5A', bg: '#EDF5ED', x: '12%', y: '20%', delay: 0,   duration: 4.5 },
  { Icon: Target,   color: '#D4A853', bg: '#FDF6E3', x: '78%', y: '15%', delay: 0.5, duration: 5.0 },
  { Icon: Zap,      color: '#8FAE8F', bg: '#EDF5ED', x: '85%', y: '55%', delay: 1.0, duration: 3.8 },
  { Icon: Brain,    color: '#7A6B5A', bg: '#F5F0EA', x: '8%',  y: '60%', delay: 1.5, duration: 4.2 },
];

const featureCards = [
  { icon: Sparkles,    title: 'AI-Powered',     desc: 'Hybrid TF-IDF + KNN engine tailored to you' },
  { icon: BarChart3,   title: 'Personalized',   desc: 'Recommendations adapt as you learn and grow' },
  { icon: CheckCircle, title: 'Track Progress',  desc: 'Real-time metrics on your learning journey' },
];

export function LandingPage({ onSignup, onLogin }: LandingPageProps) {
  return (
    <div className="dot-grid-bg" style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', padding: '60px 24px',
    }}>
      {floatingIcons.map(({ Icon, color, bg, x, y, delay, duration }, i) => (
        <motion.div key={i}
          style={{
            position: 'absolute', left: x, top: y,
            width: 72, height: 72, borderRadius: 22,
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 12px 40px ${color}22`, border: `1px solid ${color}20`, zIndex: 1,
          }}
          animate={{ y: [0, -18, 0] }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
        >
          <Icon size={32} color={color} />
        </motion.div>
      ))}

      <motion.div style={{ textAlign: 'center', zIndex: 2, maxWidth: 680 }}
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.7 }}
      >
        <div style={{
          display: 'inline-block', background: 'var(--primary-container)', color: 'var(--primary)',
          fontSize: 12, fontWeight: 700, padding: '6px 16px', borderRadius: 40,
          marginBottom: 28, fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
        }}>
          POWERED BY HYBRID ML ENGINE
        </div>

        <h1 style={{
          fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 20,
          background: 'linear-gradient(135deg, #2D2D2D 0%, #5B8C5A 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Learn Smarter,<br />Not Harder.
        </h1>

        <p style={{
          fontSize: 17, color: 'var(--on-surface-variant)', lineHeight: 1.7,
          maxWidth: 500, margin: '0 auto 40px',
        }}>
          Our AI analyzes your goals, skill gaps, and interests to build a personalized learning path.
        </p>

        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <button 
              className="btn-primary" 
              onClick={onSignup}
              style={{ fontSize: 17, padding: '16px 36px', boxShadow: '0 8px 30px rgba(91, 140, 90, 0.3)' }}
            >
              Get Started →
            </button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
            <button 
              onClick={onLogin}
              style={{ 
                fontSize: 17, padding: '14px 34px', fontWeight: 700,
                background: 'transparent',
                border: '2px solid var(--primary)', 
                color: 'var(--primary)',
                borderRadius: 50,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Log in
            </button>
          </motion.div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 20, opacity: 0.8, fontWeight: 500 }}>
          Free for students · No credit card required
        </p>
      </motion.div>

      <motion.div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24, marginTop: 80, maxWidth: 800, width: '100%', zIndex: 2,
        }}
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.7, delay: 0.3 }}
      >
        {featureCards.map(({ icon: FIcon, title, desc }) => (
          <div key={title} className="card-glass" style={{ padding: 28, textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, background: 'var(--primary-container)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            }}>
              <FIcon size={22} color="var(--primary)" />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, fontFamily: 'var(--font-display)' }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
