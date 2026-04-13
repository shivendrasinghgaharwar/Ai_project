import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizQuestion } from '../store/useAppStore';
import { CheckCircle2, XCircle, BookOpen, Trophy } from 'lucide-react';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface Props {
  quizId?: string;
  topic: string;
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  onClose: () => void;
}

interface Answer {
  selected: string;
  correct: boolean;
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function QuizTaskCard({ quizId, topic, questions, onComplete, onClose }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const q = questions[currentIdx];
  const totalQ = questions.length;

  function handleOptionClick(option: string) {
    if (selectedOption !== null) return; // already answered this question
    const isCorrect = option === q.correctAnswer;
    setSelectedOption(option);
    setAnswers(prev => ({ ...prev, [currentIdx]: { selected: option, correct: isCorrect } }));
  }

  function handleNext() {
    if (currentIdx < totalQ - 1) {
      setDirection(1);
      setSelectedOption(null);
      setCurrentIdx(i => i + 1);
    } else {
      finalise();
    }
  }

  async function finalise() {
    const correctCount = Object.values(answers).filter(a => a.correct).length;
    const score = Math.round((correctCount / totalQ) * 100);

    // Build focus areas from wrong answers
    const focusAreas = questions
      .map((q, i) => ({ q, answer: answers[i] }))
      .filter(({ answer }) => answer && !answer.correct)
      .map(({ q }) => q.explanation)
      .join(' ');

    setShowResult(true);
    setSaving(true);

    // Persist to Supabase via backend
    if (quizId) {
      try {
        await fetch(`${BASE}/api/complete-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: quizId, score, feedback: focusAreas }),
        });
      } catch (e) {
        console.error('Failed to save quiz result', e);
      }
    }
    setSaving(false);
    onComplete(score);
  }

  const correctCount = Object.values(answers).filter(a => a.correct).length;
  const score = showResult ? Math.round((correctCount / totalQ) * 100) : 0;
  const wrongAnswers = questions
    .map((q, i) => ({ q, answer: answers[i] }))
    .filter(({ answer }) => answer && !answer.correct);

  // ── Result Screen ────────────────────────────────────────────────────────────
  if (showResult) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          style={{
            background: '#fff', borderRadius: 24, maxWidth: 520, width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '2rem',
            boxShadow: '0 40px 120px rgba(0,0,0,0.25)',
          }}
        >
          {/* Score */}
          <div style={{
            textAlign: 'center', marginBottom: 24,
            padding: '1.5rem', borderRadius: 16,
            background: score >= 60 ? '#EAF3DE' : '#FCEBEB',
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>
              {score >= 80 ? '🏆' : score >= 60 ? '👍' : '📚'}
            </div>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#111' }}>{score}%</div>
            <div style={{ fontSize: 14, color: '#555', marginTop: 6 }}>
              {correctCount} / {totalQ} correct ·{' '}
              {score >= 80
                ? 'Excellent — ready for the next module!'
                : score >= 60
                ? 'Good work — review the focus areas below.'
                : 'Needs more practice — AI has highlighted the gaps.'}
            </div>
          </div>

          {/* Focus Areas */}
          {wrongAnswers.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <BookOpen size={16} color="#BA7517" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#BA7517' }}>
                  Focus Areas ({wrongAnswers.length} topic{wrongAnswers.length > 1 ? 's' : ''} to review)
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {wrongAnswers.map(({ q, answer }, i) => (
                  <div key={i} style={{
                    background: '#FAEEDA', borderRadius: 12, padding: '12px 14px',
                    borderLeft: '3px solid #BA7517',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                      Q{questions.indexOf(q) + 1}: {q.question}
                    </div>
                    <div style={{ fontSize: 11, color: '#7B4F1A', marginBottom: 4 }}>
                      You answered: <span style={{ color: '#A32D2D' }}>{answer.selected}</span>
                      {' '}— Correct: <span style={{ color: '#3B6D11' }}>{q.correctAnswer}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B5020', fontStyle: 'italic' }}>
                      {q.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {wrongAnswers.length === 0 && (
            <div style={{
              background: '#EAF3DE', borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
            }}>
              <Trophy size={16} color="#3B6D11" />
              <span style={{ fontSize: 13, color: '#27500A', fontWeight: 600 }}>
                Perfect score! All concepts mastered.
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', background: '#3B6D11', color: '#fff',
              border: 'none', borderRadius: 12, padding: '12px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Close'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Question Screen ──────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, maxWidth: 540, width: '100%',
        padding: '1.75rem', boxShadow: '0 40px 120px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>AI Checkpoint Quiz</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{topic}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>
              {currentIdx + 1} / {totalQ}
            </span>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#F3F4F6', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${((currentIdx + (selectedOption ? 1 : 0)) / totalQ) * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 4, background: '#3B6D11' }}
          />
        </div>

        {/* Question with slide animation */}
        <div style={{ minHeight: 300, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentIdx}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Question text */}
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 20, lineHeight: 1.5 }}>
                {q.question}
              </p>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrect = opt === q.correctAnswer;
                  let bg = '#F9FAFB', border = '#E5E7EB', color = '#374151', icon = null;

                  if (selectedOption !== null) {
                    if (isCorrect) {
                      bg = '#EAF3DE'; border = '#3B6D11'; color = '#27500A';
                      icon = <CheckCircle2 size={16} color="#3B6D11" style={{ flexShrink: 0 }} />;
                    } else if (isSelected && !isCorrect) {
                      bg = '#FCEBEB'; border = '#E24B4A'; color = '#A32D2D';
                      icon = <XCircle size={16} color="#E24B4A" style={{ flexShrink: 0 }} />;
                    }
                  }

                  return (
                    <motion.button
                      key={opt}
                      onClick={() => handleOptionClick(opt)}
                      whileHover={selectedOption === null ? { scale: 1.015 } : {}}
                      whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', textAlign: 'left', fontSize: 13,
                        padding: '11px 14px', borderRadius: 12,
                        border: `2px solid ${border}`,
                        background: bg, color,
                        cursor: selectedOption === null ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        fontWeight: isSelected || (selectedOption && isCorrect) ? 600 : 400,
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#F3F4F6', border: '1px solid #D1D5DB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                        ...(isSelected || (selectedOption && isCorrect)
                          ? { background: isCorrect ? '#3B6D11' : '#E24B4A', color: '#fff', border: 'none' }
                          : {}),
                      }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation (shows after selection) */}
              {selectedOption && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 14, padding: '10px 14px', borderRadius: 10,
                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                    fontSize: 12, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic',
                  }}
                >
                  💡 {q.explanation}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next / Submit button */}
        {selectedOption && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            style={{
              width: '100%', marginTop: 20, background: '#3B6D11', color: '#fff',
              border: 'none', borderRadius: 12, padding: '13px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {currentIdx < totalQ - 1 ? 'Next Question →' : 'See Results 🏆'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
