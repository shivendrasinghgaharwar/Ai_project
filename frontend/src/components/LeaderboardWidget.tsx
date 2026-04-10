import { useState, useEffect } from 'react';
import { Hover3DCard } from './Hover3DCard';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { apiClient } from '../api/client';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export function LeaderboardWidget() {
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getTrendingCourses(5).then((data: any) => {
      if (data && data.status === 'success') {
        setTrending(data.trending || []);
      }
      setLoading(false);
    }).catch((err: any) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5, delay: 0.4 }}
    >
      <Hover3DCard>
        <div style={{ padding: '24px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Trending Courses</div>
            <AnimatedClickWrapper style={{ background: 'var(--surface-base)', padding: '8px', borderRadius: '8px' }}>
              <TrendingUp size={16} color="var(--primary)" />
            </AnimatedClickWrapper>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--on-surface-variant)', fontSize: '12px', marginBottom: '16px' }}>
            <span>Rank</span>
            <span style={{ flex: 1, marginLeft: '16px' }}>Course Title</span>
            <span>Trend</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)' }}>Loading trends...</div>
            ) : (
              trending.map((course, idx) => (
                <AnimatedClickWrapper key={course.course_id}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 12px',
                    background: idx === 0 ? 'var(--primary-container)' : 'transparent',
                    borderRadius: '8px',
                    border: '1px solid transparent'
                  }}>
                    <div style={{ width: '24px', fontWeight: 'bold', fontSize: '14px', color: idx === 0 ? 'var(--primary)' : 'inherit' }}>
                      {idx === 0 ? '🥇' : idx + 1}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '14px', fontWeight: idx === 0 ? 'bold' : 'normal', color: 'var(--on-surface)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {course.title}
                      </span>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--secondary)' }}>{course.trending_score.toFixed(1)}</div>
                  </div>
                </AnimatedClickWrapper>
              ))
            )}
          </div>
        </div>
      </Hover3DCard>
    </motion.div>
  );
}
