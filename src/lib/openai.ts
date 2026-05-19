import OpenAI from "openai";
import { defaultPreferences, promptPreferenceContext, type UserPreferences } from "@/lib/localization";
import { modeProfiles } from "@/lib/mode-profiles";
import type { Mode } from "@/lib/wisdom-data";
import type { WisdomSource } from "@/lib/wisdom";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateWisdomResponse({
  question,
  mode,
  sources,
  preferences = defaultPreferences,
}: {
  question: string;
  mode: Mode;
  sources: WisdomSource[];
  preferences?: UserPreferences;
}) {
  if (!client) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const profile = modeProfiles[mode];
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
          "You are Aletheia, a calm biblical wisdom companion for money, work, stewardship, generosity, and life decisions. Sound like a wise, emotionally mature mentor, not a template. Use plain, relatable language. Be warm, concrete, and understandable. Use only the provided sources for scripture references; never invent Bible references. Do not promise financial outcomes, claim divine predictions, use prosperity-gospel framing, or present yourself as a financial advisor. If a decision is high-stakes financially, legally, or tax-wise, gently recommend qualified professional advice. Vary your structure naturally based on the user's question. Avoid repeating the same headings every time.",
      },
      {
        role: "user",
        content: `Mode: ${mode}
Mode intent: ${profile.intent}
Mode lens: ${profile.lens}
Mode guidance: ${profile.promptCue}
Mode diagnostic tracks:
${profile.diagnosticTracks.map((track) => `- ${track}`).join("\n")}
Likely blind spots:
${profile.blindSpots.map((spot) => `- ${spot}`).join("\n")}
Maturity signals:
${profile.maturitySignals.map((signal) => `- ${signal}`).join("\n")}
Mode response moves:
${profile.responseMoves.map((move) => `- ${move}`).join("\n")}

User localization preferences:
${promptPreferenceContext(preferences)}

Retrieved sources:
${context}

User question:
${question}

Write a human response that feels personal and grounded. Requirements:
- Start with a brief empathetic acknowledgment.
- Weave in the most relevant scripture reference(s) from the retrieved sources naturally.
- Explain what the biblical principle means in ordinary life today.
- Write in the preferred response language unless the user's question clearly asks for another language.
- Adapt examples to the user's region without pretending to know local law, tax, or regulated financial details.
- Honor the preferred Bible translation as a reference label. Do not quote verse text unless it is supplied in the retrieved sources.
- Use the selected mode as a real diagnostic lens. Name the most likely tension, blind spot, or maturity signal when it fits.
- Give practical next steps without sounding like financial advice.
- Ask 1-3 reflection questions only if they genuinely help.
- Keep the response concise unless the question is complex.
- Do not use a rigid five-section template.`,
      },
    ],
  });

  return response.output_text;
}
