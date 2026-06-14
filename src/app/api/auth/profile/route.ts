import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAvatarUrl } from "@/lib/avatars";
import { run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

type ProfileBody = {
  avatarUrl?: string | null;
};

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to update your profile.");
  }

  const parsedBody = await readJsonBody<ProfileBody>(request, { maxBytes: 2_000, emptyBody: {} });
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;
  const hasAvatarField = Object.prototype.hasOwnProperty.call(body, "avatarUrl");
  if (!hasAvatarField) {
    return apiError(400, "invalid_input", "avatarUrl is required.");
  }

  const rawAvatar = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  const avatarUrl = rawAvatar ? normalizeAvatarUrl(rawAvatar) : null;

  if (rawAvatar && !avatarUrl) {
    return apiError(400, "invalid_image", "Use a valid image. Curated picks, gallery uploads, and HTTPS image URLs are supported.");
  }

  await run("UPDATE users SET avatar_url = ? WHERE id = ?", avatarUrl, user.id);

  return NextResponse.json({
    user: {
      ...user,
      avatarUrl,
    },
  });
}
