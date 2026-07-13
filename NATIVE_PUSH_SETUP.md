# Native Push Setup

Aletheia supports native push through Capacitor on iOS and Android, while PWA users keep using Web Push.

This guide explains where each server env var comes from and which native project steps must be completed before push can work.

## Server Environment Variables

Set one native transport path, or both.

### APNs

- `NATIVE_PUSH_APNS_TEAM_ID`
  - Get this from your [Apple Developer account membership details](https://developer.apple.com/account/).
  - It is the Apple Developer Team ID used for the iOS app.

- `NATIVE_PUSH_APNS_KEY_ID`
  - Create or open an APNs Auth Key in [Apple Developer -> Certificates, Identifiers & Profiles -> Keys](https://developer.apple.com/help/account/keys/create-a-private-key/).
  - Apple shows the Key ID after the key is created.

- `NATIVE_PUSH_APNS_PRIVATE_KEY` or `NATIVE_PUSH_APNS_KEY_P8`
  - Download the APNs Auth Key `.p8` file from Apple when you create the key.
  - Store the full private key contents in the env var, preserving newlines.
  - The app reads either variable, so you can use whichever naming convention your hosting platform prefers.

- `NATIVE_PUSH_APNS_BUNDLE_ID`
  - Use the exact iOS bundle identifier from the Capacitor/Xcode app target.
  - It must match the App ID you registered in Apple Developer and the signed build you ship.
  - Apple references for this are [Register an App ID](https://developer.apple.com/help/account/identifiers/register-an-app-id/) and [Changing the bundle identifier](https://developer.apple.com/documentation/xcode/changing-the-bundle-identifier).

- `NATIVE_PUSH_APNS_ENVIRONMENT`
  - Use `development` for local/dev-signed builds.
  - Use `production` for TestFlight and App Store builds, or any build that should send to the production APNs endpoint.
  - Apple’s APNs token auth docs are here: [Establishing a token-based connection to APNs](https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns).

### FCM

- `NATIVE_PUSH_FCM_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - Create a Firebase project for the Android app, then go to [Project Settings -> Service accounts](https://firebase.google.com/support/guides/service-accounts).
  - Click "Generate new private key" and download the JSON file.
  - Store the full JSON contents in one of these env vars.
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` is accepted by the app as a raw JSON secret, not as a file path.
  - Firebase’s admin setup guide is [Add the Firebase Admin SDK to your server](https://firebase.google.com/docs/admin/setup).

### Quick Local Check

To see which native push vars are currently set in your shell, run:

```bash
printenv | sort | rg '^(NATIVE_PUSH_APNS|NATIVE_PUSH_FCM|GOOGLE_APPLICATION_CREDENTIALS_JSON)'
```

## iOS Project Steps

1. Open the iOS project with `npx cap open ios`.
2. In Xcode, enable the Push Notifications capability for the app target.
3. Make sure the signing team and bundle identifier match the APNs values you set above.
4. Rebuild the app after adding the capability.

## Android Project Steps

1. Open the Android project with `npx cap open android`.
2. Add Firebase's `google-services.json` to `android/app/`.
3. Confirm the Firebase Android app package name matches the Capacitor app id.
4. Sync and rebuild so the Firebase Messaging plugin can register and receive tokens.

## Minimal QA Checklist

- iOS: tap a daily wisdom push, a gratitude push, and a counsel/private comment push.
- Android: tap a challenge nudge push, a daily wisdom push, and a counsel/private comment push.
- PWA: tap the same notification types in the browser and confirm the correct in-app screen opens after the service worker click handler runs.
