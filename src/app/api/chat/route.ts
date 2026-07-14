import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/localization";
import { manualContextSummary, normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { generateWisdomResponse } from "@/lib/openai";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { detectLifeSupportConcern } from "@/lib/life-support";
import { composeModeAwareFallbackResponse, retrieveWisdom } from "@/lib/wisdom";
import { analyticsQuestionMetadata } from "@/lib/analytics-taxonomy";
import { normalizeMode } from "@/lib/wisdom-data";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

type GratitudeContextSummary = {
  totalEntries?: unknown;
  recentEntries?: unknown;
  formationThemes?: unknown;
  latestNote?: unknown;
  latestPlace?: unknown;
  latestCreatedAt?: unknown;
};

const focusIntentionLabels: Record<string, string> = {
  reduce_anxiety: "reduce anxiety",
  improve_stewardship: "improve stewardship",
  wait_with_peace: "wait with peace",
  build_consistency: "build consistency",
  seek_counsel: "seek counsel wisely",
};

function cleanPrivateText(value: unknown, limit = 220) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, limit) : "";
}

function boundedCount(value: unknown, max = 999) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(max, Math.round(parsed))) : 0;
}

function compactFocusContext(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }
  const labels = value
    .map((item) => focusIntentionLabels[String(item)])
    .filter(Boolean)
    .slice(0, 3);
  return labels.length
    ? `User-selected formation intentions: ${labels.join(", ")}. Use these quietly to shape tone, examples, and next-step emphasis.`
    : "";
}

function compactGratitudeContext(value: GratitudeContextSummary | undefined) {
  if (!value || typeof value !== "object") {
    return "";
  }
  const totalEntries = boundedCount(value.totalEntries, 50);
  const recentEntries = boundedCount(value.recentEntries, 50);
  const formationThemes = Array.isArray(value.formationThemes)
    ? value.formationThemes.map((theme) => cleanPrivateText(theme, 40)).filter(Boolean).slice(0, 4)
    : [];
  const latestNote = cleanPrivateText(value.latestNote, 180);
  const latestPlace = cleanPrivateText(value.latestPlace, 80);
  const latestCreatedAt = cleanPrivateText(value.latestCreatedAt, 40);
  if (!totalEntries && !formationThemes.length && !latestNote && !latestPlace) {
    return "";
  }

  return [
    `Local Gratitude Lens signal: ${totalEntries} saved gratitude moment${totalEntries === 1 ? "" : "s"}${recentEntries ? `, ${recentEntries} in the last 30 days` : ""}.`,
    formationThemes.length ? `Gratitude formation themes: ${formationThemes.join(", ")}.` : "",
    latestNote ? `Most recent gratitude note excerpt: ${latestNote}` : "",
    latestPlace ? `Most recent gratitude place: ${latestPlace}` : "",
    latestCreatedAt ? `Most recent gratitude date: ${latestCreatedAt}` : "",
    "Use gratitude context as a gentle formation signal. Do not mention local photos, image data, or quote the note unless directly relevant and helpful.",
  ]
    .filter(Boolean)
    .join("\n");
}

