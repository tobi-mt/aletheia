# Formation Focus Implementation Spec

## Objective

Keep the app focused on one meaningful formation journey at a time. The UI should help users continue what they already started, not re-sell it back to them.

This applies to:
- Cards
- Tabs and section rails
- Badges and status labels
- Push notification triggers
- Copy and translation behavior

## State Model

Every practice or challenge must resolve to one of these states:

1. `Not started`
2. `Started`
3. `Active`
4. `Inactive`
5. `Completed`
6. `Abandoned`

### State Resolution Rules

- `Not started`: no meaningful progress yet.
- `Started`: user has begun the practice, but it is not yet their current focus.
- `Active`: the user is currently working on this practice and it should dominate the relevant surface.
- `Inactive`: the practice has been started before, but the user has been away long enough that a gentle re-entry is appropriate.
- `Completed`: the practice is finished or archived as complete.
- `Abandoned`: the user has explicitly stopped it or it should no longer be surfaced in active recommendation areas.

### Suggested internal state mapping

- Use a shared helper to derive state from:
  - completed days
  - total days
  - last completion timestamp
  - any explicit active-practice record
- Prefer a single helper used by cards, tabs, and notifications so behavior stays consistent.

## Component Behavior

### 1. Cards

#### Not started

- Render as a recommendation card.
- Primary action:
  - `Start practice`
  - `Start challenge`
- Secondary actions:
  - `Learn more`
  - `Save for later`
- Copy should imply discovery, not continuation.

#### Started

- Do not present as a new suggestion.
- Switch the card to continuation mode.
- Primary action:
  - `Continue practice`
  - `Resume`
  - `Pick up where you left off`
- Show progress context if available:
  - last activity
  - streak
  - completed days
- Do not use “suggest” language in the card body.

#### Active

- This becomes the current focus card.
- Show progress state, not discovery state.
- Primary action: `Continue`
- Secondary actions:
  - `Pause`
  - `Mark complete`
  - `View details`
- Do not show competing challenge cards as primary recommendations in the same area.

#### Inactive

- Treat as a gentle re-entry state.
- Use copy like `Resume your practice`.
- Include a subtle cue such as `You last worked on this...`
- Avoid making it feel abandoned unless the user explicitly stopped it.

#### Completed

- Render as completed, archived, or reflected upon.
- Primary action:
  - `Review`
  - `Reflect`
  - `Start a new one`
- This is the appropriate time to suggest the next relevant practice.

#### Abandoned

- Remove from active recommendation surfaces.
- Keep in history or archive.
- Re-offer only after a meaningful delay or if it becomes clearly relevant again.

### 2. Tabs and Sections

#### Decision / Formation / Practice tabs

- If the user has one active challenge, that challenge should be the dominant item in the relevant tab.
- Do not surface unrelated challenges as competing primary cards while one is active.
- Other challenges may still appear in browse areas, but they must be:
  - visually de-emphasized
  - clearly labeled as `Browse`, `Archive`, or `Explore more`

#### Rail layout rules

- Use one clear current path.
- Allow browsing, but not interruption.
- Prefer a true horizontal rail of one card per event/practice snapshot.
- Avoid stacked duplicate layers for the same information.

#### Section headers

- Do not repeat the section name above a card that already carries the same identity.
- Example:
  - If the section is `Decision memory`, cards inside it should not also repeat a redundant `Decision memory` label unless it adds a different semantic meaning.

### 3. Badges and Labels

#### Allowed badge roles

- State badge:
  - `Continue`
  - `Start`
  - `Completed`
  - `Inactive`
- Context badge:
  - scripture reference
  - date
  - day count
  - active focus marker

#### Disallowed badge patterns

- Do not stack multiple pills that repeat the same information.
- Do not use decorative pills as the main content if they do not add meaning.
- Do not show black or high-contrast pills that reduce readability on dark or mixed themes.

#### Badge density rule

- One badge should convey one job.
- If the same information is already visible in the title or body, remove the badge.
- If a badge is only decorative, delete it.

### 4. Push Notifications

#### For started or active practices

