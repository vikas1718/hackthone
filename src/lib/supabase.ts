// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────
// TypeScript types for your DB tables
// ─────────────────────────────────────────
export type VoiceNote = {
  id: string;
  user_id: string;
  input_text: string;
  voice_id: string;
  voice_name: string;
  speed: number;
  pitch: number;
  audio_url: string | null;   // Supabase Storage URL
  duration_seconds: number | null;
  created_at: string;
};
