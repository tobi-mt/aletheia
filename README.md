# Aletheia

AI-powered biblical wisdom for money, work, stewardship, generosity, and reflective decision-making.

## Aletheia Design North Star

- Serenity first: quiet, trustworthy, and uncluttered.
- Decision-first: show the why and the next step on every screen.
- Bible experience: editorial, immersive, minimal chrome.
- Translation-first: no English leaks or visible fallback references.
- Wisdom companion: clarity, warmth, and discernment over "AI" vibes.
- Quiet luxury: deep neutrals, warm gold, subtle motion, strong type.
- Horizontal rails and compact chip trays: keep labels single-line, add an overflow-aware right-edge cue only when it is actually useful, and never let choice text overlap or block adjacent controls.

## Current MVP

- Conversational Wisdom Companion backed by a curated local wisdom library
- Server-side `/api/chat` route with retrieval-first OpenAI generation
- First-party email/password auth with httpOnly session cookies
- Auth.js Google OAuth bridge into Aletheia-owned user/session tables
- Neon/Postgres persistence for users, sessions, chat history, wisdom entries, and journal entries
- First-party privacy-conscious analytics events stored in the app database
- DB-backed rate limiting for auth and chat endpoints
- Wisdom Check decision tool with pace, counsel, and grounding signals
- Searchable Biblical Wisdom Library
- Reflection Journal synced to the database for signed-in users
- Opt-in daily wisdom Web Push notifications
- Multilingual preferences for language, region, public-domain Bible translation label, localized daily wisdom, and browser voice controls
- Mobile-first responsive PWA shell
- Production-only service worker with offline app-shell caching
- Installable PWA manifest and Aletheia app icons

## Environment

Copy `.env.example` to `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
SESSION_COOKIE_NAME="aletheia_session"
NEXT_PUBLIC_APP_URL="https://your-production-domain"
NEXTAUTH_SECRET=""
NEXTAUTH_URL="https://your-production-domain"
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
NOTIFICATION_HEALTH_SECRET=""
ANALYTICS_ADMIN_SECRET=""
ANALYTICS_GEO_ENRICHMENT_ENABLED="false"
NEXT_PUBLIC_ALETHEIA_STRIPE_DONATION_URL=""
NEXT_PUBLIC_ALETHEIA_PAYPAL_DONATION_URL=""
NEXT_PUBLIC_ALETHEIA_BANK_SUPPORT_URL=""
NEXT_PUBLIC_ALETHEIA_SUPPORT_URL=""
NEXT_PUBLIC_ALETHEIA_SUPPORT_CONTACT_EMAIL=""
```

`ANALYTICS_GEO_ENRICHMENT_ENABLED` is optional and defaults to `false`. When enabled, analytics ingestion stores only coarse geo metadata (`geo_country`, `geo_region`) derived from proxy headers.

### Avatar Image Hosts

`AVATAR_IMAGE_HOSTS` is optional and lets you add extra remote hosts for avatar image optimization.

- It **extends** the built-in avatar host allowlist; it does **not** replace it.
- Values are comma-separated hosts or URLs.

Example:

```bash
AVATAR_IMAGE_HOSTS="example-cdn.com,https://profile-images.myapp.com"
```

Built-in fallback hosts include common providers such as GitHub, Google profile images, Gravatar, Discord, X/Twitter, and Pravatar.

### Mission Support Links

The Account screen can show an optional, non-pressure "Support the Mission" card. Configure one or more public support destinations to enable its buttons:

- `NEXT_PUBLIC_ALETHEIA_STRIPE_DONATION_URL` for card, Apple Pay, or Google Pay through Stripe.
- `NEXT_PUBLIC_ALETHEIA_PAYPAL_DONATION_URL` for PayPal.
- `NEXT_PUBLIC_ALETHEIA_BANK_SUPPORT_URL` for a bank-transfer instruction page.
- `NEXT_PUBLIC_ALETHEIA_SUPPORT_URL` for a general support page.
- `NEXT_PUBLIC_ALETHEIA_SUPPORT_CONTACT_EMAIL` for a contact email link.

Payment details should stay with the payment provider. Aletheia only records the non-private `support_mission_clicked` analytics event with the selected channel.

