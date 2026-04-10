import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

// Framer Motion Animation Settings
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export function CourseGrid() {
  // Pull what we need from the global store
  const { recommendedCourses, isLoadingRecommendations, fetchRecommendations } = useAppStore();

  // Fetch the data when the component loads
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (isLoadingRecommendations) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ 
            fontSize: '15px', 
            fontWeight: 600, 
            color: 'var(--on-surface-variant)',
            letterSpacing: '0.02em'
          }}
        >
          Running ML sorting algorithm...
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px'
      }}
    >
      {recommendedCourses.map((course) => (
        <motion.div 
          key={course.id}
          variants={item}
          whileHover={{ scale: 1.03, y: -5 }}
          className="card-glass"
          style={{
            padding: '24px',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-base)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'var(--primary-container)',
                padding: '4px 12px',
                borderRadius: '50px',
                textTransform: 'uppercase'
              }}>
                {course.category}
              </span>
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--on-surface-variant)', 
                fontWeight: 600,
                opacity: 0.7
              }}>
                {Math.round(course.matchScore * 100)}% Match
              </span>
            </div>
            
            <h3 style={{ 
              margin: '0 0 8px', 
              fontSize: '17px', 
              fontWeight: 800, 
              color: 'var(--on-surface)',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.3
            }}>
              {course.title}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: 'var(--on-surface-variant)',
              fontWeight: 500
            }}>
              {course.difficulty} Level
            </p>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              marginTop: '24px',
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--surface-high)',
              color: 'var(--on-surface)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--primary)';
              (e.target as HTMLButtonElement).style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--surface-high)';
              (e.target as HTMLButtonElement).style.color = 'var(--on-surface)';
            }}
          >
            Add to Schedule
          </motion.button>
        </motion.div>
      ))}
    </motion.div>
  );
}
