import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { bibleTranslations, type BibleTranslation } from "@/lib/localization";
import { normalizeListenTranscriptForRetrieval } from "@/lib/listen-language-normalization";
import { getClientIdentity, checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { readJsonBody } from "@/lib/request";
import { retrieveVerifiedScriptureCandidatesForTranslation, verifiedCandidateMatchLabel } from "@/lib/scripture-recognition";
import { trackServerEvent } from "@/lib/analytics";

export const runtime = "nodejs";
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const identity = user?.id ?? await getClientIdentity();
  const rateLimit = await checkRateLimit(identity, { namespace: "wisdom-listen-find", limit: 40, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return NextResponse.json({ candidates: [] }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  const parsed = await readJsonBody<Record<string, unknown>>(request, { maxBytes: 12_000 });
  if (!parsed.ok) return parsed.response;
  const phrase = text(parsed.data.phrase, 2_000);
  const book = text(parsed.data.book, 80);
  const speaker = text(parsed.data.speaker, 120);
  const theme = text(parsed.data.theme, 160);
  const language = text(parsed.data.language, 12) || "en";
  const requestedTranslation = text(parsed.data.bibleTranslation, 24);
  const translation: BibleTranslation = requestedTranslation in bibleTranslations ? requestedTranslation as BibleTranslation : "WEB";
  const query = [phrase, book, theme, speaker].filter(Boolean).join(" ");
  if (query.length < 3) return NextResponse.json({ candidates: [] }, { headers: rateLimitHeaders(rateLimit) });
  const normalized = client ? await normalizeListenTranscriptForRetrieval(client, query, language) : query;
  const candidates = retrieveVerifiedScriptureCandidatesForTranslation(`${query}\n${normalized}`, translation, 5).map((candidate) => ({
    candidateId: candidate.id, reference: candidate.reference,
    strength: phrase ? verifiedCandidateMatchLabel(candidate) : "possible_echo" as const,
    evidence: candidate.evidence,
  }));
  await trackServerEvent({ eventName: "listen_help_used", userId: user?.id ?? null, path: "/api/listen/find", source: "server", metadata: { language, translation, candidate_count: candidates.length, used_phrase: Boolean(phrase), used_book: Boolean(book), used_speaker: Boolean(speaker), used_theme: Boolean(theme) } });
  return NextResponse.json({ candidates }, { headers: rateLimitHeaders(rateLimit) });
}
