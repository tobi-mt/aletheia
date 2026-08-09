# Android SDK Setup For Aletheia

This is the exact setup path to get the Android SDK installed and configured on this Mac so the release AAB can build successfully.

The build error we hit was:

- `SDK location not found`
- Gradle could not find a valid `ANDROID_HOME` or `sdk.dir`

This repo already has the Android project checked in, so you do **not** need to run `npx cap add android` again.

## What The Project Expects

The Android module is already configured with:

- Package name: `com.tobi.aletheia.app`
- `minSdkVersion = 24`
- `compileSdkVersion = 36`
- `targetSdkVersion = 36`

That means you need a modern Android SDK install that includes API level 36 and current build tools.

## Step 1: Install Android Studio

If Android Studio is not installed yet:

1. Download Android Studio from the official Android developer site.
2. Install it in `/Applications`.
3. Launch Android Studio once so it can finish initial setup.

If Android Studio is already installed:

1. Open Android Studio.
2. Let it finish any first-run updates.

## Step 2: Open The Android SDK Manager

On macOS in Android Studio, do one of these:

- `Android Studio` > `Settings...`
- or `Android Studio` > `Preferences...`
- or `Tools` > `SDK Manager`

Then open:

- `Appearance & Behavior`
- `System Settings`
- `Android SDK`

## Step 3: Install The Required SDK Components

In the `SDK Platforms` tab:

1. Check an installed platform for API level 36 if it is available.
2. If API 36 is not shown, install the latest available platform Android Studio offers for this project and come back if Gradle complains.

In the `SDK Tools` tab, make sure these are installed:

1. `Android SDK Platform-Tools`
2. `Android SDK Build-Tools`
3. `Android SDK Command-line Tools (latest)`
4. `Android SDK Tools` if Android Studio offers it

Optional but useful:

- `Android Emulator` if you want device testing from Android Studio

Then click `Apply` or `OK` and let the downloads finish.

## Step 4: Find The SDK Path

After installation, the SDK is usually here on macOS:

- `/Users/<your-username>/Library/Android/sdk`

If you are unsure, return to the Android SDK settings screen and copy the `Android SDK Location` value.

## Step 5: Set The SDK Path For Gradle

This project failed because Gradle could not find the SDK automatically.

You can fix that in either of these ways:

### Option A: Create `android/local.properties`

1. Open the `android/` folder in the repo.
2. Create `android/local.properties` if it does not already exist.
3. Add this line:

```properties
sdk.dir=/Users/<your-username>/Library/Android/sdk
```

Replace the path with your actual SDK location.

### Option B: Set `ANDROID_HOME` / `ANDROID_SDK_ROOT`

If you prefer environment variables, add the SDK path to your shell profile:

```bash
export ANDROID_HOME=/Users/<your-username>/Library/Android/sdk
export ANDROID_SDK_ROOT=/Users/<your-username>/Library/Android/sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc
```

Use `local.properties` anyway if you want the repo to build consistently on this machine without depending on shell state.

## Step 6: Confirm Java Is Available

This project’s Android build also needs a working JDK.

If Gradle later complains about Java, use JDK 21 on this machine.

You can verify with:

```bash
java -version
```

If needed, point `JAVA_HOME` at JDK 21 before building.

## Step 7: Verify The SDK In The Terminal

From the repo root, check that the SDK path is visible:

```bash
cd android
cat local.properties
```

You should see the `sdk.dir` path.

If you set environment variables instead, confirm they are exported in the current shell:

```bash
echo $ANDROID_HOME
echo $ANDROID_SDK_ROOT
```

## Step 8: Rebuild The Android App Bundle

From the repo root:

```bash
cd android
./gradlew bundleRelease
```

If the SDK is configured correctly, the signed app bundle should be written to:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Step 9: If The Build Still Fails

If you still see SDK-related errors:

1. Open Android Studio again.
2. Return to `SDK Manager`.
3. Confirm the SDK location matches the path in `local.properties`.
4. Confirm platform tools and build tools are installed.
5. Retry `./gradlew bundleRelease`.

If Gradle complains about Java instead:

1. Confirm JDK 21 is installed.
2. Set `JAVA_HOME` to JDK 21.
3. Retry the build.

## Step 10: Keep The Upload Key Separate

This repo expects an Android upload keystore, but the key file itself should stay outside git.

The signing config template is here:

- [`android/keystore.properties.example`](/Users/tobi/PycharmProjects/pythonProject/aletheia/android/keystore.properties.example)

For the release build to sign correctly, copy that template to:

- `android/keystore.properties`

Then point `storeFile` to your `.jks` file.

## Fast Checklist

- Android Studio installed
- Android SDK path known
- `android/local.properties` contains `sdk.dir=...`
- Platform-tools installed
- Build-tools installed
- Command-line tools installed
- JDK 21 available
- `./gradlew bundleRelease` completes
- `android/app/build/outputs/bundle/release/app-release.aab` exists
