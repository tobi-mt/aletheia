import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://127.0.0.1",
  "https://127.0.0.1",
]);

function getPublicAppOrigin() {
  try {
    const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "";
    if (!raw) {
      return null;
    }
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  if (origin === getPublicAppOrigin()) {
    return true;
  }

  if (DEFAULT_ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
  } catch {
    return false;
  }

  return false;
}

function applyCorsHeaders(response: NextResponse, origin: string, request: NextRequest) {
  const requestedHeaders = request.headers.get("access-control-request-headers");
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    requestedHeaders ?? "Content-Type, Authorization, Accept, Origin, Cache-Control, Pragma, Next-Action, RSC, X-Requested-With"
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  const existingVary = response.headers.get("Vary");
  const varyValues = new Set(
    (existingVary ? existingVary.split(",") : [])
      .map((value) => value.trim())
      .filter(Boolean)
  );
  varyValues.add("Origin");
  varyValues.add("Access-Control-Request-Method");
  varyValues.add("Access-Control-Request-Headers");
  response.headers.set("Vary", Array.from(varyValues).join(", "));
}

export function proxy(request: NextRequest) {
  // Aletheia uses Route Handlers for mutations and intentionally has no Server
  // Actions. Reject forged action requests before Next's renderer logs them as
  // application errors. Remove this guard if a real `use server` action is added.
  if (request.headers.has("next-action")) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response, origin!, request);
    return response;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response, origin!, request);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    {
      source: "/:path*",
      has: [{ type: "header", key: "next-action" }],
    },
  ],
};
