# Aletheia Features (Idea date: 18.05.2026)

Aletheia is a calm, premium, AI-powered biblical wisdom companion for money, work, purpose, generosity, stewardship, and major life decisions.

It is designed to feel emotionally intelligent, spiritually grounded, and practically useful, while helping people move from pressure to clarity and from clarity to action.

**Implementation Status (as of June 17, 2026):** The app is approximately 85-90% feature complete with 25 major features fully implemented, 2 features partially implemented, and 3 features planned for upcoming releases. ✅ **Core app, authentication, wisdom companion, all 5 wisdom modes, decision companion, reflections, counsel circle, manual context vault, notifications, account, analytics, mobile (Capacitor) and PWA are fully implemented.** ⚠️ **Gratitude Lens (in development), Formation Milestones UI (planned), Postcard styling filters (planned).** All features listed in this document are either fully shipped or clearly marked as planned/in-development.

## Why People Use Aletheia

- It turns overwhelming questions into calm, wise next steps.
- It gives biblically grounded guidance without sounding preachy or robotic.
- It helps users think clearly about money, work, purpose, and generosity in one place.
- It keeps meaningful answers visible instead of burying them in a noisy chat history.
- It remembers the user’s decisions, reflections, and trusted counsel when they sign in.
- It supports daily formation through small practices, reminders, and follow-up actions.
- It works as a companion on mobile and desktop, so wisdom is always close at hand.

## Core Advantages

- Calm experience that reduces noise, anxiety, and decision fatigue.
- Premium interface that feels intentional, focused, and trustworthy.
- Editorial Home rhythm with one clear next action, supporting choices, and a richer Today’s Companion card.
- Main tabs keep a shared Aletheia design language while using distinct visual outlines, rhythms, and motifs for Today, Ask, Decisions, Reflect, Library, and Account.
- Onboarding keeps setup navigation reachable and traps mobile scrolling inside the setup card so first-time users do not get stuck or accidentally scroll the app behind it.
- Spiritual depth rooted in curated biblical wisdom rather than generic advice.
- Practical guidance that includes reflection, counsel, and concrete next steps.
- Continuity across sessions for signed-in users through sync, memory, and history.
- Privacy-conscious design that avoids exposing private questions, answers, or reflections when sharing.
- Multilingual support so the app can serve users across different regions and languages.
- PWA and mobile-first behavior so the app feels like a real companion, not just a web page.
- Consistent button, link, and disclosure feedback for tap, press, focus, and disabled states across the app.
- Softer premium surfaces and clearer tappable affordances to reduce visual clutter without losing depth.
- Softer editorial surfaces and press feedback are applied across shared cards, settings rows, navigation controls, and action buttons.
- Mobile bottom navigation uses a theme-aware glossy glass treatment with a clear active tab capsule.
- Account and history card summaries wrap cleanly across languages and use compact symbolic counters where labels would otherwise truncate awkwardly.

## What Makes It Different

- Not just a chat app: it includes dashboards, journaling, decisions, counsel, rules of life, and notifications.
- Not just scripture lookup: it applies wisdom to real choices with context and discernment.
- Not just self-help: it keeps faith, integrity, and formation at the center.
- Not just an AI assistant: it is designed around habits, memory, and long-term growth.

## Wisdom Companion

- Conversational AI guidance for money, work, purpose, generosity, and stewardship questions
- Human-feeling responses with emotional understanding, biblical wisdom, practical perspective, reflection questions, and gentle reminders
- Mode-aware answers that adapt to the selected wisdom lens
- Scripture-grounded answers using curated wisdom sources
- Guardrails against prosperity-gospel language, financial promises, and invented scripture references
- Collapsed conversation history so the interface does not feel like a noisy chat transcript
- Current counsel card that keeps the latest answer prominent
- Suggested prompts for common money, work, purpose, generosity, and life questions
- Voice input for asking questions is enabled by default when supported by the browser
- Visible voice input toggle in Account so users can deactivate or reactivate the microphone beside Ask
- Voice output for reading the latest Aletheia response aloud with multilingual support
- Answer feedback buttons: helpful, too vague, too preachy, and not relevant
- Contextual personalization nudge after “too vague” feedback when the user has not added any manual context
- Signed-in memory can use active decisions, recent reflections, and rules of life for continuity
- Manual context can shape answers through strategic counsel signals rather than raw facts alone
- Stronger emotional discernment for urgency, fear, shame, and pressure
- Stronger refusal behavior for predictions, guaranteed outcomes, harmful requests, fraud, tax evasion, and manipulative giving

