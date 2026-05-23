# Translation System Implementation Guide

## 🎉 Accomplishments

### ✅ 100% Translation Coverage Achieved

All 8 languages now have **complete translations** for the 85 core UI keys:

| Language | Coverage | Status |
|----------|----------|--------|
| English (en) | 100% (85/85) | ✅ Complete |
| Español (es) | 100% (85/85) | ✅ Complete |
| Français (fr) | 100% (85/85) | ✅ Complete |
| Português (pt) | 100% (85/85) | ✅ Complete |
| Deutsch (de) | 100% (85/85) | ✅ Complete |
| Yorùbá (yo) | 100% (85/85) | ✅ Complete |
| Igbo (ig) | 100% (85/85) | ✅ Complete |
| Hausa (ha) | 100% (85/85) | ✅ Complete |

### 📁 Infrastructure Created

1. **Translation Files** (`src/locales/*.json`)
   - 8 complete JSON translation files
   - Structured with nested objects for logical grouping
   - Master English file (`en.json`) serves as reference

2. **Translation Utilities** (`src/lib/translations.ts`)
   - `loadTranslations(language)` - Dynamic JSON imports
   - `getTranslation(translations, key, fallback)` - Dot notation access
   - `loadTranslationsWithFallback(language)` - Merge with English fallback
   - `calculateCoverage()` - Coverage percentage tracking
   - `getMissingKeys()` - Gap identification

3. **Analysis & Tracking** (`scripts/analyze-translations.ts`)
   - Coverage reporting (generates `translation-reports/coverage.md`)
   - Hard-coded string extraction (generates `translation-reports/hard-coded-strings.md`)
   - Missing key templates (generates `translation-reports/{lang}-missing.json`)

4. **Documentation** (`src/locales/README.md`)
   - Translation guidelines and conventions
   - File structure documentation
   - Contributing guide for translators
   - Translation memory tracking

---

## 🚧 Remaining Work

### 163 Hard-Coded Strings Require Translation

The analysis identified **163 hard-coded strings** still embedded in the component:

#### Category Breakdown

1. **Notification Messages (55)** - `announceWorkflow()` calls
   - Examples: "Decision tracked", "Reflection saved", "Voice captured"
   - Priority: HIGH - User-facing success/error messages

2. **Status Messages (18)** - `setStatusMessage()` calls
   - Examples: "Guest mode is active", "Loading private counsel invite..."
   - Priority: HIGH - System state communication

3. **Labels & Placeholders (89)** - Form inputs and UI labels
   - Examples: "Password", "Money stress, a career decision..."
   - Priority: MEDIUM - Some already have translations, needs audit

4. **Error Messages (1)** - Tailwind CSS classes (false positive)
   - Priority: LOW - Can be ignored

**View full catalog**: [translation-reports/hard-coded-strings.md](translation-reports/hard-coded-strings.md)

---

## 📋 Implementation Steps

### Phase 1: Extract Hard-Coded Strings to Translation Files

#### 1.1 Add Notification Keys to `en.json`

```json
{
  "notifications": {
    "decisionTracked": "Decision tracked",
    "decisionTrackedBody": "The decision is now in your timeline.",
    "reflectionSaved": "Reflection saved",
    "reflectionSavedBody": "Your reflection is synced and private.",
    "voiceCaptured": "Voice captured",
    "voiceCapturedBody": "The spoken text was added to your question.",
    "signedOut": "Signed out",
    "signedOutBody": "Guest mode is active. You can still use Aletheia with local-only storage.",
    // ... add all 55 notification messages
  },
  "status": {
    "guestMode": "Guest mode is active. Sign in to sync decisions.",
    "loadingInvite": "Loading private counsel invite...",
    "inviteAccepted": "Invite accepted. You can now view shared content.",
    // ... add all 18 status messages
  },
  "placeholders": {
    "password": "Password",
    "decisionExample": "Money stress, a career decision, generosity pressure...",
    "counselPlaceholder": "Offer counsel, questions, or cautions for this decision",
    // ... add remaining placeholders
  }
}
```

#### 1.2 Translate New Keys to All 7 Other Languages

Use the analysis script to generate templates:

```bash
# Run analysis to identify missing keys after adding notifications/status
npx ts-node scripts/analyze-translations.ts

# Fill in es.json, fr.json, pt.json, de.json, yo.json, ig.json, ha.json
# Use translation-reports/*-missing.json templates
```

#### 1.3 Update Component to Use Translation Keys

Replace hard-coded strings with translation lookups:

**Before:**
```typescript
announceWorkflow("Decision tracked", "The decision is now in your timeline.");
```

**After:**
```typescript
announceWorkflow(
  t('notifications.decisionTracked'),
  t('notifications.decisionTrackedBody')
);
```

---

### Phase 2: Integrate Translation System into Component

