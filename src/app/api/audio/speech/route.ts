import { NextResponse } from "next/server";
import OpenAI from "openai";
import { apiError } from "@/lib/api-errors";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const MAX_TEXT_LENGTH = 4096;
const MANAGED_TTS_VOICES = new Set([
  "marin",
  "cedar",
  "coral",
  "sage",
]);

function managedVoiceInstructions(language: string) {
  const base = "Use a natural, human-like narrator voice at a calm, conversational speed. Prioritize audibility, intelligibility, crisp consonants, full word endings, and steady pacing with brief natural pauses. Avoid a robotic, breathy, whispery, rushed, overly dramatic, or sing-song delivery.";
  switch (language) {
    case "en":
      return `${base} Use clear English pronunciation.`;
    case "es":
      return `${base} Use clear Spanish pronunciation.`;
    case "fr":
      return `${base} Use clear French pronunciation.`;
    case "pt":
      return `${base} Use clear Portuguese pronunciation.`;
    case "de":
      return `${base} Use clear German pronunciation.`;
    case "yo":
      return `${base} Use clear Yoruba pronunciation, preserving tonal clarity and natural pacing as much as possible.`;
    case "ig":
      return `${base} Use clear Igbo pronunciation with careful vowel sounds, consonants, and natural pacing.`;
    case "ha":
      return `${base} Use clear Hausa pronunciation with steady pacing, careful word endings, and natural rhythm.`;
    case "tl":
      return `${base} Use clear Filipino pronunciation with natural conversational pacing.`;
    case "ar":
      return `${base} Use clear Modern Standard Arabic pronunciation with steady pacing and careful articulation.`;
    case "hi":
      return `${base} Use clear Hindi pronunciation with natural pacing and careful consonants.`;
    default:
      return base;
  }
}

export async function POST(request: Request) {
  try {
    const rateLimit = await checkRateLimit(await getClientIdentity(), {
      namespace: "audio-speech",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return apiError(429, "rate_limited", "Too many audio requests. Please wait a few minutes.", {
        headers: rateLimitHeaders(rateLimit),
      });
    }

    if (!client) {
      return apiError(503, "unavailable", "Audio playback is temporarily unavailable.");
    }

    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      language?: string;
      speed?: number;
    };

    const text = body.text?.trim();
    if (!text) {
      return apiError(400, "invalid_input", "Text is required for audio generation.");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return apiError(400, "invalid_input", `Audio text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
    }

    const requestedVoice = body.voice?.trim() || "";
    const voice = MANAGED_TTS_VOICES.has(requestedVoice) ? requestedVoice : "marin";
    const language = body.language?.trim().toLowerCase() || "en";
    const requestedSpeed = typeof body.speed === "number" && Number.isFinite(body.speed) ? body.speed : 1;
    const speed = Math.max(0.75, Math.min(0.9, requestedSpeed));

    const speech = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      input: text,
      voice,
      speed,
      response_format: "mp3",
      stream_format: "audio",
      instructions: managedVoiceInstructions(language),
    });

    const contentType = "audio/mpeg";

    if (!speech.body) {
      const audioBytes = await speech.arrayBuffer();
      return new NextResponse(Buffer.from(audioBytes), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(audioBytes.byteLength),
          "Cache-Control": "no-store",
          "Accept-Ranges": "bytes",
          ...rateLimitHeaders(rateLimit),
        },
      });
    }

    return new NextResponse(speech.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
        ...rateLimitHeaders(rateLimit),
      },
    });
  } catch (error) {
    console.error("Audio generation failed:", error);
    return apiError(500, "unavailable", "Audio playback is temporarily unavailable. Please try again.");
  }
}
