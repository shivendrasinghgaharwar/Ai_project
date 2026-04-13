import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  CheckCircle2, Circle, Trophy, Flame, Undo2,
  BrainCircuit, BookOpen, Loader2, ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAppStore, getTodayName } from '../store/useAppStore';
import type { ScheduleEvent, QuizQuestion } from '../store/useAppStore';
import { logStudySession, removeStudySession } from '../lib/logStudySession';
import { supabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { QuizTaskCard } from '../components/QuizTaskCard';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

function getTaskDuration(task: any): number {
  if (task.duration) return Number(task.duration);
  if (task.duration_minutes) return Number(task.duration_minutes);
  if (task.estimated_minutes) return Number(task.estimated_minutes);
  return 60;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type QuizStage = 'idle' | 'loading' | 'active' | 'result';

interface InlineQuizState {
  stage: QuizStage;
  questions: QuizQuestion[];
  quizId: string | null;
  topic: string;
  currentIdx: number;
  selectedOption: string | null;
  answers: Record<number, { selected: string; correct: boolean }>;
  error: string | null;
}

const INITIAL_QUIZ: InlineQuizState = {
  stage: 'idle',
  questions: [],
  quizId: null,
  topic: '',
  currentIdx: 0,
  selectedOption: null,
  answers: {},
  error: null,
};

// ── Inline Knowledge Check Card ───────────────────────────────────────────────
function KnowledgeCheckCard({
  completedTasks,
  userId,
}: {
  completedTasks: ScheduleEvent[];
  userId: string | null;
}) {
  const [quiz, setQuiz] = useState<InlineQuizState>(INITIAL_QUIZ);

  const disabled = completedTasks.length === 0;

  async function startDailyQuiz() {
    setQuiz({ ...INITIAL_QUIZ, stage: 'loading' });
    try {
      const res = await fetch(`${BASE}/api/generate-daily-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          completed_tasks: completedTasks.map(t => ({
            title: t.title,
            category: t.category,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate quiz');
      setQuiz({
        ...INITIAL_QUIZ,
        stage: 'active',
        questions: data.questions,
        quizId: data.quiz_id,
        topic: data.topic,
      });
    } catch (e: any) {
      setQuiz(q => ({ ...q, stage: 'idle', error: e.message || 'Could not generate quiz' }));
    }
  }

  function selectOption(option: string) {
    if (quiz.selectedOption !== null) return;
    const q = quiz.questions[quiz.currentIdx];
    const correct = option === q.correctAnswer;
    setQuiz(s => ({
      ...s,
      selectedOption: option,
      answers: { ...s.answers, [s.currentIdx]: { selected: option, correct } },
    }));
  }

  async function handleNext() {
    if (quiz.currentIdx < quiz.questions.length - 1) {
      setQuiz(s => ({ ...s, currentIdx: s.currentIdx + 1, selectedOption: null }));
    } else {
      // Finished — show result
      const correctCount = Object.values({ ...quiz.answers }).filter(a => a.correct).length;
      const totalQ = quiz.questions.length;
      const scoreFloat = correctCount / totalQ;

      setQuiz(s => ({ ...s, stage: 'result' }));

      // Log to Supabase
      try {
        if (quiz.quizId) {
          const focusAreas = quiz.questions
            .map((q, i) => ({ q, a: quiz.answers[i] ?? { correct: true } }))
            .filter(x => !x.a.correct)
            .map(x => x.q.explanation)
            .join(' ');

          await fetch(`${BASE}/api/complete-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quiz_id: quiz.quizId, score: Math.round(scoreFloat * 100), feedback: focusAreas }),
          });
        }
        if (userId) {
          await fetch(`${BASE}/api/log-quiz-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              course_name: quiz.topic || 'Daily Review',
              score: scoreFloat,
              total_questions: totalQ,
            }),
          });
        }
      } catch (e) {
        console.error('Score log error', e);
      }
    }
  }

  const correctCount = Object.values(quiz.answers).filter(a => a.correct).length;
  const totalQ = quiz.questions.length;
  const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const wrongAnswers = quiz.questions
    .map((q, i) => ({ q, answer: quiz.answers[i] }))
    .filter(x => x.answer && !x.answer.correct);

  return (
    <motion.div
      layout
      style={{
        background: 'linear-gradient(135deg, #F0F7EE 0%, #EAF0F5 100%)',
        border: '1.5px solid rgba(91,140,90,0.18)',
        borderRadius: 24,
        padding: '22px 24px',
        overflow: 'hidden',
      }}
    >
      {/* ── KNOWLEDGE CHECK CARD (IDLE & LOADING) ─────────────────── */}
      {(quiz.stage === 'idle' || quiz.stage === 'loading') && (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(124,58,237,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BrainCircuit size={20} color="#7C3AED" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
                Knowledge Check
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                {disabled
                  ? 'Complete at least one task today to unlock your AI review quiz.'
                  : `Ready to test ${completedTasks.length} topic${completedTasks.length > 1 ? 's' : ''} you studied today.`}
              </div>
            </div>
          </div>

          {/* Completed topics preview chips */}
          {!disabled && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {completedTasks.slice(0, 6).map(t => (
                <span key={t.id} style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: '#fff', border: '1px solid rgba(91,140,90,0.2)',
                  color: '#374151',
                }}>
                  {t.title.length > 24 ? t.title.slice(0, 24) + '…' : t.title}
                </span>
              ))}
              {completedTasks.length > 6 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: 'rgba(124,58,237,0.08)', color: '#7C3AED',
                }}>
                  +{completedTasks.length - 6} more
                </span>
              )}
            </div>
          )}

          {quiz.error && (
            <div style={{
              fontSize: 12, color: '#A32D2D', background: '#FCEBEB', borderRadius: 10,
              padding: '8px 12px', marginBottom: 12,
            }}>
              ⚠️ {quiz.error}
            </div>
          )}

          <motion.button
            whileHover={disabled || quiz.stage === 'loading' ? {} : { scale: 1.02, y: -1, boxShadow: '0 8px 24px rgba(124,58,237,0.25)' }}
            whileTap={disabled || quiz.stage === 'loading' ? {} : { scale: 0.98 }}
            onClick={disabled || quiz.stage === 'loading' ? undefined : startDailyQuiz}
            className={`w-full py-3 rounded-xl font-medium transition-all ${
              disabled || quiz.stage === 'loading'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
            }`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            {quiz.stage === 'loading' ? 'Generating AI Quiz... ⏳' : (
              <>
                <BrainCircuit size={16} />
                Generate Daily Review Quiz 🧠
              </>
            )}
          </motion.button>
        </motion.div>
      )}



      {/* ── ACTIVE (one question at a time) ───────────────────────────── */}
      {quiz.stage === 'active' && quiz.questions.length > 0 && (() => {
        const q = quiz.questions[quiz.currentIdx];
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Quiz header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Daily Review
                </div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 2 }}>
                  {quiz.topic}
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 999,
                background: 'rgba(124,58,237,0.10)', color: '#7C3AED',
              }}>
                {quiz.currentIdx + 1} / {quiz.questions.length}
              </span>
            </div>

            {/* Progress */}
            <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${((quiz.currentIdx + (quiz.selectedOption ? 1 : 0)) / quiz.questions.length) * 100}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #7C3AED, #5B21B6)' }}
              />
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={quiz.currentIdx}
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -40, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16, lineHeight: 1.55 }}>
                  {q.question}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options.map((opt, oi) => {
                    const isSelected = quiz.selectedOption === opt;
                    const isCorrect  = opt === q.correctAnswer;
                    let bg = '#fff', border = '1.5px solid #E5E7EB', col = '#374151';

                    if (quiz.selectedOption !== null) {
                      if (isCorrect) {
                        bg = '#EAF3DE'; border = '1.5px solid #3B6D11'; col = '#27500A';
                      } else if (isSelected) {
                        bg = '#FCEBEB'; border = '1.5px solid #E24B4A'; col = '#A32D2D';
                      }
                    }

                    return (
                      <motion.button
                        key={opt}
                        whileHover={quiz.selectedOption === null ? { scale: 1.015 } : {}}
                        whileTap={quiz.selectedOption === null ? { scale: 0.98 } : {}}
                        onClick={() => selectOption(opt)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', textAlign: 'left',
                          padding: '11px 14px', borderRadius: 12, fontSize: 13,
                          border, background: bg, color: col,
                          cursor: quiz.selectedOption === null ? 'pointer' : 'default',
                          transition: 'all 0.18s ease',
                          fontWeight: isSelected || (quiz.selectedOption && isCorrect) ? 600 : 400,
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                          background: quiz.selectedOption
                            ? (isCorrect ? '#3B6D11' : isSelected ? '#E24B4A' : '#F3F4F6')
                            : '#F3F4F6',
                          color: quiz.selectedOption
                            ? ((isCorrect || isSelected) ? '#fff' : '#9CA3AF')
                            : '#9CA3AF',
                          border: '1px solid transparent',
                        }}>
                          {quiz.selectedOption
                            ? (isCorrect ? '✓' : isSelected ? '✕' : String.fromCharCode(65 + oi))
                            : String.fromCharCode(65 + oi)}
                        </span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation */}
                <AnimatePresence>
                  {quiz.selectedOption && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        background: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: '10px 14px',
                        fontSize: 12, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic',
                        overflow: 'hidden',
                      }}
                    >
                      💡 {q.explanation}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* Next / Finish button */}
            <AnimatePresence>
              {quiz.selectedOption && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={handleNext}
                  style={{
                    width: '100%', marginTop: 16,
                    background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    padding: '12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {quiz.currentIdx < quiz.questions.length - 1
                    ? <><ChevronRight size={16} /> Next Question</>
                    : <><Trophy size={16} /> Finish &amp; See Score</>}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })()}

      {/* ── RESULT ────────────────────────────────────────────────────── */}
      {quiz.stage === 'result' && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          {/* Score hero */}
          <div style={{
            textAlign: 'center', padding: '1.5rem',
            background: score >= 60 ? '#EAF3DE' : '#FCEBEB',
            borderRadius: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>
              {score === 100 ? '🏆' : score >= 80 ? '🎯' : score >= 60 ? '👍' : '📚'}
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#111', lineHeight: 1 }}>
              {correctCount} <span style={{ fontSize: 28, color: '#6B7280' }}>/ {totalQ}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {score === 100
                ? 'Perfect review! All concepts mastered today.'
                : score >= 80
                ? 'Great work — almost perfect!'
                : score >= 60
                ? 'Solid effort — review the focus areas below.'
                : 'Keep studying these topics — you\'ll get there!'}
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
              ✓ Score logged to your recommendation profile
            </div>
          </div>

          {/* Focus areas */}
          {wrongAnswers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <BookOpen size={14} color="#BA7517" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#BA7517' }}>
                  Focus Areas — What to review
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {wrongAnswers.map(({ q, answer }, i) => (
                  <div key={i} style={{
                    background: '#FAEEDA', borderLeft: '3px solid #BA7517',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 3 }}>
                      {q.question}
                    </div>
                    <div style={{ fontSize: 11, color: '#7B4F1A', marginBottom: 3 }}>
                      Your answer: <span style={{ color: '#A32D2D' }}>{answer.selected}</span>
                      {' · '}Correct: <span style={{ color: '#3B6D11' }}>{q.correctAnswer}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B5020', fontStyle: 'italic' }}>
                      {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setQuiz(INITIAL_QUIZ)}
              style={{
                flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Sparkles size={14} /> Retake Quiz
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setQuiz(INITIAL_QUIZ)}
              style={{
                flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                background: '#F3F4F6', color: '#374151', border: 'none', cursor: 'pointer',
              }}
            >
              Done
            </motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Main TasksPage ─────────────────────────────────────────────────────────────
export function TasksPage() {
  const {
    scheduleEvents, completedTaskIds,
    completeTask, uncompleteTask,
    activeQuiz, setActiveQuiz,
  } = useAppStore();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const today = getTodayName();
  const todayEvents = scheduleEvents.filter((e) => e.day === today);
  const pending   = todayEvents.filter((e) => !completedTaskIds.has(e.id));
  const completed = todayEvents.filter((e) => completedTaskIds.has(e.id));
  const total     = todayEvents.length;
  const doneCount = completed.length;
  const progress  = total > 0 ? (doneCount / total) * 100 : 0;

  const handleComplete = async (task: ScheduleEvent) => {
    completeTask(task.id);
    if (userId) {
      await logStudySession({
        userId,
        category: task.category || 'General',
        durationMinutes: getTaskDuration(task),
      });
    }
  };

  const handleUncomplete = async (task: ScheduleEvent) => {
    uncompleteTask(task.id);
    if (userId) {
      await removeStudySession({
        userId,
        category: task.category || 'General',
        durationMinutes: getTaskDuration(task),
      });
    }
  };

  const handleTaskClick = (task: ScheduleEvent) => {
    if (task.source === 'quiz' && task.quizQuestions && task.quizQuestions.length > 0) {
      setActiveQuiz(task);
    } else {
      handleComplete(task);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Per-course quiz modal (from CourseDrawer) */}
      {activeQuiz && activeQuiz.quizQuestions && (
        <QuizTaskCard
          quizId={activeQuiz.quizId}
          topic={activeQuiz.quizTopic || activeQuiz.title}
          questions={activeQuiz.quizQuestions}
          onComplete={() => { handleComplete(activeQuiz); setActiveQuiz(null); }}
          onClose={() => setActiveQuiz(null)}
        />
      )}

      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Today's Tasks
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--on-surface-variant)' }}>
          {today} — Track, complete, and review your daily study progress
        </p>
      </div>

      {/* Progress bar card */}
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

        <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-high)', overflow: 'hidden' }}>
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
            <Trophy size={16} /> All done! Great work today — take your review quiz 🧠
          </motion.div>
        )}
      </motion.div>

      {/* Split task columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── Pending ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Circle size={16} color="var(--on-surface-variant)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Pending</h3>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
              background: 'var(--surface-high)', color: 'var(--on-surface-variant)',
            }}>
              {pending.length}
            </span>
          </div>

          <motion.div variants={containerVariants} initial="hidden" animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence mode="popLayout">
              {pending.map((task) => {
                const isQuiz = task.source === 'quiz';
                return (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.8, x: -60, transition: { duration: 0.35 } }}
                    layout
                    className="card-glass"
                    style={{
                      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer',
                      ...(isQuiz ? { border: '1.5px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.03)' } : {}),
                    }}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(91,140,90,0.10)' }}
                    onClick={() => handleTaskClick(task)}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${isQuiz ? '#7C3AED' : 'var(--outline-variant)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isQuiz ? 'rgba(124,58,237,0.08)' : 'transparent',
                    }}>
                      {isQuiz && <BrainCircuit size={12} color="#7C3AED" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
                        {task.category} · {task.time}
                        {isQuiz && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '1px 6px', borderRadius: 6 }}>
                            AI QUIZ
                          </span>
                        )}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={e => { e.stopPropagation(); handleTaskClick(task); }}
                      style={{
                        padding: '6px 14px', borderRadius: 10, border: 'none',
                        background: isQuiz ? '#7C3AED' : 'var(--primary)',
                        color: '#fff', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {isQuiz ? 'Take Quiz' : 'Done'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {pending.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 14, borderRadius: 16, background: 'var(--surface-high)' }}>
                {total > 0 ? '🎉 All tasks completed!' : '📅 No tasks scheduled for today'}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ── Completed + Knowledge Check ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={16} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>Completed Today</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                background: 'var(--primary-container)', color: 'var(--primary)',
              }}>
                {completed.length}
              </span>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence mode="popLayout">
                {completed.map((task) => (
                  <motion.div
                    key={task.id}
                    layoutId={task.id}
                    initial={{ opacity: 0, scale: 0.85, x: 60 }}
                    animate={{ opacity: 1, scale: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="card-glass"
                    style={{
                      padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
                      background: task.source === 'quiz' ? 'rgba(124,58,237,0.05)' : 'var(--primary-container)',
                      border: task.source === 'quiz' ? '1px solid rgba(124,58,237,0.15)' : '1px solid rgba(91,140,90,0.2)',
                    }}
                  >
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}>
                      {task.source === 'quiz'
                        ? <BrainCircuit size={20} color="#7C3AED" />
                        : <CheckCircle2 size={22} color="var(--primary)" />}
                    </motion.div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, textDecoration: 'line-through', opacity: 0.7 }}>
                        {task.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.color, flexShrink: 0 }} />
                        {task.category} · {task.time}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => handleUncomplete(task)}
                      style={{ padding: 6, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--on-surface-variant)' }}
                      title="Undo"
                    >
                      <Undo2 size={14} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {completed.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13, borderRadius: 16, background: 'var(--surface-high)' }}>
                  ✅ Completed tasks appear here
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* ── Knowledge Check card ── */}
          <KnowledgeCheckCard
            completedTasks={completed}
            userId={userId}
          />
        </div>
      </div>
    </motion.div>
  );
}
