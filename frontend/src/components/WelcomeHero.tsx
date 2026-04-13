import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function WelcomeHero() {
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        const name = data?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || 'Student';
        setUserName(name);
      }
    };
    fetchUser();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      style={{
        padding: '40px 48px',
        borderRadius: '32px',
        background: 'linear-gradient(135deg, var(--primary) 0%, #4A7549 100%)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(91, 140, 90, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Background Decorative Elements */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '40%',
        height: '140%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
        transform: 'rotate(-15deg)'
      }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '14px', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.1em',
            opacity: 0.9
          }}
        >
          <Sparkles size={16} /> Dashboard
        </motion.div>
        
        <h1 style={{ 
          margin: 0, 
          fontSize: '42px', 
          fontWeight: 800, 
          fontFamily: 'var(--font-display)',
          lineHeight: 1.1
        }}>
          Welcome back, <br />
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{userName}!</span>
        </h1>
      </div>

      <p style={{ 
        margin: 0, 
        fontSize: '16px', 
        maxWidth: '460px', 
        lineHeight: 1.6,
        opacity: 0.9,
        position: 'relative',
        zIndex: 1
      }}>
        You're doing great! You've completed 85% of your weekly goals. Ready to tackle your next study session?
      </p>

      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', position: 'relative', zIndex: 1 }}>
        <motion.button
          onClick={() => navigate('/dashboard/schedule')}
          whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '12px 24px',
            borderRadius: '50px',
            border: 'none',
            background: '#FFFFFF',
            color: 'var(--primary)',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Check Schedule <ArrowRight size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
