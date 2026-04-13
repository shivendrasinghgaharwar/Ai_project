import { supabase } from '../lib/supabaseClient';

const API_BASE = 'http://localhost:5000/api';

export interface OnboardingPayload {
  userId: string;
  primaryGoal: string;
  skills: Record<string, number>;
  weeklyHours: number;
}

/** Get the Supabase JWT and return it as an Authorization header object */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }
  return { 'Content-Type': 'application/json' };
}

export const apiClient = {
  // Public — no auth needed
  submitOnboarding: async (payload: OnboardingPayload) => {
    const res = await fetch(`${API_BASE}/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: payload.userId,
        primary_goal: payload.primaryGoal,
        skills: payload.skills,
        weekly_hours: payload.weeklyHours,
      }),
    });
    return res.json();
  },

  // Public — trending is open
  getTrendingCourses: async (n: number = 5) => {
    const res = await fetch(`${API_BASE}/trending?n=${n}`);
    const json = await res.json();
    // The backend returns { trending_courses: [...] }
    return {
      status: 'success',
      trending: json?.trending_courses ?? []
    };
  },

  // Protected — requires Supabase JWT
  getRecommendations: async (userId: string, n: number = 5) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/recommendations/${userId}?n=${n}`, { headers });
    return res.json();
  },

  // Protected — requires Supabase JWT
  getUserProfile: async (userId: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/${userId}`, { headers });
    return res.json();
  },

  // Protected — requires Supabase JWT
  logInteraction: async (userId: string, courseId: string, rating: number = 5, progress: number = 10) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/interactions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId,
        rating: rating,
        progress: progress,
      }),
    });
    return res.json();
  },

  // Public — courses list with filters
  getCourses: async (filters?: { category?: string; difficulty?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/courses${qs ? `?${qs}` : ''}`);
    const json = await res.json();
    return json;
  },

  // Public — quick search
  searchCourses: async (query: string) => {
    if (!query.trim()) return [];
    const res = await fetch(`${API_BASE}/courses?search=${encodeURIComponent(query)}`);
    const json = await res.json();
    return json?.courses ?? [];
  },

  // Public — get evaluation metrics
  getEvaluation: async () => {
    const res = await fetch(`${API_BASE}/evaluation`);
    return res.json();
  },
};
