import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import { supabase } from "../lib/supabaseClient";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface BurnoutData {
  risk_score: number;
  risk_level: string;
  recommendation: string;
  breakdown: {
    study_gaps: number;
    task_velocity: number;
    difficulty_load: number;
  };
  predicted_hours_next_7_days: number[];
}

interface Props {
  userId: string;
  weeklyHours: number[];
}

export default function BurnoutPredictor({ userId, weeklyHours }: Props) {
  const [burnout, setBurnout] = useState<BurnoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState(userId);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Auto-resolve userId from Supabase session if none passed
  useEffect(() => {
    if (userId) { setResolvedUserId(userId); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setResolvedUserId(session.user.id);
    });
  }, [userId]);

  useEffect(() => {
    if (!resolvedUserId) return;
    async function fetchBurnout() {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}/api/ml/burnout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: resolvedUserId }),
        });
        const result = await res.json();
        if (!result.error) setBurnout(result);
      } catch (e) {
        console.error("Burnout API error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchBurnout();
  }, [resolvedUserId]);

  useEffect(() => {
    if (!burnout || !chartRef.current) return;
    chartInstance.current?.destroy();

    const actual = [...weeklyHours];
    const predicted = [
      null, null, null, null, null, null,
      actual[6] ?? 0,
      ...burnout.predicted_hours_next_7_days,
    ];
    const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun","Mon+","Tue+","Wed+","Thu+","Fri+","Sat+","Sun+"];
    const burnoutLine = Array(14).fill(7);

    chartInstance.current = new Chart(chartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Actual hours",
            data: [...actual, null, null, null, null, null, null, null],
            borderColor: "#3B6D11",
            backgroundColor: "rgba(59,109,17,0.08)",
            fill: true, tension: 0.35,
            pointBackgroundColor: "#3B6D11",
            pointRadius: 4, borderWidth: 2,
          },
          {
            label: "ML predicted",
            data: predicted,
            borderColor: "#185FA5",
            borderDash: [6, 4],
            fill: false, tension: 0.35,
            pointBackgroundColor: "#185FA5",
            pointRadius: 4, borderWidth: 2,
          },
          {
            label: "Burnout zone",
            data: burnoutLine,
            borderColor: "#E24B4A",
            borderDash: [3, 3],
            fill: false,
            pointRadius: 0, borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => v + "h",
              font: { size: 10 },
            },
            grid: { color: "rgba(0,0,0,0.04)" },
          },
        },
      },
    });

    return () => { chartInstance.current?.destroy(); };
  }, [burnout, weeklyHours]);

  const riskColor =
    !burnout ? "#888" :
    burnout.risk_level === "High" ? "#E24B4A" :
    burnout.risk_level === "Medium" ? "#BA7517" : "#3B6D11";

  const riskBg =
    !burnout ? "#F1EFE8" :
    burnout.risk_level === "High" ? "#FCEBEB" :
    burnout.risk_level === "Medium" ? "#FAEEDA" : "#EAF3DE";

  const circumference = 2 * Math.PI * 28;
  const offset = burnout
    ? circumference - (burnout.risk_score / 100) * circumference
    : circumference;

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB",
      borderRadius: 20, padding: 20, marginTop: 4,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: 0 }}>
            Predictive progress &amp; burnout radar
          </h2>
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
            Random Forest model · next 7-day trajectory
          </p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 999,
          background: riskBg, color: riskColor,
        }}>
          {loading ? "Analysing…" : `${burnout?.risk_level ?? "—"} risk`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: 16 }}>
        {/* Chart */}
        <div>
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
            {[
              { color: "#3B6D11", dash: false, label: "Actual" },
              { color: "#185FA5", dash: true,  label: "ML predicted" },
              { color: "#E24B4A", dash: true,  label: "Burnout zone (7h)" },
            ].map(l => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6B7280" }}>
                <span style={{
                  display: "inline-block", width: 14, height: 0,
                  borderTop: `2px ${l.dash ? "dashed" : "solid"} ${l.color}`,
                }} />
                {l.label}
              </span>
            ))}
          </div>
          <div style={{ height: 180, position: "relative" }}>
            <canvas ref={chartRef} aria-label="Burnout prediction chart" role="img" />
          </div>
        </div>

        {/* Ring + Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Gauge ring */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="36" cy="36" r="28" fill="none" stroke="#F1EFE8" strokeWidth="6" />
              <circle
                cx="36" cy="36" r="28" fill="none"
                stroke={riskColor} strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              fontSize: 15, fontWeight: 500, color: "#111",
            }}>
              {loading ? "…" : burnout?.risk_score ?? 0}
            </div>
          </div>

          {/* Breakdown bars */}
          {burnout && (
            <div style={{ width: "100%" }}>
              {Object.entries(burnout.breakdown).map(([key, val]) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>
                    <span>{key.replace(/_/g, " ")}</span>
                    <span>{val}%</span>
                  </div>
                  <div style={{ height: 4, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      width: `${val}%`,
                      background: val > 65 ? "#E24B4A" : val > 40 ? "#BA7517" : "#3B6D11",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation */}
      {burnout && (
        <div style={{
          marginTop: 16, borderRadius: 12, padding: "10px 14px",
          background: riskBg, color: riskColor,
          fontSize: 12, lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 600 }}>AI recommendation: </span>
          {burnout.recommendation}
        </div>
      )}

      {/* Next-week AI schedule */}
      {burnout && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 8, marginTop: 0 }}>
            AI-generated next week schedule
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
              const hrs = burnout.predicted_hours_next_7_days[i] ?? 0;
              const bg = hrs === 0 ? "#F1EFE8" : hrs >= 7 ? "#FCEBEB" : hrs >= 4 ? "#FAEEDA" : "#EAF3DE";
              const tx = hrs === 0 ? "#888" : hrs >= 7 ? "#A32D2D" : hrs >= 4 ? "#633806" : "#27500A";
              return (
                <div key={day} style={{ background: bg, borderRadius: 12, padding: "6px 4px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 500, color: tx }}>{day}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: tx }}>{hrs}h</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
