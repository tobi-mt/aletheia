import { NextResponse } from "next/server";

function parseFingerprints() {
  const raw =
    process.env.ANDROID_APP_LINK_SHA256_FINGERPRINTS ||
    process.env.NEXT_PUBLIC_ANDROID_APP_LINK_SHA256_FINGERPRINTS ||
    "";

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function GET() {
  return new NextResponse(
    JSON.stringify([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.aletheia.app",
          sha256_cert_fingerprints: parseFingerprints(),
        },
      },
    ]),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
