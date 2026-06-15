# Manual Device QA Checklist

Use this checklist for final premium QA on real devices before release.

## iOS Safari PWA

Device coverage:
- iPhone SE / compact viewport
- iPhone 14 Pro / notch viewport
- iPhone Pro Max / tall viewport

Install and launch:
- Open in Safari and add to Home Screen.
- Launch from the Home Screen, not from Safari tab switcher.
- Confirm splash-to-home transition has no content hidden under status bar or top header.
- Confirm bottom nav clears the home indicator and does not crowd content.

Layout and polish:
- Check Home, Decide, Reflect, Library, and Account on first launch.
- Confirm first card, heading, and CTA row are fully visible on every tab.
- Confirm no empty dead bands beside mic, buttons, chips, or section headers.
- Confirm all tappable controls feel comfortably touchable and not cramped.
- Confirm no clipped text, horizontal scrolling, or misaligned card borders.

Interaction:
- Tap each bottom tab once and repeatedly to verify state changes cleanly.
- In Home, tap a suggested question and confirm it fills the ask textarea.
- If voice is enabled, confirm mic and Ask stay aligned on one row.
- In Decide, type a decision title and scan the form for crowded controls.
- In Reflect, type title and body text, then verify save CTA remains visible and comfortable.
- In Library, search for a term like debt and verify results update without layout jump.
- In Account, expand Profile, Preferences, Notifications, and one sidebar section.

PWA-specific:
- Rotate portrait to landscape and back on Home, Reflect, and Account.
- Background the app and restore it; verify layout reserves remain correct.
- Toggle system light/dark appearance if relevant to your current theme flow.
- If notifications are configured, verify permission and subscription prompts do not break spacing.

## Android Chrome PWA

Device coverage:
- Pixel-class narrow/tall device
- Large Android device or tablet

Install and launch:
- Open in Chrome and install as app.
- Launch from app icon.
- Confirm top header spacing is correct with Android status bar and cutout handling.
- Confirm bottom nav does not collide with gesture bar.

Layout and polish:
- Check all primary tabs at cold launch.
- Confirm no button row leaves unused space when a control can expand.
- Confirm chips, detail toggles, and segmented controls stay aligned.
- Confirm all form fields and buttons meet comfortable touch size expectations.

Interaction:
- Repeat the Home, Decide, Reflect, Library, and Account checks from iOS.
- Confirm search keyboard open/close does not cause content overlap.
- Confirm textarea focus does not push the top content underneath the app chrome.
- Confirm switching tabs after typing preserves spacing and alignment.

## Airplane-Mode Today Visual Fallback QA

Goal:
- Confirm the Home -> Today hero visual shows a meaningful local curated image when network images are unavailable.

Safety setup:
- Use a QA/staging build on a non-primary test device.
- Keep this flow read-only: do not clear app data unless needed for unrelated troubleshooting.

Quick pass (single theme):
- Open Home -> Today while online and confirm the visual area renders.
- Enable airplane mode (disable Wi-Fi and cellular).
- Fully close the app, relaunch, and return to Home -> Today.
- Pass criteria: visual panel still renders an intentional image (not blank, not broken icon, not empty placeholder look).

Major-theme coverage pass:
- Because Today theme is date-driven, repeat with device date moved forward one day at a time.
- For each date/day sampled, do this exact loop:
1. Set device date to target day.
2. Launch app online once and open Home -> Today.
3. Close app, enable airplane mode, relaunch to Home -> Today.
4. Capture screenshot and note displayed theme label + date.
5. Mark pass/fail for local fallback rendering.

Coverage target:
- Capture at least 8 distinct themes from this set:
- Stewardship
- Cost Counting
- Diligence
- Provision and Anxiety
- Generosity
- Contentment
- Counsel
- Work
- Bonus coverage if encountered: Debt, Life, Purity, Recovery, Confession, Freedom.

Visual quality checks (each sample):
- No blank panel, no missing-image glyph, no severe pixelation.
- Image crop remains balanced inside the rounded visual container.
- Text remains legible over the image at normal brightness.
- App remains responsive after repeated online/offline relaunches.

Record template:
- Date tested:
- Theme shown:
- Network state: airplane mode ON
- Result: pass/fail
- Notes (if fail):

Reset:
- Restore automatic date/time after testing.
- Re-enable Wi-Fi/cellular.

## Release Sign-off

Mark release-ready only when all of the following are true:
- No top or bottom safe-area collisions on tested devices.
- No horizontal overflow on any core screen.
- No touch target feels undersized or hard to hit.
- No major empty or dead visual space remains around primary controls.
- No console-breaking runtime errors appear during standard navigation.
- Home, Decide, Reflect, Library, and Account all feel visually balanced and intentional.