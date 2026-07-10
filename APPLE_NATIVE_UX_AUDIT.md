# Apple Native Account and UX Audit

## P0 — Release blockers

- [x] Keep native authentication sessions available to API requests.
- [x] Let users replace an Apple-provided or relay-associated display name.
- [x] Add the iOS push entitlement and Xcode Push Notifications capability metadata.
- [x] Stop automatic native push registration loops and handle registration errors without unhandled promise rejections.
- [ ] Enable Push Notifications for the production App ID in Apple Developer and refresh the provisioning profile.
- [ ] Verify the signed archive contains `aps-environment` with the value supplied by the distribution profile.

## P1 — Signed-in account experience

- [x] Keep relay email as the private account identifier while showing an editable display name separately.
- [x] Persist display-name changes through the authenticated profile API.
- [x] Keep notification timing editable in the native shell without invoking browser service-worker APIs.
- [x] Keep support reporting available in Account → System.
- [ ] Physical-device regression: edit name, relaunch, confirm greeting and avatar label remain personalized.
- [ ] Physical-device regression: enable, disable, and re-enable notifications on a clean installation.

## P1 — Onboarding and native-shell UX

- [x] Remove the duplicate vertical onboarding step list.
- [x] Keep one sticky, horizontal rail-style step tray.
- [x] Flatten onboarding highlights into a horizontal rail rather than stacked nested cards.
- [x] Align the close button within the onboarding header safe area.
- [x] Hide “Add to Home Screen” guidance from Capacitor iOS and Android builds.
- [x] Use signed-in onboarding copy after Apple account creation instead of asking the user to sign in again.
- [ ] Physical-device visual regression at small and large Dynamic Type sizes.
- [ ] Verify rail overflow cues and RTL behavior in Arabic.

## P2 — Product-wide follow-up

- [ ] Split the oversized account/onboarding implementation into focused components to reduce regression risk.
- [ ] Add screenshot tests for onboarding, Account personalization, notifications, privacy, share, and system tabs.
- [ ] Add API integration tests for profile-name validation, persistence, authorization, and Unicode names.
- [ ] Audit every disabled control so it has an adjacent explanation and recovery action.
- [ ] Audit all native-only, PWA-only, and browser-only surfaces through a shared capability policy.
- [ ] Review relay-email presentation everywhere; private relay addresses should be identified as private account email, not used as a person’s name.
- [ ] Run VoiceOver, keyboard, contrast, Dynamic Type, landscape, and iPad layout passes before resubmission.

## Release verification

- [x] TypeScript validation.
- [x] Targeted ESLint validation.
- [x] Translation key parity across all 11 locales.
- [x] Native-auth/account regression suite.
- [x] Next.js production build and Capacitor sync.
- [x] Unsigned generic physical-iOS compilation.
- [ ] Signed physical-device installation with refreshed Apple provisioning profile.
- [ ] TestFlight clean-install smoke test before App Review resubmission.
