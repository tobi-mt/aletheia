# Google Play Upload Pack

Use this as the exact Play Console checklist for Aletheia.

## 1. App Details

Fill these fields in the Play Console app setup.

- App name: `Aletheia`
- Default language: `English (United States)` unless you want another default
- App or game: `App`
- Free or paid: `Free` unless you intentionally want paid upfront pricing
- Package name: `com.tobi.aletheia.app`
- App category: `Lifestyle`
- Secondary category: `Productivity`
- Contact email: your public support email
- Contact phone: optional
- Contact website: optional but recommended if you have one

## 2. Store Listing

Go to `Store presence > Main store listing`.

### Title

- `Aletheia`
- Limit: 30 characters max

### Short description

- `A calm biblical wisdom companion for money, work, generosity, and decisions.`
- Limit: 80 characters max

### Full description

Paste this exactly:

```text
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

### App icon

- Upload the 512 x 512 high-resolution icon
- Use the final brand icon, not a screenshot or framed mockup

### Feature graphic

- Upload `1024 x 500`
- JPEG or 24-bit PNG
- Keep the center visually important
- Avoid device frames, badges, promo text, or store ranking claims

### Screenshots

Minimum to publish:

- At least 2 screenshots across supported device types

Recommended for a stronger listing:

- 4 portrait phone screenshots at 1080 x 1920 or larger
- 1 optional landscape screenshot if you want to show orientation support
- 7-inch tablet screenshots only if the tablet UI looks good
- 10-inch tablet screenshots only if you intend to support tablets in listing

Suggested order:

1. Home / Companion
2. Ask / chat composer
3. Decisions
4. Reflect
5. Library search
6. Account / preferences

Screenshot rules:

- Keep them real and current
- No marketing overlays
- No tiny text that will be unreadable on mobile
- No device frames unless the specific format requires them
- Use only app UI, not mocked-up store badges or callouts

### Preview video

- Optional
- Skip unless you already have a polished promo video

## 3. Privacy And App Content

Go to `Policy and programs > App content`.

### Privacy policy

- Add your public privacy policy URL
- It must be live and reachable from outside the app
- Also link it inside the app if your in-app flow exposes the setting

### Data safety

Declare data honestly based on the shipped app.

Likely collected data:

- Personal info: name, email address
- App activity: app interactions, feature usage, in-app search, notification interactions
- App info and performance: crash logs, diagnostics, performance data
- Device or other IDs: account IDs, session identifiers, push subscription identifiers
- User content: chat prompts and responses, journal entries, decision notes, counsel summaries, support reports, saved manual context

Likely purposes:

- App functionality
- Account management
- Analytics
- Personalization
- Communications
- Notifications

Likely sharing answers:

- No sale of data
- No ads tracking by default
- If third-party processors handle data, reflect that in the privacy policy and Data Safety form

### Ads

- Declare `No` if there are no ads in the shipped build

### Content rating

- Start with `Everyone` or `Teen`
- Be careful with the AI chat, user-generated content, religious guidance, and finance-related prompts

### Target audience

- Choose the audience that matches the intended users of the shipped app
- If the app is not designed for children, say so clearly

### App access

If the reviewer needs to sign in:

- Provide a valid test account
- Include the exact steps needed to reach the key flows
- Mention whether guest mode is available

### Sensitive permissions

- The current Android build only requests `INTERNET`
- No sensitive permission declaration should be needed unless you add new permissions later

## 4. Release Track

For first launch, use this order:

1. Internal testing
2. Closed testing
3. Production

If your Play account is a new personal developer account, Google may require a closed test with 12 opted-in testers for 14 continuous days before production access.

## 5. Release Artifact

- Android App Bundle: [`android/app/build/outputs/bundle/release/app-release.aab`](/Users/tobi/PycharmProjects/pythonProject/aletheia/android/app/build/outputs/bundle/release/app-release.aab)

## 6. Upload Steps

1. Open Play Console and create or select the Aletheia app.
2. Complete app details.
3. Fill the store listing text.
4. Upload the icon, feature graphic, and screenshots.
5. Complete privacy policy, Data Safety, ads, content rating, and target audience.
6. Open `Release > Testing > Internal testing` or `Closed testing`.
7. Create a new release.
8. Upload `app-release.aab`.
9. Review the generated release notes or enter your own.
10. Save, review, and roll out to the selected track.

## 7. Review Checklist

- The listing text matches the actual shipped app
- Screenshots show the real UI
- The privacy policy URL is live
- Data Safety matches the current build
- Reviewer instructions are present if login is required
- The release artifact is the signed `.aab`

