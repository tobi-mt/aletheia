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
]);

function managedVoiceInstructions(language: string) {
  const base = "Use a natural, human-like narrator voice. Prioritize intelligibility, crisp consonants, full word endings, and steady pacing. Avoid a robotic, breathy, whispery, overly dramatic, or sing-song delivery.";
  switch (language) {
    case "es":
      return `${base} Use clear Spanish pronunciation.`;
    case "fr":
      return `${base} Use clear French pronunciation.`;
    case "pt":
      return `${base} Use clear Portuguese pronunciation.`;
    case "de":
      return `${base} Use clear German pronunciation.`;
    case "yo":
    case "ig":
    case "ha":
    case "tl":
    case "ar":
    case "hi":
      return `${base} Use a careful, clear delivery suited to the language.`;
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
    const speed = Math.max(0.25, Math.min(4, requestedSpeed));

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