## Wisdom Modes

Aletheia includes 5 distinct wisdom modes that change how guidance is interpreted and applied:

- **Money mode** for budgeting, debt, saving, investing, contentment, comparison, and stewardship
- **Work mode** for career decisions, leadership, business, burnout, calling, and sustainable ambition
- **Purpose mode** for identity, direction, peace, motives, timing, and discernment
- **Generosity mode** for giving, family support, charity, boundaries, guilt, and sustainability
- **Life mode** for family, relationships, habits, rest, health, recovery, holiness, and character formation

**Mode Features:**
- Each mode includes its own diagnostic tracks, blind spots, maturity signals, practices, prompts, and response strategy
- The active mode is shown inside the UI so users understand how the lens shapes the answer
- Mode can be selected during onboarding and changed anytime from Account > Personalization
- Mode-aware wisdom retrieval shapes which biblical principles and practices are surfaced
- Mode-specific counsel signals help diagnose underlying issues vs. surface pressure

## Today Dashboard

- A daily home dashboard centered on the question: “What should I do next?”
- Home uses a top-level Today / Ask Aletheia switch so the main ask experience is one tap away without scrolling past dashboard cards.
- Strong visual hierarchy that keeps one primary next action visible before supporting options.
- Quick actions to start or continue a decision
- Quick action to reflect on today’s wisdom
- Quick action to ask Aletheia
- Quick action to review a recurring pattern
- Sync and notification prompts when the user is not fully set up
- Quiet personalization hint when the Manual Context Vault is empty
- Today’s wisdom principle
- Today’s scripture anchor
- Tiny daily practice
- Editorial Today’s Companion card with scripture chip, featured insight, carry phrase, and quiet detail expansion
- Visible mode lens for the day
- Carry Card action that turns the daily carry phrase into a beautiful shareable wisdom card
- Weekly Wisdom Review with quiet counts for questions, reflections, gratitude moments, decisions, one saved weekly scripture/principle, and one next faithful step

## Decision Companion

- Guided decision tracking for major life, money, work, and generosity decisions
- Decision memory for choices users are actively discerning
- Tracks the original decision, pressure, emotion, readiness, counsel, cost, alignment, reversibility, and peace
- Wisdom timeline for changes, learning, counsel, and patterns over time
- Calm readiness indicator instead of gamified scoring
- Waiting mode options for 1, 3, 7, and 30 days
- Outcome review prompts for 7, 30, and 90 days
- Decision summary export area
- Mentor-ready decision summary with privacy review before sharing
- Decision summary postcard export for sharing the principle or summary without exposing the full private story by default
- Optional decision blessing / prayer draft after a decision summary
- “What changed?” revisit support that helps users compare urgency, counsel, clarity, numbers, and peace over time
- Outcome and learning capture after the decision is made
- Decision history
- Ability to continue a decision from a chat answer
- Ability to turn a chat answer into a tracked decision

## Post-Answer Actions

After a meaningful answer, Aletheia can help the user take the next wise step. All post-answer actions are fully implemented:

