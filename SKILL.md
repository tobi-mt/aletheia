# Skill: i18n Consistency

Use this skill when a task involves translations, locale files, or missing language strings.

## Steps
1. Treat [src/locales/en.json](src/locales/en.json) as key reference.
2. Mirror new keys into all locale JSON files in [src/locales](src/locales).
3. Preserve placeholders exactly (example: `{day}`, `{total}`, `{count}`).
4. Run `python3 scripts/validate-translation-keys.py`.
5. Report missing/extra keys and the files updated.

## Do Not
- Change key names in non-English files only.
- Introduce key structure drift between locales.
