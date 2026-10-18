import OpenAI from "openai";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";
import { modeProfiles } from "@/lib/mode-profiles";
import { normalizeMode } from "@/lib/wisdom-data";
import { readJsonBody } from "@/lib/request";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { calibrateSemanticModeFit, normalizeModeProbabilities } from "@/lib/semantic-mode-fit";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
  if (!client) return NextResponse.json({ available: false, suggestion: null });

  const limit = await checkRateLimit(await getClientIdentity(), { namespace: "mode-fit", limit: 30, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) return NextResponse.json({ available: false, suggestion: null }, { headers: rateLimitHeaders(limit) });

  try {
    const profiles = Object.values(modeProfiles).map((profile) => `${profile.label}: ${profile.useWhen} Lens: ${profile.lens}`).join("\n");
    const response = await client.responses.create({
      model: process.env.OPENAI_MODE_CLASSIFIER_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: "Classify one question across the supplied Aletheia lenses. Return calibrated probabilities that sum to 1. Mark mixed true when two lenses are genuinely needed or the evidence is insufficient. Do not infer personal history. Topic must be a short privacy-safe category, never a quotation or paraphrase of the question." },
        { role: "user", content: `Available lenses:\n${profiles}\n\nSelected lens: ${selectedMode}\n\nQuestion:\n${question}` },
      ],
      text: { format: { type: "json_schema", name: "aletheia_mode_fit", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: {
          probabilities: { type: "object", additionalProperties: false, properties: {
            Money: { type: "number", minimum: 0, maximum: 1 }, Work: { type: "number", minimum: 0, maximum: 1 },
            Purpose: { type: "number", minimum: 0, maximum: 1 }, Generosity: { type: "number", minimum: 0, maximum: 1 }, Life: { type: "number", minimum: 0, maximum: 1 },
          }, required: ["Money", "Work", "Purpose", "Generosity", "Life"] },
          mixed: { type: "boolean" }, topic: { type: "string", maxLength: 48 },
        }, required: ["probabilities", "mixed", "topic"],
      } } },
    }, { signal: AbortSignal.timeout(2_200) });
    const raw = JSON.parse(response.output_text) as { probabilities?: unknown; mixed?: unknown; topic?: unknown };
    const probabilities = normalizeModeProbabilities(raw.probabilities);
    if (!probabilities || typeof raw.mixed !== "boolean" || typeof raw.topic !== "string") throw new Error("Invalid mode-fit output");
    const suggestion = calibrateSemanticModeFit({ probabilities, mixed: raw.mixed, topic: raw.topic }, selectedMode);
    return NextResponse.json({ available: true, probabilities, mixed: raw.mixed, suggestion }, { headers: rateLimitHeaders(limit) });
  } catch {
    return NextResponse.json({ available: false, suggestion: null }, { headers: rateLimitHeaders(limit) });
  }
}
