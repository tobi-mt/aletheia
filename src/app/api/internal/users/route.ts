import { NextResponse } from "next/server";
import { many, one, run } from "@/lib/db";
import { apiError } from "@/lib/api-errors";

function authorized(request: Request) {
  const secret = process.env.ANALYTICS_ADMIN_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(secret && token === secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
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

export async function DELETE(request: Request) {
  if (!authorized(request)) {
    return apiError(401, "permission_denied", "Unauthorized");
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = body.userId?.trim();

  if (!userId) {
    return apiError(400, "invalid_input", "userId is required.");
  }

  const user = await one<{ id: string; email: string; name: string | null }>(
    "SELECT id, email, name FROM users WHERE id = ?",
    userId
  );

  if (!user) {
    return apiError(404, "not_found", "User not found.");
  }

  await run("DELETE FROM users WHERE id = ?", userId);

  return NextResponse.json({
    deleted: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
}
