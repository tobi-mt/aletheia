# Privacy Deployment Checklist

Use this checklist before production releases that touch chat, memory, manual context, gratitude, decisions, reflections, auth, or analytics.

## Required Environment Controls

- `NEXTAUTH_SECRET` is set to a strong generated secret in production.
- `NEXTAUTH_URL` matches the production app URL.
- `AUTH_TRUST_HOST` is set appropriately for the hosting platform.
- `OPENAI_API_KEY` is server-side only and never exposed as a public env var.
- `OPENAI_MODEL` is set to a valid Responses API model, or omitted to use the app fallback.
- `ANALYTICS_ADMIN_SECRET` and `NOTIFICATION_CRON_SECRET` are unique strong secrets.
- Google OAuth redirect URIs match only the intended production and staging domains.

## OpenAI And AI Data Handling

- Confirm the OpenAI organization/project data-retention setting matches the privacy promise for Aletheia.
- Confirm logs and traces do not store raw chat prompts, manual context, gratitude notes, or generated answers beyond what is intentionally persisted in the app database.
- Keep system prompts privacy-first: user memory, manual context, gratitude, decisions, reflections, and rules should tailor counsel without being recited mechanically.
- Do not add tools or prompt language that claims financial, legal, tax, medical, or guaranteed outcome authority.

## User Context Boundaries

- Manual context is used only when `useInAnswers` and the per-domain toggles allow it.
- Gratitude Lens data sent to chat remains a compact text summary; never send image data or the full local archive.
- Reflections/journals are summarized as patterns only; do not quote private entries unless the user includes that text in the active chat.
- Decisions may be used for continuity, but answer wording should summarize patterns before naming private details.
- Support reports include only the user-submitted report text plus basic app context.

## API Safety

- JSON request bodies are bounded by endpoint-specific size limits.
- Malformed JSON returns a clear `400` response instead of being silently treated as empty input.
- Oversized JSON returns `413` before route work continues.
- Destructive actions still require explicit confirmation and signed-in ownership checks.

## Release Verification

- `npm ci` succeeds from a clean install.
- `npm run lint` passes.
- `node test-comprehensive.mjs` passes.
- `npm run ui:regression` passes.
- `npm run build` passes with production-like environment variables.
- After any shared UI/layout refactor, run `npm run build` and confirm TypeScript still passes before deploying.
