import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, X, Check } from 'lucide-react';
import { useAppStore, getTodayName, generateDynamicDefaults, type ScheduleEvent } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';
import { logStudySession } from '../lib/logStudySession';

export function HorizontalTimetable() {
  const {
    scheduleEvents, setScheduleEvents,
    completeTask, completedTaskIds,
    userProfile, fetchUserProfile
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get the current user's ID on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id && !userProfile) {
        fetchUserProfile();
      }
    });
  }, [userProfile, fetchUserProfile]);

  const today = getTodayName();
  const todayEvents = scheduleEvents.filter((e) => e.day === today && !completedTaskIds.has(e.id));

  // Load from Supabase on first mount (if store is empty)
  useEffect(() => {
    if (scheduleEvents.length > 0) { setLoaded(true); return; }

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Set default items for new / unauthenticated users
        setScheduleEvents(generateDynamicDefaults(undefined));
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('user_id', session.user.id);

      if (data && data.length > 0) {
        const events: ScheduleEvent[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          category: row.category || 'General',
          color: row.color || '#5B8C5A',
          day: row.day_of_week,
          time: row.start_time,
          duration: row.duration_minutes || 60,
          source: row.source || 'manual',
          courseId: row.course_id,
        }));
        setScheduleEvents(events);
      } else {
        // Seed defaults if DB is empty, dynamically based on target_goal or career_path
        
        let path = userProfile?.career_path || userProfile?.target_goal;
        if (!path) {
          // If profile wasn't ready in store, fetch it quickly here
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          path = prof?.career_path || prof?.target_goal;
        }

        setScheduleEvents(generateDynamicDefaults(path));
      }
      setLoaded(true);
    };
    load();
  }, [scheduleEvents.length, setScheduleEvents, userProfile]);

  const editItem = scheduleEvents.find((i) => i.id === editingId);

  const handleSave = (updatedItem: any) => {
    const events = scheduleEvents.map((i) =>
      i.id === updatedItem.id
        ? { ...i, title: updatedItem.title, time: updatedItem.time, category: updatedItem.category }
        : i
    );
    setScheduleEvents(events);
    setEditingId(null);
  };

  const handleComplete = (id: string) => {
    setCompletingId(id);
    const task = scheduleEvents.find(e => e.id === id);
    // Delay to let animation play
    setTimeout(async () => {
      completeTask(id);
      setCompletingId(null);

      // Log study session to Supabase
      if (userId && task) {
        await logStudySession({
          userId,
          category: task.category || "General",
          durationMinutes: task.duration || 60,
        });
      }
    }, 600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.4, 0, 0.2, 1], duration: 0.5, delay: 0.2 }}
      className="focus-card"
    >
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Today's Schedule</h3>
        <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
          {todayEvents.length} sessions remaining
        </span>
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        <AnimatePresence mode="popLayout">
          {todayEvents.length > 0 ? todayEvents.map((item) => (
            <TimetableCard
              key={item.id}
              item={item}
              isCompleting={completingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onComplete={() => handleComplete(item.id)}
            />
          )) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                padding: '24px 32px', textAlign: 'center', width: '100%',
                color: 'var(--on-surface-variant)', fontSize: 14,
              }}
            >
              {loaded
                ? '🎉 All sessions done for today! Check Tasks page for details.'
                : 'Loading schedule...'}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editingId && editItem && (
          <ScheduleEditModal
            item={editItem}
            onSave={handleSave}
            onClose={() => setEditingId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Timetable Card with Done Button ──────────────────────────────────────────
function TimetableCard({ item, isCompleting, onEdit, onComplete }: {
  item: ScheduleEvent;
  isCompleting: boolean;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      layoutId={`timetable-${item.id}`}
      exit={{
        opacity: 0,
        scale: 0.85,
        x: -40,
        transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
      }}
      className="card-glass"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={isCompleting ? {
        scale: [1, 1.05, 0.9],
        boxShadow: [
          '0 0 0 0 rgba(91,140,90,0)',
          '0 0 24px 8px rgba(91,140,90,0.35)',
          '0 0 0 0 rgba(91,140,90,0)',
        ],
      } : {}}
      transition={isCompleting
        ? { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
        : { type: 'spring', stiffness: 300, damping: 20 }
      }
      style={{
        minWidth: 170, padding: '18px 20px', position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer', flexShrink: 0,
        border: isCompleting ? '1.5px solid var(--primary)' : undefined,
      }}
      whileHover={{ scale: 1.05, boxShadow: `0 12px 40px ${item.color}18` }}
    >
      {/* Top row: time + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: item.color, letterSpacing: '0.03em' }}>
          {item.time}
        </div>
        <AnimatePresence>
          {isHovered && !isCompleting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ display: 'flex', gap: 4 }}
            >
              <div
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                style={{ padding: 4, background: 'var(--surface-high)', borderRadius: 6, cursor: 'pointer' }}
              >
                <Edit2 size={11} color="var(--on-surface-variant)" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</div>

      <div style={{
        fontSize: 11, color: 'var(--on-surface-variant)',
        background: 'var(--surface-high)', padding: '3px 10px', borderRadius: 8,
        alignSelf: 'flex-start',
      }}>
        {item.category}
      </div>

      {/* Done Button */}
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 4px 16px rgba(91,140,90,0.25)' }}
        whileTap={{ scale: 0.95 }}
        onClick={(e) => { e.stopPropagation(); onComplete(); }}
        disabled={isCompleting}
        style={{
          marginTop: 4, padding: '6px 14px', borderRadius: 10, border: 'none',
          background: isCompleting ? 'var(--primary)' : 'var(--primary-container)',
          color: isCompleting ? '#fff' : 'var(--primary)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          transition: 'all 0.2s ease',
        }}
      >
        <Check size={12} />
        {isCompleting ? 'Done!' : 'Mark Done'}
      </motion.button>
    </motion.div>
  );
}

// ── Edit Modal (preserved from original) ────────────────────────────────────
function ScheduleEditModal({ item, onSave, onClose }: { item: ScheduleEvent, onSave: (i: any) => void, onClose: () => void }) {
  const [form, setForm] = useState({ ...item });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(12px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 400, padding: 32,
          background: 'var(--surface-base)', borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.08)',
          border: '1px solid var(--outline-variant)'
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
          <X size={20} />
        </button>

        <h2 style={{ fontSize: 20, marginBottom: 24 }}>Edit Session</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Time</label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm({ ...form, time: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--outline-variant)', background: 'var(--surface-high)', marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Course Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--outline-variant)', background: 'var(--surface-high)', marginTop: 4 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Category</label>
            <input
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--outline-variant)', background: 'var(--surface-high)', marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary" style={{ flex: 1 }}>Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
}


