# iOS Xcode Signing Fixes for Aletheia

This guide is the exact path to finish the iOS archive on this machine.

The failure we hit was:

- `Failed Registering Bundle Identifier`
- `No profiles for 'com.tobi.aletheia.app' were found`
- Xcode was still pointing at `Tobi Ojekunle (Personal Team)` instead of the paid Apple Developer team

The goal is to make Xcode use a real distribution team, create a valid App ID / provisioning profile, and then archive the app for App Store upload.

## What You Need Ready First

- A paid Apple Developer Program membership on the Apple ID you want to use
- Xcode signed in with that same Apple ID
- Internet access
- The iOS project open at `ios/App/App.xcodeproj`

## Step 1: Sign In To The Paid Apple Developer Account In Xcode

1. Open Xcode.
2. In the macOS menu bar, click `Xcode` > `Settings...` (or `Preferences...` on older versions).
3. Click `Accounts`.
4. Make sure your paid Apple ID is listed.
5. If it is not listed, click the `+` button and choose `Apple Account`.
6. Sign in with the Apple ID that has the paid developer membership.
7. Select that account and confirm the team shows as your paid developer team, not `Personal Team`.

If Xcode already has the account but the team looks stale:

1. Select the account in `Accounts`.
2. Click the `Manage Certificates...` button.
3. Make sure there is an `Apple Distribution` certificate.
4. If there is only `Apple Development`, create the distribution certificate from here.

## Step 2: Open The App Target Signing Screen

1. Open the project `ios/App/App.xcodeproj`.
2. In the left sidebar, click the blue project icon at the top.
3. Under `TARGETS`, click `App`.
4. At the top of the editor, click `Signing & Capabilities`.

You are looking for the section that shows:

- `Automatically manage signing`
- `Team`
- `Bundle Identifier`
- the `iOS` signing status area

## Step 3: Switch Off The Personal Team

1. Keep `Automatically manage signing` checked.
2. Click the `Team` dropdown.
3. Pick your paid Apple Developer team, not `Tobi Ojekunle (Personal Team)`.

If your paid team does not appear:

1. Go back to `Xcode` > `Settings...` > `Accounts`.
2. Refresh the account if there is a refresh icon.
3. Sign out and back in if the team still does not appear.
4. Return to the target signing screen and try the dropdown again.

## Step 4: Confirm The Bundle Identifier

The current project bundle identifier is:

- `com.tobi.aletheia.app`

Keep it only if Xcode accepts it for your paid team.

If Xcode still says the identifier is unavailable:

1. Click into the `Bundle Identifier` field.
2. Change it to a new unique reverse-DNS identifier that no other team owns.
3. Keep it stable after you choose it.
4. Use the same bundle identifier later in App Store Connect.

Important:

- The app name and the bundle identifier are not the same thing.
- The App Store name can be `Aletheia Companion`, while the bundle identifier stays a unique technical ID.

## Step 5: Let Xcode Regenerate Profiles

1. After changing the team or bundle identifier, wait a few seconds.
2. Click `Try Again` if Xcode shows that button under the signing error.
3. If Xcode creates a profile successfully, the red error should disappear.

If it still fails:

1. Turn `Automatically manage signing` off.
2. Wait a moment.
3. Turn `Automatically manage signing` back on.
4. Click `Try Again` again.

If the error persists:

1. Close Xcode.
2. Reopen the project.
3. Return to `Signing & Capabilities`.
4. Pick the paid team again.
5. Try again.

## Step 6: Clean The Build State If The Error Lingers

If the signing settings look correct but Xcode still complains:

1. In Xcode, click `Product`.
2. Click `Clean Build Folder...`.
3. Confirm the clean.
4. Rebuild or archive again.

If needed, also clear derived data:

1. Quit Xcode.
2. In Finder, open `~/Library/Developer/Xcode/DerivedData/`.
3. Remove the folder for this project.
4. Reopen Xcode and retry the archive.

## Step 7: Make Sure Release Uses The Right Signing Setup

1. In `Signing & Capabilities`, use the segmented control for `Release`.
2. Confirm the `Team` is still your paid Apple Developer team.
3. Confirm `Bundle Identifier` is still the same value.
4. Keep `Automatically manage signing` enabled unless you have a very specific manual-signing reason.

You want the Release configuration to be clean before archiving.

## Step 8: Archive The App

1. In Xcode, choose `Any iOS Device (arm64)` or `Generic iOS Device` as the run destination.
2. Do not archive from the simulator.
3. Click `Product` > `Archive`.
4. Wait for the build to complete.

If the archive succeeds, Xcode opens the Organizer window.

## Step 9: Export Or Upload The Archive

In Organizer:

1. Select the new archive.
2. Click `Distribute App`.
3. Choose `App Store Connect`.
4. Choose `Upload` if you want Xcode to send it directly.
5. Follow the remaining prompts.

If Xcode asks for distribution signing:

1. Choose the App Store distribution option.
2. Let Xcode manage signing unless you already created a manual distribution profile.

## Step 10: If You Need To Match This Repo Exactly

The checked-in iOS project currently uses:

- Bundle identifier: `com.tobi.aletheia.app`
- Marketing version: `1.0.0`
- Build number: `10000`

If you change the bundle identifier, update App Store Connect to match the new value before upload.

Note:

- This archive path currently ships without the `Associated Domains` entitlement.
- If you add universal links back later, make sure the Apple Developer App ID and provisioning profile both include the capability first, or Xcode archive/export will fail again.

## Fast Checklist

- Paid Apple Developer team selected
- `Personal Team` no longer used for the target
- `Automatically manage signing` enabled
- Bundle identifier is unique and accepted
- Xcode generated a provisioning profile
- Archive built from a generic iOS device
- Organizer shows a valid archive
- App Store Connect upload starts without signing errors
