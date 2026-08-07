"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { getTranslation, loadTranslationsSync } from "@/lib/translations";
import type { LanguageCode } from "@/lib/localization";

function readLanguage() {
  try {
    const value = window.localStorage.getItem("aletheia_preferences");
    return value ? (JSON.parse(value) as { language?: string }).language || "en" : "en";
  } catch {
    return "en";
  }
}

export default function ResetPasswordPage() {
  const translations = useMemo(() => loadTranslationsSync(readLanguage() as LanguageCode), []);
  const ts = (key: string, fallback: string) => String(getTranslation(translations, key, fallback));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const token = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) {
      setStatus(ts("auth.passwordsDoNotMatch", "Passwords do not match."));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = (await response.json()) as { message?: string; error?: string };
      setStatus(data.message || data.error || ts("auth.passwordResetComplete", "Your password has been reset. You can now sign in."));
    } catch {
      setStatus(ts("auth.resetLinkMissing", "This reset link is incomplete. Request a new one from sign in."));
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-dvh place-items-center bg-[#eef2ef] p-5 text-[#203a35]"><section className="w-full max-w-md rounded-3xl border border-[#c9d5cd] bg-[#fbfcf8] p-6 shadow-sm"><h1 className="text-xl font-semibold">{ts("auth.chooseNewPassword", "Choose a new password")}</h1><p className="mt-2 text-sm leading-6 text-[#52645d]">{token ? ts("auth.newPasswordBody", "Use at least 8 characters. This link expires after one hour.") : ts("auth.resetLinkMissing", "This reset link is incomplete. Request a new one from sign in.")}</p><form onSubmit={submit} className="mt-5 grid gap-3"><label className="sr-only" htmlFor="new-password">{ts("auth.newPassword", "New password")}</label><div className="relative"><input id="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full rounded-full border border-[#9bab9f] bg-white px-4 pr-11 outline-none" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required disabled={!token || busy} placeholder={ts("auth.newPassword", "New password")} /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-0 w-11 text-[#52645d]" aria-label={visible ? ts("auth.hidePassword", "Hide password") : ts("auth.showPassword", "Show password")}>{visible ? <EyeOff className="mx-auto size-4" /> : <Eye className="mx-auto size-4" />}</button></div><label className="sr-only" htmlFor="confirm-password">{ts("auth.confirmNewPassword", "Confirm new password")}</label><input id="confirm-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-11 rounded-full border border-[#9bab9f] bg-white px-4 outline-none" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} required disabled={!token || busy} placeholder={ts("auth.confirmNewPassword", "Confirm new password")} /><button disabled={!token || busy} className="h-11 rounded-full bg-[#203a35] px-4 text-sm font-semibold text-white disabled:opacity-60">{ts("auth.resetPassword", "Reset password")}</button></form>{status ? <p role="status" className="mt-4 text-sm leading-6 text-[#52645d]">{status}</p> : null}<Link href="/" className="mt-5 inline-block text-sm font-semibold underline underline-offset-4">{ts("auth.backToSignIn", "Back to sign in")}</Link></section></main>;
}
