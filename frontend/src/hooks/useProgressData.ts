import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

export interface ProgressData {
  totalHours: number;
  completionRate: number;
  activeDays: number;
  currentStreak: number;
  topCategory: string;
  weeklyHours: number[];
  plannedHours: number[];
  categoryHours: { name: string; hours: number; minutes: number }[];
  courseProgress: { title: string; percent: number }[];
  monthStreak: number[];
  todayTasksTotal: number;
  todayTasksDone: number;
}

const EMPTY_DATA: ProgressData = {
  totalHours: 0,
  completionRate: 0,
  activeDays: 0,
  currentStreak: 0,
  topCategory: "—",
  weeklyHours: Array(7).fill(0),
  plannedHours: Array(7).fill(2),
  categoryHours: [],
  courseProgress: [],
  monthStreak: Array(30).fill(0),
  todayTasksTotal: 0,
  todayTasksDone: 0,
};

export function useProgressData(userId?: string) {
  const [data, setData] = useState<ProgressData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(userId);

  // If no userId was passed, resolve it from the current session
  useEffect(() => {
    if (userId) {
      setResolvedUserId(userId);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setResolvedUserId(session?.user?.id);
    });
  }, [userId]);

  const fetchAll = useCallback(async () => {
    if (!resolvedUserId) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [
        { data: sessions, error: sessErr },
        { data: enrollments, error: enrErr },
      ] = await Promise.all([
        // Study sessions (logged when tasks completed)
        supabase
          .from("study_sessions")
          .select("date, duration_minutes, category")
          .eq("user_id", resolvedUserId)
          .gt("duration_minutes", 0),

        // Course enrollments — use interactions table which tracks progress
        supabase
          .from("interactions")
          .select("progress, course:courses(title)")
          .eq("user_id", resolvedUserId),
      ]);

      if (sessErr) console.error("Sessions query error:", sessErr.message);
      if (enrErr) console.error("Enrollments query error:", enrErr.message);

      // ── Total hours ──────────────────────────────────────────────────────
      const totalMins = (sessions || []).reduce(
        (sum, r) => sum + (Number(r.duration_minutes) || 0), 0
      );
      const totalHours = Math.round(totalMins / 60);

      // ── Weekly hours (Mon=0 to Sun=6 of current week) ────────────────────
      const weeklyHours = Array(7).fill(0);
      const now = new Date();
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);

      (sessions || []).forEach(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.floor((d.getTime() - monday.getTime()) / 86400000);
        if (diff >= 0 && diff <= 6) {
          weeklyHours[diff] += Math.round((Number(s.duration_minutes) || 0) / 60);
        }
      });

      // ── Active days this week ────────────────────────────────────────────
      const activeDays = weeklyHours.filter(h => h > 0).length;

      // ── Current streak (consecutive days ending today) ───────────────────
      const sessionDates = new Set(
        (sessions || []).map(s =>
          typeof s.date === "string" ? s.date.slice(0, 10) : ""
        ).filter(Boolean)
      );

      let currentStreak = 0;
      const checkDate = new Date();
      while (true) {
        const ds = checkDate.toISOString().slice(0, 10);
        if (sessionDates.has(ds)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }

      // ── Category hours ───────────────────────────────────────────────────
      const catMap: Record<string, number> = {};
      (sessions || []).forEach(s => {
        const mins = Number(s.duration_minutes) || 0;
        if (mins <= 0) return;
        const cat = (s.category || "Other").trim();
        catMap[cat] = (catMap[cat] || 0) + mins;
      });

      const categoryHours = Object.entries(catMap)
        .map(([name, mins]) => ({
          name,
          hours: Math.round(mins / 60) || 1,
          minutes: mins,
        }))
        .sort((a, b) => b.minutes - a.minutes);

      const topCategory = categoryHours[0]?.name || "—";

      // ── Completion rate (capped 0–100%) ──────────────────────────────────
      const enrolled = enrollments || [];
      const completionRate = enrolled.length > 0
        ? Math.min(100, Math.round(
            enrolled.reduce((s, e: any) => s + Math.min(100, e.progress || 0), 0)
            / enrolled.length
          ))
        : 0;

      const courseProgress = enrolled.map((e: any) => ({
        title: e.course?.title || "Unknown",
        percent: Math.min(100, e.progress || 0),
      }));

      // ── Month streak (last 30 days) ──────────────────────────────────────
      const monthStreak = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return sessionDates.has(d.toISOString().slice(0, 10)) ? 1 : 0;
      });

      // ── Today's task counts (from schedule events + completedTaskIds) ────
      // We read these from the Zustand store at the ProgressPage level instead
      const todayTasksTotal = 0;
      const todayTasksDone = 0;

      setData({
        totalHours, completionRate, activeDays,
        currentStreak, topCategory,
        weeklyHours, plannedHours: Array(7).fill(2),
        categoryHours, courseProgress, monthStreak,
        todayTasksTotal, todayTasksDone,
      });

    } catch (err: any) {
      console.error("Progress data fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [resolvedUserId]);

  useEffect(() => {
    fetchAll();

    // Poll every 30 seconds for fresh data
    const interval = setInterval(fetchAll, 30000);

    // Realtime subscription for instant updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (resolvedUserId) {
      channel = supabase
        .channel("progress-live")
        .on("postgres_changes", {
          event: "*", schema: "public", table: "study_sessions",
          filter: `user_id=eq.${resolvedUserId}`,
        }, fetchAll)
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchAll, resolvedUserId]);

  return { data, loading, error, refetch: fetchAll };
}
