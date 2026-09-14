#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const requireAll = process.argv.includes("--require-all");

function capture(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    available: !result.error,
    status: result.status,
    output: `${result.stdout || ""}\n${result.stderr || ""}`.trim(),
  };
}

const adb = capture("adb", ["devices", "-l"]);
const androidDevices = adb.available
  ? adb.output.split("\n").slice(1).filter((line) => /\sdevice(?:\s|$)/.test(line))
  : [];

const appleDevices = capture("xcrun", ["xctrace", "list", "devices"]);
const onlineAppleDeviceSection = appleDevices.available
  ? appleDevices.output.split("== Devices Offline ==")[0].split("== Devices ==")[1] || ""
  : "";
const physicalIosDevices = onlineAppleDeviceSection
  .split("\n")
  .filter((line) => /\([0-9.]+\) \([0-9a-f-]{20,}\)$/i.test(line.trim()));

const identities = capture("security", ["find-identity", "-v", "-p", "codesigning"]);
const hasDevelopmentIdentity = /Apple Development/.test(identities.output);
const hasDistributionIdentity = /Apple Distribution/.test(identities.output);

console.log(`[native readiness] Android physical devices: ${androidDevices.length}`);
console.log(`[native readiness] iOS physical devices online: ${physicalIosDevices.length}`);
console.log(`[native readiness] Apple Development identity: ${hasDevelopmentIdentity ? "yes" : "no"}`);
console.log(`[native readiness] Apple Distribution identity: ${hasDistributionIdentity ? "yes" : "no"}`);
console.log("[native readiness] Physical acceptance still requires push delivery, keyboard, VoiceOver, and TalkBack journey evidence.");

if (requireAll && (androidDevices.length === 0 || physicalIosDevices.length === 0 || !hasDistributionIdentity)) {
  process.exitCode = 1;
}
