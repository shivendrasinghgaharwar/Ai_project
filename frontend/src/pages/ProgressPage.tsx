import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { TrendingUp, Clock, Flame, Award, BookOpen } from 'lucide-react';
import { useAppStore, getTodayName } from '../store/useAppStore';
import { apiClient } from '../api/client';

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

// Color palette for charts
const CHART_COLORS = ['#5B8C5A', '#D4A853', '#7A6B5A', '#8FAE8F', '#6B8E9B', '#9B6B8E'];

// Simulated 7-day progress data based on schedule
function generateWeeklyData(scheduleEvents: any[], completedIds: Set<string>) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const today = getTodayName();
  const todayIdx = DAYS.indexOf(today);

  return DAYS.map((day, i) => {
    const dayEvents = scheduleEvents.filter((e) => e.day === day);
    const totalHours = dayEvents.length; // 1 event ≈ 1 hour
    const completedHours = i < todayIdx
      ? Math.max(1, Math.round(totalHours * (0.6 + Math.random() * 0.4)))
      : i === todayIdx
        ? dayEvents.filter((e) => completedIds.has(e.id)).length
        : 0;

    return {
      day: day.slice(0, 3),
      planned: totalHours,
      completed: completedHours,
      target: Math.max(2, Math.round(totalHours * 0.8)),
    };
  });
}

function generateCategoryBreakdown(scheduleEvents: any[]) {
  const counts: Record<string, number> = {};
  scheduleEvents.forEach((e) => {
    const cat = e.category || 'General';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  return Object.entries(counts).map(([name, hours]) => ({
    name,
    hours,
  }));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)',
        border: '1px solid var(--outline-variant)', borderRadius: 12,
        padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{label}</p>
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

  useEffect(() => {
    apiClient.getEvaluation().then((data) => {
      if (data?.status === 'success') {
        setEvalData(data);
      }
    }).catch(() => {});
  }, []);

  const weeklyData = generateWeeklyData(scheduleEvents, completedTaskIds);
  const categoryData = generateCategoryBreakdown(scheduleEvents);
  const totalPlanned = weeklyData.reduce((a, d) => a + d.planned, 0);
  const totalCompleted = weeklyData.reduce((a, d) => a + d.completed, 0);
  const streakDays = weeklyData.filter((d) => d.completed > 0).length;
  const topCategory = categoryData.sort((a, b) => b.hours - a.hours)[0]?.name || 'N/A';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}
    >
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800 }}>
          Learning Progress
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--on-surface-variant)' }}>
          Track your weekly study patterns and category breakdown
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
      >
        {[
          { label: 'Total Hours', value: `${totalCompleted}h`, icon: Clock, color: 'var(--primary)' },
          { label: 'Completion Rate', value: `${totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0}%`, icon: TrendingUp, color: 'var(--tertiary)' },
          { label: 'Active Days', value: streakDays, icon: Flame, color: '#E53E3E' },
          { label: 'Top Category', value: topCategory, icon: Award, color: 'var(--secondary)' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={cardVariants}
            className="card-glass"
            whileHover={{ scale: 1.02, boxShadow: '0 12px 40px rgba(91,140,90,0.10)' }}
            style={{ padding: 20 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <stat.icon size={18} color={stat.color as string} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                {stat.label}
              </span>
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)',
              color: 'var(--on-surface)',
            }}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>
        {/* Weekly Progress Chart */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="card-glass"
          style={{ padding: 24 }}
        >
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
                <XAxis
                  dataKey="day"
                  axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }}
                  unit="h"
                />
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
                <Area
                  type="monotone" dataKey="planned" name="Planned"
                  stroke="var(--tertiary)" strokeWidth={2} strokeDasharray="5 5"
                  fill="url(#colorPlanned)"
                />
                <Area
                  type="monotone" dataKey="completed" name="Completed"
                  stroke="var(--primary)" strokeWidth={2.5}
                  fill="url(#colorCompleted)"
                  dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="card-glass"
          style={{ padding: 24 }}
        >
          <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Hours by Category</h3>

          {categoryData.length > 0 ? (
            <>
              <div style={{ height: 200, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={4}
                      strokeWidth={0}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {categoryData.map((cat, i) => (
                  <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 3,
                      background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cat.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)' }}>
                      {cat.hours}h
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              height: 200, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)',
            }}>
              <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <span style={{ fontSize: 13 }}>Schedule study blocks to see breakdown</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ML Model Performance (if available) */}
      {evalData && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="show"
          className="card-glass"
          style={{ padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <TrendingUp size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>ML Engine Performance</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {evalData.evaluation && Object.entries(evalData.evaluation).map(([model, metrics]: [string, any]) => (
              <div key={model} style={{
                padding: 16, background: 'var(--surface-high)', borderRadius: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  {model}
                </div>
                {metrics && typeof metrics === 'object' && Object.entries(metrics).slice(0, 4).map(([key, val]: [string, any]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--on-surface-variant)', fontWeight: 500 }}>{key}</span>
                    <span style={{ fontWeight: 700 }}>
                      {typeof val === 'number' ? val.toFixed(3) : String(val)}
                    </span>
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