- Send reminders only about the user’s current practice.
- Use continuity language:
  - `Continue your practice`
  - `Pick up where you left off`
  - `You’re due for a gentle return`
- Best timing:
  - after inactivity
  - at the user’s preferred reminder window

#### Allowed notification types

- Continuity reminder
- Streak recovery prompt
- Milestone celebration
- Completion acknowledgement
- Gentle nudge after inactivity

#### Disallowed notification types

- Promoting a different challenge while one is already active
- Recommending unrelated alternatives before the current one is completed or abandoned
- Repeating `start` language for something already started

### 5. Copy Rules

#### Not started

- `Start practice`
- `Begin challenge`
- `Try this next`

#### Started / Inactive

- `Continue practice`
- `Resume`
- `Pick up where you left off`

#### Active

- `Current practice`
- `In progress`
- `Keep going`

#### Completed

- `Completed`
- `Review your journey`
- `Start another`

#### General copy rules

- Avoid wording that implies the app forgot the user’s progress.
- Avoid mixing `new suggestion` and `continue this` language for the same item.
- Copy should always match the state being shown.

### 6. Recommendation Logic

Use this priority order:

1. If a practice is `Active`, show that first.
2. If a practice is `Started` or `Inactive`, show continuation first.
3. Only show new suggestions when there is no active or in-progress practice.
4. Only suggest alternatives when the current practice is `Completed` or `Abandoned`, or when the user explicitly asks to explore.

### 7. Exception Rules

Allow another challenge to appear only when:

- It is directly related to the active one.
- The user explicitly requests options.
- The current challenge is completed or abandoned.

### 8. Translation and Locale Rules

- Do not hardcode English fallback text in UI components.
- If a visible string is user-facing, it should come from translations or a shared copy source.
- If a translation key is missing, prefer a safe fallback from the app’s translation layer rather than ad hoc English embedded in the component.
- Keep the copy keys aligned across cards, tabs, badges, and notifications.

## Implementation Sequence

### Phase 1: State and data modeling

- [x] Add a shared challenge progress helper.
- [x] Normalize progress state resolution for active/inactive/completed behavior.
- [x] Make recommendation data carry keys and progress counts needed for localized UI.

### Phase 2: Card behavior

- [x] Convert recommendation cards to continuation mode when a challenge is already started.
- [x] Remove redundant fit chips and duplicate labels from continuation cards.
- [x] Simplify rail cards to one snapshot per item.
- [x] Hide competing primary challenge cards when one active challenge exists.

### Phase 3: Tab and section behavior

- [x] Prioritize the active challenge in the relevant tab.
- [x] Remove repeated section-layer duplication where the card already communicates the same concept.
- [ ] Audit any remaining browse/archive surfaces for duplicate section headers or extra card shells.

### Phase 4: Notifications

- [x] Update reminder copy to focus on continuity for active/started practices.
- [x] Use localized challenge descriptions instead of ad hoc English notes.
- [x] Review notification scheduling rules for exact inactivity thresholds and preferred reminder windows.
- [x] Confirm the active-practice reminder path already uses the saved delivery hour and the shared 3-day inactivity threshold helper.

### Phase 5: Copy and translation cleanup

- [x] Remove remaining hardcoded English fallbacks from the account/preferences flow, streak modal path, and challenge reminder path.
- [x] Audit the rest of the app shell for any remaining hardcoded English fallbacks.
- [x] Verify all card, tab, and notification copy keys exist in every supported locale.
- [x] Fix locale drift that is unrelated to this feature but still blocks fully clean translation validation.

### Phase 6: Visual QA

- [x] Verify the changed rail copy in the browser.
- [x] Confirm the app no longer shows the old suggestion-style language for started/active practices.
- [ ] Re-check the relevant rail screens on the shortest phone height after any follow-up spacing changes.

## QA Checklist

- One active challenge only surfaces as the primary focus.
- Started practices read as continuation, not discovery.
- Inactive practices feel like a gentle return, not abandonment.
- Completed practices can suggest the next step.
- Abandoned practices stay out of active recommendation areas.
- No duplicate layer repeats the same concept inside a section.
- No unreadable black pills or redundant badges remain.
- Notifications never cross-sell another practice while one is active.
