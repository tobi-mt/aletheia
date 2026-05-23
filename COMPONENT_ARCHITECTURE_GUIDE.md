# Component Architecture Refactoring Guide

## Current State

**File**: `src/components/aletheia-app.tsx`
**Size**: 6,777 lines
**Type**: Monolithic component with all features

## Why This Works (For Now)

✅ **Advantages of Current Architecture**:
1. **Simple mental model** - Everything in one place
2. **Easy state sharing** - No prop drilling
3. **Fast development** - No need to decide component boundaries
4. **Works perfectly** - Zero functionality issues

❌ **Trade-offs**:
1. **Hard to test** - Must test entire app at once
2. **Slower IDE** - Large file can lag syntax highlighting
3. **Harder to review** - PRs touch many unrelated features
4. **Difficult onboarding** - New devs overwhelmed by size

## Recommended Refactoring (Post-Launch)

**IMPORTANT**: Do NOT refactor before production launch. Current architecture is stable and tested. Refactor only when you have time for thorough regression testing.

### Phase 1: Extract Stateless Components (Low Risk)

**Extract these first** (they don't manage state):

```typescript
// src/components/dashboard/
DashboardAction.tsx          // ~50 lines
RhythmItem.tsx              // ~20 lines

// src/components/scripture/
ScriptureQuickRead.tsx      // ~150 lines
ScriptureChips.tsx          // ~40 lines

// src/components/onboarding/
OnboardingModal.tsx         // ~200 lines
OnboardingStep.tsx          // ~50 lines

// src/components/ui/
WorkflowNotice.tsx          // ~60 lines
```

**Impact**: ~500 lines removed, zero functionality change

### Phase 2: Extract View Components (Medium Risk)

**Extract major views** (they manage their own state):

```typescript
// src/components/views/
HomeView.tsx                // ~300 lines
DecisionsView.tsx           // ~800 lines
ReflectView.tsx             // ~600 lines
LibraryView.tsx             // ~400 lines
AccountView.tsx             // ~1200 lines
```

**Impact**: ~3,300 lines removed, requires careful prop management

### Phase 3: Extract Panels (Medium Risk)

**Extract companion panels** (complex state interactions):

```typescript
// src/components/panels/
CompanionPanel.tsx          // ~700 lines
DecisionCompanionPanel.tsx  // ~600 lines
CounselPanel.tsx            // ~400 lines
```

**Impact**: ~1,700 lines removed, requires context or props

### Phase 4: Extract Hooks (Low Risk, High Value)

**Custom hooks for logic reuse**:

```typescript
// src/hooks/
useAuth.ts                  // User authentication
usePreferences.ts           // User preferences
useNotifications.ts         // Push notifications
useDecisions.ts             // Decision management
useJournal.ts               // Journal entries
useTranslations.ts          // Translation loading
```

**Impact**: Better testability, cleaner code

## Example Refactor: DashboardAction

### Before (Inside aletheia-app.tsx)

```typescript
function DashboardAction({ icon: Icon, label, body, primary = false, compact = false, onClick }: {
  icon: typeof Compass;
  label: string;
  body: string;
  primary?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-start gap-3 rounded-md border text-left transition ${compact ? "p-3" : "p-4"} ${
        primary
          ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8] shadow-lg shadow-[#203a35]/12"
          : "border-[#d8e1db] bg-white/62 text-[#203a35] hover:border-[#203a35] hover:bg-white"
      }`}
    >
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ${primary ? "bg-white/10 text-[#d0ad55]" : "bg-[#edf2ee] text-[#203a35]"}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className={`${primary ? "text-base" : "text-sm"} block font-semibold`}>{label}</span>
        <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${primary ? "text-[#dfe8df]" : "text-[#607067]"}`}>{body}</span>
      </span>
    </button>
  );
}
```

### After (src/components/dashboard/DashboardAction.tsx)

