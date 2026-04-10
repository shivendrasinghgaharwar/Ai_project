// AI Tutor client — calls the Flask backend proxy (Groq-powered)

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const responseCache = new Map<string, string>();

/**
 * Sends a user prompt to the backend AI proxy.
 * Simplified: just sends the latest message + course name.
 * The backend handles the system prompt injection.
 */
export async function askGemini(
  prompt: string,
  courseName: string = 'this course'
): Promise<string> {
  const cacheKey = `${courseName}::${prompt}`;

  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey)!;
  }

  const res = await fetch(`${BASE_URL}/api/gemini/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, courseName }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to get AI response');
  }

  responseCache.set(cacheKey, data.response);
  return data.response;
}

/**
 * buildSystemPrompt is no longer needed (backend handles it),
 * but we keep a stub export so existing imports don't break.
 */
export function buildSystemPrompt(_course: any, _skillLevel: string): string {
  return '';
}