- **Track this decision** - Create a tracked decision from the answer
- **Save as reflection** - Turn the answer into a reflection/journal entry
- **Create counsel summary** - Generate a structured summary for sharing with mentors
- **Wait 3 days** - Create a 3-day waiting period reminder
- **Continue from an older conversation** - Link back to related questions
- **Draft a reflection** - Auto-generate reflection text from the answer
- **Draft a mentor/counsel summary** - Auto-generate a shareable summary
- **Invite someone to Aletheia** - Share the app without exposing private answer content
- **Turn into a Wisdom Postcard** - Create a beautiful shareable card with the principle or insight

## Sharing And Referrals

**Sharing Channels:**
- Native Web Share support where available
- Copy-link fallback
- Share link for WhatsApp
- Share link for Facebook
- Share link for X / Twitter
- Share link for LinkedIn
- Email invite link
- SMS invite link

**Sharing Features:**
- Account-level invite card in Account > Share Aletheia section
- Gentle post-answer sharing prompt after meaningful responses
- Formation milestone sharing prompt to celebrate and invite friends
- Shares only the public Aletheia app link by default
- Does not share private questions, answers, decisions, or reflections
- Privacy-conscious `app_shared` analytics event with only channel and placement metadata
- Referral-ready share URL: `https://aletheia.mirrortalkpodcast.com?ref=share`

## Reflect Area

- Combined Wisdom Check and Reflection Journal in one intentional workspace
- Wisdom Check for slowing down decisions and pressures
- Readiness signal based on urgency, counsel, and time horizon
- Emotional state selector
- Time horizon selector
- Grounding scripture and principle
- Mode-specific diagnostic readout
- Watch-for guidance
- Practical next faithful action
- Private reflection journal
- Saved reflections
- Reflection deletion
- Voice Reflection Mode for a short guided moment: breathe, name the pressure, name what is true, and name the next faithful step
- Reflection postcard export for sharing a principle or insight without exposing private journal context unless the user chooses
- First-reflection milestone moment that gently acknowledges formation without gamification
- Reflection drafts created from AI answers
- Today’s wisdom can be turned into a reflection prompt

**Gratitude Lens (In Development):**

The following Gratitude Lens features are planned for upcoming release and currently under development:

- Visual gratitude practice using a user-selected or captured photo plus one grateful note
- Frames each saved moment as private visual formation: provision, beauty, enoughness, answered prayer, or ordinary mercy
- Gratitude interface, timeline, weekly recap, and postcard actions use the user's selected app language
- Gratitude photos stay local on the user’s device by default and are not synced to the account
- Evening gratitude notifications delivered around 7 PM local time
- Prompt from today’s wisdom to suggest one gratitude photo or observation
- Photo-to-reflection flow that turns a saved gratitude moment into a journal prompt
- Optional place/context field for gratitude moments without requesting GPS location
- Private gratitude timeline for visual tracking of provision, beauty, and small mercies
- Gratitude Gallery summary that highlights recurring themes across the user’s saved gratitude moments
- Weekly gratitude recap highlights formation patterns over time without streaks, scores, or social-media pressure
- Streak-free weekly gratitude recap focused on remembrance rather than pressure
- Generated gratitude postcard that includes the selected image, note, date/time, and optional place
- **Postcard Styling (Planned):** Calm filters (Warm, Soft, Mono, Forest, Golden Hour, Calm Contrast), overlays, stickers, and emoji accents
- Gratitude postcard includes Aletheia branding/signature and a subtle invitation to begin a gratitude rhythm
- Gratitude postcards export/share only when the user explicitly chooses
- Exported gratitude postcards are marked back in the local Gratitude Timeline
- Gratitude rhythm guidance and push delivery use around 7 PM local time as a calm day-closing practice


## Bible Translations

**Supported Translations (13 public-domain versions):**
- English: WEB (World English Bible), KJV (King James Version), ASV (American Standard Version)
- Spanish: RV1909 (Reina-Valera 1909), RV1960 (Reina-Valera 1960)
- French: LSG1910 (Louis Segond 1910), MARTIN (Martin 1707)
- Portuguese: AA (Almeida Atualizada), ARC (Almeida Revista Corrigida)
- German: LUTH1912 (Luther 1912), SCHLACH (Schlachter)
- Yoruba: YOR1900
- Igbo: IGB1913
- Hausa: HAU1932

