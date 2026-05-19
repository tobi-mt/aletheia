# Aletheia

AI-powered biblical wisdom for money, work, stewardship, generosity, and reflective decision-making.

## Current MVP

- Conversational Wisdom Companion backed by a curated local wisdom library
- Server-side `/api/chat` route with retrieval-first OpenAI generation
- First-party email/password auth with httpOnly session cookies
- Auth.js Google OAuth bridge into Aletheia-owned user/session tables
- Neon/Postgres persistence for users, sessions, chat history, wisdom entries, and journal entries
- DB-backed rate limiting for auth and chat endpoints
- Wisdom Check decision tool with pace, counsel, and grounding signals
- Searchable Biblical Wisdom Library
- Reflection Journal synced to the database for signed-in users
- Opt-in daily wisdom Web Push notifications
- Mobile-first responsive PWA shell
- Production-only service worker with offline app-shell caching
- Installable PWA manifest and Aletheia app icons

## Environment

Copy `.env.example` to `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5.4-mini"
SESSION_COOKIE_NAME="aletheia_session"
NEXT_PUBLIC_APP_URL="https://your-production-domain"
AUTH_SECRET=""
AUTH_TRUST_HOST="true"
AUTH_URL="https://your-production-domain"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:hello@mirrortalkpodcast.com"
NOTIFICATION_CRON_SECRET=""
```

Without `OPENAI_API_KEY`, the server still performs retrieval and returns a deterministic grounded fallback response. With `OPENAI_API_KEY`, `/api/chat` calls OpenAI server-side after retrieving curated biblical wisdom sources.

The database adapter creates required tables and seeds the curated wisdom entries automatically on first API access. For Railway, set the same variables in the service's Variables tab and redeploy.

## Railway Checklist

- Set `DATABASE_URL` to the Neon pooled connection string.
- Set `OPENAI_API_KEY` server-side only.
- Set `NEXT_PUBLIC_APP_URL` to the Railway/custom production URL.
- Set `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` for Google sign-in.
- Set VAPID keys for daily wisdom push notifications.
- Set `NOTIFICATION_CRON_SECRET` and use it from your Railway scheduled job.
- Use `npm run build` as the build command.
- Use `npm run start` as the start command.
- Redeploy after changing variables.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Preview

```bash
npm run build
npm run start -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

The service worker is registered only in production so local development does not get stuck behind stale cached bundles.

## Google Sign-In With Auth.js

Generate an Auth.js secret:

```bash
openssl rand -base64 32
```

Create a Google OAuth client in Google Cloud Console:

- Application type: Web application
- Authorized JavaScript origin: `https://aletheia.mirrortalkpodcast.com`
- Authorized redirect URI: `https://aletheia.mirrortalkpodcast.com/api/auth/callback/google`

Set these Railway variables on the Aletheia web service:

```bash
AUTH_SECRET="generated-secret"
AUTH_TRUST_HOST="true"
AUTH_URL="https://aletheia.mirrortalkpodcast.com"
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
```

Google OAuth users are bridged into Aletheia's own `users` and `sessions` tables after successful sign-in, so journals, decisions, notifications, and rules stay owned by the app database.

## Daily Wisdom Notifications

Generate Web Push VAPID keys:

```bash
npm run push:keys
```

Set the generated keys in Railway:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:hello@mirrortalkpodcast.com"
NOTIFICATION_CRON_SECRET="a-long-random-secret"
```

Users must be signed in and opt in from inside Aletheia. iOS users need to install the PWA to the Home Screen before Web Push is available.

Create a Railway scheduled job that sends a POST request to:

```text
https://aletheia.mirrortalkpodcast.com/api/notifications/daily
```

with this header:

```text
Authorization: Bearer YOUR_NOTIFICATION_CRON_SECRET
```

The current implementation sends only to users whose preferred notification hour matches the current UTC hour and avoids repeat sends within 20 hours.

## PWA Notes

Aletheia uses the Next.js app manifest route and a custom production-only service worker in `public/sw.js`. `next-pwa` is not installed because adding a second service-worker generator would overlap with the current controlled caching behavior.

## Capacitor Preparation

The project includes `capacitor.config.ts` with:

- app name: `Aletheia`
- app id: `com.aletheia.app`
- remote server URL: `NEXT_PUBLIC_APP_URL`

When the web app is polished enough for native shells:

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

For this cloud-backed app, Capacitor should load the deployed Railway URL rather than a static export, because auth, OpenAI, and journal persistence depend on server routes.

## Launch Notes

This MVP is intentionally not a financial advisor and does not promise financial outcomes. The current wisdom engine retrieves curated entries before any AI generation and keeps the same guardrails:

- retrieve from curated wisdom data first
- cite only known scripture references
- include professional-advice disclaimers for high-stakes financial/legal/tax questions
- log no private journal content unless a user explicitly opts in
