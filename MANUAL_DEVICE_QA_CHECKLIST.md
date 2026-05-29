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

## Release Sign-off

Mark release-ready only when all of the following are true:
- No top or bottom safe-area collisions on tested devices.
- No horizontal overflow on any core screen.
- No touch target feels undersized or hard to hit.
- No major empty or dead visual space remains around primary controls.
- No console-breaking runtime errors appear during standard navigation.
- Home, Decide, Reflect, Library, and Account all feel visually balanced and intentional.