**Translation Features:**
- Scripture quick reads available in multiple translations
- Users can select preferred Bible translation during onboarding or anytime from Account > Personalization
- Cross-language translation options: users can keep app UI in one language and read scripture in another
- Safe fallback to English when public-domain localized text is unavailable

## Biblical Wisdom Knowledge Engine

- Curated wisdom library focused on stewardship, debt, contentment, counsel, cost counting, generosity, diligence, anxiety, and provision
- Structured entries with theme, scripture, principle, context, application, keywords, emotions, and reflection questions
- Searchable wisdom library
- Mode-aware wisdom retrieval
- Scripture chips in answers
- Scripture quick-read modal
- Public-domain scripture text or concise summaries where appropriate
- Selected-language scripture quick reads when a safe public-domain text is available
- Context shown for scripture references
- “Why this matters here” explanation
- Related wisdom principle shown in the scripture modal
- Integrity layer that avoids invented scripture references
- Gentle Scripture Memory: users can carry one scripture/principle for the week, revisit it, hear it read aloud, or export it as a card

## Wisdom Postcards

- Users can create beautiful shareable cards from daily wisdom, carry phrases, scripture memory, reflections, and decision summaries
- Cards include Aletheia branding and a privacy-first posture: “Share the principle, not the private story”
- Private questions, full answers, journal entries, and decision details are not shared by default
- Export uses an in-browser canvas so the user explicitly controls saving or sharing

## Enough And Values Tools

- Manual Context Vault includes “definition of enough” and future-state targets for savings buffer, work hours, rest, generosity, support, stress, and urgency
- Enough profile summary helps Aletheia challenge endless “more” with the user’s own stated values
- Counsel signals can distinguish lack of courage from missing numbers, thin buffers, unclear cost, or insufficient counsel

## Counsel Circle

**Core Features (Fully Implemented):**
- Private list of trusted people the user may consult
- Supports trusted voices such as spouse, mentor, pastor, advisor, or friend
- Encourages counsel for high-stakes choices
- Empty state that invites users to add one trusted person before pressure arrives
- Token-based invite system with email delivery
- Can share decision summaries with counsel contacts
- Permissions for counsel contacts: can_view_summaries, can_comment_on_decisions, can_receive_checkins

**Planned Features:**
- Counsel check-in workflow (permissions infrastructure in place, workflow pending implementation)

## Rule Of Life

- Users can create personal principles for money, work, generosity, and discernment
- Helps users form stable convictions before emotional pressure arrives
- Mode-specific rule display
- Examples include avoiding debt under pressure, seeking counsel before career moves, giving from conviction rather than guilt, and defining enough

## Account

**Account Organization:**
- Dedicated Account tab with premium grouped interface
- Sections: Profile, Personalization, Share Aletheia, Support the Mission, Daily Wisdom Notifications, Manual Context Vault, and System
- One Profile card with avatar/photo and personalized greeting in the default state, with sign-in, sync, and notification details available on expand
- Collapsed Profile card shows avatar/photo, email, and icon-and-number continuity stats for reflections, decisions, and trusted voices without truncating translated labels
- Account navigation can show the user’s selected avatar/profile photo while guests keep the standard account icon
- Personalization group with command-center rows for language, Bible translation, visual theme swatches, curated voice preference, avatar, and focus intentions
- Visible Voice Input control in Account for showing or hiding the microphone beside Ask
- Voice selector separates Use and Preview actions, shows selected-state feedback, and reports localized preview status
- Each personalization row shows the current value first and expands only when the user wants to change it
- Guided onboarding journey for mode, tone, faith familiarity, language, Bible translation, region, focus intentions, and privacy/context posture
- Onboarding setup navigation is tappable, responsive, and language-safe so long translated step labels do not wrap awkwardly
- First launch uses the device/browser language when Aletheia supports it, then falls back to English until the user chooses another language
- Daily Wisdom Notifications card for push status, delivery rhythm, local delivery time, and timezone preference
- Manual Context Vault card for region/context, privacy posture, user-provided current/future state signals, and per-area privacy toggles
- Dedicated Share Aletheia card with native share, copy link, WhatsApp, Facebook, X / Twitter, LinkedIn, email, and SMS channels
- Dedicated Support the Mission card with optional external donation/support links, transparent impact areas, and a clear non-pressure trust note
- System group for sync status, Trust Center, data boundaries, export data, delete account, and report issue
- Avatar/profile image update support
- Avatar studio with curated presets and validated custom avatar URL support
- Guest mode
- Email sign-up
- Email sign-in
- Google sign-in through Auth.js
- Sign out
- Clear signed-in state
- Sync status
- Last synced status
- Notification status
- Account history summary
- Clear local personalization control
- Trust Center panel inside Account
- Data boundaries panel describing what syncs and what stays local

