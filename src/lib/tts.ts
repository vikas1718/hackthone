// src/lib/tts.ts
// Free TTS: Unreal Speech — 250,000 chars/month FREE
// Docs: https://docs.unrealspeech.com

const UNREALSPEECH_API_KEY = import.meta.env.VITE_UNREALSPEECH_API_KEY;
const TTS_API_URL = "https://api.v7.unrealspeech.com/speech";

// Unreal Speech voice IDs mapped to your UI voices
export const VOICE_MAP: Record<string, string> = {
  "1": "Sierra",    // Sarah  → American Female
  "2": "Dan",       // James  → British Male
  "3": "Scarlett",  // Priya  → Indian Female (closest)
  "4": "Will",      // Chen   → Male
  "5": "Amy",       // Maria  → Female
  "6": "Jasper",    // Ahmed  → Male
};

export type TTSOptions = {
  text: string;
  voiceId: string;   // Your UI voice id ("1", "2", etc.)
  speed?: number;    // 0.5 – 2.0
  pitch?: number;    // Not directly supported; applied via Web Audio API
};

// ─────────────────────────────────────────────────────────────
// Generate speech — returns a Blob (MP3)
// ─────────────────────────────────────────────────────────────
export async function generateSpeech(options: TTSOptions): Promise<Blob> {
  const { text, voiceId, speed = 1.0 } = options;

  if (!UNREALSPEECH_API_KEY) {
    throw new Error("VITE_UNREALSPEECH_API_KEY is missing in .env.local");
  }

  // Unreal Speech speed: -1 (slow) to 1 (fast), so we map 0.5–2.0 → -0.5–1
  const mappedSpeed = (speed - 1.0).toFixed(2);
  const apiVoice = VOICE_MAP[voiceId] ?? "Sierra";

  const response = await fetch(TTS_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UNREALSPEECH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Text: text,
      VoiceId: apiVoice,
      Bitrate: "192k",
      Speed: mappedSpeed,
      Pitch: 1.0,          // Unreal Speech free tier doesn't support pitch; keep at 1.0
      OutputFormat: "mp3",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`TTS API Error ${response.status}: ${JSON.stringify(err)}`);
  }

  return response.blob();
}

// ─────────────────────────────────────────────────────────────
// Preview a voice with sample text (used in voice list)
// ─────────────────────────────────────────────────────────────
export async function previewVoice(voiceId: string): Promise<string> {
  const sampleText = "Hello! I'm your AI voice assistant. How can I help you today?";
  const blob = await generateSpeech({ text: sampleText, voiceId });
  return URL.createObjectURL(blob);
}