# Language Expansion Rollout

## Goal

Ship the next three languages in a market-fit-first order that matches Aletheia's biblical wisdom positioning and regional context model:

1. Filipino / Tagalog
2. Arabic
3. Hindi

This order favors the highest-fit, lowest-risk launch first, then moves to the largest strategic upside, then broadens Asia reach with a lighter implementation lift.

## Ranking Rationale

### 1. Filipino / Tagalog

- Best first expansion for Asia because it is a strong faith-market fit and stays left-to-right.
- Lowest platform risk of the three because it does not require RTL layout work.
- Good proof point for whether the app resonates in a Christian-majority Asian market.

Effort vs impact:

- Effort: Low
- Impact: High
- Risk: Low

### 2. Arabic

- Highest upside for MENA and Arabic-speaking diaspora.
- Strong brand signal because it unlocks a completely new script direction and region strategy.
- Requires RTL UI validation and layout mirroring work, so it should follow the easier first launch.

Effort vs impact:

- Effort: High
- Impact: Very high
- Risk: Medium to high

### 3. Hindi

- Large reach with a lower implementation burden than Arabic.
- Broadens Asia coverage after we have already proven the rollout path with Tagalog.
- Works well with the existing region-context model and keeps the UI LTR.

Effort vs impact:

- Effort: Medium
- Impact: High
- Risk: Medium

## Region Strategy

The app already supports these region presets:

- `global`
- `us`
- `uk`
- `eu`
- `ng`
- `br`
- `latam`

Add new presets only when the language launch justifies region-specific guidance:

- Tagalog -> `ph`
- Arabic -> `mena`
- Hindi -> `in`

Keep the region model tied to advice quality, not just translation coverage. If examples, prompts, or scriptural framing do not materially change, the region preset can stay coarse.

## Exact File Changes By Language

### Tagalog / Filipino

Primary files:

- [src/locales/tl.json](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/locales/tl.json)
- [src/lib/localization.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/localization.ts)
- [src/lib/translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/translations.ts)
- [src/components/home-client-shell.tsx](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/components/home-client-shell.tsx)
- [scripts/analyze-translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/analyze-translations.ts)
- [scripts/ui-i18n-regression.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/ui-i18n-regression.mjs)
- [test-runtime.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-runtime.mjs)
- [test-comprehensive.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-comprehensive.mjs)

PR-sized batches:

1. Locale plumbing PR
   - Add `tl` to the language registry and default language metadata.
   - Wire `tl` into translation loading, browser fallback, splash copy, and test matrices.
   - Add the `ph` region preset and default Bible mapping.
2. User-facing copy PR
   - Translate the highest-visibility strings in `tl.json`.
   - Fill in the shell, notifications, status, and settings copy that users see first.
   - Keep English fallback active for anything not yet translated.
3. QA and polish PR
   - Run coverage and smoke checks.
   - Fix overflow, line wrap, and tone issues discovered during testing.
   - Tighten browser-language fallback and any Tagalog-specific copy adjustments.

What to do:

- Translate the highest-visibility UI strings first:
  - navigation
  - ask/question flows
  - notifications
  - status messages
  - settings and account labels
- Keep English fallback in place for any lower-priority strings.
- Use `ph` for region context and local examples.
- Review long-text overflow on small screens, but no RTL work is required.

Launch gate:

- Full shell renders in Tagalog without truncation.
- Browser-language fallback maps `fil` and `tl` correctly.
- Translation coverage is high enough for the visible surface before the long tail is finished.

### Arabic

Primary files:

- [src/locales/ar.json](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/locales/ar.json)
- [src/lib/localization.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/localization.ts)
- [src/lib/translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/translations.ts)
- [src/components/aletheia-app.tsx](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/components/aletheia-app.tsx)
- [src/app/layout.tsx](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/app/layout.tsx)
- [scripts/analyze-translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/analyze-translations.ts)
- [scripts/ui-i18n-regression.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/ui-i18n-regression.mjs)
- [test-runtime.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-runtime.mjs)
- [test-comprehensive.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-comprehensive.mjs)

PR-sized batches:

1. RTL foundation PR
   - Add `ar` to the language registry and translation loader.
   - Ensure Arabic activates `dir="rtl"` end to end.
   - Add the `mena` region preset and Arabic browser/profile handling.
2. Arabic shell copy PR
   - Translate the core Arabic UI surface in `ar.json`.
   - Cover nav, main actions, status text, and the highest-traffic app-shell labels.
   - Keep the remaining copy on English fallback until later.
3. RTL QA and layout hardening PR
   - Test navigation, forms, tabs, toasts, drawers, and modals in RTL.
   - Fix mirrored spacing, icon placement, and overflow issues.
   - Add or adjust regression coverage for Arabic-specific layout behavior.

What to do:

- Translate the highest-traffic UI first, then extend into the rest of the app shell.
- Verify `dir="rtl"` is applied when Arabic is active.
- Confirm layout mirroring for:
  - navigation
  - forms and inputs
  - tabs and segmented controls
  - toast/status placement
  - drawers, overlays, and modal close buttons