## Persistence And Sync

- Guest mode works locally
- Signed-in users can sync data to the database
- Preferences can persist across sessions
- Decisions can persist across sessions
- Journal entries can persist across sessions
- Counsel contacts can persist across sessions
- Rules of life can persist across sessions
- Notification subscriptions can persist for signed-in users

## Preferences

**Personalization Options:**
- Preferred language (11 supported)
- Theme preference (system, classic, dark, black, warm, ocean, forest, sunset)
- Life context / region (10 regions with localized examples)
- Preferred Bible translation (13 public-domain translations)
- Voice preference (device default or selected installed voice with preview playback)
- Notification timing preference (local hour, timezone mode, timezone, delivery strategy)
- Focus intentions (up to 3) to tune prompt suggestions and Companion/Decision guidance emphasis

**Preference Storage:**
- Local fallback when signed out
- Database sync when signed in
- Settings persist across sessions and devices

## Onboarding Customization

- Starting wisdom mode selection (Money, Work, Purpose, Generosity, Life)
- Clickable setup step navigation for mode, tone, language/Bible/region, focus, and privacy
- First concern prompt to personalize first-session guidance
- Tone selection for early guidance (gentle, direct, strategic, reflective)
- Faith familiarity selection (new to biblical wisdom, familiar, deeply familiar)
- Language selection during onboarding (11 languages supported)
- Device/browser language is used as the first onboarding language when supported
- Bible translation selection during onboarding (13 public-domain translations supported)
- Region selection during onboarding (10 regions with localized examples)
- Focus intentions selection (up to 3) to tune early guidance emphasis
- Onboarding settings can be changed later in Account

## Interface And Guidance Customization

- Wisdom mode can be changed anytime to switch the active discernment lens
- Quick language selector access from the main experience
- Quick Bible translation selector access from the main experience
- Focus intentions selection (up to 3) to shape prompt suggestions and guidance emphasis
- Notification guidance state indicators (account-level vs device-level enablement)
- Personalization model disclosure that explains canonical settings behavior
- Local personalization reset for this device (theme, voice, notification timing, manual context drafts, carry-today state, and focus intentions)

## Manual Context Vault Customization

