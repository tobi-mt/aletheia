import { NextResponse } from "next/server";

const association = {
  applinks: {
    apps: [],
    details: [
      {
        appID: "2DFDVGFXUK.com.tobi.aletheia.app",
        paths: ["/*"],
      },
    ],
  },
};

export function GET() {
  return new NextResponse(JSON.stringify(association), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
