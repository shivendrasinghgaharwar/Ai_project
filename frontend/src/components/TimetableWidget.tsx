import { Hover3DCard } from './Hover3DCard';
import { upcomingLessons } from '../data/mockData';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function TimetableWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5, delay: 0.2 }}
      style={{ height: '100%' }}
    >
      <Hover3DCard style={{ height: '100%' }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Timetable <span style={{ color: 'var(--on-surface-variant)', fontSize: '13px', marginLeft: '8px' }}>23</span></div>
            <Calendar size={18} color="var(--on-surface-variant)" />
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '44px', top: 0, bottom: 0, width: '2px', background: 'var(--surface-high)' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} style={{ display: 'flex', gap: '24px', position: 'relative', alignItems: 'center' }}>
                  <div style={{ width: '40px', fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                    {lesson.time.split(' - ')[0]}
                  </div>
                  
                  {/* Current time indicator with breathing dot */}
                  <div style={{ 
                    position: 'absolute', left: '41px',
                    width: '8px', height: '8px', 
                    borderRadius: '50%',
                    background: lesson.isActive ? 'var(--primary)' : 'var(--outline-variant)',
                  }} className={lesson.isActive ? 'breathing-dot' : ''} />

                  <div style={{ 
                    flex: 1, 
                    background: 'var(--surface-high)', 
                    padding: '20px', 
                    borderRadius: '16px',
                    borderLeft: `4px solid ${lesson.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', marginBottom: '8px', lineHeight: 1.4, fontWeight: 600 }}>{lesson.title}</div>
                      <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{lesson.time}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ 
                        background: `${lesson.color}20`, 
                        color: lesson.color, 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}>{lesson.subject}</span>

                      {/* Conditional Icon Rendering */}
                      <div style={{ width: '24px' }}>
                        <AnimatePresence>
                          {lesson.isActive && (
                            <motion.div
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 5 }}
                              transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.4 }}
                            >
                              <MoreHorizontal size={20} color="var(--on-surface-variant)" style={{ cursor: 'pointer' }} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Hover3DCard>
    </motion.div>
  );
}