- Dedicated Manual Context Vault in Account
- Optional by default, private by default
- User can pause or enable context usage in answers at any time
- Fine-grained toggles for which context areas can shape answers (money, work, health, relationships, values)
- Current-state and future-state tabs so Aletheia can understand both the user’s present reality and desired direction
- One-click “Add one helpful detail” flow for users who want better personalization without filling out the full vault
- Open-text context fields for health, finance, work, obligations, goals, and boundaries
- Desired future-state fields for money posture, work rhythm, health rhythm, relationships/community, values posture, future goals, and future boundaries
- Numeric context fields for practical realities (income, expenses, debt, savings buffer, work hours, stress, support, urgency, and related signals)
- Future target fields for savings buffer, work hours, sleep, exercise, loved-ones time, community time, stress, urgency, and support
- Values and discernment fields (risk tolerance, waiting preference, counsel cadence, definition of enough, definition of success, must-not-sacrifice boundaries)
- Strategic counsel signals derived from the vault, including financial pressure, burnout, isolation, urgency, values, and future-state direction
- Region signal from the user’s life-context preference so examples and assumptions fit the user’s setting without pretending to know local law, tax, or regulated advice
- Works for guests on local device storage
- Syncs to signed-in account when available
- Graceful fallback if sync fails so context is not lost
- Manual context summary and strategic counsel signals are injected into counsel only when enabled by user controls
- The AI is instructed to use context quietly and relevantly, without exposing private details unnecessarily or treating context as deterministic

## Multilingual Support

**Supported Languages (11 total):**
- English (`en`)
- Spanish (`es`)
- French (`fr`)
- Portuguese (`pt`)
- German (`de`)
- Yoruba (`yo`)
- Igbo (`ig`)
- Hausa (`ha`)
- Filipino/Tagalog (`tl`)
- Arabic (`ar`)
- Hindi (`hi`)

**Localization Features:**
- Native-language labels for language selection
- Localized daily wisdom labels and practices
- Localized scripture quick reads for supported public-domain passages
- Localized onboarding copy
- Localized placeholders and voice hints
- Localized Account personalization, Manual Context Vault, avatar, sharing, and profile-status controls
- Localization audit coverage for newly added UI surfaces so expanded settings do not fall back to English unintentionally
- Region-aware examples for global, United States, United Kingdom, Europe, Nigeria, Brazil, Latin America, Philippines, Middle East/North Africa, and India
- Safe fallback to English/reference-only wording when public-domain localized scripture text is unavailable
- Cross-language Bible translation options so users can keep app UI in one language and read scripture in another
- Bidirectional text (LTR & RTL) support for Arabic and other RTL languages

## Privacy And Data Controls

- Trust Center explains boundaries, scripture sourcing posture, and data-saving behavior in plain language
- Private by default sharing posture: app link sharing does not expose private chats, journals, decisions, or reflections
- Private counsel invites only expose explicitly shared summaries
- Privacy-conscious analytics that avoid storing private answer text, private journal content, decision pressure details, counsel names, or rule text
- Manual context is clearly labeled optional and private
- Signed-in sync is explicit; local fallback remains available when signed out or when sync fails
- Clear local personalization control available from Account
- Export and account delete controls are intentionally gated as production-hardening items

## Notifications

- Opt-in daily wisdom notifications
- Web Push support
- Daily push copy is generated from the selected wisdom principle, practice, scripture, user language, and local date so notifications remain meaningful, varied, and non-duplicative
- Premium daily notification copy rotates across localized title/body patterns so users do not repeatedly receive the same generic “Today...” line
- Daily notifications include a scripture anchor, tiny practice, or clear reason to open the Today Companion card while avoiding private user content
- Daily notification tags include the local date and wisdom entry, helping each day feel distinct instead of replacing every prior daily message with the same tag
- Decision waiting-mode and revisit notifications use distinct, premium reminder copy and deep-link back to the relevant decision card
- Notification status inside Account
- Enable and disable notification controls
- Server endpoint for scheduled daily notification sending
- VAPID key support
- Signed-in user requirement for notification subscriptions
- Notification click analytics include non-private notification kind and wisdom theme metadata
- PWA-friendly notification flow

## Formation Milestones

Calm milestones are included as signs of formation, not childish gamification. Milestone tracking and event detection are fully implemented.

**Tracked Milestones:**
- First reflection saved
- First decision tracked
- Sought counsel
- Waiting mode used
- Rule of life created
- Notifications enabled
- 7 days of wisdom practice

