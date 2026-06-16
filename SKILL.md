# Skill: Aletheia Domain Knowledge & i18n Consistency

## When to Use
- Implementing decision features, notifications, or wisdom library updates
- Adding or modifying translations across 11 language files
- Checking feature implementation status or architecture patterns
- Working with Capacitor mobile platform or API routes

## Domain Context: Aletheia Core Features

### Decision Companion
- Users track decisions with context, options, and outcomes
- Core types: Decision, DecisionOption, DecisionOutcome (see [src/lib/db.ts](src/lib/db.ts))
- UI in [src/components/aletheia-app.tsx](src/components/aletheia-app.tsx) wisdom modes: discover, decide, discern, grow, harvest
- API routes: `/api/decisions/`, `/api/decision-outcomes/` (in [src/app/api/](src/app/api/))

### Notifications
- Daily notifications + decision reminders implemented ✅
- Gratitude reminder tracking exists but gratitude feature not yet implemented ❌
- Counsel check-in workflow not yet implemented ❌

### Localization (11 languages)
- Files: en, es, fr, de, pt, ar, ha, ig, yo, hi, tl (in [src/locales/](src/locales/))
- Use `ts(key, fallback)` function in components
- Validation: `python3 scripts/validate-translation-keys.py`

### Implementation Status
- 85-90% complete (25/28 features fully implemented)
- See [IMPLEMENTATION_INVENTORY.md](IMPLEMENTATION_INVENTORY.md) for full breakdown

## i18n Consistency Steps
1. Treat [src/locales/en.json](src/locales/en.json) as key reference.
2. Mirror new keys into all locale JSON files in [src/locales](src/locales).
3. Preserve placeholders exactly (example: `{day}`, `{total}`, `{count}`).
4. Run `python3 scripts/validate-translation-keys.py`.
5. Report missing/extra keys and files updated.

## Common Pitfalls
- Changing key names in non-English files only (breaks consistency).
- Introducing key structure drift between locales.
- Forgetting to validate before merging.
- Missing translations for new UI text (causes English fallback for all users).

## Key Files Reference
- Main app: [src/components/aletheia-app.tsx](src/components/aletheia-app.tsx) (~2,200 lines)
- APIs: [src/app/api/](src/app/api/) (37 route files)
- Database: [src/lib/db.ts](src/lib/db.ts) (PostgreSQL schema, 19 tables)
- Translations: [src/locales/](src/locales/) (11 JSON files)
- Build scripts: [scripts/](scripts/) (validation, analysis, generation)
- Tests: test-*.mjs files in root
