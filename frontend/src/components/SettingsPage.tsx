import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, LogOut, User, Target, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';

export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [targetGoal, setTargetGoal] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(10);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      setEmail(session.user.email ?? '');
      setUserId(session.user.id);

      const { data } = await supabase
        .from('profiles')
        .select('full_name, target_goal, weekly_hours')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setFullName(data.full_name ?? '');
        setTargetGoal(data.target_goal ?? '');
        setWeeklyHours(data.weekly_hours ?? 10);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      full_name: fullName,
      target_goal: targetGoal,
      weekly_hours: weeklyHours,
    }).eq('id', userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="card-glass" style={{ padding: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div style={{ color: 'var(--on-surface-variant)', fontSize: 15 }}>Loading profile...</div>
      </div>
    );
  }

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || email[0]?.toUpperCase() || 'U';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}
    >
      <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>Account Settings</h2>

      {/* Profile Card */}
      <div className="card-glass" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--primary-container)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: 'var(--primary)',
            fontFamily: 'var(--font-display)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{fullName || 'Your Name'}</div>
            <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>{email}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--outline-variant)' }} />

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 10 }}>
              <User size={15} /> Full Name
            </label>
            <input
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 10 }}>
              <Target size={15} /> Learning Goal
            </label>
            <input
              className="input-field"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              placeholder="e.g. Full-Stack Developer"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 10 }}>
              <Clock size={15} /> Weekly Study Hours: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{weeklyHours}h</span>
            </label>
            <input
              type="range" min={1} max={40} value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>
              <span>1h</span><span>40h</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <AnimatedClickWrapper onClick={handleSave}>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: saving ? 0.7 : 1 }}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : saved ? '✅ Saved!' : 'Save Changes'}
          </button>
        </AnimatedClickWrapper>
      </div>

      {/* Danger Zone */}
      <div className="card-glass" style={{ padding: 24, border: '1px solid rgba(229, 62, 62, 0.2)' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: '#E53E3E' }}>Sign Out</h3>
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: '0 0 16px 0' }}>
          You'll be redirected to the landing page.
        </p>
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: '2px solid #E53E3E', color: '#E53E3E',
            padding: '10px 24px', borderRadius: 50, fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </motion.div>
  );
}