- Audit typography and spacing for Arabic script readability.
- Use `mena` for region context and examples.

Launch gate:

- Arabic renders correctly in desktop and mobile widths.
- No clipped icons, swapped margins, or off-screen controls in RTL.
- Core flows work in both light and dark themes.

### Hindi

Primary files:

- [src/locales/hi.json](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/locales/hi.json)
- [src/lib/localization.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/localization.ts)
- [src/lib/translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/src/lib/translations.ts)
- [scripts/analyze-translations.ts](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/analyze-translations.ts)
- [scripts/ui-i18n-regression.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/scripts/ui-i18n-regression.mjs)
- [test-runtime.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-runtime.mjs)
- [test-comprehensive.mjs](/Users/tobi/PycharmProjects/pythonProject/aletheia/test-comprehensive.mjs)

PR-sized batches:

1. Locale and region PR
   - Add `hi` to the language registry, loader, and test matrices.
   - Add the `in` region preset and default Hindi profile mapping.
   - Wire Hindi into browser fallback and translation coverage tooling.
2. Core Hindi copy PR
   - Translate the main app-shell, notification, and status copy in `hi.json`.
   - Add the Hindi splash text and any region-aware examples needed for launch.
   - Keep the rest of the app on English fallback until the locale matures.
3. Polish and QA PR
   - Run smoke tests and coverage checks.
   - Fix long-text wrapping, phrasing, and any UI labels that feel awkward in Hindi.
   - Confirm the region context improves examples without introducing noise.

What to do:

- Translate the same high-visibility shell copy used for Tagalog first.
- Use `in` for region context and local examples.
- Add examples that reflect family obligations, work pressure, savings discipline, and regional diversity.
- Keep the rollout LTR and use English fallback for any incomplete surface area.

Launch gate:

- Hindi language selection is stable across refresh, browser fallback, and stored preferences.
- The app shell reads naturally in Hindi on mobile and desktop.
- The new region context improves example quality instead of sounding generic.

## Common Engineering Tasks For Every Language

- Add the locale JSON file.
- Wire the locale into the translation loader.
- Add the language to the registry and normalization logic.
- Add a browser-language alias if needed.
- Add a region preset only when examples and advice materially change.
- Update the splash copy and any language-aware UI labels.
- Add the locale to translation analysis and regression tooling.
- Add runtime and smoke-test coverage.

## Rollout Checklist

### Pre-launch

- Add or update the locale file.
- Confirm the locale is included in the language registry.
- Confirm the language falls back cleanly to English for missing keys.
- Verify the region preset exists and is used in prompts/examples.
- Run translation coverage checks.
- Run TypeScript checks.

### UI QA

- Switch the language from the app selector.
- Reload the app and confirm the preference persists.
- Check long text on:
  - nav labels
  - status messages
  - buttons
  - empty states
  - notifications
- Verify browser-language fallback still resolves to the intended locale.

### Arabic-only QA

- Verify `dir="rtl"` on the document root.
- Check icon alignment, margins, and container padding.
- Test forms, tabs, toasts, modals, and sheets.
- Confirm no layout regressions in both theme variants and mobile widths.

### Regional Copy QA

- Confirm the AI prompt uses the right region context.
- Verify examples mention the intended market signals:
  - Philippines for Tagalog
  - MENA for Arabic
  - India for Hindi
- Make sure scripture references remain accurate when localized text is incomplete.

### Release Gate

- TypeScript passes.
- Locale smoke tests pass.
- Translation coverage report is updated.
- `npm run translations:strict` passes with no missing keys for `tl`, `ar`, and `hi`.
- The exact missing-key inventories in [`translation-reports/strict-missing-keys.md`](/Users/tobi/PycharmProjects/pythonProject/aletheia/translation-reports/strict-missing-keys.md) are empty.
- The region-aware copy reads naturally.
- No RTL regressions for Arabic.

## Final No-Fallback Gate

We can only drop English fallback for a locale when all of the following are true:

- The locale has zero missing keys against `en.json`.
- The strict loader check passes for that locale.
- The generated missing-key report for that locale is empty.
- Native review signs off on translation quality and tone.
- The UI passes smoke tests at mobile and desktop sizes.
- Arabic passes RTL-specific QA for layout, forms, tabs, toasts, and overlays.
- Region-aware examples read naturally for the target audience.

Recommended order for the no-fallback rollout:

1. Tagalog first, because it is the lowest-risk language to fully complete.
2. Hindi second, because it expands Asia coverage without RTL overhead.
3. Arabic last, because strict completeness should only follow RTL hardening.

## Recommended Sequence

1. Finish Tagalog first.
2. Ship Arabic after RTL QA passes.
3. Ship Hindi once Tagalog and Arabic are stable.

If we want the lowest-risk launch, Tagalog is the first release candidate. If we want the largest regional statement, Arabic is the most important follow-on.
