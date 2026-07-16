/**
 * Small helpers used across the app.
 */
import { supabase } from "@/integrations/supabase/client";

export async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const LEARNING_STYLES = [
  { value: "visual", label: "Visual" },
  { value: "auditory", label: "Auditory" },
  { value: "reading_writing", label: "Reading / Writing" },
  { value: "kinaesthetic", label: "Kinaesthetic" },
  { value: "unsure", label: "I'm not sure" },
] as const;

export const EDUCATION_SYSTEMS = [
  "GCSE", "A-Level", "BTEC", "T-Level",
  "University", "SSC", "HSC", "CBSE", "ICSE", "IB", "SAT",
] as const;

export const SUBJECT_COLORS = [
  "#0B1F3A", "#10B981", "#F59E0B", "#7C6BF2",
  "#EF4444", "#06B6D4", "#EC4899", "#84CC16",
] as const;

export function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** ISO week — Monday-start week bounds around a reference date */
export function weekBounds(ref = new Date()) {
  const d = new Date(ref);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}
