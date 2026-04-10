import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProcessingScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate ML calibration time before routing to the dashboard setup
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-base)',
      gap: 32,
    }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: 'var(--primary-container)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(59, 130, 246, 0.2)',
        }}
      >
        <Brain size={44} color="var(--primary)" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>Analyzing your learning profile...</h2>
        <p style={{ color: 'var(--on-surface-variant)', fontSize: 15 }}>
          Our hybrid ML engine is calibrating recommendations for you.
        </p>
      </motion.div>

      {/* Animated progress dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--primary)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
