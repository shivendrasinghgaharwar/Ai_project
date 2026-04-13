import { supabase } from "./supabaseClient";

export async function logStudySession({
  userId,
  category,
  durationMinutes,
}: {
  userId: string;
  category: string;
  durationMinutes: number;
}) {
  if (!userId || !category) return;

  const today = new Date().toISOString().slice(0, 10);

  // Check if session already exists for today + this category
  const { data: existing } = await supabase
    .from("study_sessions")
    .select("id, duration_minutes")
    .eq("user_id", userId)
    .eq("date", today)
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    // Add on top of existing session
    await supabase
      .from("study_sessions")
      .update({
        duration_minutes: existing.duration_minutes + durationMinutes,
      })
      .eq("id", existing.id);
  } else {
    // Create brand new session for today
    await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        date: today,
        category: category,
        duration_minutes: durationMinutes,
      });
  }
}

export async function removeStudySession({
  userId,
  category,
  durationMinutes,
}: {
  userId: string;
  category: string;
  durationMinutes: number;
}) {
  if (!userId || !category) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("study_sessions")
    .select("id, duration_minutes")
    .eq("user_id", userId)
    .eq("date", today)
    .eq("category", category)
    .maybeSingle();

  if (!existing) return;

  const newMins = existing.duration_minutes - durationMinutes;

  if (newMins <= 0) {
    // Remove session entirely if hours go to zero
    await supabase
      .from("study_sessions")
      .delete()
      .eq("id", existing.id);
  } else {
    await supabase
      .from("study_sessions")
      .update({ duration_minutes: newMins })
      .eq("id", existing.id);
  }
}