Without `OPENAI_API_KEY`, the server still performs retrieval and returns a deterministic grounded fallback response. With `OPENAI_API_KEY`, `/api/chat` calls OpenAI server-side after retrieving curated biblical wisdom sources.

The database adapter creates required tables and seeds the curated wisdom entries automatically on first API access. For Railway, set the same variables in the service's Variables tab and redeploy.

## Railway Checklist

- Set `DATABASE_URL` to the Neon pooled connection string.
- Set `OPENAI_API_KEY` server-side only.
- Set `NEXT_PUBLIC_APP_URL` to the Railway/custom production URL.
- Set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`, `AUTH_GOOGLE_ID`, and `AUTH_GOOGLE_SECRET` for Google sign-in.
- Set VAPID keys for daily wisdom push notifications.
- Set `NOTIFICATION_CRON_SECRET` and use it from your Railway scheduled job against `/api/notifications/daily`.
- Set `ANALYTICS_ADMIN_SECRET` to protect aggregate analytics exports.
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

## Native Mobile Shells

Aletheia can be packaged for iOS and Android with Capacitor while keeping the hosted app as the source of truth.

Useful commands:

```bash
npm run mobile:assets
npm run mobile:bundle:web
npm run mobile:sync
npm run mobile:bundle:android
npm run mobile:archive:ios
npm run mobile:open:android
npm run mobile:open:ios
```

The `android/` and `ios/` projects are checked in and ready for store signing, screenshots, and platform-specific review work.
For the launch checklist, start with Google Play in [`GOOGLE_PLAY_UPLOAD_PACK.md`](./GOOGLE_PLAY_UPLOAD_PACK.md).
Keep [`STORE_LAUNCH_PREP.md`](./STORE_LAUNCH_PREP.md) for the later Apple pass.

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
NEXTAUTH_SECRET="generated-secret"
NEXTAUTH_URL="https://aletheia.mirrortalkpodcast.com"
AUTH_TRUST_HOST="true"
AUTH_URL="https://aletheia.mirrortalkpodcast.com"
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
```

Google OAuth users are bridged into Aletheia's own `users` and `sessions` tables after successful sign-in, so journals, decisions, notifications, and rules stay owned by the app database.

## First-Party Analytics

Aletheia stores product analytics in its own `analytics_events` table. Events intentionally avoid private content: no chat question text, no journal text, no decision pressure, no counsel names, and no rule text.

Tracked examples:

- app opens
- app view changes (Home, Decisions, Reflect, Library, Account)
- wisdom mode selection
- sign-in and registration success
- sign-out
- chat questions sent
- journal entries created
- decisions created or updated
- counsel contacts created
- counsel decision bulk share
- rules created
- notifications enabled
- notifications disabled and timing changes
- local-only guest actions (reflections, decisions, counsel contacts, rules)

Read aggregate analytics with:

```bash
curl -H "Authorization: Bearer YOUR_ANALYTICS_ADMIN_SECRET" \
  https://aletheia.mirrortalkpodcast.com/api/analytics/summary
```
Internal Analytics Summary Dashboard: https://aletheia.mirrortalkpodcast.com/internal/analytics

The summary response includes high-level usage and product insight blocks:

- `overview` (users, sessions, event volume)
- `events30d` and `modes30d`
- `daily14d`
- `features30d` (feature adoption by unique people)
- `funnel30d` (open -> auth -> ask -> decide -> notifications)
- `feedback30d`
- `views30d`
- `acquisitionSources30d`
- `paths30d`
- `hourlyUsage30d`
- `retentionWeekly` (weekly signup cohorts with 7-day retention)

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

The legacy `/api/notifications/send` route remains as a compatibility alias, but new scheduler wiring should point at `/api/notifications/daily`.

### Notifications Health Endpoint

Use a lightweight health endpoint for monitoring notification delivery state:

```text
GET /api/notifications/health
```

Authentication options (any one):

```text
Authorization: Bearer YOUR_NOTIFICATION_HEALTH_SECRET
```

```text
x-health-secret: YOUR_NOTIFICATION_HEALTH_SECRET
```

```text
?secret=YOUR_NOTIFICATION_HEALTH_SECRET
```

If `NOTIFICATION_HEALTH_SECRET` is not set, the endpoint falls back to `NOTIFICATION_CRON_SECRET`.

Live snapshot response includes:

- `enabledSubscriptions`
- `dueNow`
- `unauthorizedHits`
- `scanned`
- `hourUtc`

