// src/lib/voiceNotesService.ts
// All Supabase DB + Storage operations for the Voice Notes feature

import { supabase } from "./supabase";
import type { VoiceNote } from "./supabase";

const BUCKET = "voice-audio"; // Supabase Storage bucket name

// ─────────────────────────────────────────────────────────────
// 1. Upload audio blob to Supabase Storage
//    Returns the public URL of the uploaded file
// ─────────────────────────────────────────────────────────────
export async function uploadAudio(
  audioBlob: Blob,
  userId: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}.mp3`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, audioBlob, { contentType: "audio/mpeg", upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// 2. Save voice note metadata to the DB
// ─────────────────────────────────────────────────────────────
export async function saveVoiceNote(
  note: Omit<VoiceNote, "id" | "created_at">
): Promise<VoiceNote> {
  const { data, error } = await supabase
    .from("voice_notes")
    .insert(note)
    .select()
    .single();

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return data;
}

// ─────────────────────────────────────────────────────────────
// 3. Get all voice notes for the current user
// ─────────────────────────────────────────────────────────────
export async function getUserVoiceNotes(): Promise<VoiceNote[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("voice_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// 4. Delete a voice note (DB row + Storage file)
// ─────────────────────────────────────────────────────────────
export async function deleteVoiceNote(noteId: string, audioUrl: string) {
  // Extract file path from public URL
  const filePath = audioUrl.split(`${BUCKET}/`)[1];

  await supabase.storage.from(BUCKET).remove([filePath]);

  const { error } = await supabase
    .from("voice_notes")
    .delete()
    .eq("id", noteId);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}