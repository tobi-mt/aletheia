# Google Play Launch Prep

This document is the Play Console handoff for Aletheia.

For the exact field-by-field upload checklist, use [`GOOGLE_PLAY_UPLOAD_PACK.md`](./GOOGLE_PLAY_UPLOAD_PACK.md).

## App Identity

- App name: `Aletheia`
- Package name: `com.aletheia.app`
- Category: `Lifestyle`
- Secondary category: `Productivity`
- Alternative category if you want a narrower framing: `Finance`

## Play Store Copy

- Short description: `A calm biblical wisdom companion for money, work, generosity, and decisions.`
- Full description:

```
Aletheia is a calm, AI-powered wisdom companion for money, work, stewardship, generosity, and reflective decision-making.

Use Aletheia to:
- Ask grounded questions about money, work, and next steps
- Reflect in a private journal
- Keep track of decisions, counsel, and wise boundaries
- Search a curated biblical wisdom library
- Receive optional daily wisdom notifications
- Choose language, region, Bible translation, and voice preferences

Aletheia is designed to be thoughtful, quiet, and practical. It helps you pause, notice what matters, and take one faithful next step.

Your account can sync decisions, reflections, preferences, and notifications across devices. You can also export or delete your account data from inside the app.
```

## Asset Checklist

- High-res icon: `512x512`
- Feature graphic: `1024x500`
- Phone screenshots: at least 2 portrait screenshots
- Tablet screenshots: 7-inch and 10-inch if you choose to list tablets
- Optional landscape screenshot: one if you want to show cross-orientation support

### Suggested Screenshot Order

1. Home / Companion
2. Ask / chat composer
3. Decisions
4. Reflect
5. Library search
6. Account / preferences

### Screenshot Notes

- Keep the UI calm and readable
- Favor real product moments over marketing text
- Avoid cluttered callouts and small copy
- Use the same visual theme across all screenshots

## Data Safety

Be conservative and accurate. If the feature exists in the shipped build, disclose it.

### Collected Data

- Personal info:
  - Name
  - Email address
- App activity:
  - App interactions
  - Feature usage
  - In-app search
  - Notification interactions
- App info and performance:
  - Crash logs
  - Diagnostics
  - Performance data
- Device or other IDs:
  - Account IDs
  - Session identifiers
  - Push subscription identifiers
- User content:
  - Chat prompts and responses
  - Journal entries
  - Decision notes
  - Counsel summaries
  - Support reports
  - Saved manual context
- Photos and videos:
  - Declare this only if avatar/photo upload is present in the shipped build

### Data Use

- App functionality
- Account management
- Analytics
- Personalization
- Communications
- Notifications

### Data Sharing

- No sale of data
- No ads tracking by default
- If third-party services process data on your behalf, describe them in the privacy policy and Data Safety form

## Content Rating

- Likely rating: `Everyone` or `Teen`
- Answer carefully for:
  - Chat/AI content
  - User-generated content
  - Religious guidance language
  - Any mention of finance or personal decision support

## Release Artifacts

- Signed Android App Bundle: [`android/app/build/outputs/bundle/release/app-release.aab`](/Users/tobi/PycharmProjects/pythonProject/aletheia/android/app/build/outputs/bundle/release/app-release.aab)
- Signing config example: [`android/keystore.properties.example`](/Users/tobi/PycharmProjects/pythonProject/aletheia/android/keystore.properties.example)

## Build Commands

For the exact Android SDK install/config steps, see [ANDROID_SDK_SETUP.md](/Users/tobi/PycharmProjects/pythonProject/aletheia/ANDROID_SDK_SETUP.md).

```bash
cd android
./gradlew bundleRelease
```

If you need a fresh asset pass:

```bash
npm run mobile:assets
npm run mobile:sync
```

## Upload Steps

1. Open Google Play Console.
2. Create or open the Aletheia app listing.
3. Fill in store listing text.
4. Upload the high-res icon and feature graphic.
5. Upload screenshots.
6. Complete Data Safety and content rating.
7. Upload the signed `.aab`.
8. Start with internal testing or closed testing.
9. Promote to production after review.

## Review Notes

- If review needs a sign-in path, provide a demo account.
- If guest mode works, mention that explicitly.
- If push notifications are enabled, mention they are opt-in.
- If the app exports or deletes data, mention where those controls live.
- Keep the privacy policy URL public and easy to reach.