**Current Implementation Status:** Milestone events are tracked in the analytics system and database. Quiet acknowledgement UI is planned for upcoming release to gently celebrate formation moments with copy like "You practiced wisdom before speed" rather than points, pressure, or competition.
## Analytics

- First-party analytics owned by the app
- Analytics events stored in the app database
- Privacy-conscious event tracking
- Tracks product usage without storing private chat, journal, decision pressure, counsel names, or rule text
- Supports understanding unique usage, engagement, mode selection, questions asked, decisions created, reflections saved, and notifications enabled
- Tracks answer feedback and app sharing without storing private answer text
- Protected aggregate analytics endpoint

## PWA Experience

- Installable Progressive Web App
- Mobile-first layout
- App manifest
- App icons
- Standalone display mode
- Portrait orientation
- Service worker support
- Fast production build
- Sticky mobile navigation
- Lean mobile bottom navigation that stays close to the device bottom without an oversized translucent backdrop
- Sticky companion input on mobile
- Responsive layout for desktop and mobile

## Safety And Trust

- Does not promise financial outcomes
- Does not claim divine financial predictions
- Does not replace professional financial, legal, tax, investment, or pastoral advice
- Encourages qualified counsel for high-stakes decisions
- Avoids prosperity-gospel framing
- Avoids emotional manipulation
- Uses curated biblical wisdom rather than hallucinated references
- Keeps the experience calm, reflective, and non-judgmental
- Visible trust layer explaining source integrity, advice boundaries, and plain-English privacy/model behavior
- Tap-to-read scripture context and “why this matters here”
- Signing out hides synced private workspace data from the device immediately
- Guest mode includes a separate clear-guest-workspace action for local guest conversations, decisions, reflections, counsel contacts, and rules
- Local settings reset is separate from private workspace reset, so users understand what is being cleared

## Retention Rhythm

- 3-minute morning reflection
- Evening examen for money and work moments
- Weekly pattern review
- Decision waiting check-ins
- Continue-where-you-left-off dashboard actions
- Streak-free formation language

## Technical Features

**Framework & Language:**
- Next.js 16 (React 19) app with App Router
- TypeScript with strict mode
- Tailwind CSS 4 for styling
- Framer Motion for animations

**Authentication & Authorization:**
- Auth.js (NextAuth.js) for authentication
- Google OAuth support (with fallback to email/guest modes)
- JWT session strategy
- Password hashing and secure session management

**Backend & Database:**
- PostgreSQL persistence (Neon-compatible)
- 19 database tables with 30+ indexes
- Server-side API routes (27 endpoints)
- First-party analytics with privacy-conscious event tracking (50+ events)

**AI & Content:**
- Server-side OpenAI integration (GPT-4o-mini for chat, TTS for voice)
- Retrieval-augmented wisdom flow with semantic search
- 30+ curated wisdom entries with multi-language support
- Life support detection and referral system

**Mobile & PWA:**
- Capacitor for iOS/Android native apps
- Progressive Web App (PWA) with offline capability
- Web Push notifications with VAPID support
- Service worker support
- Mobile-first responsive layout

**Notifications:**
- Web Push API integration
- Daily notification delivery with scheduled cron
- Decision reminder notifications (waiting mode, revisits, outcomes)
- Gratitude prompt notifications (planned)
- VAPID key support for secure push delivery

**Email & Communication:**
- Nodemailer/Resend support for transactional emails
- Counsel invite email system
- Issue reporting endpoints

**Deployment & Environment:**
- Environment-based configuration
- Production-ready deployment paths (Vercel, Railway, self-hosted)
- Fast production builds with optimized output
- Health check and monitoring endpoints

### Avatar Host Configuration

- `AVATAR_IMAGE_HOSTS` supports comma-separated custom avatar/CDN hosts for remote image optimization.
- Custom hosts are additive: they extend the built-in avatar host allowlist and do not replace it.
- Built-in fallback host coverage includes common providers (GitHub, Google profile images, Gravatar, Discord, X/Twitter, Pravatar).
