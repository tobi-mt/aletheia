#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skipUi = process.argv.includes("--skip-ui");
const skipNative = process.argv.includes("--skip-native");
const requirePhysicalDevices = process.argv.includes("--require-physical-devices");
const archiveIos = process.argv.includes("--archive-ios");

function run(label, command, args, cwd = workspaceRoot) {
  console.log(`\n[release gate] ${label}`);
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const regressionTests = readdirSync(path.join(workspaceRoot, "tests"))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join("tests", name));

run("TypeScript", "npx", ["tsc", "--noEmit"]);
run("ESLint", "npm", ["run", "lint"]);
run("translation parity", "python3", ["scripts/validate-translation-keys.py"]);
run("regression tests", "node", ["--test", "--loader", "./tests/alias-loader.mjs", ...regressionTests]);
run("iOS, Android, and PWA contracts", "npm", ["run", "quality:platforms"]);

if (!skipUi) {
  run("responsive UI journeys", "npm", ["run", "ui:regression"]);
  run("multilingual and RTL UI journeys", "npm", ["run", "ui:i18n"]);
}

if (!skipNative) {
  run("production native web bundle", "npm", ["run", "mobile:bundle:web"]);

  const androidRoot = path.join(workspaceRoot, "android");
  if (existsSync(path.join(androidRoot, "gradlew"))) {
    run("Android lint", "./gradlew", ["lintDebug"], androidRoot);
    run("Android debug package", "./gradlew", ["assembleDebug"], androidRoot);
  } else {
    console.log("\n[release gate] Android lint skipped: android/gradlew is unavailable.");
  }

  const iosProject = path.join(workspaceRoot, "ios", "App", "App.xcodeproj");
  if (process.platform === "darwin" && existsSync(iosProject)) {
    run("iOS simulator build", "xcodebuild", [
      "-project", iosProject,
      "-scheme", "App",
      "-configuration", "Debug",
      "-sdk", "iphonesimulator",
      "-destination", "generic/platform=iOS Simulator",
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ]);
    if (archiveIos) {
      run("signed iOS Release archive", "xcodebuild", [
        "-project", iosProject,
        "-scheme", "App",
        "-configuration", "Release",
        "-destination", "generic/platform=iOS",
        "-archivePath", path.join(workspaceRoot, "build", "Aletheia.xcarchive"),
        "archive",
      ]);
    }
  } else {
    console.log("\n[release gate] iOS build skipped: macOS/Xcode project is unavailable.");
  }
}

if (requirePhysicalDevices) {
  run("physical-device readiness", "node", ["scripts/native-device-readiness.mjs", "--require-all"]);
}

console.log("\n[release gate] PASS");
