import type OpenAI from "openai";

export async function normalizeListenTranscriptForRetrieval(client: OpenAI, transcript: string, language: string) {
  if (language === "en") return transcript;
  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: "Normalize the supplied speech transcript into literal English for Bible-text retrieval. Preserve every spoken book name, chapter, verse number, proper name, negation, and repeated phrase. Do not interpret, identify, add, or guess a Bible reference. Return JSON only." },
        { role: "user", content: `Source language code: ${language}\nTranscript:\n${transcript}` },
      ],
      text: { format: { type: "json_schema", name: "listen_retrieval_normalization", strict: true, schema: {
        type: "object", additionalProperties: false,
        properties: { retrievalText: { type: "string" } }, required: ["retrievalText"],
      } } },
    });
    const parsed = JSON.parse(response.output_text) as { retrievalText?: unknown };
    return typeof parsed.retrievalText === "string" && parsed.retrievalText.trim()
      ? parsed.retrievalText.trim().slice(0, 8_000)
      : transcript;
  } catch {
    return transcript;
  }
}
