# Strict Mode Missing Keys

These files list every key that must be translated before we can disable English fallback for the locale.

- tl: 0 missing keys -> [tl.json](./strict-missing-keys/tl.json)
- ar: 0 missing keys -> [ar.json](./strict-missing-keys/ar.json)
- hi: 0 missing keys -> [hi.json](./strict-missing-keys/hi.json)

Use `loadTranslationsWithFallbackSync(language, { strict: true })` to fail fast when any of these keys are still missing.
