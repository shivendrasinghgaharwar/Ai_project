import { BookOpen, Code, Terminal, Database } from 'lucide-react';
import { AnimatedClickWrapper } from './AnimatedClickWrapper';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';

const ICONS: Record<string, any> = {
  'frontend': Code,
  'backend': Terminal,
  'database': Database,
  'general': BookOpen,
};

interface TrendingSectionProps {
  onCourseClick?: (course: any) => void;
}

export function TrendingSection({ onCourseClick }: TrendingSectionProps) {
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    apiClient.getTrendingCourses(3)
      .then((data: any) => {
        if (data && data.status === 'success') {
          setTrending(data.trending || []);
        } else {
          setTrending([]);
        }
      })
      .catch((err: any) => {
        console.error('Failed to fetch trending:', err);
        setTrending([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="card-glass focus-card" style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 24 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Trending Paths</h3>
        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View all</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              style={{
                background: 'rgba(91, 140, 90, 0.1)', // Sage Green ghost pulse
                borderRadius: 16,
                minHeight: 64,
                width: '100%',
                border: '1px solid rgba(91, 140, 90, 0.2)'
              }}
            />
          ))
        ) : trending?.length > 0 ? (
          trending?.map((course, i) => {
            const Icon = ICONS[course?.category?.toLowerCase()] || BookOpen;
            return (
              <AnimatedClickWrapper key={i}>
                <div onClick={() => onCourseClick ? onCourseClick(course) : navigate(`/dashboard/courses/${course?.course_id}`)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 12,
                  background: 'var(--surface-high)', borderRadius: 16, cursor: 'pointer',
                  border: '1px solid transparent', flex: 1, minHeight: 64
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--outline-variant)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                  <div style={{ padding: 10, background: 'var(--surface-base)', borderRadius: 12, color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course?.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course?.category}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>#{i + 1}</div>
                </div>
              </AnimatedClickWrapper>
            );
          })
        ) : (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
            No trending topics found
          </div>
        )}
      </div>
    </div>
  );
}