#### 2.1 Modify `aletheia-app.tsx` to Load Translations

**Current State (Lines 111-620):**
```typescript
const uiText = {
  en: { nav: { companion: "Home", decisions: "Decisions", ... }, ... },
  es: { nav: { companion: "Inicio", decisions: "Decisiones", ... }, ... },
  // ... 620 lines of embedded translations
};

const ui = useMemo(() => ({ ...uiText.en, ...uiText[selectedLanguage] }), [selectedLanguage]);
```

**Replace With:**
```typescript
import { loadTranslationsWithFallback, getTranslation } from '@/lib/translations';

// Inside component
const [translations, setTranslations] = useState<TranslationData>({});

useEffect(() => {
  loadTranslationsWithFallback(selectedLanguage).then(setTranslations);
}, [selectedLanguage]);

// Helper function for easy access
const t = (key: string, fallback?: string) => 
  getTranslation(translations, key, fallback);

// Usage examples:
const navText = t('nav.companion'); // "Home", "Inicio", "Début", etc.
const askButtonText = t('askButton'); // "Ask", "Preguntar", "Demander", etc.
```

#### 2.2 Update All UI Text References

**Find and replace patterns:**

| Old Pattern | New Pattern |
|-------------|-------------|
| `ui.nav.companion` | `t('nav.companion')` |
| `ui.askTitle` | `t('askTitle')` |
| `ui.guardrails` | `t('guardrails')` |
| `ui.guardrailItems[0]` | `t('guardrailItems.0')` (if using array) or refactor to object |

**Array Handling:**

If `guardrailItems` is an array in JSON, access like:
```typescript
const guardrails = t('guardrailItems') as string[];
guardrails.map((item, i) => <li key={i}>{item}</li>)
```

#### 2.3 Remove Embedded `uiText` Object

Once all references are migrated to `t()` function:

1. Delete lines 111-620 (`const uiText = { ... }`)
2. Remove `ui` memo: `const ui = useMemo(...)`
3. Verify no remaining references to `ui.` or `uiText.`

---

### Phase 3: Testing & Validation

#### 3.1 Verify Translation Loading

```typescript
// Add temporary logging in useEffect
useEffect(() => {
  loadTranslationsWithFallback(selectedLanguage).then(data => {
    console.log(`Loaded ${selectedLanguage} with fallback:`, Object.keys(data).length, 'keys');
    setTranslations(data);
  });
}, [selectedLanguage]);
```

#### 3.2 Test All Languages

For each of the 8 languages:

1. Switch language in UI (`languageSelect` dropdown)
2. Verify nav bar labels update
3. Test ask/question flow - check all buttons and messages
4. Create/save decision - verify notification messages
5. Open preferences - check all labels
6. Test counsel invites - verify status messages

#### 3.3 Run Coverage Analysis

```bash
npx ts-node scripts/analyze-translations.ts
```

**Expected Output:**
```
✅ English: 100% (130+/130+)    # 85 original + ~45 notifications/status
✅ Español: 100% (130+/130+)
✅ Français: 100% (130+/130+)
...
```

---

## 🛠️ Maintenance & Workflow

### Adding New UI Text

**1. Add to Master English File (`en.json`)**

```json
{
  "newFeature": {
    "title": "New Feature Title",
    "description": "Description of the new feature",
    "actionButton": "Take Action"
  }
}
```

**2. Run Analysis Script**

```bash
npx ts-node scripts/analyze-translations.ts
```

**3. Fill Missing Translations**

Script generates `translation-reports/es-missing.json` (and others) with templates:

```json
{
  "newFeature.title": "[TODO: Translate] New Feature Title",
  "newFeature.description": "[TODO: Translate] Description of the new feature",
  "newFeature.actionButton": "[TODO: Translate] Take Action"
}
```

**4. Update Language Files**

Translate and add to `es.json`, `fr.json`, etc.:

```json
{
  "newFeature": {
    "title": "Título de Nueva Función",
    "description": "Descripción de la nueva función",
    "actionButton": "Tomar Acción"
  }
}
```

**5. Verify 100% Coverage**

```bash
npx ts-node scripts/analyze-translations.ts
# Should show 100% for all languages
```

### Pre-Commit Hook (Optional)

Add to `package.json`:

```json
{
  "scripts": {
    "translations:check": "ts-node scripts/analyze-translations.ts",
    "translations:verify": "ts-node scripts/analyze-translations.ts && node -e 'process.exit(1)' # TODO: parse output"
  }
}
```

Use with Husky or similar to block commits with incomplete translations.

---

## 📊 Current Statistics

### File Sizes

- `en.json`: 85 keys, ~4 KB
- `es.json`, `fr.json`, `pt.json`: 85 keys each, ~4 KB each
- `de.json`, `yo.json`: 85 keys each, ~4.5 KB each
- `ig.json`, `ha.json`: 85 keys each, ~5 KB each
- **Total**: ~35 KB across all languages (before gzip)

