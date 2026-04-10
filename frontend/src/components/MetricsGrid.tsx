import { useState, useEffect } from 'react';
import { Hover3DCard } from './Hover3DCard';
import { apiClient } from '../api/client';
import { motion } from 'framer-motion';
import { Target, Layers, Clock } from 'lucide-react';

interface MetricsGridProps {
  userId: string;
}

export function MetricsGrid({ userId }: MetricsGridProps) {
  const [stats, setStats] = useState({ interactions: 0, courses: 0, progress: 0 });

  useEffect(() => {
    apiClient.getUserProfile(userId).then(data => {
      if (data?.status === 'success') {
        const u = data.user;
        let avg = 0;
        if (u.interactions?.length > 0) {
          avg = u.interactions.reduce((a: number, c: any) => a + c.progress, 0) / u.interactions.length;
        }
        setStats({
          interactions: u.interaction_count || 0,
          courses: u.interactions?.length || 0,
          progress: Math.round(avg),
        });
      }
    }).catch(() => {});
  }, [userId]);

  const cards = [
    { label: 'Avg Progress', value: `${stats.progress}%`, Icon: Target, color: 'var(--tertiary)' },
    { label: 'Interactions', value: stats.interactions, Icon: Layers, color: 'var(--primary)' },
    { label: 'Active Courses', value: stats.courses, Icon: Clock, color: 'var(--secondary)' },
  ];

  return (
    <motion.div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5, delay: 0.1 }}
    >
      {cards.map(({ label, value, Icon, color }) => (
        <Hover3DCard key={label}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 10, fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)' }}>
              <Icon size={22} color={color} />
              {value}
            </div>
          </div>
        </Hover3DCard>
      ))}
    </motion.div>
  );
}