Readiness-only check (no DB scan):

```text
GET /api/notifications/health?scope=readiness
```

Example:

```bash
curl -H "Authorization: Bearer YOUR_NOTIFICATION_CRON_SECRET" \
  https://aletheia.mirrortalkpodcast.com/api/notifications/health
```

## Multilingual Layer

Aletheia supports user preferences for:

- preferred language: English, Spanish, French, Portuguese, German, Yoruba, Igbo, Hausa, Filipino/Tagalog, Arabic, Hindi
- region context: global, United States, United Kingdom, Europe, Nigeria, Brazil, Latin America, Philippines, Middle East and North Africa, India
- public-domain Bible translation label: WEB, KJV, ASV
- browser voice input/output when supported

The AI prompt receives these preferences and adapts language, regional examples, and scripture-reference labels. If a safe public-domain localized scripture text is not available, Aletheia keeps the scripture reference accurate and falls back to English/reference-only wording rather than inventing translation text.

For the launch sequence, file-level rollout scope, and QA gates, see [`LANGUAGE_EXPANSION_ROLLOUT.md`](/Users/tobi/PycharmProjects/pythonProject/aletheia/LANGUAGE_EXPANSION_ROLLOUT.md).

## PWA Notes

Aletheia uses the Next.js app manifest route and a custom production-only service worker in `public/sw.js`. `next-pwa` is not installed because adding a second service-worker generator would overlap with the current controlled caching behavior.

## Capacitor Preparation

The project includes `capacitor.config.ts` with:

- app name: `Aletheia`
- app id: `com.aletheia.app`
- local web bundle: `capacitor-web`
- native bundle generator: `npm run mobile:bundle:web`

The checked-in native shells currently use:

- Android application/package id: `com.aletheia.app`
- iOS bundle identifier: `com.tobi.aletheia.app`

When the web app is polished enough for native shells:

```bash
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

For the native shells, `npm run mobile:bundle:web` builds the Next.js app, copies the prerendered shell and static assets into `capacitor-web`, and rewrites API traffic back to the hosted backend. That keeps the mobile app self-contained at launch while still relying on the deployed backend for auth, OpenAI, and journal persistence.

## Native Push Setup

Aletheia supports native push through Capacitor on iOS and Android, while PWA users keep using Web Push.

### Server Environment Variables

Set one native transport path, or both:

- APNs:
  - `NATIVE_PUSH_APNS_TEAM_ID`
  - `NATIVE_PUSH_APNS_KEY_ID`
  - `NATIVE_PUSH_APNS_PRIVATE_KEY` or `NATIVE_PUSH_APNS_KEY_P8`
  - `NATIVE_PUSH_APNS_BUNDLE_ID`
  - `NATIVE_PUSH_APNS_ENVIRONMENT` (`development` or `production`)
- FCM:
  - `NATIVE_PUSH_FCM_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS_JSON`

For production, keep the APNs bundle ID aligned with the iOS app bundle identifier and make sure the FCM service account belongs to the Firebase project for the Android app.

### iOS Project Steps

1. Open the iOS project with `npx cap open ios`.
2. In Xcode, enable the Push Notifications capability for the app target.
3. Make sure the signing team and bundle identifier match the APNs bundle ID you set in the environment.
4. Rebuild the app after the capability is added.

### Android Project Steps

1. Open the Android project with `npx cap open android`.
2. Add Firebase's `google-services.json` to `android/app/`.
3. Confirm the Firebase Android app package name matches the Capacitor app id.
4. Sync and rebuild so the Firebase Messaging plugin can register and receive tokens.

### Tiny QA Checklist

- iOS: tap a daily wisdom push, a gratitude push, and a counsel/private comment push.
- Android: tap a challenge nudge push, a daily wisdom push, and a counsel/private comment push.
- PWA: tap the same notification types in the browser and confirm the correct in-app screen opens after the service worker click handler runs.

## Launch Notes

This MVP is intentionally not a financial advisor and does not promise financial outcomes. The current wisdom engine retrieves curated entries before any AI generation and keeps the same guardrails:

- retrieve from curated wisdom data first
- cite only known scripture references
- include professional-advice disclaimers for high-stakes financial/legal/tax questions
- log no private journal content unless a user explicitly opts in