### Code Impact

- **Lines to Remove**: ~510 (embedded uiText object in aletheia-app.tsx)
- **Lines to Add**: ~50 (import statements, useEffect, t() helper)
- **Net Reduction**: ~460 lines in main component
- **New Files**: 8 JSON files, 1 utility file, 1 analysis script

### Translation Debt

| Category | Count | Status |
|----------|-------|--------|
| Core UI Keys | 85 | ✅ 100% complete (all 8 languages) |
| Notification Messages | 55 | ⏳ Pending extraction |
| Status Messages | 18 | ⏳ Pending extraction |
| Placeholders/Labels | 89 | ⏳ Pending audit & extraction |
| **Total** | **247** | **34% complete** |

---

## 🎯 Recommended Timeline

### Immediate (1-2 hours)
1. ✅ **DONE**: Create JSON files with 85 core keys
2. ✅ **DONE**: Complete all 8 language translations
3. ✅ **DONE**: Set up analysis tooling

### Next Session (2-3 hours)
4. Extract 55 notification messages to JSON files
5. Translate notification keys to all languages
6. Update `announceWorkflow()` calls to use `t()`

### Following Session (2-3 hours)
7. Extract 18 status messages to JSON files
8. Translate status keys to all languages
9. Update `setStatusMessage()` and `setCounselInviteStatus()` calls

### Final Session (3-4 hours)
10. Audit and extract 89 placeholder/label strings
11. Integrate translation loader into component
12. Remove embedded `uiText` object
13. End-to-end testing across all 8 languages
14. Production deployment with 100% coverage

**Total Estimated Time**: 8-12 hours

---

## 🚀 Quick Start Guide

### For Developers: Using the Translation System

```typescript
import { loadTranslationsWithFallback, getTranslation } from '@/lib/translations';

// Load translations with English fallback
const translations = await loadTranslationsWithFallback('es');

// Get translated text
const welcomeText = getTranslation(translations, 'askTitle'); // "Pregunta a Aletheia"

// With fallback
const newFeature = getTranslation(translations, 'newFeature.title', 'Untranslated Feature');

// Nested access
const navHome = getTranslation(translations, 'nav.companion'); // "Inicio"
```

### For Translators: Contributing Translations

1. **Check current coverage**:
   ```bash
   npx ts-node scripts/analyze-translations.ts
   ```

2. **Find your language file**: `src/locales/{language-code}.json`
   - `es.json` - Español
   - `fr.json` - Français
   - `pt.json` - Português
   - `de.json` - Deutsch
   - `yo.json` - Yorùbá
   - `ig.json` - Igbo
   - `ha.json` - Hausa

3. **Translate missing keys**: Use `translation-reports/{lang}-missing.json` as template

4. **Verify completeness**:
   ```bash
   npx ts-node scripts/analyze-translations.ts
   # Look for your language showing 100%
   ```

5. **Test in app**: Switch to your language in Preferences → Language

---

## 📚 Additional Resources

- **Translation Guidelines**: [src/locales/README.md](src/locales/README.md)
- **Coverage Report**: [translation-reports/coverage.md](translation-reports/coverage.md)
- **Hard-Coded Strings**: [translation-reports/hard-coded-strings.md](translation-reports/hard-coded-strings.md)
- **Localization Utilities**: [src/lib/localization.ts](src/lib/localization.ts)
- **Translation Utilities**: [src/lib/translations.ts](src/lib/translations.ts)

---

## ✅ Success Criteria

### Phase 1 Complete When:
- ✅ All 8 languages have 85 core UI keys translated (ACHIEVED)
- ✅ Analysis script runs without errors (ACHIEVED)
- ✅ Coverage report shows 100% for all languages (ACHIEVED)

### Phase 2 Complete When:
- ⏳ All 163 hard-coded strings extracted to JSON files
- ⏳ All new keys translated to 8 languages
- ⏳ Component uses `t()` function instead of embedded `uiText`

### Phase 3 Complete When:
- ⏳ All 8 languages tested end-to-end
- ⏳ No English fallback text visible when using non-English languages
- ⏳ Translation analysis shows 0 hard-coded strings
- ⏳ Production deployment successful with user validation

---

## 🎉 Conclusion

**Current State**: Foundation complete! All 8 languages have 100% coverage of the 85 core UI keys. Translation infrastructure (JSON files, utilities, analysis tools) is production-ready.

**Next Steps**: Extract 163 remaining hard-coded strings, translate to all languages, and integrate the JSON-based translation system into the main component.

**Impact**: When complete, Aletheia will offer truly localized experiences in 8 languages with systematic coverage tracking and maintainability.
