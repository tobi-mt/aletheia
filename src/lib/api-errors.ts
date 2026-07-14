import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "sign_in_required"
  | "rate_limited"
  | "invalid_input"
  | "invalid_json"
  | "body_required"
  | "body_too_large"
  | "not_configured"
  | "unavailable"
  | "not_found"
  | "permission_denied"
  | "save_failed"
  | "invalid_subscription"
  | "confirm_delete"
  | "invalid_image"
  | "invalid_credentials"
  | "authentication_failed"
  | "account_exists"
  | "sign_in_not_finish"
  | "apple_revocation_failed"
  | "unsafe_content";

export function apiError(
  status: number,
  errorCode: ApiErrorCode,
  error: string,
  init?: ResponseInit
) {
  return NextResponse.json(
    { errorCode, error },
    {
      status,
      headers: init?.headers,
    }
  );
}
