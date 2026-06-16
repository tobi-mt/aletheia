# Notification Reliability & UX Audit

## Executive Summary
Your notification system has solid architecture but is missing **delivery verification, user diagnostics, and complete deep-linking for certain notification types**. Some users don't receive notifications due to subscription failures or service worker issues, and clicked notifications sometimes don't navigate to the right context.

---

## 🔴 Critical Issues

### 1. **Reliability Gap: No Subscription Health Monitoring**
**Problem:** Users may have broken subscriptions but don't know it.

**Current State:**
- `src/app/api/notifications/subscribe/route.ts` creates subscriptions via upsert
- No post-subscription verification (test push never sent)
- No periodic health checks for existing subscriptions
- Users with permission granted ≠ users actually receiving notifications

**Impact:** A user grants permission, sees "Notifications enabled," but never gets anything.

**Causes:**
- Device was offline during subscription
- Browser revoked permission silently (permission drift)
- VAPID credentials changed (app deployment without key rotation awareness)
- Endpoint URL became invalid but wasn't detected

**Fix Required:**
1. Send test notification after subscription to verify delivery
2. Track subscription health: `last_successful_send_at`, `consecutive_failures`
3. In `/api/notifications/subscribe`, after saving subscription, send a small test push
4. Client side: periodically sync subscription if `last_successful_send_at` is stale (>7 days)

---

### 2. **Deep Linking Gap: Daily Wisdom Navigation**
**Problem:** User clicks notification for today's wisdom, app opens but doesn't focus the wisdom card.

**Current State:**
- `src/lib/notifications.ts` sends daily wisdom to `/?source=notification&focus=today`
- App correctly navigates to companion view + "today" home section
- BUT: `pendingNotificationFocus` state is set, but no logic to actually scroll/focus the wisdom card

