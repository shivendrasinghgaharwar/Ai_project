import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { apiClient } from '../api/client';
import { useAppStore } from '../store/useAppStore';

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export function TasksPanel({ userId, onCourseClick }: { userId: string, onCourseClick: (course: any) => void }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Zustand connection for mini progress view
  const { scheduleEvents, completedTaskIds } = useAppStore();
  const todayEvents = scheduleEvents.filter((e) => e.day === useAppStore.getState().getTodayEvents()[0]?.day || new Date().toLocaleString('en-US', { weekday: 'long' }));
  const completedToday = todayEvents.filter((e) => completedTaskIds.has(e.id));
  const progressPercent = todayEvents.length > 0 ? (completedToday.length / todayEvents.length) * 100 : 0;

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const data = await apiClient.getRecommendations(userId, 3);
        if (data.status === 'success') {
          setRecommendations(data.recommendations || []);
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Today's Summary (New) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Daily Goal</h3>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
            {completedToday.length} / {todayEvents.length}
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-high)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: '100%', background: 'var(--primary)', borderRadius: 4 }}
          />
        </div>
        {progressPercent === 100 && todayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ fontSize: 12, color: 'var(--tertiary)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <CheckCircle2 size={12} /> All tasks complete!
          </motion.div>
        )}
      </motion.div>

      {/* Up Next / Recommendations */}
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={16} color="var(--primary)" />
        Up Next
      </h3>

      <div style={{ flex: 1, position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
              <motion.div key={i} animate={{ opacity: [0.5, 0.2, 0.5] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }} style={{ height: 80, borderRadius: 16, background: 'var(--surface-high)' }} />
            ))}
          </div>
        ) : recommendations.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {recommendations.map((course) => (
                <motion.div key={course.course_id} variants={itemVariants} className="card-glass" style={{ padding: 16, cursor: 'pointer' }} whileHover={{ scale: 1.02 }} onClick={() => onCourseClick(course)}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>{course.category}</div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.title}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{(course.score * 100).toFixed(0)}% Match</span>
                    <AnimatedClickWrapper>
                      <button style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Play size={12} style={{ marginLeft: 2 }} />
                      </button>
                    </AnimatedClickWrapper>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13, background: 'var(--surface-high)', borderRadius: 16 }}>
            Ready for your next challenge? We're curating courses for you.
          </div>
        )}
      </div>
    </div>
  );
}
