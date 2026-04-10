import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, GripVertical, X, Clock } from 'lucide-react';
import { useAppStore, getTodayName } from '../store/useAppStore';
import type { ScheduleEvent } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 (24 hours)
const ROW_HEIGHT = 68; // Slightly taller for more "elite" spacing

export function SchedulePage() {
  const {
    scheduleEvents, setScheduleEvents, addScheduleEvent,
    removeScheduleEvent, moveScheduleEvent,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState<{ day: string; time: string } | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const today = getTodayName();

  // Load schedule from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoaded(true); return; }

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
      }
      setLoaded(true);
      
      // Scroll to current time (roughly)
      const currentHour = new Date().getHours();
      if (gridRef.current) {
        gridRef.current.scrollTop = Math.max(0, (currentHour - 2) * ROW_HEIGHT);
      }
    };
    load();
  }, [setScheduleEvents]);

  const getEventsForSlot = useCallback((day: string, hour: number) => {
    return scheduleEvents.filter((e) => {
      const eventHour = parseInt(e.time.split(':')[0], 10);
      return e.day === day && eventHour === hour;
    });
  }, [scheduleEvents]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Create a ghost image or just set data
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, day: string, hour: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (!id) return;

    const newTime = `${hour.toString().padStart(2, '0')}:00`;
    moveScheduleEvent(id, day, newTime);

    // Update Supabase
    await supabase
      .from('schedule_events')
      .update({ day_of_week: day, start_time: newTime })
      .eq('id', id);

    setDraggedId(null);
  };

  const handleAddEvent = async (title: string, category: string, day: string, time: string) => {
    const newEvent: ScheduleEvent = {
      id: crypto.randomUUID(),
      title,
      category,
      color: getCategoryColor(category),
      day,
      time,
      duration: 60,
      source: 'manual',
    };

    addScheduleEvent(newEvent);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('schedule_events').insert({
        id: newEvent.id,
        user_id: session.user.id,
        title: newEvent.title,
        category: newEvent.category,
        color: newEvent.color,
        day_of_week: newEvent.day,
        start_time: newEvent.time,
        duration_minutes: 60,
        source: 'manual',
      });
    }

    setShowAddModal(null);
  };

  const handleDeleteEvent = async (id: string) => {
    removeScheduleEvent(id);
    await supabase.from('schedule_events').delete().eq('id', id);
  };

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '4px solid var(--primary-container)',
            borderTopColor: 'var(--primary)',
          }}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: 20 }}
    >
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 32, fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.02em' }}>
            Weekly Planner
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--on-surface-variant)', fontWeight: 500 }}>
            Visualise your learning journey and block your core focus hours.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ 
            padding: '8px 16px', background: 'var(--surface-high)', borderRadius: 16, 
            display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 700 
          }}>
            <Calendar size={16} color="var(--primary)" />
            <span>{scheduleEvents.length} Sessions</span>
          </div>
        </div>
      </div>

      {/* Elite Calendar Grid Container */}
      <div 
        className="card-glass" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          borderRadius: 32,
          border: '1px solid var(--outline-variant)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.05)'
        }}
      >
        {/* Sticky Days Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px repeat(7, 1fr)',
          background: 'var(--surface-base)',
          zIndex: 10,
          borderBottom: '1px solid var(--outline-variant)'
        }}>
          <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={18} color="var(--on-surface-variant)" />
          </div>
          {DAYS.map((day) => (
            <div
              key={day}
              style={{
                padding: '20px 12px', textAlign: 'center',
                borderLeft: '1px solid var(--outline-variant)',
                fontSize: 14, fontWeight: 800,
                color: day === today ? 'var(--primary)' : 'var(--on-surface)',
                fontFamily: 'var(--font-display)',
                background: day === today ? 'var(--primary-container-low)' : 'transparent',
                position: 'relative'
              }}
            >
              {day.slice(0, 3)}
              {day === today && (
                <motion.div 
                  layoutId="today-indicator"
                  style={{ 
                    position: 'absolute', bottom: 0, left: '20%', right: '20%', 
                    height: 3, background: 'var(--primary)', borderRadius: '3px 3px 0 0' 
                  }} 
                />
              )}
            </div>
          ))}
        </div>

        {/* Scrollable Body */}
        <div 
          ref={gridRef}
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            overflowX: 'hidden',
            position: 'relative',
            background: 'linear-gradient(to right, var(--surface-base) 80px, transparent 80px)'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)',
            gridTemplateRows: `repeat(24, ${ROW_HEIGHT}px)`,
          }}>
            {HOURS.map((hour) => (
              <>
                {/* Time Label */}
                <div
                  key={`time-${hour}`}
                  style={{
                    padding: '20px 12px', fontSize: 12, fontWeight: 700,
                    color: 'var(--on-surface-variant)', textAlign: 'right',
                    borderBottom: '1px solid var(--outline-variant)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                    opacity: 0.6
                  }}
                >
                  {formatHour(hour)}
                </div>
                
                {/* Day Columns */}
                {DAYS.map((day) => {
                  const events = getEventsForSlot(day, hour);
                  const isCurrentHour = new Date().getHours() === hour && day === today;
                  
                  return (
                    <div
                      key={`${day}-${hour}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, hour)}
                      onClick={() => events.length === 0 && setShowAddModal({ day, time: `${hour.toString().padStart(2, '0')}:00` })}
                      style={{
                        position: 'relative',
                        borderBottom: '1px solid var(--outline-variant)',
                        borderLeft: '1px solid var(--outline-variant)',
                        background: isCurrentHour ? 'var(--primary-container-low)' : 'transparent',
                        cursor: events.length === 0 ? 'pointer' : 'default',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        if (events.length === 0) e.currentTarget.style.background = 'rgba(var(--primary-rgb), 0.04)';
                      }}
                      onMouseOut={(e) => {
                        if (!isCurrentHour) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <AnimatePresence>
                        {events.map((event) => (
                          <motion.div
                            key={event.id}
                            layoutId={event.id}
                            draggable
                            onDragStart={(e: any) => handleDragStart(e, event.id)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.02, zIndex: 50 }}
                            style={{
                              position: 'absolute',
                              inset: '4px',
                              padding: '10px 12px',
                              borderRadius: 16,
                              background: `linear-gradient(135deg, ${event.color}22 0%, ${event.color}11 100%)`,
                              backdropFilter: 'blur(10px)',
                              borderLeft: `4px solid ${event.color}`,
                              border: `1px solid ${event.color}44`,
                              fontSize: 12, fontWeight: 700,
                              cursor: 'grab',
                              color: 'var(--on-surface)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <GripVertical size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                              <span style={{ 
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                              }}>
                                {event.title}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: 10, opacity: 0.6, fontWeight: 600, 
                              display: 'flex', alignItems: 'center', gap: 4 
                            }}>
                              <Clock size={10} /> {event.time}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                              style={{
                                position: 'absolute', top: 6, right: 6,
                                background: 'var(--surface-high)', border: 'none', 
                                cursor: 'pointer', padding: 4, borderRadius: 8,
                                color: 'var(--on-surface-variant)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              <X size={12} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddEventModal
            day={showAddModal.day}
            time={showAddModal.time}
            onConfirm={handleAddEvent}
            onClose={() => setShowAddModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ day, time, onConfirm, onClose }: {
  day: string;
  time: string;
  onConfirm: (title: string, category: string, day: string, time: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const categories = ['General', 'Frontend', 'Backend', 'ML', 'Databases', 'DevOps', 'Other Work'];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 1001, width: '90%', maxWidth: 420, padding: 32,
          background: 'var(--surface-base)', borderRadius: 32,
          boxShadow: '0 40px 100px rgba(0,0,0,0.2)', border: '1px solid var(--outline-variant)',
        }}
      >
        <button onClick={onClose} style={{
          position: 'absolute', top: 20, right: 20, background: 'var(--surface-high)', border: 'none',
          cursor: 'pointer', color: 'var(--on-surface-variant)', padding: 8, borderRadius: 12
        }}>
          <X size={20} />
        </button>

        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)' }}>New Block</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--on-surface-variant)', fontWeight: 500 }}>
          Scheduling for <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{day}</span> at <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{time}</span>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 8, display: 'block' }}>
              Study Focus
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master React Concurrency"
              className="card-glass"
              style={{ 
                width: '100%',
                fontSize: 14, 
                padding: '14px 18px', 
                borderRadius: 16, 
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-high)',
                color: 'var(--on-surface)',
                outline: 'none'
              }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 12, display: 'block' }}>
              Specialisation
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(c)}
                  style={{
                    padding: '8px 16px', borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer',
                    background: category === c ? 'var(--primary)' : 'var(--surface-high)',
                    color: category === c ? '#fff' : 'var(--on-surface-variant)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: 16 }}>Cancel</button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => title.trim() && onConfirm(title, category, day, time)}
            className="btn-primary"
            style={{ 
              flex: 1, padding: '14px', borderRadius: 16, 
              background: title.trim() ? 'var(--primary)' : 'var(--surface-disabled)',
              cursor: title.trim() ? 'pointer' : 'not-allowed'
            }}
            disabled={!title.trim()}
          >
            Create Session
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatHour(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display} ${suffix}`;
}

function getCategoryColor(category?: string): string {
  const map: Record<string, string> = {
    Frontend: '#D4A853',
    Backend: '#5B8C5A',
    ML: '#8FAE8F',
    Databases: '#7A6B5A',
    DevOps: '#6B8E9B',
    General: '#5B8C5A',
    'Other Work': '#9B6B8E',
  };
  return map[category || ''] || '#5B8C5A';
}
