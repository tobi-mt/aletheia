import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const { code, message } = error as { code?: string; message?: string };
  const normalizedMessage = `${code ?? ""} ${message ?? ""}`.toLowerCase();

  return [
    "08000",
    "08001",
    "08003",
    "08006",
    "08007",
    "08p01",
    "57p01",
    "57p02",
    "57p03",
    "53300",
    "53400",
    "etimedout",
    "econreset",
    "econnreset",
    "econnrefused",
    "socket hang up",
    "server closed the connection unexpectedly",
    "connection terminated unexpectedly",
    "connection terminated due to connection timeout",
    "terminating connection",
    "could not connect to server",
  ].some((fragment) => normalizedMessage.includes(fragment));
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    // If Railway is briefly warming the database, treat the session as absent
    // instead of failing the app start or spamming deploy logs.
    if (isTransientDbError(error)) {
      return NextResponse.json({ user: null });
    }

    throw error;
  }
}
