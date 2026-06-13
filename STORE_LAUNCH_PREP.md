# Store Launch Prep

This document collects the copy, screenshot plan, privacy metadata, and signing setup needed to ship Aletheia on the App Store and Google Play.

## Recommended Store Positioning

- App name: `Aletheia`
- App identity: Calm biblical wisdom companion for money, work, stewardship, generosity, and thoughtful decisions
- Recommended primary category: `Lifestyle`
- Recommended secondary category: `Productivity`
- Alternate category if you want a narrower stewardship angle: `Finance`

## App Store Copy

- Subtitle: `Biblical wisdom for life`
- Promotional text: `A calm AI-powered companion for stewardship, work, generosity, and wise decisions.`
- Keyword seed list: `wisdom, stewardship, prayer, finance, work, generosity, discernment, journal, decisions, reflection`
- Support URL: your public support page
- Marketing URL: your public product page or homepage
- Privacy policy URL: your public privacy policy page

### App Store Description

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

## Google Play Copy

- App title: `Aletheia`
- Short description: `A calm biblical wisdom companion for money, work, generosity, and decisions.`
- Full description: reuse the App Store description above, or shorten slightly for Play Console formatting.
- Content rating: expect `Everyone` or `Teen` depending on final review wording and any user-generated content policy answers.

## Screenshot Checklist

### App Store

Capture these flows on real devices or device-mockup frames:

- iPhone 6.7-inch: Home / Companion
- iPhone 6.7-inch: Ask / chat composer open
- iPhone 6.7-inch: Decisions
- iPhone 6.7-inch: Reflect
- iPhone 6.7-inch: Library search
- iPhone 6.7-inch: Account / preferences
- iPad 13-inch or 12.9-inch: Home or Account
- iPad 13-inch or 12.9-inch: Decisions or Reflect

### Google Play

- Phone portrait hero screenshots, at least 2
- Phone landscape screenshot if you support landscape flows in the marketing visuals
- 7-inch tablet screenshot set if you plan to list tablets
- 10-inch tablet screenshot set if you plan to list tablets
- Feature graphic: `1024x500`
- High-res icon: `512x512`

### Screenshot Content Guidance

- Show the calm top-level home screen first
- Include at least one screenshot with the chat composer
- Include one screenshot that demonstrates decisions or reflection
- Include one screenshot that shows settings or account management
- Avoid text-heavy screenshots that are hard to read on store pages
- Keep device chrome minimal and use the same visual theme for consistency

## Privacy Metadata

### App Store Privacy Answers

Mark data as collected when it is stored or synced by the app backend or sent to service providers.

- Linked to User:
  - Name
  - Email Address
  - User Content
  - Identifiers
  - Usage Data
  - Diagnostics
- Not Linked to User:
  - None by default
- Used for Tracking:
  - No

### Data Categories to Disclose

- Contact Info:
  - Name
  - Email Address
- User Content:
  - Chat prompts and responses
  - Journal entries
  - Decision notes
  - Counsel summaries
  - Support reports
  - Manual context the user chooses to save
- Photos and Videos:
  - If avatar/photo upload remains available in the current build, disclose it here
- Identifiers:
  - Account IDs
  - Session identifiers
  - Push subscription tokens
- Usage Data:
  - App opens
  - Feature usage
  - Screen/view transitions
  - Notification opt-in state
  - Share actions
- Diagnostics:
  - Error logs
  - Crash logs
  - Performance data

### Data Use Purposes

- App functionality
- Account management
- Analytics and product improvement
- Personalization
- Communication and support
- Notifications

### Privacy Policy Points

- The app uses OpenAI server-side for AI responses
- The app uses hosting, email, analytics, and push notification service providers
- The app does not sell user data
- Users can export or delete their account data
- Private content should remain private unless the user explicitly shares it

## Native Polish

- App icon and splash assets are generated from the Aletheia brand art
- Android and iOS native shells are checked in
- iOS launch screen uses the generated splash asset
- Android launch screen uses the generated splash asset
- iOS encryption disclosure is set to `false` for standard app transport encryption

## Signing Setup

### Android

1. Generate or locate your upload keystore.
2. Copy [`android/keystore.properties.example`](./android/keystore.properties.example) to `android/keystore.properties`.
3. Point `storeFile` at the keystore file.
4. Fill in `storePassword`, `keyAlias`, and `keyPassword`.
5. Keep the keystore outside git; the repo ignores `android/keystore.properties` and `*.jks`.
6. Build an App Bundle with:

```bash
cd android
./gradlew bundleRelease
```

The signed bundle will be in `android/app/build/outputs/bundle/release/`.

### iOS

1. Open the Xcode project from `ios/App/App.xcodeproj`.
2. Set the correct Apple Developer Team in Signing & Capabilities.
3. Confirm bundle identifier `com.aletheia.app`.
4. Confirm version numbers:
   - Marketing version: `1.0.0`
   - Build number: `10000`
5. Archive the app in Xcode and export an App Store build.
6. Upload the archive to App Store Connect with Transporter or Xcode.

### Release Checklist

- Production domain is live and serving HTTPS
- `NEXT_PUBLIC_APP_URL` points to the production app
- Backend env vars are set in production
- App Store Connect metadata is filled in
- Play Console listing is filled in
- Privacy policy is public
- Support contact is public
- Test account or guest mode is available for review

## Review Notes

- If review needs sign-in, provide a demo account and the login path
- If review can use guest mode, say so explicitly
- If push notifications are enabled in the build, note whether they require opt-in
- If photo/avatar upload remains in the build, mention where it lives in the UI
