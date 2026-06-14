import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-errors";

type JsonBodyOptions<T> = {
  maxBytes?: number;
  emptyBody?: T;
};

type JsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

const DEFAULT_MAX_JSON_BYTES = 32_000;

export async function readJsonBody<T = unknown>(
  request: Request,
  { maxBytes = DEFAULT_MAX_JSON_BYTES, emptyBody }: JsonBodyOptions<T> = {}
): Promise<JsonBodyResult<T>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = Number(contentLength);
    if (Number.isFinite(bytes) && bytes > maxBytes) {
      return {
        ok: false,
        response: apiError(413, "body_too_large", "Request body is too large."),
      };
    }
  }

  let text = "";
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "Could not read request body."),
    };
  }

  if (new TextEncoder().encode(text).length > maxBytes) {
    return {
      ok: false,
      response: apiError(413, "body_too_large", "Request body is too large."),
    };
  }

  if (!text.trim()) {
    if (emptyBody !== undefined) {
      return { ok: true, data: emptyBody };
    }
    return {
      ok: false,
      response: apiError(400, "body_required", "Request body is required."),
    };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "Request body must be valid JSON."),
    };
  }
}
