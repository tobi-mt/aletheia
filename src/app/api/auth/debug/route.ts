import { NextRequest, NextResponse } from "next/server";

function describeUrl(value: string | undefined) {
  if (!value) {
    return { present: false };
  }

  try {
    const url = new URL(value);
    return {
      present: true,
      origin: url.origin,
      protocol: url.protocol,
      hostname: url.hostname,
    };
  } catch {
    return {
      present: true,
      invalid: true,
    };
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    request: {
      origin: request.nextUrl.origin,
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
    },
    env: {
      NEXT_PUBLIC_APP_URL: describeUrl(process.env.NEXT_PUBLIC_APP_URL),
      AUTH_URL: describeUrl(process.env.AUTH_URL),
      AUTH_SECRET: { present: Boolean(process.env.AUTH_SECRET) },
      AUTH_GOOGLE_ID: {
        present: Boolean(process.env.AUTH_GOOGLE_ID),
        placeholder: process.env.AUTH_GOOGLE_ID === "your-google-client-id",
      },
      AUTH_GOOGLE_SECRET: { present: Boolean(process.env.AUTH_GOOGLE_SECRET) },
    },
  });
}
