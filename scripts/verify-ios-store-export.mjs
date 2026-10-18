#!/usr/bin/env node

import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ipaPath = path.resolve(process.argv[2] ?? "build/AppStoreExport/App.ipa");
const extractionRoot = mkdtempSync(path.join(os.tmpdir(), "aletheia-store-export-"));

function command(commandName, args) {
  const result = spawnSync(commandName, args, { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exitCode = result.status ?? 1;
    throw new Error(`${commandName} failed`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

try {
  command("ditto", ["-x", "-k", ipaPath, extractionRoot]);
  const payloadRoot = path.join(extractionRoot, "Payload");
  const appName = readdirSync(payloadRoot).find((entry) => entry.endsWith(".app"));
  if (!appName) throw new Error("The IPA does not contain an application bundle");

  const appPath = path.join(payloadRoot, appName);
  command("codesign", ["--verify", "--deep", "--strict", appPath]);
  const signature = command("codesign", ["-dv", "--verbose=4", appPath]);
  const entitlements = command("codesign", ["-d", "--entitlements", ":-", appPath]);
  const info = readFileSync(path.join(appPath, "Info.plist"));

  if (!signature.includes("Authority=Apple Distribution:")) throw new Error("IPA is not Apple Distribution signed");
  if (!signature.includes("Identifier=com.tobi.aletheia.app")) throw new Error("IPA bundle identifier is incorrect");
  if (!entitlements.match(/<key>aps-environment<\/key>\s*<string>production<\/string>/)) throw new Error("IPA does not use production push entitlements");
  if (!entitlements.match(/<key>get-task-allow<\/key>\s*<false\s*\/>/)) throw new Error("IPA unexpectedly permits debugging");
  if (!info.includes(Buffer.from("1.1.2")) || !info.includes(Buffer.from("10020"))) throw new Error("IPA version is not 1.1.2 (10020)");

  console.log("Verified App Store IPA: Apple Distribution, production push, debugging disabled, version 1.1.2 (10020).");
} finally {
  rmSync(extractionRoot, { recursive: true, force: true });
}
