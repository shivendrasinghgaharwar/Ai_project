import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BookOpen, BarChart2, Tag, Sparkles,
  Send, ChevronDown, ChevronUp, GraduationCap, Loader2, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/client';
import { askGemini } from '../lib/geminiClient';
import { useAppStore, getTodayName } from '../store/useAppStore';

interface CourseDrawerProps {
  course: any | null;
  userId: string;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: '#5B8C5A',
  Intermediate: '#D4A853',
  Advanced: '#E53E3E',
};

export function CourseDrawer({ course, userId, onClose }: CourseDrawerProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [isMastered, setIsMastered] = useState(false);
  const [quizGenerating, setQuizGenerating] = useState(false);
  const [quizToast, setQuizToast] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addScheduleEvent = useAppStore(s => s.addScheduleEvent);
  const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // Load user's skill level from Supabase on mount  
  useEffect(() => {
    if (!userId || !course) return;

    const fetchSkill = async () => {
      await supabase
        .from('user_stats')
        .select('skill_level')
        .eq('id', userId)
        .ilike('category_name', `%${course.category?.split(' ')[0]}%`)
        .single();

      // Skill level fetched but unused in UI currently
    };
    fetchSkill();

    // Log course view interaction
    if (userId) {
      apiClient.logInteraction(userId, course.course_id, 3).catch(() => {});
    }

    // Reset chat on course change
    setMessages([{
      id: 0,
      role: 'ai',
      text: `Hi! I'm your AI tutor for **${course?.title}**. Ask me anything about this course — concepts, exercises, career paths, or how to get started! 🎓`,
      timestamp: new Date(),
    }]);
    setEnrolled(false);
  }, [course?.course_id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!course) return null;

  const handleEnroll = async () => {
    setEnrolled(true);
    await apiClient.logInteraction(userId, course.course_id, 5);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const aiText = await askGemini(text, course?.title || 'this course');

      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'ai', text: aiText, timestamp: new Date(),
      }]);

      // Log AI interaction to backend
      await apiClient.logInteraction(userId, course.course_id, 4).catch(() => {});
    } catch (error: any) {
      setIsTyping(false);
      const msg = error?.message || "";
      let errorText = "⚠️ Something went wrong. Please try again.";

      if (msg.includes("wait") || msg.includes("429") || msg.includes("quota")) {
        errorText = `⏳ ${msg}`;
      } else if (msg.includes("unavailable")) {
        errorText = "⚠️ AI tutor is temporarily unavailable. Please try again in a moment.";
      } else if (msg.includes("API key") || msg.includes("key") || msg.includes("Invalid")) {
        errorText = "⚠️ There's an issue with the AI configuration. Please contact support.";
      }

      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "ai", text: errorText, timestamp: new Date()
      }]);
    }
  };

  const diffColor = DIFFICULTY_COLORS[course.difficulty] ?? 'var(--primary)';

  return (
    <AnimatePresence>
      {course && (
        <>
          {/* Dimmed backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Slide-in Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 38 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 'min(520px, 95vw)', zIndex: 201,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(91,140,90,0.15)',
              boxShadow: '-24px 0 80px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px 28px', borderBottom: '1px solid var(--outline-variant)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: `${diffColor}18`, color: diffColor,
                  }}>
                    {course.difficulty}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: 'var(--primary-container)', color: 'var(--primary)',
                  }}>
                    {course.category}
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3, fontFamily: 'var(--font-display)' }}>
                  {course.title}
                </h2>
              </div>
              <button onClick={onClose} style={{
                background: 'var(--surface-high)', border: 'none', borderRadius: 12,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
                <X size={18} color="var(--on-surface-variant)" />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Stats Row */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { icon: BarChart2, label: `${course.avg_progress?.toFixed(0) ?? 0}% avg progress` },
                  { icon: BookOpen, label: `${course.num_enrollments ?? 0} enrolled` },
                  { icon: Tag, label: `${course.avg_rating?.toFixed(1) ?? '—'} / 5.0` },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    flex: 1, background: 'var(--surface-high)', borderRadius: 14, padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
                  }}>
                    <Icon size={16} color="var(--primary)" />
                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', textAlign: 'center', fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  About This Course
                </h4>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--on-surface)' }}>
                  {course.description || 'No description available.'}
                </p>
              </div>

              {/* Tags (Syllabus) */}
              {course.tags && (
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Topics Covered
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {course.tags.split(',').map((tag: string) => (
                      <span key={tag} style={{
                        fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20,
                        background: 'var(--surface-high)', color: 'var(--on-surface-variant)',
                        border: '1px solid var(--outline-variant)',
                      }}>
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mastery Action Button */}
              {enrolled ? (
                <>
                  <div style={{ padding: '4px 8px', background: 'var(--surface-high)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: 'var(--on-surface-variant)' }}>Course Progress</span>
                      <span style={{ color: 'var(--primary)' }}>{isMastered ? '100%' : 'In Progress'}</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--surface-base)', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isMastered ? '100%' : '45%' }}
                        transition={{ duration: 1 }}
                        style={{ height: '100%', background: 'var(--primary)' }}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async (e) => {
                      if (isMastered) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: {
                          x: (rect.left + rect.width / 2) / window.innerWidth,
                          y: (rect.top + rect.height / 2) / window.innerHeight
                        },
                        colors: ['#5B8C5A', '#D4A853', '#BA7517'],
                        disableForReducedMotion: true
                      });
                      setIsMastered(true);
                      if (course?.course_id) {
                        const { useAppStore } = await import('../store/useAppStore');
                        await useAppStore.getState().markCourseComplete(userId, course.course_id);
                      }
                    }}
                    style={{
                      width: '100%', padding: '15px 24px', borderRadius: 50, border: 'none',
                      background: isMastered ? '#EAF3DE' : 'var(--primary)',
                      color: isMastered ? 'var(--primary)' : '#fff',
                      fontWeight: 700, fontSize: 15, cursor: isMastered ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      transition: 'all 0.3s ease',
                      boxShadow: isMastered ? 'none' : '0 8px 30px rgba(91,140,90,0.35)',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    {isMastered ? 'Course Mastered!' : 'Mark Course Complete'}
                  </motion.button>
                </>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEnroll}
                  style={{
                    width: '100%', padding: '15px 24px', borderRadius: 50, border: 'none',
                    background: 'var(--primary)',
                    color: '#fff',
                    fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.3s ease',
                    boxShadow: '0 8px 30px rgba(91,140,90,0.35)',
                  }}
                >
                  <GraduationCap size={18} />
                  Enroll Now — It's Free
                </motion.button>
              )}

              {/* Quiz Button — Generate & Schedule */}
              <button
                onClick={async () => {
                  if (quizGenerating) return;
                  setQuizGenerating(true);
                  setQuizToast(null);
                  try {
                    const res = await fetch(`${BASE}/api/generate-quiz`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_id: userId,
                        topic: course?.title || 'General Study',
                        course_id: course?.id || '',
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

                    // Add quiz task to today's schedule in Zustand
                    const quizEvent = {
                      id: `quiz-${data.quiz_id || Date.now()}`,
                      title: `Quiz: ${course?.title}`,
                      category: course?.category || 'Study',
                      color: '#7C3AED',
                      day: getTodayName(),
                      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                      duration: 15,
                      source: 'quiz' as const,
                      courseId: course?.id,
                      quizId: data.quiz_id,
                      quizTopic: course?.title,
                      quizQuestions: data.questions,
                    };
                    addScheduleEvent(quizEvent);
                    setQuizToast('✅ Quiz ready in Tasks!');
                    setTimeout(() => setQuizToast(null), 4000);
                  } catch (e: any) {
                    setQuizToast(`⚠️ ${e.message || 'Could not generate quiz'}`);
                    setTimeout(() => setQuizToast(null), 5000);
                  } finally {
                    setQuizGenerating(false);
                  }
                }}
                disabled={quizGenerating}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 16,
                  border: '1.5px solid #7C3AED',
                  background: quizGenerating ? '#F5F3FF' : 'transparent',
                  color: '#7C3AED',
                  fontWeight: 700, fontSize: 14, cursor: quizGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  transition: 'all 0.2s ease', opacity: quizGenerating ? 0.75 : 1,
                }}
                onMouseEnter={e => {
                  if (!quizGenerating) {
                    (e.currentTarget as HTMLElement).style.background = '#7C3AED';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = quizGenerating ? '#F5F3FF' : 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#7C3AED';
                }}
              >
                {quizGenerating ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating AI Quiz… 🧠</>
                ) : (
                  '🧠 Generate Checkpoint Quiz'
                )}
              </button>

              {/* Toast notification */}
              <AnimatePresence>
                {quizToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    style={{
                      padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                      background: quizToast.startsWith('⚠') ? '#FCEBEB' : '#EAF3DE',
                      color: quizToast.startsWith('⚠') ? '#A32D2D' : '#27500A',
                      border: `1px solid ${quizToast.startsWith('⚠') ? '#FECACA' : '#BBF7D0'}`,
                    }}
                  >
                    {quizToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Chat Toggle */}
              <div>
                <button
                  onClick={() => { setChatOpen(!chatOpen); setTimeout(() => inputRef.current?.focus(), 300); }}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 16, border: '1.5px solid var(--primary)',
                    background: chatOpen ? 'var(--primary-container)' : 'transparent',
                    color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Sparkles size={16} />
                  {chatOpen ? 'Hide AI Tutor' : 'Ask AI Tutor About This Course'}
                  {chatOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>

                {/* Chat Panel */}
                <AnimatePresence>
                  {chatOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden', marginTop: 12 }}
                    >
                      {/* Message List */}
                      <div style={{
                        background: 'var(--surface-high)', borderRadius: 16, padding: 16,
                        maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
                      }}>
                        {messages.map(msg => (
                          <div key={msg.id} style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          }}>
                            <div style={{
                              maxWidth: '82%',
                              padding: '10px 14px',
                              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: msg.role === 'user' ? 'var(--primary)' : '#fff',
                              color: msg.role === 'user' ? '#fff' : 'var(--on-surface)',
                              fontSize: 13, lineHeight: 1.6,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                              padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
                              background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              display: 'flex', gap: 6, alignItems: 'center',
                            }}>
                              {[0, 1, 2].map(i => (
                                <motion.div key={i}
                                  animate={{ y: [-3, 0, -3] }}
                                  transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                  style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input row */}
                      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <input
                          ref={inputRef}
                          className="input-field"
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                          placeholder={`Ask about ${course?.title?.split(' ').slice(0, 3).join(' ')}...`}
                          style={{ flex: 1, fontSize: 13 }}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSend}
                          disabled={isTyping || !input.trim()}
                          style={{
                            width: 44, height: 44, flexShrink: 0, borderRadius: 14, border: 'none',
                            background: input.trim() && !isTyping ? 'var(--primary)' : 'var(--surface)',
                            color: input.trim() && !isTyping ? '#fff' : 'var(--on-surface-variant)',
                            cursor: input.trim() && !isTyping ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <Send size={17} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
