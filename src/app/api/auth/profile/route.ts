import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAvatarUrl } from "@/lib/avatars";
import { run } from "@/lib/db";

type ProfileBody = {
  avatarUrl?: string | null;
};

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ProfileBody;
  const hasAvatarField = Object.prototype.hasOwnProperty.call(body, "avatarUrl");
  if (!hasAvatarField) {
    return NextResponse.json({ error: "avatarUrl is required." }, { status: 400 });
  }

  const rawAvatar = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  const avatarUrl = rawAvatar ? normalizeAvatarUrl(rawAvatar) : null;

  if (rawAvatar && !avatarUrl) {
    return NextResponse.json(
      { error: "Use a valid image. Curated picks, gallery uploads, and HTTPS image URLs are supported." },
      { status: 400 }
    );
  }

  await run("UPDATE users SET avatar_url = ? WHERE id = ?", avatarUrl, user.id);

  return NextResponse.json({
    user: {
      ...user,
      avatarUrl,
    },
  });
}
