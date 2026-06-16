import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError } from "@/lib/api-errors";
import { many, run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";

const MAX_IMAGE_DATA_URL_BYTES = 10_000_000; // ~10MB base64

type GratitudeRow = {
  id: string;
  client_entry_id: string;
  image_data_url: string;
  note: string;
  place: string;
  formation: string | null;
  visual: unknown;
  postcard_created_at: string | null;
  reflected_at: string | null;
  created_at: string;
};

type GratitudeEntryPayload = {
  id?: unknown;
  imageDataUrl?: unknown;
  note?: unknown;
  place?: unknown;
  formation?: unknown;
  visual?: unknown;
  postcardCreatedAt?: unknown;
  reflectedAt?: unknown;
  createdAt?: unknown;
};

type GratitudeRequestBody = {
  entry?: GratitudeEntryPayload;
  entries?: GratitudeEntryPayload[];
};

function toResponseEntry(row: GratitudeRow) {
  return {
    id: row.client_entry_id || row.id,
    imageDataUrl: row.image_data_url,
    note: row.note,
    place: row.place,
    formation: row.formation ?? undefined,
    visual: row.visual,
    postcardCreatedAt: row.postcard_created_at ?? undefined,
    reflectedAt: row.reflected_at ?? undefined,
    createdAt: row.created_at,
  };
}

function validateImageDataUrl(dataUrl: string): string | null {
  if (!dataUrl.startsWith("data:image/")) {
    return "Image must be a valid data URL (data:image/...)";
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(dataUrl);
  if (bytes.length > MAX_IMAGE_DATA_URL_BYTES) {
    return `Image is too large. Maximum size is ${Math.round(MAX_IMAGE_DATA_URL_BYTES / 1_000_000)}MB.`;
  }

  // Validate base64 encoding (after the comma)
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    return "Image data URL format is invalid.";
  }

  const base64Part = parts[1];
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Part)) {
    return "Image data contains invalid base64 characters.";
  }

  return null;
}

function normalizePayloadEntry(input: GratitudeEntryPayload): null | string | {
  clientEntryId: string;
  imageDataUrl: string;
  note: string;
  place: string;
  formation: string | null;
  visualJson: string;
  postcardCreatedAt: string | null;
  reflectedAt: string | null;
  createdAt: string;
  updatedAt: string;
} {
  if (!input || typeof input !== "object") {
    return null;
  }

  const clientEntryId = typeof input.id === "string" ? input.id.trim() : "";
  const imageDataUrl = typeof input.imageDataUrl === "string" ? input.imageDataUrl : "";
  const note = typeof input.note === "string" ? input.note.trim() : "";

  if (!clientEntryId || !imageDataUrl || !note) {
    return null;
  }

  const imageError = validateImageDataUrl(imageDataUrl);
  if (imageError) {
    return imageError;
  }

  const now = new Date().toISOString();
  const createdAt =
    typeof input.createdAt === "string" && Number.isFinite(Date.parse(input.createdAt))
      ? input.createdAt
      : now;

  const visual = input.visual && typeof input.visual === "object" ? input.visual : {};

  return {
    clientEntryId,
    imageDataUrl,
    note,
    place: typeof input.place === "string" ? input.place.trim() : "",
    formation: typeof input.formation === "string" && input.formation.trim() ? input.formation.trim() : null,
    visualJson: JSON.stringify(visual),
    postcardCreatedAt:
      typeof input.postcardCreatedAt === "string" && Number.isFinite(Date.parse(input.postcardCreatedAt))
        ? input.postcardCreatedAt
        : null,
    reflectedAt:
      typeof input.reflectedAt === "string" && Number.isFinite(Date.parse(input.reflectedAt))
        ? input.reflectedAt
        : null,
    createdAt,
    updatedAt: now,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await many<GratitudeRow>(
      `SELECT id, client_entry_id, image_data_url, note, place, formation, visual, postcard_created_at, reflected_at, created_at
       FROM gratitude_entries
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      user.id
    );

    return NextResponse.json({ entries: rows.map(toResponseEntry) });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to use gratitude sync.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsedBody = await readJsonBody<GratitudeRequestBody>(request, {
      maxBytes: 10_000_000,
      emptyBody: {},
    });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.data;
    const candidates = [
      ...(body.entry ? [body.entry] : []),
      ...(Array.isArray(body.entries) ? body.entries : []),
    ];

    if (!candidates.length) {
      return apiError(400, "invalid_input", "At least one gratitude entry is required.");
    }

    const normalized: Array<{ clientEntryId: string; imageDataUrl: string; note: string; place: string; formation: string | null; visualJson: string; postcardCreatedAt: string | null; reflectedAt: string | null; createdAt: string; updatedAt: string }> = [];
    for (const entry of candidates) {
      const result = normalizePayloadEntry(entry);
      if (result === null) {
        continue;
      }
      if (typeof result === "string") {
        return apiError(400, "invalid_image", result);
      }
      normalized.push(result);
    }

    if (!normalized.length) {
      return apiError(400, "invalid_input", "No valid gratitude entries were provided.");
    }

    for (const entry of normalized) {
      const rowId = crypto.randomUUID();
      await run(
        `INSERT INTO gratitude_entries (
          id, user_id, client_entry_id, image_data_url, note, place, formation, visual,
          postcard_created_at, reflected_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)
        ON CONFLICT (user_id, client_entry_id)
        DO UPDATE SET
          image_data_url = EXCLUDED.image_data_url,
          note = EXCLUDED.note,
          place = EXCLUDED.place,
          formation = EXCLUDED.formation,
          visual = EXCLUDED.visual,
          postcard_created_at = EXCLUDED.postcard_created_at,
          reflected_at = EXCLUDED.reflected_at,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at`,
        rowId,
        user.id,
        entry.clientEntryId,
        entry.imageDataUrl,
        entry.note,
        entry.place,
        entry.formation,
        entry.visualJson,
        entry.postcardCreatedAt,
        entry.reflectedAt,
        entry.createdAt,
        entry.updatedAt
      );
    }

    const rows = await many<GratitudeRow>(
      `SELECT id, client_entry_id, image_data_url, note, place, formation, visual, postcard_created_at, reflected_at, created_at
       FROM gratitude_entries
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      user.id
    );

    return NextResponse.json({ entries: rows.map(toResponseEntry) });
  } catch {
    return apiError(401, "sign_in_required", "Sign in to save gratitude entries.");
  }
}
