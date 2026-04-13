import { useEffect, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { supabase } from "../lib/supabaseClient";
import { useAppStore } from "../store/useAppStore";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const NODE_COLORS: Record<string, string> = {
  mastered: "#3B6D11",
  progress: "#BA7517",
  missing:  "#E24B4A",
  none:     "#B4B2A9",
};
const NODE_FILLS: Record<string, string> = {
  mastered: "#EAF3DE",
  progress: "#FAEEDA",
  missing:  "#FCEBEB",
  none:     "#F1EFE8",
};

interface Props {
  completedCourses: string[];    // >= 80% done → mastered
  enrolledCourses?: string[];    // in progress (0–80%)
  targetSkill?: string;
  userId?: string;               // for Supabase cache
}

export default function KnowledgeGraph({
  completedCourses,
  enrolledCourses = [],
  targetSkill = "Recommender Sys",
  userId = "",
}: Props) {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ w: 600, h: 360 });
  const hasFetched = useRef(false); // ← guard: fetch exactly once

  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({ w: containerRef.current.offsetWidth, h: 360 });
      }
    };
    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, []);

  // Fetch once on mount — never re-runs unless user clicks Retry or kgRefreshTrigger increments
  const kgRefreshTrigger = useAppStore((state) => state.kgRefreshTrigger);

  useEffect(() => {
    if (hasFetched.current && kgRefreshTrigger === 0) return;
    hasFetched.current = true;
    fetchGraph();
  }, [kgRefreshTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchGraph() {
    setLoading(true);
    setError(null);
    try {
      // Attach Supabase auth token so the backend can trust the request
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";

      const res = await fetch(`${BASE}/api/kg/graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          completed_courses: completedCourses,
          in_progress_courses: enrolledCourses,
          target_skill: targetSkill,
          user_id: userId,          // enables Supabase read-through cache
        }),
      });

      if (res.status === 429) {
        setError("AI is cooling down (rate limit). Please wait ~1 minute and click Retry.");
        return;
      }
      if (!res.ok) {
        setError(`Server error (${res.status}). Is Flask running?`);
        return;
      }

      const data = await res.json();
      if (data.error) { setError(data.error); return; }

      const nodes = (data.nodes || []).map((n: any) => ({
        id: n.id, state: n.state, group: n.group,
      }));
      const links = (data.edges || []).map(([s, t]: string[]) => ({
        source: s, target: t,
      }));
      setGraphData({ nodes, links });
    } catch {
      setError("Could not connect to backend. Is Flask running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid #E5E7EB",
      borderRadius: 20, padding: 20,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: 0 }}>Skill Knowledge Graph</h2>
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, marginBottom: 0 }}>
            NLP-extracted from your completed courses · llama-3.3-70b
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(["mastered","progress","missing","none"] as const).map(state => (
            <span key={state} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#6B7280" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: NODE_COLORS[state], display: "inline-block" }} />
              {state === "none" ? "Not started" : state === "progress" ? "In progress" : state === "missing" ? "Missing prereq" : "Mastered"}
            </span>
          ))}
        </div>
      </div>

      {/* Click tooltip */}
      {tooltip && (
        <div style={{
          marginBottom: 8, fontSize: 11, background: "#F9FAFB",
          border: "1px solid #E5E7EB", borderRadius: 10,
          padding: "6px 12px", color: "#374151",
        }}>
          {tooltip}
        </div>
      )}

      {/* Graph canvas */}
      <div
        ref={containerRef}
        style={{ height: 360, borderRadius: 12, overflow: "hidden", background: "#fafaf8", position: "relative" }}
      >
        {loading && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#fafaf8", color: "#9CA3AF", fontSize: 13,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🧠</div>
            NLP model mapping your skill graph…
          </div>
        )}

        {error && !loading && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#E24B4A", textAlign: "center", padding: "0 24px",
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            <span style={{ marginBottom: 10 }}>{error}</span>
            <button
              onClick={() => { hasFetched.current = false; fetchGraph(); }}
              style={{
                fontSize: 11, background: "#F3F4F6",
                border: "none", borderRadius: 8, padding: "5px 14px",
                cursor: "pointer", color: "#374151",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {graphData && !loading && !error && (
          <ForceGraph2D
            width={dimensions.w}
            height={dimensions.h}
            graphData={graphData}
            nodeLabel="id"
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              const r = 14;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = NODE_FILLS[node.state] || "#F1EFE8";
              ctx.fill();
              ctx.strokeStyle = NODE_COLORS[node.state] || "#B4B2A9";
              ctx.lineWidth = 2;
              ctx.stroke();
              const fs = Math.max(8, 10 / globalScale);
              ctx.font = `${fs}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = NODE_COLORS[node.state] || "#888";
              ctx.fillText(node.id, node.x, node.y + r + fs);
            }}
            linkColor={() => "#D3D1C7"}
            linkWidth={1.5}
            onNodeClick={(node: any) => {
              const msgs: Record<string, string> = {
                mastered: `✓ ${node.id} — Mastered`,
                progress: `~ ${node.id} — In progress`,
                missing:  `✕ ${node.id} — Missing prereq for ${targetSkill}`,
                none:     `○ ${node.id} — Not started yet`,
              };
              setTooltip(msgs[node.state] || node.id);
            }}
            cooldownTicks={80}
            enableZoomInteraction
          />
        )}
      </div>
      <p style={{ fontSize: 10, color: "#D1D5DB", textAlign: "center", marginTop: 8, marginBottom: 0 }}>
        Click any node for details · Scroll to zoom · Drag to explore
      </p>
    </div>
  );
}
