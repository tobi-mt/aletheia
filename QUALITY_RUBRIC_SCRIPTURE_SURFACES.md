# Scripture Quality Rubric (Five Surfaces)

This rubric defines quality gates for:
- Wisdom Principle
- Scripture of the Day
- Quick Read
- Study Mode
- Reference Scriptures

## Scoring Model

Each surface is scored out of 5 dimensions (0-2 each, max 10):
- Depth (D)
- Citation Grounding (C)
- Language Naturalness (L)
- Actionability (A)
- Fallback Integrity (F)

Interpretation:
- 9-10: Excellent
- 7-8: Good
- 5-6: Needs improvement
- 0-4: Unacceptable

## 1) Wisdom Principle

Checks:
- D: Principle is specific and non-generic for the scripture/theme.
- C: At least one explicit scripture reference is present in card context.
- L: Localized wording is idiomatic for UI language.
- A: Includes one practical action or reflection prompt.
- F: If passage unavailable, translation label remains explicit and no fabricated verse text appears.

## 2) Scripture of the Day

Checks:
- D: Includes meaningful text (not placeholder) with context framing.
- C: Canonical scripture reference appears exactly.
- L: Reference book names localize correctly where available.
- A: Connected to one clear practice/reflection.
- F: Fallback translation visibility is explicit when used.

## 3) Quick Read

Checks:
- D: Verse payload includes multiple verse units when range is requested.
- C: Verse numbering aligns with requested chapter/verse range.
- L: Translation label matches selected translation.
- A: Supports progression to deeper reading/study.
- F: Unavailable responses are truthful and non-deceptive.

## 4) Study Mode

Checks:
- D: Summary + 2-3 themes + reflection questions + practice actions are present.
- C: Each theme/action includes verse citations grounded in chapter content.
- L: Study narrative templates honor selected language.
- A: Actions are concrete and time-bound enough to execute.
- F: `fallbackTranslation` is surfaced whenever source translation falls back.

## 5) Reference Scriptures

Checks:
- D: Curated references set is complete and coherent with supported wisdom themes.
- C: References are canonicalized and de-duplicated.
- L: Localized scripture references preserve canonical mapping.
- A: References are linkable to readable payloads.
- F: Missing full-book data records fallback telemetry.

## Regression Thresholds

Build/regression should fail when any of these occur:
- Study mode depth failure on any sampled language/translation.
- Study mode citation grounding below 0.75 cited themes ratio in sampled checks.
- Fallback rate above 0.35 in sampled quick-read checks.

## Automation Mapping

Automated script `scripts/scripture-quality-regression.mjs` enforces:
- Depth checks for Study API payload structure.
- Citation grounding checks for Study API themes/actions.
- Fallback rate checks through rollout telemetry and sampled reads.

Run:
- `npm run quality:scripture`
