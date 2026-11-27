import { toFile } from "openai";

export type AudioContainer = "wav" | "webm" | "mp4" | "ogg" | "mp3" | "aac" | "3gp";

const CONTAINER_FILE: Record<AudioContainer, { extension: string; type: string }> = {
  wav: { extension: "wav", type: "audio/wav" },
  webm: { extension: "webm", type: "audio/webm" },
  mp4: { extension: "m4a", type: "audio/mp4" },
  ogg: { extension: "ogg", type: "audio/ogg" },
  mp3: { extension: "mp3", type: "audio/mpeg" },
  aac: { extension: "aac", type: "audio/aac" },
  "3gp": { extension: "3gp", type: "audio/3gpp" },
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Identifies the real container from its signature; recorder MIME labels are not trustworthy. */
export function detectAudioContainer(bytes: Uint8Array): AudioContainer | null {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return "wav";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  if (ascii(bytes, 4, 4) === "ftyp") return ascii(bytes, 8, 3) === "3gp" ? "3gp" : "mp4";
  if (ascii(bytes, 0, 4) === "OggS") return "ogg";
  if (ascii(bytes, 0, 3) === "ID3") return "mp3";
  if (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return "aac";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";
  return null;
}

/**
 * Re-labels an uploaded clip so the filename extension and type match its bytes.
 * OpenAI picks the decoder from the filename, so a mislabelled clip is rejected as corrupted.
 */
export async function prepareTranscriptionAudio(audio: File, baseName: string) {
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const container = detectAudioContainer(bytes);
  if (!container) return null;
  const { extension, type } = CONTAINER_FILE[container];
  const file = await toFile(bytes, `${baseName}.${extension}`, { type });
  return { file, container, labelledType: audio.type.split(";")[0]?.toLowerCase() || "" };
}

type OpenAIErrorShape = { status?: unknown; code?: unknown; param?: unknown; message?: unknown; requestID?: unknown };

/** OpenAI answers 400 invalid_value on `file` when it cannot decode the clip, which is not an outage. */
export function isUnreadableAudioError(error: unknown) {
  const shape = (error ?? {}) as OpenAIErrorShape;
  return shape.status === 400 && (shape.param === "file" || shape.code === "invalid_value");
}

/** Compact, secret-free log line instead of dumping full response headers and cookies. */
export function describeTranscriptionError(error: unknown) {
  const shape = (error ?? {}) as OpenAIErrorShape;
  return {
    status: typeof shape.status === "number" ? shape.status : undefined,
    code: typeof shape.code === "string" ? shape.code : undefined,
    message: typeof shape.message === "string" ? shape.message.slice(0, 200) : String(error).slice(0, 200),
    requestId: typeof shape.requestID === "string" ? shape.requestID : undefined,
  };
}
