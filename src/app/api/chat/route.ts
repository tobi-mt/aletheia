import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { many, run } from "@/lib/db";
import { generateWisdomResponse } from "@/lib/openai";
import { checkRateLimit, getClientIdentity, rateLimitHeaders } from "@/lib/rate-limit";
import { composeModeAwareFallbackResponse, retrieveWisdom } from "@/lib/wisdom";
import type { Mode } from "@/lib/wisdom-data";

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
    mode?: Mode;
  };

  const message = body.message?.trim();
  const mode = body.mode ?? "Money";

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const sources = await retrieveWisdom(message, mode, 3);
  const aiText =
    (await generateWisdomResponse({ question: message, mode, sources })) ??
    composeModeAwareFallbackResponse(message, mode, sources);

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
    await trackServerEvent({
      userId: user.id,
      eventName: "chat_question_sent",
      metadata: {
        mode,
        persisted: true,
        usedOpenAI: Boolean(process.env.OPENAI_API_KEY),
        sourceCount: sources.length,
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
      usedOpenAI: Boolean(process.env.OPENAI_API_KEY),
    },
    { headers: rateLimitHeaders(rateLimit) }
  );
}
