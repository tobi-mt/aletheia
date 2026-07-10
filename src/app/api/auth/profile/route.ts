import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAvatarUrl } from "@/lib/avatars";
import { run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

type ProfileBody = {
  avatarUrl?: string | null;
  name?: string | null;
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
  const hasNameField = Object.prototype.hasOwnProperty.call(body, "name");
  if (!hasAvatarField && !hasNameField) {
    return apiError(400, "invalid_input", "A profile field is required.");
  }

  const rawAvatar = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  const avatarUrl = rawAvatar ? normalizeAvatarUrl(rawAvatar) : null;

  if (rawAvatar && !avatarUrl) {
    return apiError(400, "invalid_image", "Use a valid image. Curated picks, gallery uploads, and HTTPS image URLs are supported.");
  }

  const rawName = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (hasNameField && (rawName.length < 1 || rawName.length > 80)) {
    return apiError(400, "invalid_input", "Use a name between 1 and 80 characters.");
  }

  await run(
    "UPDATE users SET avatar_url = CASE WHEN ? THEN ? ELSE avatar_url END, name = CASE WHEN ? THEN ? ELSE name END WHERE id = ?",
    hasAvatarField,
    avatarUrl,
    hasNameField,
    rawName || null,
    user.id
  );

  return NextResponse.json({
    user: {
      ...user,
      name: hasNameField ? rawName : user.name,
      avatarUrl: hasAvatarField ? avatarUrl : user.avatarUrl,
    },
  });
}
