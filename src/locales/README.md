# Aletheia Translations

This directory contains all UI translations for the Aletheia app in JSON format.

## Supported Languages

- **en** - English (Master/Reference)
- **es** - Español (Spanish)
- **fr** - Français (French)
- **pt** - Português (Portuguese)
- **de** - Deutsch (German)
- **yo** - Yorùbá (Yoruba)
- **ig** - Igbo
- **ha** - Hausa
- **tl** - Filipino / Tagalog
- **ar** - العربية (Arabic)
- **hi** - हिन्दी (Hindi)

## File Structure

Each language has its own JSON file with the following structure:

```json
{
  "nav": { ... },
  "decideShort": "...",
  "guardrails": "...",
  ...
}
```

## Translation Guidelines

### 1. Key Naming Convention
- Use camelCase for keys
- Keep keys descriptive but concise
- Group related translations under nested objects (e.g., `nav.*`)

### 2. Translation Principles
- **Accuracy over literalness**: Translate meaning, not just words
- **Cultural relevance**: Adapt examples and metaphors for local context
- **Consistency**: Use the same term for the same concept
- **Tone**: Maintain calm, wise, supportive tone

### 3. Special Considerations
- **Scripture references**: Keep biblical references accurate
- **Financial terms**: Use locally appropriate terminology
- **Decision-making vocabulary**: Adapt to cultural decision-making norms

## Adding New Translations

1. Add the key to `en.json` first (master file)
2. Add translations to all language files
3. Run the analysis script to verify completeness:
   ```bash
   npx ts-node scripts/analyze-translations.ts
   ```
4. Review the coverage report in `translation-reports/coverage.md`

## Working with Missing Translations

The analysis script generates missing translation templates in `translation-reports/`:
- `es-missing.json` - Missing Spanish translations
- `fr-missing.json` - Missing French translations
- etc.

These files show English source text with `[TODO: Translate]` prefix for easy translation.

## Translation Status

Run `npx ts-node scripts/analyze-translations.ts` to see current coverage:

`tl`, `ar`, and `hi` now pass the strict no-fallback check. English fallback stays available in the loader, but these three locales currently have complete key coverage.

The tactical rollout plan, exact file scope, and launch checklist live in [`LANGUAGE_EXPANSION_ROLLOUT.md`](/Users/tobi/PycharmProjects/pythonProject/aletheia/LANGUAGE_EXPANSION_ROLLOUT.md).
The exact strict-mode missing-key inventories live in [`translation-reports/strict-missing-keys.md`](/Users/tobi/PycharmProjects/pythonProject/aletheia/translation-reports/strict-missing-keys.md), and `npm run translations:strict` enforces the no-fallback gate for `tl`, `ar`, and `hi`.

```
✅ English: 100% (85/85)
🟡 Deutsch: 62% (53/85)
🟡 Yorùbá: 74% (63/85)
✅ Filipino / Tagalog: strict no-fallback complete
✅ العربية: strict no-fallback complete
✅ हिन्दी: strict no-fallback complete
🔴 Español: 31% (26/85)
🔴 Français: 31% (26/85)
🔴 Português: 31% (26/85)
🔴 Igbo: 27% (23/85)
🔴 Hausa: 27% (23/85)
```

## Hard-Coded Strings

Hard-coded English strings that need translation are tracked in:
`translation-reports/hard-coded-strings.md`

These should be:
1. Extracted to translation files
2. Refactored to use the translation system
3. Removed from component code

## Usage in Components

```typescript
import translations from '@/locales/en.json'; // or dynamic import
import { useTranslation } from '@/lib/i18n';

function Component() {
  const { t } = useTranslation();
  
  return <h1>{t('askTitle')}</h1>; // "Ask Aletheia"
}
```

## Maintenance

- **Add new keys**: Always add to `en.json` first
- **Check coverage**: Run analysis script before commits
- **Review reports**: Check `translation-reports/` regularly
- **Update all languages**: Don't leave partial translations

## Contributing Translations

Native speakers are encouraged to:
1. Review existing translations for accuracy
2. Fill in missing translations
3. Suggest improvements for cultural relevance
4. Report ambiguous or unclear source text

## Translation Memory

Key terms and their translations across languages:

| English | Spanish | French | Portuguese | German | Yoruba | Igbo | Hausa |
|---------|---------|--------|------------|--------|--------|------|-------|
| Decision | Decisión | Décision | Decisão | Entscheidung | Ìpinnu | Mkpebi | Shawara |
| Wisdom | Sabiduría | Sagesse | Sabedoria | Weisheit | Ọgbọ́n | Amamihe | Hikima |
| Counsel | Consejo | Conseil | Conselho | Rat | Ìmọ̀ràn | Ndụmọdụ | Shawara |
| Reflection | Reflexión | Réflexion | Reflexão | Reflexion | Ìrònú | Ntụgharị uche | Tunani |

---

Last updated: 2026-05-22
