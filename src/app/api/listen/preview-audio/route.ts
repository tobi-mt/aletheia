import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { getClientIdentity, checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { retrieveVerifiedScriptureCandidatesForTranslation, verifiedCandidateMatchLabel } from "@/lib/scripture-recognition";
import { normalizeListenTranscriptForRetrieval } from "@/lib/listen-language-normalization";
import { bibleTranslations, type BibleTranslation } from "@/lib/localization";
import { trackServerEvent } from "@/lib/analytics";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "video/mp4", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/ogg", "audio/3gpp"]);
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(request: Request) {
  const startedAt = performance.now();
  const user = await getCurrentUser();
  const identity = user?.id ?? await getClientIdentity();
  const rateLimit = await checkRateLimit(identity, {
    namespace: user ? "wisdom-listen-audio-preview-user" : "wisdom-listen-audio-preview-guest",
    limit: user ? 100 : 30,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) return NextResponse.json({ candidates: [] }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  if (!client) return NextResponse.json({ candidates: [] }, { status: 503 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 256_000) return NextResponse.json({ candidates: [] }, { status: 413 });
  const formData = await request.formData().catch(() => null);
  const audio = formData?.get("audio");
  const languageValue = formData?.get("language");
  const language = typeof languageValue === "string" ? languageValue.trim().slice(0, 12) : "en";
  const translationValue = formData?.get("bibleTranslation");
  const submittedTranslation = typeof translationValue === "string" ? translationValue.trim() : "";
  const bibleTranslation: BibleTranslation = submittedTranslation in bibleTranslations ? submittedTranslation as BibleTranslation : "WEB";
  const durationSeconds = Math.max(0, Math.min(60, Number(formData?.get("durationSeconds")) || 0));
  const submittedConsent = formData?.get("thirdPartyAiConsent") === "true";
  const storedConsent = user
    ? Boolean((await one<{ third_party_ai_consent: boolean }>("SELECT third_party_ai_consent FROM user_preferences WHERE user_id = ?", user.id))?.third_party_ai_consent)
    : submittedConsent;
  if (!storedConsent) return NextResponse.json({ candidates: [] }, { status: 403 });
  if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ candidates: [] }, { status: 400 });
  const baseType = audio.type.split(";")[0]?.toLowerCase();
  if (baseType && !SUPPORTED_AUDIO_TYPES.has(baseType)) return NextResponse.json({ candidates: [] }, { status: 415 });

  try {
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
      language: language === "tl" ? "fil" : language,
      prompt: "Short sermon or Bible quotation. Preserve Scripture wording, Bible book names, chapter and verse numbers, and repeated phrases accurately.",
    });
    const transcript = transcription.text.trim().slice(0, 8_000);
    const retrievalText = await normalizeListenTranscriptForRetrieval(client, transcript, language);
    const candidates = retrieveVerifiedScriptureCandidatesForTranslation(`${transcript}\n${retrievalText}`, bibleTranslation, 4).map((candidate) => ({
      candidateId: candidate.id,
      reference: candidate.reference,
      strength: verifiedCandidateMatchLabel(candidate),
      evidence: candidate.evidence,
    }));
    await trackServerEvent({ eventName: "listen_preview_processed", userId: user?.id ?? null, path: "/api/listen/preview-audio", source: "server", metadata: { duration_ms: Math.round(performance.now() - startedAt), audio_bytes: audio.size, clip_seconds: durationSeconds, language, translation: bibleTranslation, candidate_count: candidates.length, outcome: "success" } });
    return NextResponse.json({ transcript, candidates }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error("Listen for Wisdom live preview failed", error);
    await trackServerEvent({ eventName: "listen_preview_processed", userId: user?.id ?? null, path: "/api/listen/preview-audio", source: "server", metadata: { duration_ms: Math.round(performance.now() - startedAt), audio_bytes: audio.size, clip_seconds: durationSeconds, language, translation: bibleTranslation, candidate_count: 0, outcome: "failure" } });
    return NextResponse.json({ candidates: [] }, { status: 502 });
  }
}
