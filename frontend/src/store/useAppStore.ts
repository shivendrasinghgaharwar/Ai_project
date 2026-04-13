import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  category: string;
  color: string;
  day: string;          // 'Monday', 'Tuesday', ...
  time: string;         // '09:00'
  duration: number;     // minutes
  source: 'course' | 'manual' | 'quiz';
  courseId?: string;
  // Quiz-task extras
  quizId?: string;
  quizTopic?: string;
  quizQuestions?: QuizQuestion[];
}

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  color: string;
  time: string;
  completedAt?: Date;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  matchScore: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getTodayName(): string {
  return DAYS[new Date().getDay()];
}

export function generateDynamicDefaults(careerPath: string | undefined): ScheduleEvent[] {
  const dynamicItems: ScheduleEvent[] = [];
  const today = getTodayName();
  let subjects = [
    { title: 'General Studies', category: 'Foundation', color: '#5B8C5A' },
    { title: 'Task Execution', category: 'Practice', color: '#B35E5B' }
  ];

  if (careerPath === 'Full-Stack') {
    subjects = [
      { title: 'Frontend (React)', category: 'Frontend', color: '#5B8C5A' },
      { title: 'Backend (Node/Python)', category: 'Backend', color: '#B35E5B' },
      { title: 'Databases (SQL)', category: 'Database', color: '#885B8C' },
      { title: 'DevOps (Docker)', category: 'Infrastructure', color: '#5B698C' }
    ];
  } else if (careerPath === 'Data Science') {
    subjects = [
      { title: 'Python Math', category: 'Data Analysis', color: '#B35E5B' },
      { title: 'Database Querying', category: 'Database', color: '#5B698C' },
      { title: 'ML Models', category: 'Machine Learning', color: '#5B8C5A' },
      { title: 'Entrepreneurship & Startups', category: 'Business', color: '#885B8C' }
    ];
  }

  // Generate 2 or 3 daily tasks from the subjects
  const times = ['09:00', '13:00', '15:00', '18:00'];
  subjects.slice(0, 3).forEach((sub, i) => {
    dynamicItems.push({
      id: crypto.randomUUID(),
      title: sub.title,
      category: sub.category,
      color: sub.color,
      day: today,
      time: times[i],
      duration: 60,
      source: 'course'
    });
  });

  return dynamicItems;
}

// ── Store Definition ─────────────────────────────────────────────────────────
interface AppState {
  // Schedule
  scheduleEvents: ScheduleEvent[];
  setScheduleEvents: (events: ScheduleEvent[]) => void;
  addScheduleEvent: (event: ScheduleEvent) => void;
  removeScheduleEvent: (id: string) => void;
  moveScheduleEvent: (id: string, newDay: string, newTime: string) => void;

  // Tasks
  completedTaskIds: Set<string>;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  resetDailyTasks: () => void;

  // Active Quiz
  activeQuiz: ScheduleEvent | null;
  setActiveQuiz: (task: ScheduleEvent | null) => void;

  // Derived helpers
  getTodayEvents: () => ScheduleEvent[];
  getTodayPendingTasks: () => TaskItem[];
  getTodayCompletedTasks: () => TaskItem[];

  // User Profile
  userProfile: any | null;
  fetchUserProfile: () => Promise<void>;

  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: any[];
  setSearchResults: (results: any[]) => void;
  isSearching: boolean;
  setIsSearching: (v: boolean) => void;

  // ML Recommendations
  recommendedCourses: Course[];
  isLoadingRecommendations: boolean;
  fetchRecommendations: () => Promise<void>;

