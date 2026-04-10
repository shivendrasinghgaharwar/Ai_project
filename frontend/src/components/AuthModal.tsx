import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onSuccess: () => void;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export function AuthModal({ onSuccess, onClose, defaultMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;

        // Safety net: also save email to profiles table in case trigger hasn't fired yet
        if (data?.user?.id) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
          }, { onConflict: 'id' });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.4 }}
        className="card-glass"
        style={{ width: 420, padding: 40, position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
          {mode === 'signup' ? 'Start your personalized learning journey' : 'Sign in to continue learning'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <div style={{ position: 'relative' }}>
              <User size={18} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 14, top: 15 }} />
              <input
                className="input-field"
                style={{ paddingLeft: 42 }}
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 14, top: 15 }} />
            <input
              className="input-field"
              style={{ paddingLeft: 42 }}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 14, top: 15 }} />
            <input
              className="input-field"
              style={{ paddingLeft: 42, paddingRight: 42 }}
              type={showPw ? 'text' : 'password'}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div
              style={{ position: 'absolute', right: 14, top: 15, cursor: 'pointer' }}
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? <EyeOff size={18} color="var(--on-surface-variant)" /> : <Eye size={18} color="var(--on-surface-variant)" />}
            </div>
          </div>

          {error && (
            <div style={{ color: '#E53E3E', fontSize: 13, textAlign: 'center', padding: '8px 12px', background: '#FFF5F5', borderRadius: 10 }}>
              {error}
            </div>
          )}

          <AnimatedClickWrapper onClick={handleSubmit}>
            <button className="btn-primary" style={{ width: '100%', opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </AnimatedClickWrapper>

          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--on-surface-variant)' }}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}
            >
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