**Found in:** [aletheia-app.tsx](src/components/aletheia-app.tsx#L6993) has `pendingNotificationFocus` but it's only declared, never used to scroll/highlight.

**Impact:** Premium experience broken—user expects to see the wisdom card they tapped, sees the homepage instead.

**Fix Required:**
Use `pendingNotificationFocus` to scroll to and highlight the wisdom card (similar to decision reminders which work correctly).

---

### 3. **Deep Linking Gap: Decision Reminder URL Parameters Not Passed Through Service Worker**
**Problem:** Decision reminder notifications are generated with `decisionId` in payload, but service worker may not preserve all metadata.

**Current State:**
- `src/lib/notifications.ts` `followupNotificationPayload()` correctly encodes `decisionId` and `kind` in URL
- Service worker in `public/sw.js` copies this to notification data
- App correctly extracts and focuses the decision

**BUT:** No validation that these parameters made it through. If service worker version is stale or mismatches, parameters get lost.

**Fix Required:**
1. Version the notification data schema
2. Validate `decisionId` exists before trying to focus
3. Fallback behavior if focus fails (show decisions list instead of blank screen)

---

## 🟡 Reliability Issues

### 4. **Subscription Permission Drift Not Auto-Healed**
**Problem:** User granted permission once, but browser revoked it (OS privacy change, reinstall, etc.).

**Current State:**
- App checks `Notification.permission === 'granted'` in UI
- But doesn't validate that a working subscription exists
- Memory note says client self-heal is in place, but it only triggers on detected drift

**Fix Required:**
- On app focus/visibility change, verify `last_successful_send_at` isn't stale
- If stale (>7 days) OR permission is granted but no subscriptions exist, silently re-subscribe
- This is already partially implemented but not comprehensive

---

### 5. **No Retry Exhaustion Feedback**
**Problem:** Push delivery fails after retries exhausted, user never informed.

**Current State:**
- `sendNotificationWithRetry()` does exponential backoff (configurable via env)
- Failed notifications are logged but not surfaced to user
- No way to know if "user didn't get notification" vs "network glitch"

**Fix Required:**
1. Track failed notifications in a `notification_failures` table
2. Provide `/api/notifications/diagnostics` endpoint returning:
   - Last successful send
   - Consecutive failures
   - Last error reason
3. Surface in UI: "Last notification sent X days ago" with refresh button

---

### 6. **VAPID Key Rotation Not User-Safe**
**Problem:** If VAPID keys change (e.g., deployment secrets rotate), all existing subscriptions break silently.

**Current State:**
- Memory note mentions auto-deletion on VAPID mismatch
- But only on error detection, not preventive

**Fix Required:**
1. Include VAPID key hash in subscription record
2. On daily send, check if key hash changed
3. If changed, pre-delete broken subscriptions before send attempt
4. Notify affected users

---

## 🟢 UX Issues (Medium Priority)

### 7. **Daily Wisdom Card Not Focused on Notification Click**
**Problem:** User taps "Money: a wiser pace" notification, app opens to Companion view, but wisdom card isn't highlighted/scrolled-to.

**Current State:**
- `pendingNotificationFocus` state exists (line 6993)
- Set when `focus=today` arrives (line 7859)
- **Never actually used to scroll/focus element**

**Fix:**
Add effect to scroll/highlight wisdom card when `pendingNotificationFocus` is true (mirror of gratitude/decision logic at line 7878+).

---

### 8. **Gratitude Reflection Deep Link Exists but No Scroll Verification**
**Problem:** Gratitude notification click navigates to reflect view, but doesn't verify the gratitude lens card scrolled into view properly on slow devices.

**Current State:**
- Logic at line 7878+ attempts scroll with retry timers
- Uses `getElementById("gratitude-lens-card")` 
- But times out without feedback if element missing

**Fix:**
1. Add timeout warning after 3 attempts
2. Log which device/browser couldn't find element
3. Fallback: show gratitude list if card not found

---

### 9. **Decision Reminder Parameters Could Be Clearer in URL**
**Problem:** `/?source=notification&focus=decision&decisionId=...&kind=...` works but is fragile.

**Current State:**
- `kind` is only validated as "waiting" or "revisit", no enum
- No version prefix if schema changes

**Fix:**
1. Add `notificationVersion=1` parameter
2. Validate all required params before focus attempt
3. Analytics: track parameter presence/validity

---

## 💡 Recommended Priority Implementation Order

### Phase 1: Critical (This Week)
1. Add daily wisdom card scrolling on notification click
2. Implement post-subscription test push
3. Add subscription health diagnostics endpoint

### Phase 2: High (Next Sprint)
4. Implement auto-healing for permission drift
5. Track notification failures table + diagnostics UI
6. Add fallback UI for failed deep-link focus

### Phase 3: Medium (Ongoing)
7. VAPID rotation safety net
8. Notification delivery metrics dashboard
9. User-facing "last sent" indicator

---

## Implementation Guidance

### A. Daily Wisdom Focus (Quickest Win)

In [aletheia-app.tsx](src/components/aletheia-app.tsx), add after line 7878:

```typescript
useEffect(() => {
  if (!pendingNotificationFocus || activeView !== "companion" || showOnboarding) {
    return;
  }
  
  let settled = false;
  const focusWisdomCard = () => {
    const target = document.getElementById("wisdom-card-today");
    if (!target) return false;
    const topNav = document.querySelector(".app-top-nav");
    const topOffset = topNav instanceof HTMLElement ? topNav.getBoundingClientRect().height + 18 : 112;
    const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
    target.focus({ preventScroll: true });
    window.scrollTo({ top, behavior: "smooth" });
    return true;
  };

  const timers = [0, 180, 720, 1400, 2600].map((delay) =>
    window.setTimeout(() => {
      if (!settled && focusWisdomCard()) {
        settled = true;
        setPendingNotificationFocus(null);
      }
    }, delay)
  );
  
  return () => timers.forEach(t => clearTimeout(t));
}, [activeView, pendingNotificationFocus, showOnboarding]);
```

**Then:** Ensure wisdom card has `id="wisdom-card-today"` in render.

### B. Post-Subscription Test Push

Add to `src/app/api/notifications/subscribe/route.ts`:

```typescript
// After successful subscription upsert
const testPayload = {
  title: preferences.language === 'en' ? 'Aletheia is ready' : 'Aletheia está lista',
  body: 'A calm wisdom prompt can now reach this device at your chosen local time.',
  url: '/?source=notification&test=1',
  tag: 'aletheia-test-subscription',
};

// Small delay to let subscription sync before test
setTimeout(() => {
  webpush.sendNotification(subscription, JSON.stringify(testPayload))
    .catch(err => console.error('Test notification failed:', err.message));
}, 500);
```

### C. Diagnostics Endpoint

Create `src/app/api/notifications/diagnostics/route.ts`:

```typescript
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const sub = await one(`
    SELECT last_sent_at, updated_at, enabled, p256dh
    FROM push_subscriptions
    WHERE user_id = ? AND enabled = TRUE
    ORDER BY updated_at DESC LIMIT 1
  `, user.id);

  const failures = await many(`
    SELECT COUNT(*) as count, reason
    FROM notification_failures
    WHERE user_id = ? AND created_at > datetime('now', '-7 days')
    GROUP BY reason
  `, user.id);

  return NextResponse.json({
    hasActiveSubscription: !!sub,
    lastSentAt: sub?.last_sent_at,
    daysSinceLastSend: sub ? Math.floor((Date.now() - new Date(sub.last_sent_at).getTime()) / 86400000) : null,
    consecutiveFailures: failures.length,
    failureReasons: failures,
  });
}
```

Then expose in UI at Settings → Notifications → Diagnostics.

---

## Measurement Plan

Track these metrics to verify fixes:

1. **Subscription Health**
   - `active_subscriptions`: count where `enabled=TRUE` and `last_sent_at` < 7 days ago
   - `stale_subscriptions`: count where `last_sent_at` > 7 days ago
   - `failed_subscriptions`: count in `notification_failures` table

2. **Delivery Success**
   - `notification_sent`: count of attempted pushes
   - `notification_failed`: count with final error
   - `failure_rate`: failed / sent

3. **Deep Link Success**
   - `notification_clicked`: tracked in analytics
   - `notification_focus_settled`: new metric when card scrolls into view
   - `notification_focus_timeout`: when scroll fails

4. **User Actions**
   - `diagnostics_viewed`: when user opens the diagnostics page
   - `resubscribe_clicked`: manual re-subscription button

---

## Questions for Product/User Research

1. "Some users report not getting notifications"—can you provide:
   - Browser/OS breakdown of affected users?
   - When they last successfully received one?
   - Do they see notifications as enabled in settings?

2. "Notification clicks don't navigate right"—which notification type?
   - Daily wisdom (goes to today but card not highlighted)?
   - Decision reminders (goes to decisions but wrong decision)?
   - Gratitude (goes to reflect but doesn't show gratitude card)?

3. Have users mentioned:
   - Notifications arriving late?
   - Notifications getting grouped/replaced unexpectedly?
   - Clicking notification opens old/wrong app state?
