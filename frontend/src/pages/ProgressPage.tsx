import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { TrendingUp, BookOpen } from 'lucide-react';
import { useAppStore, getTodayName } from '../store/useAppStore';
import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/client';
import { useProgressData } from '../hooks/useProgressData';
import BurnoutPredictor from '../components/BurnoutPredictor';
import KnowledgeGraph from '../components/KnowledgeGraph';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

const CHART_COLORS = ['#5B8C5A', '#D4A853', '#7A6B5A', '#8FAE8F', '#6B8E9B', '#9B6B8E'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        border: '1px solid var(--outline-variant)', borderRadius: 12,
        padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13 }}>{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ margin: '2px 0', color: entry.color, fontSize: 12, fontWeight: 600 }}>
            {entry.name}: {entry.value}h
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ProgressPage() {
  const { scheduleEvents, completedTaskIds } = useAppStore();
  const [evalData, setEvalData] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const { data, loading } = useProgressData();

  // Resolve current user's ID from Supabase session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? '');
    });
  }, []);

  useEffect(() => {
    apiClient.getEvaluation().then((d) => {
      if (d?.status === 'success') setEvalData(d);
    }).catch(() => {});
  }, []);

  // Today's task counts from Zustand (instant, no fetch)
  const today = getTodayName();
  const todayEvents = scheduleEvents.filter((e) => e.day === today);
  const todayTasksTotal = todayEvents.length;
  const todayTasksDone = todayEvents.filter((e) => completedTaskIds.has(e.id)).length;

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeklyData = DAYS.map((day, i) => ({
    day,
    completed: data.weeklyHours[i] || 0,
    planned: data.plannedHours[i] || 2,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
    >
      {/* ── Header ── */}
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Learning Progress
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--on-surface-variant)' }}>
          Track your weekly study patterns, burnout risk, and skill knowledge graph
        </p>
      </div>

      {/* ── Stat cards ── */}
      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          Loading stats…
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {[
            {
              label: "Total hours",
              value: data.totalHours > 0 ? `${data.totalHours}h` : "0h",
              sub: data.totalHours > 0 ? "all time" : "Complete tasks to start tracking",
              fill: "#3B6D11", pct: Math.min(100, data.totalHours * 2),
            },
            {
              label: "Today's tasks",
              value: todayTasksTotal > 0
                ? `${Math.round((todayTasksDone / todayTasksTotal) * 100)}%`
                : "0%",
              sub: todayTasksTotal > 0
                ? `${todayTasksDone} of ${todayTasksTotal} done`
                : "No tasks scheduled today",
              fill: "#185FA5",
              pct: todayTasksTotal > 0 ? Math.round((todayTasksDone / todayTasksTotal) * 100) : 0,
            },
            {
              label: "Active days",
              value: data.activeDays > 0 ? `${data.activeDays} / 7` : "0 / 7",
              sub: data.currentStreak > 0
                ? `${data.currentStreak}-day streak 🔥`
                : "No streak yet — start today!",
              fill: "#BA7517", pct: (data.activeDays / 7) * 100,
            },
            {
              label: "Top category",
              value: data.topCategory !== "—" ? data.topCategory : "None yet",
              sub: data.categoryHours.length > 0
                ? `${data.categoryHours[0].hours}h logged`
                : "Complete tasks to see categories",
              fill: "#534AB7", pct: data.categoryHours.length > 0 ? 85 : 0,
            },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">{s.label}</div>
              <div className="text-2xl font-semibold text-gray-900 leading-tight">{s.value}</div>
              <div className="text-[11px] text-gray-400 mt-1">{s.sub}</div>
              <div className="h-[3px] bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.pct}%`, background: s.fill }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Weekly Progress Chart */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="card-glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Weekly Progress</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} />
                Completed
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--tertiary)', opacity: 0.5 }} />
                Planned
              </div>
            </div>
          </div>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" opacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} unit="h" />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B8C5A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5B8C5A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A853" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="planned" name="Planned"
                  stroke="var(--tertiary)" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorPlanned)" />
                <Area type="monotone" dataKey="completed" name="Completed"
                  stroke="var(--primary)" strokeWidth={2.5} fill="url(#colorCompleted)"
                  dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2, fill: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="card-glass" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Hours by Category</h3>
          {data.categoryHours.length > 0 ? (
            <>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.categoryHours} dataKey="hours" nameKey="name"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} strokeWidth={0}>
                      {data.categoryHours.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {data.categoryHours.map((cat, i) => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cat.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)' }}>{cat.hours}h</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)' }}>
              <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <span style={{ fontSize: 13 }}>Complete tasks to see breakdown</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Burnout Predictor ── */}
      <BurnoutPredictor
        userId={userId}
        weeklyHours={data.weeklyHours}
      />

      {/* ── Knowledge Graph ── */}
      <KnowledgeGraph
        completedCourses={data.courseProgress
          .filter(c => c.percent >= 80)
          .map(c => c.title)}
        enrolledCourses={data.courseProgress
          .filter(c => c.percent > 0 && c.percent < 80)
          .map(c => c.title)}
        targetSkill="Recommender Sys"
        userId={userId}
      />

      {/* ── ML Engine Performance (from existing evaluator) ── */}
      {evalData && (
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="card-glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TrendingUp size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>ML Engine Performance</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {evalData.evaluation && Object.entries(evalData.evaluation).map(([model, metrics]: [string, any]) => (
              <div key={model} style={{ padding: 16, background: 'var(--surface-high)', borderRadius: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  {model}
                </div>
                {metrics && typeof metrics === 'object' && Object.entries(metrics).slice(0, 4).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--on-surface-variant)', fontWeight: 500 }}>{key}</span>
                    <span style={{ fontWeight: 700 }}>{typeof val === 'number' ? val.toFixed(3) : String(val)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
