import type { BibleTranslation } from "@/lib/localization";

export type FullScriptureChunkManifest = {
  version: string;
  generatedAt: string;
  translations: Partial<Record<BibleTranslation, {
    chunkCount: number;
    chunks: string[]; // lowercase book keys available as static JSON under /scripture-chunks/[TRANSLATION]/[book-key].json
  }>>;
};

// Populated by scripts/generate-full-scripture-chunks.mjs.
// Empty until chunks are generated — the dual-read path in localization.ts
// falls back gracefully to the curated dataset when this is empty.
export const fullScriptureChunkManifest: FullScriptureChunkManifest = {
  version: "1",
  generatedAt: "",
  translations: {},
};