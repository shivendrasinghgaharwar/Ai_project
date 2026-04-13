import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Props {
  courseName: string;
  userId: string;
  onClose: () => void;
}

export default function QuizModal({ courseName, userId, onClose }: Props) {
  const [stage, setStage] = useState<"intro" | "loading" | "quiz" | "result">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [error, setError] = useState("");

  async function startQuiz() {
    setStage("loading");
    setError("");
    try {
      const res = await fetch(`${BASE}/api/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_name: courseName, num_questions: 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions);
      setStage("quiz");
    } catch (e: any) {
      setError(e.message || "Failed to generate quiz");
      setStage("intro");
    }
  }

  async function submitQuiz() {
    const correct = questions.filter((q, i) => answers[i] === q.correct_index).length;
    const score = correct / questions.length;
    setStage("result");

    // Resolve user id from session if not passed
    let uid = userId;
    if (!uid) {
      const { data: { session } } = await supabase.auth.getSession();
      uid = session?.user?.id ?? "";
    }

    try {
      await fetch(`${BASE}/api/quiz/save-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          course_name: courseName,
          score,
          total_questions: questions.length,
        }),
      });
    } catch (e) {
      console.error("Score save failed:", e);
    }
  }

  const correctCount = questions.filter((q, i) => answers[i] === q.correct_index).length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, maxWidth: 560, width: "100%",
        maxHeight: "88vh", overflowY: "auto", padding: "1.5rem",
        boxShadow: "0 32px 100px rgba(0,0,0,0.20)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#111", margin: 0 }}>
              AI Checkpoint Quiz
            </h2>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
              {courseName} · RAG pipeline · llama-3.3-70b
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, color: "#aaa", cursor: "pointer", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Intro */}
        {stage === "intro" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
            <p style={{ fontSize: 13, color: "#555", marginBottom: 16, lineHeight: 1.6 }}>
              The AI will generate 5 questions from <strong>{courseName}</strong> using a Retrieval-Augmented Generation pipeline.
              Your score feeds back into the recommendation engine.
            </p>
            {error && (
              <div style={{
                background: "#FCEBEB", color: "#A32D2D", borderRadius: 10,
                padding: "8px 12px", fontSize: 12, marginBottom: 12,
              }}>
                ⚠️ {error}
              </div>
            )}
            <button
              onClick={startQuiz}
              style={{
                background: "#3B6D11", color: "#fff", border: "none",
                borderRadius: 12, padding: "10px 28px", fontSize: 13,
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Generate Quiz
            </button>
          </div>
        )}

        {/* Loading */}
        {stage === "loading" && (
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 13, color: "#9CA3AF" }}>
              AI generating questions from course materials…
            </div>
          </div>
        )}

        {/* Quiz questions */}
        {stage === "quiz" && questions.map((q, qi) => (
          <div key={qi} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 8 }}>
              {qi + 1}. {q.question}
            </p>
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              return (
                <button
                  key={oi}
                  onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    fontSize: 12, padding: "9px 12px", borderRadius: 10,
                    marginBottom: 6, cursor: "pointer", transition: "all 0.15s",
                    border: selected ? "2px solid #3B6D11" : "1px solid #E5E7EB",
                    background: selected ? "#EAF3DE" : "#fff",
                    color: selected ? "#27500A" : "#444",
                  }}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                </button>
              );
            })}
          </div>
        ))}

        {stage === "quiz" && (
          <button
            onClick={submitQuiz}
            disabled={answeredCount < questions.length}
            style={{
              width: "100%", background: "#3B6D11", color: "#fff",
              border: "none", borderRadius: 12, padding: "11px",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              opacity: answeredCount < questions.length ? 0.4 : 1, marginTop: 8,
            }}
          >
            Submit Quiz ({answeredCount}/{questions.length} answered)
          </button>
        )}

        {/* Results */}
        {stage === "result" && (
          <div>
            <div style={{
              textAlign: "center", padding: "1rem",
              background: correctCount >= 3 ? "#EAF3DE" : "#FCEBEB",
              borderRadius: 14, marginBottom: 16,
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#111" }}>
                {correctCount} / {questions.length}
              </div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                {correctCount === questions.length
                  ? "🎉 Perfect score! Ready for the next module."
                  : correctCount >= 3
                  ? "👍 Good work — review missed topics."
                  : "📚 Needs practice — AI will re-prioritize these topics."}
              </div>
            </div>

            {questions.map((q, qi) => {
              const userAns = answers[qi];
              const isCorrect = userAns === q.correct_index;
              return (
                <div key={qi} style={{ marginBottom: 14, fontSize: 12 }}>
                  <p style={{ fontWeight: 600, color: "#111", marginBottom: 4 }}>
                    {qi + 1}. {q.question}
                  </p>
                  <p style={{ color: isCorrect ? "#3B6D11" : "#A32D2D", marginBottom: 2 }}>
                    Your answer: {q.options[userAns]} {isCorrect ? "✓" : "✕"}
                  </p>
                  {!isCorrect && (
                    <p style={{ color: "#3B6D11", marginBottom: 2 }}>
                      Correct: {q.options[q.correct_index]}
                    </p>
                  )}
                  <p style={{ color: "#9CA3AF", fontStyle: "italic", marginTop: 2, marginBottom: 0 }}>
                    {q.explanation}
                  </p>
                </div>
              );
            })}

            <button
              onClick={onClose}
              style={{
                width: "100%", background: "#3B6D11", color: "#fff",
                border: "none", borderRadius: 12, padding: "10px",
                fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8,
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
