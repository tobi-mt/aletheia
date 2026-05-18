import OpenAI from "openai";
import type { Mode } from "@/lib/wisdom-data";
import type { WisdomSource } from "@/lib/wisdom";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateWisdomResponse({
  question,
  mode,
  sources,
}: {
  question: string;
  mode: Mode;
  sources: WisdomSource[];
}) {
  if (!client) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const context = sources
    .map(
      (source, index) => `Source ${index + 1}
Theme: ${source.theme}
Scripture: ${source.scripture}
Principle: ${source.principle}
Context: ${source.context}
Modern application: ${source.application}
Reflection questions: ${source.questions.join(" | ")}`
    )
    .join("\n\n");

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content:
          "You are Aletheia, a calm biblical wisdom companion for money, work, stewardship, generosity, and life decisions. Use only the provided sources for scripture references. Never invent Bible references. Never promise financial outcomes, claim divine predictions, or present yourself as a financial advisor. Include clear nuance and recommend qualified professional advice for high-stakes financial, legal, tax, or investment decisions.",
      },
      {
        role: "user",
        content: `Mode: ${mode}

Retrieved sources:
${context}

User question:
${question}

Respond with these exact section labels:
Reflection
Biblical Wisdom
Practical Perspective
Reflection Questions
Gentle Reminder`,
      },
    ],
  });

  return response.output_text;
}
