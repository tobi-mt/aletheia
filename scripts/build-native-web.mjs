#!/usr/bin/env node

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const DEFAULT_PUBLIC_APP_ORIGIN = "https://aletheia.mirrortalkpodcast.com";

function runBuild(rootDir, appOrigin) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const env = {
    ...process.env,
    AUTH_URL: process.env.AUTH_URL || appOrigin,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || appOrigin,
    NEXT_PUBLIC_NATIVE_WEB_BUNDLE: "1",
  };

  execFileSync(npmCommand, ["run", "build"], {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });
}

async function verifyNativeIntelligenceBundle(staticDir) {
  const chunksDir = path.join(staticDir, "chunks");
  const chunkNames = await readdir(chunksDir).catch(() => []);
  let unifiedAutoFitFound = false;

  for (const name of chunkNames) {
    if (!name.endsWith(".js")) continue;
    const contents = await readFile(path.join(chunksDir, name), "utf8");
    if (contents.includes("/api/chat/mode-fit")) {
      throw new Error("Native intelligence bundle still contains the retired split classifier request.");
    }
    if (contents.includes("autoFit")) unifiedAutoFitFound = true;
  }

  if (!unifiedAutoFitFound) {
    throw new Error("Native intelligence bundle verification failed: unified auto-fit marker was not found.");
  }
}

function shouldCopyNativeServerArtifact(name) {
  return name.endsWith(".html") || name.endsWith(".rsc") || name.endsWith(".meta") || name.endsWith(".body");
}

async function copyNativeServerArtifacts(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });

  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationName = entry.name.endsWith(".body") ? entry.name.slice(0, -5) : entry.name;
    const destinationPath = path.join(destinationDir, destinationName);

    if (entry.isDirectory()) {
      if (entry.name.includes(".")) {
        continue;
      }
      await copyNativeServerArtifacts(sourcePath, destinationPath);
      continue;
    }

    if (!shouldCopyNativeServerArtifact(entry.name)) {
      continue;
    }

    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }
}

async function copyOptionalFile(sourcePath, destinationPath) {
  const contents = await readFile(sourcePath).catch(() => null);
  if (!contents) {
    return;
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, contents);
}

async function main() {
  const rootDir = process.cwd();
  const appOrigin = (process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || DEFAULT_PUBLIC_APP_ORIGIN).trim() || DEFAULT_PUBLIC_APP_ORIGIN;
  const capacitorWebDir = path.join(rootDir, "capacitor-web");
  const nextServerAppDir = path.join(rootDir, ".next", "server", "app");
  const nextStaticDir = path.join(rootDir, ".next", "static");
  const publicDir = path.join(rootDir, "public");
  runBuild(rootDir, appOrigin);
  await verifyNativeIntelligenceBundle(nextStaticDir);

  await rm(capacitorWebDir, { recursive: true, force: true });
  await mkdir(capacitorWebDir, { recursive: true });

  await cp(publicDir, capacitorWebDir, { recursive: true });
  await copyNativeServerArtifacts(nextServerAppDir, capacitorWebDir);
  await cp(nextStaticDir, path.join(capacitorWebDir, "_next", "static"), { recursive: true });
  await copyOptionalFile(path.join(rootDir, "src", "app", "favicon.ico"), path.join(capacitorWebDir, "favicon.ico"));
  await copyOptionalFile(path.join(nextServerAppDir, "manifest.webmanifest.body"), path.join(capacitorWebDir, "manifest.webmanifest"));

  await writeFile(
    path.join(capacitorWebDir, "capacitor.config.json"),
    `${JSON.stringify(
      {
        appId: "com.tobi.aletheia.app",
        appName: "Aletheia",
        webDir: "capacitor-web",
        bundle: "local",
      },
      null,
      2
    )}\n`
  );

  console.log("Verified native unified intelligence bundle: one auto-fit chat pipeline and no split classifier request.");
}

await main();