function compactMemorySummary({
  decisions,
  journals,
  feedbackGuidance,
}: {
  decisions: Array<{ title: string; mode: string; pressure: string; status: string }>;
  journals: Array<{ title: string; mode: string }>;
  feedbackGuidance: string[];
}) {
  const text = decisions.map((decision) => `${decision.title} ${decision.pressure}`).join(" ").toLowerCase();
  const patterns = [
    text.match(/career|job|work|business|calling|startup|quit|leave/) ? "career pressure" : "",
    text.match(/compare|comparison|behind|envy/) ? "financial comparison" : "",
    text.match(/urgent|rush|now|quick|pressure/) ? "urgency" : "",
    text.match(/debt|invest|house|salary|income|budget/) ? "money stewardship" : "",
    text.match(/give|help|family|support|generosity/) ? "generosity and boundaries" : "",
  ].filter(Boolean);
  const activeModes = Array.from(new Set(decisions.slice(0, 5).map((decision) => decision.mode))).join(", ");
  const reflectionModes = Array.from(new Set(journals.slice(0, 5).map((journal) => journal.mode))).join(", ");

  return [
    decisions.length
      ? `User-safe continuity summary: user has ${decisions.length} recent decision${decisions.length === 1 ? "" : "s"}${activeModes ? ` across ${activeModes}` : ""}. Recurring themes appear to include ${patterns.length ? patterns.join(", ") : "discernment under pressure"}.`
      : "",
    journals.length
      ? `Reflection pattern: ${journals.length} recent reflection${journals.length === 1 ? "" : "s"}${reflectionModes ? ` touching ${reflectionModes}` : ""}. Do not quote journal content unless the user provides it in this chat.`
      : "",
    feedbackGuidance.length ? `Answer style feedback: ${feedbackGuidance.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await many<{
    id: string;
    role: string;
    mode: string;
    content: string;
    sources: unknown[] | null;
    created_at: string;
  }>(
    `SELECT id, role, mode, content, sources, created_at
     FROM chat_messages
     WHERE user_id = ?
     ORDER BY created_at ASC
     LIMIT 60`,
    user.id
  );

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.content,
      mode: message.mode,
      sources: message.sources ?? undefined,
      createdAt: message.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const identity = user?.id ?? (await getClientIdentity());
  const rateLimit = await checkRateLimit(identity, {
    namespace: user ? "chat-user" : "chat-guest",
    limit: user ? 60 : 12,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Aletheia needs a short pause before answering more questions." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  const parsedBody = await readJsonBody<{
    message?: string;
    mode?: unknown;
    preferences?: Partial<UserPreferences>;
    manualContext?: Partial<ManualContextProfile>;
    focusIntentions?: unknown;
    gratitudeContext?: GratitudeContextSummary;
  }>(request, { maxBytes: 24_000 });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  const message = body.message?.trim();
  const mode = normalizeMode(body.mode);
  const preferences = normalizePreferences(body.preferences ?? defaultPreferences);

  if (!message) {
    return apiError(400, "invalid_input", "Message is required.");
  }

  const lifeConcern = mode === "Life" ? detectLifeSupportConcern(message) : null;
  const sources = await retrieveWisdom(message, mode, 8);
  if (lifeConcern === "self_harm") {
    const aiText = composeModeAwareFallbackResponse(message, mode, sources, preferences);

    if (user) {
      const now = new Date().toISOString();
      await run(
        "INSERT INTO chat_messages (id, user_id, role, mode, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        crypto.randomUUID(),
        user.id,
        "user",
        mode,
        message,
        null,
        now
      );
      await run(
        "INSERT INTO chat_messages (id, user_id, role, mode, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        crypto.randomUUID(),
        user.id,
        "aletheia",
        mode,
        aiText,
        JSON.stringify(sources),
        now
      );
      await trackServerEvent({
        userId: user.id,
        eventName: "chat_question_sent",
        metadata: {
          mode,
          language: preferences.language,
          region: preferences.region,
          persisted: true,
          usedOpenAI: false,
          sourceCount: sources.length,
          ...analyticsQuestionMetadata(message, mode),
        },
      });
    }

    return NextResponse.json(
      {
        userMessage: {
          id: crypto.randomUUID(),
          role: "user",
          text: message,
          mode,
        },
        reply: {
          id: crypto.randomUUID(),
          role: "aletheia",
          text: aiText,
          mode,
          sources,
        },
        persisted: Boolean(user),
        usedOpenAI: false,
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  }

  let memoryContext = "";
  const guestManualContext = normalizeManualContext(body.manualContext ?? {});
  const clientContext = [compactFocusContext(body.focusIntentions), compactGratitudeContext(body.gratitudeContext)]
    .filter(Boolean)
    .join("\n\n");
  const privateContextRules = `Private context handling rules:
- Treat manual context, gratitude, reflections, decisions, rules, saved memories, and preferences as private support for discernment.
- Use context to tailor emphasis, examples, pacing, questions, and next steps; do not recite or expose private details mechanically.
- When current and desired future states are available, bridge them with one faithful next step without promising outcomes.
- Do not quote journal/reflection content unless the user provides it in this chat. For decisions, summarize patterns before naming details.
- Respect region and language preferences while avoiding legal, tax, medical, or regulated financial claims.`;
  if (user) {
    const [decisions, rules, journals, manualContextRows, memoryRows] = await Promise.all([
      many<{ title: string; mode: string; pressure: string; status: string; updated_at: string }>(
        `SELECT title, mode, pressure, status, updated_at
         FROM wisdom_decisions
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT 5`,
        user.id
      ),
      many<{ mode: string; principle: string }>(
        `SELECT mode, principle
         FROM rule_of_life_entries
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT 5`,
        user.id
      ),
      many<{ title: string; mode: string; created_at: string }>(
        `SELECT title, mode, created_at
         FROM journal_entries
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 8`,
        user.id
      ),
      many<{
        health_context: string;
        finance_context: string;
        work_context: string;
        obligations: string;
        goals: string;
        boundaries: string;
        context_json: unknown;
        use_in_answers: boolean;
      }>(
        `SELECT health_context, finance_context, work_context, obligations, goals, boundaries, context_json, use_in_answers
         FROM user_manual_context
         WHERE user_id = ?
         LIMIT 1`,
        user.id
      ),
      many<{ summary: string; answer_preferences: { guidance?: string[] } | null }>(
        `SELECT summary, answer_preferences
         FROM user_memory_summaries
         WHERE user_id = ?
         LIMIT 1`,
        user.id
      ),
    ]);
    const contextRow = manualContextRows[0];
    const contextFromJson =
      contextRow && contextRow.context_json && typeof contextRow.context_json === "object"
        ? (contextRow.context_json as Partial<ManualContextProfile>)
        : {};
    const manualContext = contextRow
      ? normalizeManualContext({
          ...contextFromJson,
          healthContext: contextFromJson.healthContext ?? contextRow.health_context,
          financeContext: contextFromJson.financeContext ?? contextRow.finance_context,
          workContext: contextFromJson.workContext ?? contextRow.work_context,
          obligations: contextFromJson.obligations ?? contextRow.obligations,
          goals: contextFromJson.goals ?? contextRow.goals,
          boundaries: contextFromJson.boundaries ?? contextRow.boundaries,
          useInAnswers: contextFromJson.useInAnswers ?? contextRow.use_in_answers,
        })
      : null;
    const memoryRow = memoryRows[0];
    const feedbackGuidance = Array.isArray(memoryRow?.answer_preferences?.guidance)
      ? memoryRow.answer_preferences.guidance
      : [];
    const safeSummary = compactMemorySummary({ decisions, journals, feedbackGuidance });
    memoryContext = [
      privateContextRules,
      clientContext,
      memoryRow?.summary ? `Saved user-safe memory:\n${memoryRow.summary}` : "",
      safeSummary,
      manualContextSummary(manualContext) ? `User-provided manual context:\n${manualContextSummary(manualContext)}` : "",
      decisions.length
        ? `Active/recent decisions:\n${decisions
            .map((decision) => `- ${decision.title} (${decision.mode}, ${decision.status}): ${decision.pressure.slice(0, 220)}`)
            .join("\n")}`
        : "",
      rules.length
        ? `Rules of life:\n${rules.map((rule) => `- ${rule.mode}: ${rule.principle.slice(0, 180)}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  } else {
    const guestContext = manualContextSummary(guestManualContext);
    memoryContext = [
      privateContextRules,
      clientContext,
      guestContext ? `User-provided manual context from this device:\n${guestContext}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  const mayUseThirdPartyAi = preferences.thirdPartyAiConsent === true;
  const aiText =
    (mayUseThirdPartyAi
      ? await generateWisdomResponse({ question: message, mode, sources, preferences, memoryContext })
      : null) ?? composeModeAwareFallbackResponse(message, mode, sources, preferences);

  if (user) {
    const now = new Date().toISOString();
    await run(
      "INSERT INTO chat_messages (id, user_id, role, mode, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      crypto.randomUUID(),
      user.id,
      "user",
      mode,
      message,
      null,
      now
    );
    await run(
      "INSERT INTO chat_messages (id, user_id, role, mode, content, sources, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      crypto.randomUUID(),
      user.id,
      "aletheia",
      mode,
      aiText,
      JSON.stringify(sources),
      now
    );
  }

  if (user) {
    const analyticsMetadata = {
      mode,
      language: preferences.language,
      region: preferences.region,
      persisted: true,
      usedOpenAI: mayUseThirdPartyAi && Boolean(process.env.OPENAI_API_KEY),
      sourceCount: sources.length,
      ...analyticsQuestionMetadata(message, mode),
    };
    await trackServerEvent({
      userId: user.id,
      eventName: "chat_question_sent",
      metadata: analyticsMetadata,
    });
  }

  return NextResponse.json(
    {
      userMessage: {
        id: crypto.randomUUID(),
        role: "user",
        text: message,
        mode,
      },
      reply: {
        id: crypto.randomUUID(),
        role: "aletheia",
        text: aiText,
        mode,
        sources,
      },
      persisted: Boolean(user),
      usedOpenAI: mayUseThirdPartyAi && Boolean(process.env.OPENAI_API_KEY),
    },
    { headers: rateLimitHeaders(rateLimit) }
  );
}