```typescript
import type { LucideIcon } from 'lucide-react';

interface DashboardActionProps {
  icon: LucideIcon;
  label: string;
  body: string;
  primary?: boolean;
  compact?: boolean;
  onClick: () => void;
}

export function DashboardAction({
  icon: Icon,
  label,
  body,
  primary = false,
  compact = false,
  onClick,
}: DashboardActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-start gap-3 rounded-md border text-left transition ${compact ? "p-3" : "p-4"} ${
        primary
          ? "border-[#203a35] bg-[#203a35] text-[#f8f5e8] shadow-lg shadow-[#203a35]/12"
          : "border-[#d8e1db] bg-white/62 text-[#203a35] hover:border-[#203a35] hover:bg-white"
      }`}
    >
      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ${primary ? "bg-white/10 text-[#d0ad55]" : "bg-[#edf2ee] text-[#203a35]"}`}>
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className={`${primary ? "text-base" : "text-sm"} block font-semibold`}>{label}</span>
        <span className={`mt-1 line-clamp-2 block text-xs leading-5 ${primary ? "text-[#dfe8df]" : "text-[#607067]"}`}>{body}</span>
      </span>
    </button>
  );
}
```

**Benefits**:
- ✅ Separate file = easier to find
- ✅ TypeScript interface = better type safety
- ✅ Can test in isolation
- ✅ Reusable across app

## Testing Strategy for Refactoring

When you decide to refactor (post-launch):

### 1. Before You Start
```bash
# Run all tests to establish baseline
npm run build
node test-comprehensive.mjs

# Take screenshots of all views
# Document expected behavior
```

### 2. Extract One Component
```bash
# Create new component file
# Move code
# Update imports
# Test immediately
```

### 3. After Each Extraction
```bash
# Re-run tests
npm run build
node test-comprehensive.mjs

# Manual test the affected view
# Compare with screenshots
```

### 4. Commit Often
```bash
git add .
git commit -m "refactor: extract DashboardAction component"
# One component per commit = easy rollback
```

## Alternative: Keep Monolithic Architecture

**If you choose NOT to refactor**, that's perfectly valid! Here's how to make it work:

### 1. Add Internal Documentation
```typescript
/**
 * ============================================
 * SECTION: Authentication & User Management
 * Lines: 1250-1580
 * ============================================
 */

// Auth state
const [user, setUser] = useState<User | null>(null);
const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
```

### 2. Use Code Folding
Configure VS Code to automatically fold sections:
```json
// .vscode/settings.json
{
  "editor.foldingStrategy": "indentation",
  "editor.showFoldingControls": "always"
}
```

### 3. File Navigation Shortcuts
Use VS Code's symbol search (Cmd+Shift+O) to jump directly to functions

### 4. Keep State Management Clear
Document all useState declarations at the top with comments

## Recommendation

**For Production Launch**: ✅ **Keep current architecture**
- It's stable, tested, and working
- No risk of introducing bugs
- Faster to ship

**After 3-6 Months**: Consider Phase 1 refactoring
- You'll have production usage data
- Better understanding of pain points
- More time for thorough testing

**After 1 Year**: Consider full refactoring
- Proven product-market fit
- Growing team needs better organization
- Technical debt worth addressing

## Metrics to Watch

Track these to decide when refactoring is worth it:

📊 **Development Velocity**
- Time to add new feature?
- Time to fix bugs?
- If slowing down → consider refactor

🐛 **Bug Rate**
- Are bugs clustered in certain areas?
- If yes → extract those areas first

👥 **Team Growth**
- Onboarding new developers?
- If yes → clearer boundaries help

⚡ **Performance**
- Is bundle size too large?
- If yes → code-splitting via components

## Conclusion

Your current monolithic architecture is **not a problem**. It's a reasonable trade-off that got you to production quickly. Refactor only when:

1. ✅ Product is validated (users love it)
2. ✅ You have time for thorough testing
3. ✅ Development velocity is actually slowing down

**For now**: Ship it! 🚀

---

*Last Updated: May 23, 2026*
*Next Review: After 10,000 active users or 6 months*
