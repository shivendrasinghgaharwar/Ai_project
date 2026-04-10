import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/client';
import { Target, Layers, Clock, ChevronRight, ChevronLeft } from 'lucide-react';

interface OnboardingFlowProps {
  userId: string;
  onComplete: () => void;
}

const GOALS = [
  'Full-Stack Developer', 'Data Scientist', 'ML Engineer',
  'Cloud Architect', 'Mobile Developer', 'DevOps Engineer',
];

const SKILL_CATEGORIES = [
  'Frontend', 'Backend', 'Machine Learning', 'Data Science', 'Cloud Computing', 'Mobile Dev',
];

const LABELS: Record<number, string> = { 1: 'Beginner', 2: 'Novice', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };

const stepVariants = { enter: { opacity: 0, x: 60 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -60 } };

export function OnboardingFlow({ userId, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [skills, setSkills] = useState<Record<string, number>>(
    Object.fromEntries(SKILL_CATEGORIES.map(c => [c, 3]))
  );
  const [hours, setHours] = useState(10);
  const [saving, setSaving] = useState(false);

  const canAdvance = () => step !== 0 || goal !== '';

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // 1. Save profile to Supabase
      await supabase.from('profiles').update({
        target_goal: goal,
        weekly_hours: hours,
        onboarded: true,
      }).eq('id', userId);

      // 2. Save skill stats to Supabase
      const stats = SKILL_CATEGORIES.map(cat => ({
        user_id: userId,
        category_name: cat,
        skill_level: skills[cat],
      }));

      await supabase.from('user_stats').upsert(stats, { onConflict: 'user_id,category_name' });

      // 3. Bridge to Flask ML API
      await apiClient.submitOnboarding({
        userId: userId,
        primaryGoal: goal,
        skills: skills,
        weeklyHours: hours,
      });

    } catch (err) {
      console.error('Onboarding save error:', err);
    }

    setSaving(false);
    onComplete();
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--surface-base)', padding: 24,
    }}>
      <motion.div className="card-glass" style={{ width: '100%', maxWidth: 560, padding: 44, position: 'relative' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
      >
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 36 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4,
              background: i <= step ? 'var(--primary)' : 'var(--surface-high)', transition: 'background 0.4s ease' }} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Target size={22} color="var(--primary)" />
                <h2 style={{ fontSize: 21 }}>What's your primary goal?</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                Choose the career path that excites you most.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {GOALS.map(g => (
                  <AnimatedClickWrapper key={g} onClick={() => setGoal(g)}>
                    <div style={{
                      padding: '13px 16px', borderRadius: 14, textAlign: 'center', fontSize: 13, fontWeight: 600,
                      border: `2px solid ${goal === g ? 'var(--primary)' : 'var(--outline-variant)'}`,
                      background: goal === g ? 'var(--primary-container)' : 'transparent',
                      color: goal === g ? 'var(--primary)' : 'var(--on-surface)',
                      transition: 'all 0.3s ease',
                    }}>{g}</div>
                  </AnimatedClickWrapper>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Layers size={22} color="var(--tertiary)" />
                <h2 style={{ fontSize: 21 }}>Rate your skill level</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 24 }}>
                1 = Beginner (Hard for you) → 5 = Expert
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {SKILL_CATEGORIES.map(cat => (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                      <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 700 }}>{LABELS[skills[cat]]}</span>
                    </div>
                    <input 
                      type="range" 
                      min={1} 
                      max={5} 
                      value={skills[cat]} 
                      onChange={(e) => setSkills(p => ({ ...p, [cat]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--primary)', height: 6 }}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" variants={stepVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Clock size={22} color="var(--primary)" />
                <h2 style={{ fontSize: 21 }}>Weekly commitment</h2>
              </div>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 28 }}>
                How many hours per week can you dedicate?
              </p>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  fontSize: 56, fontWeight: 800, fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #5B8C5A, #8FAE8F)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>{hours}</div>
                <div style={{ color: 'var(--on-surface-variant)', fontSize: 14 }}>hours / week</div>
              </div>
              <input type="range" min={2} max={40} value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)', height: 6 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                <span>2h casual</span><span>40h intensive</span>
              </div>
              <div style={{
                marginTop: 28, padding: 18, background: 'var(--surface-high)', borderRadius: 16,
                fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.8,
              }}>
                <strong style={{ color: 'var(--on-surface)' }}>Profile Summary</strong><br />
                Goal: <strong style={{ color: 'var(--primary)' }}>{goal}</strong><br />
                Weakest: <strong style={{ color: 'var(--tertiary)' }}>{Object.entries(skills).sort((a, b) => a[1] - b[1])[0][0]}</strong><br />
                Pace: <strong>{hours}h/week</strong>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 0 ? (
            <AnimatedClickWrapper onClick={() => setStep(s => s - 1)}>
              <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ChevronLeft size={16} /> Back
              </button>
            </AnimatedClickWrapper>
          ) : <div />}

          {step < 2 ? (
            <AnimatedClickWrapper onClick={() => canAdvance() && setStep(s => s + 1)}>
              <button className="btn-primary" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: canAdvance() ? 1 : 0.4, pointerEvents: canAdvance() ? 'auto' : 'none',
              }}>
                Next <ChevronRight size={16} />
              </button>
            </AnimatedClickWrapper>
          ) : (
            <AnimatedClickWrapper onClick={handleSubmit}>
              <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Launch Dashboard'} <Layers size={16} />
              </button>
            </AnimatedClickWrapper>
          )}
        </div>
      </motion.div>
    </div>
  );
}
