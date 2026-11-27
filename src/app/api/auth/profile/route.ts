import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_AVATAR_DATA_URL_LENGTH, normalizeAvatarUrl } from "@/lib/avatars";
import { run } from "@/lib/db";
import { readJsonBody } from "@/lib/request";
import { apiError } from "@/lib/api-errors";

type ProfileBody = {
  avatarUrl?: string | null;
  name?: string | null;
};

// The body must fit the largest accepted avatar data URL plus the name and JSON envelope.
const MAX_PROFILE_BODY_BYTES = MAX_AVATAR_DATA_URL_LENGTH + 4_000;

const profileDeps = { getCurrentUser, run };

export async function putProfile(request: Request, deps = profileDeps) {
  const user = await deps.getCurrentUser();
  if (!user) {
    return apiError(401, "sign_in_required", "Sign in to update your profile.");
  }

  const parsedBody = await readJsonBody<ProfileBody>(request, { maxBytes: MAX_PROFILE_BODY_BYTES, emptyBody: {} });
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

  await deps.run(
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

export async function PUT(request: Request) {
  return putProfile(request);
}