  // Knowledge Graph Syncing
  kgRefreshTrigger: number;
  triggerKgRefresh: () => void;
  markCourseComplete: (userId: string, courseId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Schedule State ──────────────────────────────────────────────────
  scheduleEvents: [],

  setScheduleEvents: (events) => set({ scheduleEvents: events }),

  addScheduleEvent: (event) =>
    set((state) => ({
      scheduleEvents: [...state.scheduleEvents, event],
    })),

  removeScheduleEvent: (id) =>
    set((state) => ({
      scheduleEvents: state.scheduleEvents.filter((e) => e.id !== id),
    })),

  moveScheduleEvent: (id, newDay, newTime) =>
    set((state) => ({
      scheduleEvents: state.scheduleEvents.map((e) =>
        e.id === id ? { ...e, day: newDay, time: newTime } : e
      ),
    })),

  // ── Task Completion State ───────────────────────────────────────────
  completedTaskIds: new Set<string>(),

  completeTask: (id) =>
    set((state) => {
      const newSet = new Set(state.completedTaskIds);
      newSet.add(id);
      return { completedTaskIds: newSet };
    }),

  uncompleteTask: (id) =>
    set((state) => {
      const newSet = new Set(state.completedTaskIds);
      newSet.delete(id);
      return { completedTaskIds: newSet };
    }),

  resetDailyTasks: () => set({ completedTaskIds: new Set() }),

  // ── Active Quiz ─────────────────────────────────────────────────────
  activeQuiz: null,
  setActiveQuiz: (task) => set({ activeQuiz: task }),

  // ── Derived Helpers ─────────────────────────────────────────────────
  getTodayEvents: () => {
    const today = getTodayName();
    return get().scheduleEvents.filter((e) => e.day === today);
  },

  getTodayPendingTasks: () => {
    const today = getTodayName();
    const { scheduleEvents, completedTaskIds } = get();
    return scheduleEvents
      .filter((e) => e.day === today && !completedTaskIds.has(e.id))
      .map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        color: e.color,
        time: e.time,
      }));
  },

  getTodayCompletedTasks: () => {
    const today = getTodayName();
    const { scheduleEvents, completedTaskIds } = get();
    return scheduleEvents
      .filter((e) => e.day === today && completedTaskIds.has(e.id))
      .map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        color: e.color,
        time: e.time,
        completedAt: new Date(),
      }));
  },

  // ── User Profile ────────────────────────────────────────────────────
  userProfile: null,
  fetchUserProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (data) {
        set({ userProfile: data });
      }
    }
  },

  // ── Search State ────────────────────────────────────────────────────
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  isSearching: false,
  setIsSearching: (v: boolean) => set({ isSearching: v }),

  // ── ML Recommendations ──────────────────────────────────────────────
  recommendedCourses: [],
  isLoadingRecommendations: false,

  fetchRecommendations: async () => {
    set({ isLoadingRecommendations: true });
    try {
      // 1. Get the Supabase session for the JWT
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        throw new Error('User not authenticated');
      }

      const userId = session.user.id;

      // 2. Fetch from Flask with the token
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/recommendations/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ML data: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data?.status === 'success' && data.recommendations) {
        // Map backend keys to our frontend shape
        const mappedCourses: Course[] = data.recommendations.map((c: any) => ({
          id: c.course_id,
          title: c.title,
          category: c.category,
          difficulty: c.difficulty,
          matchScore: c.final_score || c.score || 0
        }));

        set({ recommendedCourses: mappedCourses, isLoadingRecommendations: false });
      } else {
        set({ isLoadingRecommendations: false });
      }
    } catch (error) {
      console.error('Error fetching course recommendations:', error);
      set({ isLoadingRecommendations: false });
    }
  },

  // ── Knowledge Graph Syncing ──────────────────────────────────────────
  kgRefreshTrigger: 0,
  triggerKgRefresh: () => set((state) => ({ kgRefreshTrigger: state.kgRefreshTrigger + 1 })),
  markCourseComplete: async (userId, courseId) => {
    try {
      const { apiClient } = await import('../api/client');
      // POST the interaction with progress 100 to mark it mathematically fully completed.
      // This routes through Flask backwards proxy which handles the database insertion efficiently
      await apiClient.logInteraction(userId, courseId, 5, 100);

      // Force graph to clear and fetch newly green nodes
      set((state) => ({ kgRefreshTrigger: state.kgRefreshTrigger + 1 }));
    } catch (e) {
      console.error("Failed to mark course as complete: ", e);
    }
  },
}));
