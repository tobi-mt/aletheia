# Aletheia

AI-powered biblical wisdom for money, work, stewardship, generosity, and reflective decision-making.

## Current MVP

- Conversational Wisdom Companion backed by a curated local wisdom library
- Server-side `/api/chat` route with retrieval-first OpenAI generation
- First-party email/password auth with httpOnly session cookies
- Neon/Postgres persistence for users, sessions, chat history, wisdom entries, and journal entries
- Wisdom Check decision tool with pace, counsel, and grounding signals
- Searchable Biblical Wisdom Library
- Reflection Journal synced to the database for signed-in users
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
```

Without `OPENAI_API_KEY`, the server still performs retrieval and returns a deterministic grounded fallback response. With `OPENAI_API_KEY`, `/api/chat` calls OpenAI server-side after retrieving curated biblical wisdom sources.

The database adapter creates required tables and seeds the curated wisdom entries automatically on first API access. For Railway, set the same variables in the service's Variables tab and redeploy.

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

## Launch Notes

This MVP is intentionally not a financial advisor and does not promise financial outcomes. The current wisdom engine retrieves curated entries before any AI generation and keeps the same guardrails:

- retrieve from curated wisdom data first
- cite only known scripture references
- include professional-advice disclaimers for high-stakes financial/legal/tax questions
- log no private journal content unless a user explicitly opts in
