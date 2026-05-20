# Aletheia Features

Aletheia is an AI-powered biblical wisdom companion for money, work, purpose, generosity, stewardship, and major life decisions.

It is designed to feel calm, premium, emotionally intelligent, spiritually grounded, and practically useful.

## Wisdom Companion

- Conversational AI guidance for money, work, purpose, generosity, and stewardship questions
- Human-feeling responses with emotional understanding, biblical wisdom, practical perspective, reflection questions, and gentle reminders
- Mode-aware answers that adapt to the selected wisdom lens
- Scripture-grounded answers using curated wisdom sources
- Guardrails against prosperity-gospel language, financial promises, and invented scripture references
- Collapsed conversation history so the interface does not feel like a noisy chat transcript
- Current counsel card that keeps the latest answer prominent
- Suggested prompts for common money, work, purpose, and generosity questions
- Voice input for asking questions when supported by the browser
- Voice output for reading the latest Aletheia response aloud
- Answer feedback buttons: helpful, too vague, too preachy, and not relevant
- Signed-in memory can use active decisions, recent reflections, and rules of life for continuity
- Stronger emotional discernment for urgency, fear, shame, and pressure
- Stronger refusal behavior for predictions, guaranteed outcomes, harmful requests, fraud, tax evasion, and manipulative giving

## Wisdom Modes

Aletheia includes distinct wisdom modes that change how guidance is interpreted and applied.

- Money mode for budgeting, debt, saving, investing, contentment, comparison, and stewardship
- Work mode for career decisions, leadership, business, burnout, calling, and sustainable ambition
- Purpose mode for identity, direction, peace, motives, timing, and discernment
- Generosity mode for giving, family support, charity, boundaries, guilt, and sustainability
- Each mode includes its own diagnostic tracks, blind spots, maturity signals, practices, prompts, and response strategy
- The active mode is shown inside the UI so users understand how the lens shapes the answer

## Today Dashboard

- A daily home dashboard centered on the question: “What should I do next?”
- Quick actions to start or continue a decision
- Quick action to reflect on today’s wisdom
- Quick action to ask Aletheia
- Quick action to review a recurring pattern
- Sync and notification prompts when the user is not fully set up
- Today’s wisdom principle
- Today’s scripture anchor
- Tiny daily practice
- Visible mode lens for the day

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
- Outcome and learning capture after the decision is made
- Decision history
- Ability to continue a decision from a chat answer
- Ability to turn a chat answer into a tracked decision

## Post-Answer Actions

After a meaningful answer, Aletheia can help the user take the next wise step.

- Track this decision
- Save as reflection
- Create counsel summary
- Wait 3 days
- Continue from an older conversation
- Draft a reflection from the latest answer
- Draft a mentor/counsel summary from the latest answer
- Invite someone to Aletheia without sharing private question or answer content

## Sharing And Referrals

- Native Web Share support where available
- Copy-link fallback
- Share link for WhatsApp
- Share link for Facebook
- Share link for X / Twitter
- Share link for LinkedIn
- Email invite link
- SMS invite link
- Account-level invite card
- Gentle post-answer sharing prompt
- Formation milestone sharing prompt
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
- Reflection drafts created from AI answers
- Today’s wisdom can be turned into a reflection prompt

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

## Counsel Circle

- Private list of trusted people the user may consult
- Supports trusted voices such as spouse, mentor, pastor, advisor, or friend
- Encourages counsel for high-stakes choices
- Empty state that invites users to add one trusted person before pressure arrives

## Rule Of Life

- Users can create personal principles for money, work, generosity, and discernment
- Helps users form stable convictions before emotional pressure arrives
- Mode-specific rule display
- Examples include avoiding debt under pressure, seeking counsel before career moves, giving from conviction rather than guilt, and defining enough

## Account

- Dedicated Account tab
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
- Preferences management
- Formation milestones

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

- Preferred language
- Preferred onboarding tone
- Faith familiarity context during onboarding
- “What are you carrying right now?” starting prompt
- Life context / region
- Preferred Bible translation
- Voice controls
- Region-aware examples
- Public-domain translation preference labels
- Local fallback when signed out
- Database sync when signed in

## Multilingual Support

- English
- Spanish
- French
- Portuguese
- German
- Yoruba
- Igbo
- Hausa
- Localized daily wisdom labels and practices
- Localized scripture quick reads for supported public-domain passages
- Localized onboarding copy
- Localized placeholders and voice hints
- Region-aware examples for global, United States, United Kingdom, Europe, Nigeria, Brazil, and Latin America
- Safe fallback to English/reference-only wording when public-domain localized scripture text is unavailable

## Notifications

- Opt-in daily wisdom notifications
- Web Push support
- Notification status inside Account
- Enable and disable notification controls
- Server endpoint for scheduled daily notification sending
- VAPID key support
- Signed-in user requirement for notification subscriptions
- PWA-friendly notification flow

## Formation Milestones

Calm milestones are included as signs of formation, not childish gamification.

- First reflection saved
- First decision tracked
- Sought counsel
- Waiting mode used
- Rule of life created
- Notifications enabled
- 7 days of wisdom practice

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

## Retention Rhythm

- 3-minute morning reflection
- Evening examen for money and work moments
- Weekly pattern review
- Decision waiting check-ins
- Continue-where-you-left-off dashboard actions
- Streak-free formation language

## Technical Features

- Next.js app
- TypeScript
- Tailwind CSS
- Framer Motion animations
- Auth.js authentication
- Google OAuth support
- PostgreSQL persistence
- Neon-compatible database setup
- Server-side OpenAI endpoint
- Retrieval-augmented wisdom flow
- Push notification endpoints
- First-party analytics endpoints
- PWA manifest route
- Production-ready Railway deployment path
