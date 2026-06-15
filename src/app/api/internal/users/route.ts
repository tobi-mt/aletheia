import { NextResponse } from "next/server";
import { many } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

export async function GET(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!secret || token !== secret) {
    return apiError(401, "permission_denied", "Unauthorized");
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "500", 10), 1000);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10), 0);
  const search = url.searchParams.get("search")?.trim() ?? "";

  const [users, countRows] = await Promise.all([
    many<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      login_count: number;
      last_seen_at: string | null;
      created_at: string;
    }>(
      search
        ? `SELECT id, email, name, avatar_url, login_count, last_seen_at, created_at
           FROM users
           WHERE email ILIKE $1 OR name ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2 OFFSET $3`
        : `SELECT id, email, name, avatar_url, login_count, last_seen_at, created_at
           FROM users
           ORDER BY created_at DESC
           LIMIT $1 OFFSET $2`,
      ...(search ? [`%${search}%`, limit, offset] : [limit, offset])
    ),
    many<{ total: number }>(
      search
        ? `SELECT COUNT(*)::int AS total FROM users WHERE email ILIKE $1 OR name ILIKE $1`
        : `SELECT COUNT(*)::int AS total FROM users`,
      ...(search ? [`%${search}%`] : [])
    ),
  ]);

  return NextResponse.json({
    users,
    total: countRows[0]?.total ?? 0,
    limit,
    offset,
  });
}
