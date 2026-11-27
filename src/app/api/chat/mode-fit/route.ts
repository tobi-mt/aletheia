import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { normalizeMode } from "@/lib/wisdom-data";
import { readJsonBody } from "@/lib/request";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { classifyModeAtRuntime } from "@/lib/runtime-mode-fit";

export async function POST(request: Request) {
  const parsed = await readJsonBody<{ question?: unknown; selectedMode?: unknown; thirdPartyAiConsent?: unknown }>(request, { maxBytes: 4_000 });
  if (!parsed.ok) return parsed.response;
  const question = typeof parsed.data.question === "string" ? parsed.data.question.trim().slice(0, 1_200) : "";
  const selectedMode = normalizeMode(parsed.data.selectedMode);
  if (!question) return apiError(400, "invalid_input", "Question is required.");
  if (parsed.data.thirdPartyAiConsent !== true) {
    return apiError(403, "permission_denied", "Third-party AI consent is required for semantic mode matching.");
  }
  if (process.env.SEMANTIC_MODE_FIT_ENABLED === "false") {
    return NextResponse.json({ available: false, suggestion: null }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ available: false, suggestion: null });

  const limit = await checkRateLimit(await getClientIdentity(), { namespace: "mode-fit", limit: 30, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json({ available: false, suggestion: null }, { headers: rateLimitHeaders(limit) });

  const fit = await classifyModeAtRuntime({ question, selectedMode, allowModel: true });
  const suggestion = fit.available && fit.recommendedMode !== selectedMode ? {
    mode: fit.recommendedMode, confidence: "very_high", evidence: "semantic", topic: fit.topic,
    leadingProbability: fit.probabilities[fit.recommendedMode], selectedProbability: fit.probabilities[selectedMode],
    margin: fit.probabilities[fit.recommendedMode] - fit.probabilities[selectedMode],
  } : null;
  return NextResponse.json({ ...fit, suggestion }, { headers: rateLimitHeaders(limit) });
}
