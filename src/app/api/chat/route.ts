import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";
import { defaultPreferences, normalizePreferences, type UserPreferences } from "@/lib/localization";
import { manualContextSummary, normalizeManualContext, type ManualContextProfile } from "@/lib/manual-context";
import { generateWisdomResponse } from "@/lib/openai";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { composeModeAwareFallbackResponse, retrieveWisdom } from "@/lib/wisdom";
import { analyticsQuestionMetadata } from "@/lib/analytics-taxonomy";
import { normalizeMode } from "@/lib/wisdom-data";

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

  const body = (await request.json()) as {
    message?: string;
    mode?: unknown;
    preferences?: Partial<UserPreferences>;
    manualContext?: Partial<ManualContextProfile>;
  };

  const message = body.message?.trim();
  const mode = normalizeMode(body.mode);
  const preferences = normalizePreferences(body.preferences ?? defaultPreferences);

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const sources = await retrieveWisdom(message, mode, 3);
  let memoryContext = "";
  const guestManualContext = normalizeManualContext(body.manualContext ?? {});
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
    memoryContext = guestContext
      ? `User-provided manual context from this device:\n${guestContext}`
      : "";
  }
  const aiText =
    (await generateWisdomResponse({ question: message, mode, sources, preferences, memoryContext })) ??
    composeModeAwareFallbackResponse(message, mode, sources, preferences);

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
      usedOpenAI: Boolean(process.env.OPENAI_API_KEY),
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
      usedOpenAI: Boolean(process.env.OPENAI_API_KEY),
    },
    { headers: rateLimitHeaders(rateLimit) }
  );
}
