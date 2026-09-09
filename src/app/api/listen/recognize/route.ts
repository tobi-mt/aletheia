import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClientIdentity, checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { retrieveVerifiedScriptureCandidatesForTranslation, verifiedCandidateMatchLabel } from "@/lib/scripture-recognition";
import { normalizeListenTranscriptForRetrieval } from "@/lib/listen-language-normalization";
import { bibleTranslations, type BibleTranslation } from "@/lib/localization";
import { trackServerEvent } from "@/lib/analytics";
import { normalizeMode } from "@/lib/wisdom-data";
import type { WisdomListenResult } from "@/lib/wisdom-listen";
import { one } from "@/lib/db";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const SUPPORTED_AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "video/mp4", "audio/aac", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/ogg", "audio/3gpp"]);
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function cleanText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
}

function rejectedIds(value: unknown) {
  try {
    const parsed = JSON.parse(cleanText(value, 2_000) || "[]") as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 20) : []);
  } catch {
    return new Set<string>();
  }
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const user = await getCurrentUser();
  const identity = user?.id ?? await getClientIdentity();
  const rateLimit = await checkRateLimit(identity, { namespace: user ? "wisdom-listen-user" : "wisdom-listen-guest", limit: user ? 20 : 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ errorCode: "listen_rate_limited" }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  if (!client) return NextResponse.json({ errorCode: "listen_unavailable" }, { status: 503 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_BYTES + 512_000) {
    return NextResponse.json({ errorCode: "listen_audio_too_large" }, { status: 413 });
  }

  const formData = await request.formData().catch(() => null);
  const audio = formData?.get("audio");
  const mode = normalizeMode(formData?.get("mode"));
  const language = cleanText(formData?.get("language"), 12) || "en";
  const submittedTranslation = cleanText(formData?.get("bibleTranslation"), 24);
  const bibleTranslation: BibleTranslation = submittedTranslation in bibleTranslations ? submittedTranslation as BibleTranslation : "WEB";
  const submittedConsent = formData?.get("thirdPartyAiConsent") === "true";
  const rejectedCandidateIds = rejectedIds(formData?.get("rejectedCandidateIds"));
  const durationSeconds = Math.max(0, Math.min(60, Number(formData?.get("durationSeconds")) || 0));
  const storedConsent = user
    ? Boolean((await one<{ third_party_ai_consent: boolean }>("SELECT third_party_ai_consent FROM user_preferences WHERE user_id = ?", user.id))?.third_party_ai_consent)
    : submittedConsent;
  if (!storedConsent) return NextResponse.json({ errorCode: "listen_ai_consent_required" }, { status: 403 });
  if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ errorCode: "listen_invalid_audio" }, { status: 400 });
  const baseType = audio.type.split(";")[0]?.toLowerCase();
  if (baseType && !SUPPORTED_AUDIO_TYPES.has(baseType)) return NextResponse.json({ errorCode: "listen_unsupported_audio" }, { status: 415 });

  try {
    const transcription = await client.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
      language: language === "tl" ? "fil" : language,
      prompt: "Short sermon, Bible study, podcast, or trusted-counsel excerpt. Preserve Scripture wording, Bible book names, chapter and verse numbers, Hebrew and Greek names, and repeated phrases accurately. Do not silently omit a spoken reference.",
    });
    const transcript = transcription.text.trim().slice(0, 8_000);
    if (transcript.length < 8) return NextResponse.json({ errorCode: "listen_no_speech" }, { status: 422 });

    const retrievalText = await normalizeListenTranscriptForRetrieval(client, transcript, language);
    const candidates = retrieveVerifiedScriptureCandidatesForTranslation(`${transcript}\n${retrievalText}`, bibleTranslation, 16)
      .filter((candidate) => !rejectedCandidateIds.has(candidate.id)).slice(0, 12);
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const candidateContext = candidates.map((candidate) => [
      `ID: ${candidate.id}`,
      `Reference: ${candidate.reference}`,
      `Verified WEB text: ${candidate.text}`,
      `Before: ${candidate.contextBefore}`,
      `After: ${candidate.contextAfter}`,
      `Deterministic lexical score: ${candidate.lexicalScore.toFixed(3)}`,
      `Spoken-query coverage: ${candidate.queryCoverage.toFixed(3)}`,
      `Deterministic phrase score: ${candidate.phraseScore.toFixed(3)}`,
    ].join("\n")).join("\n\n");

    let rankedMatches: Array<{ candidateId?: unknown; explanation?: unknown }> = [];
    let counsel = "";
    let application = "";
    try {
      const analysis = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: `You rank only the verified Bible candidates supplied by Aletheia. Never create, alter, or infer another reference. Select zero to three candidate IDs. Prefer textual evidence over thematic resemblance. Explanations may describe why transcript wording aligns, but must not invent quotations. Summarize the speaker's counsel neutrally. Application must remain tentative and begin naturally with the equivalent of "This may...". Write explanation, counsel, and application in language code ${language}. Return JSON only.`,
        },
        {
          role: "user",
          content: `Wisdom mode: ${mode}\n\nTranscript:\n${transcript}\n\nVerified candidates:\n${candidateContext || "No deterministic candidate met the retrieval threshold."}`,
        },
      ],
      text: { format: { type: "json_schema", name: "verified_wisdom_listen_ranking", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          rankedMatches: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { candidateId: { type: "string" }, explanation: { type: "string" } }, required: ["candidateId", "explanation"] } },
          counsel: { type: "string" }, application: { type: "string" },
        },
        required: ["rankedMatches", "counsel", "application"],
      } } },
      });
      const parsed = JSON.parse(analysis.output_text) as { rankedMatches?: Array<{ candidateId?: unknown; explanation?: unknown }>; counsel?: unknown; application?: unknown };
      rankedMatches = parsed.rankedMatches ?? [];
      counsel = cleanText(parsed.counsel, 700);
      application = cleanText(parsed.application, 700);
    } catch (analysisError) {
      console.error("Listen for Wisdom interpretation failed; returning verified retrieval", analysisError);
      rankedMatches = candidates.slice(0, 3).map((candidate) => ({
        candidateId: candidate.id,
        explanation: "",
      }));
    }
    const usedIds = new Set<string>();
    const matches = rankedMatches.flatMap((ranked) => {
      const candidateId = cleanText(ranked.candidateId, 120);
      const candidate = candidateById.get(candidateId);
      if (!candidate || usedIds.has(candidateId)) return [];
      usedIds.add(candidateId);
      return [{
        candidateId,
        reference: candidate.reference,
        book: candidate.book,
        chapter: candidate.chapter,
        verse: candidate.verse,
        strength: verifiedCandidateMatchLabel(candidate),
        explanation: cleanText(ranked.explanation, 360),
        verifiedText: candidate.text,
        contextBefore: candidate.contextBefore,
        contextAfter: candidate.contextAfter,
      }];
    }).slice(0, 3);

    const result: WisdomListenResult = {
      id: crypto.randomUUID(), transcript, matches,
      counsel, application,
      mode, language, bibleTranslation, createdAt: new Date().toISOString(), syncState: "local",
    };
    await trackServerEvent({ eventName: "listen_recognition_completed", userId: user?.id ?? null, path: "/api/listen/recognize", source: "server", metadata: { duration_ms: Math.round(performance.now() - startedAt), audio_bytes: audio.size, clip_seconds: durationSeconds, language, translation: bibleTranslation, candidate_count: matches.length, rejected_count: rejectedCandidateIds.size, interpretation_available: Boolean(counsel || application) } });
    return NextResponse.json({ result }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error("Listen for Wisdom transcription failed", error);
    await trackServerEvent({ eventName: "listen_recognition_failed", userId: user?.id ?? null, path: "/api/listen/recognize", source: "server", metadata: { duration_ms: Math.round(performance.now() - startedAt), audio_bytes: audio.size, clip_seconds: durationSeconds, language, translation: bibleTranslation, failure_stage: "transcription" } });
    return NextResponse.json({ errorCode: "listen_transcription_failed" }, { status: 502 });
  }
}
