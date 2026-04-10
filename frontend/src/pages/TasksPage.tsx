import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { CheckCircle2, Circle, Trophy, Flame, Undo2 } from 'lucide-react';
import { useAppStore, getTodayName } from '../store/useAppStore';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

export function TasksPage() {
  const {
    scheduleEvents, completedTaskIds,
    completeTask, uncompleteTask,
  } = useAppStore();

  const today = getTodayName();
  const todayEvents = scheduleEvents.filter((e) => e.day === today);
  const pending = todayEvents.filter((e) => !completedTaskIds.has(e.id));
  const completed = todayEvents.filter((e) => completedTaskIds.has(e.id));
  const total = todayEvents.length;
  const doneCount = completed.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Today's Tasks
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--on-surface-variant)' }}>
          {today} — Track your daily study progress
        </p>
      </div>

      {/* Progress Bar */}
      <motion.div
        className="card-glass"
        style={{ padding: 24 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Flame size={20} color="var(--tertiary)" />
            <span style={{ fontSize: 15, fontWeight: 700 }}>
              {doneCount} of {total} tasks completed
            </span>
          </div>
          <span style={{
            fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)',
            color: progress === 100 ? 'var(--primary)' : 'var(--on-surface)',
          }}>
            {Math.round(progress)}%
          </span>
        </div>

        <div style={{
          height: 10, borderRadius: 5, background: 'var(--surface-high)',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: '100%', borderRadius: 5,
              background: progress === 100
                ? 'linear-gradient(90deg, var(--primary), var(--tertiary))'
                : 'var(--primary)',
            }}
          />
        </div>

        {progress === 100 && total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 14, padding: '10px 16px', borderRadius: 12,
              background: 'var(--primary-container)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 700, color: 'var(--primary)',
            }}
          >
            <Trophy size={16} /> All done! Great work today 🎉
          </motion.div>
        )}
      </motion.div>

      {/* Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 300 }}>
        {/* Pending Column */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          }}>
            <Circle size={16} color="var(--on-surface-variant)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pending</h3>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'var(--surface-high)', color: 'var(--on-surface-variant)',
            }}>
              {pending.length}
            </span>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <AnimatePresence mode="popLayout">
              {pending.map((task) => (
                <motion.div
                  key={task.id}
                  layoutId={task.id}
                  variants={itemVariants}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    x: -60,
                    filter: 'brightness(1.2)',
                    transition: { duration: 0.4 },
                  }}
                  layout
                  className="card-glass"
                  style={{
                    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer',
                  }}
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(91,140,90,0.10)' }}
                  onClick={() => completeTask(task.id)}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '2px solid var(--outline-variant)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.2s ease',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: task.color, flexShrink: 0,
                      }} />
                      {task.category} · {task.time}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); completeTask(task.id); }}
                    style={{
                      padding: '6px 14px', borderRadius: 10, border: 'none',
                      background: 'var(--primary)', color: '#fff',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Done
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {pending.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)',
                  fontSize: 14, borderRadius: 16, background: 'var(--surface-high)',
                }}
              >
                {total > 0 ? '🎉 All tasks completed!' : '📅 No tasks scheduled for today'}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Completed Column */}
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          }}>
            <CheckCircle2 size={16} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>Completed</h3>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'var(--primary-container)', color: 'var(--primary)',
            }}>
              {completed.length}
            </span>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <AnimatePresence mode="popLayout">
              {completed.map((task) => (
                <motion.div
                  key={task.id}
                  layoutId={task.id}
                  initial={{ opacity: 0, scale: 0.8, x: 60 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    transition: { type: 'spring', stiffness: 100, damping: 15 },
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  layout
                  className="card-glass"
                  style={{
                    padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                    background: 'var(--primary-container)',
                    border: '1px solid rgba(91,140,90,0.2)',
                  }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
                  >
                    <CheckCircle2 size={22} color="var(--primary)" />
                  </motion.div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                      textDecoration: 'line-through', opacity: 0.7,
                    }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', background: task.color, flexShrink: 0,
                      }} />
                      {task.category} · {task.time}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => uncompleteTask(task.id)}
                    style={{
                      padding: 6, borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--on-surface-variant)',
                    }}
                    title="Undo"
                  >
                    <Undo2 size={14} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {completed.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)',
                  fontSize: 14, borderRadius: 16, background: 'var(--surface-high)',
                }}
              >
                ✅ Complete tasks to see them here
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
