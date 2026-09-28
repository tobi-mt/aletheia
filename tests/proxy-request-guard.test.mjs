import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { NextRequest } from "next/server.js";

import { proxy } from "../src/proxy.ts";

const root = new URL("../", import.meta.url);

async function findTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findTypeScriptFiles(entryPath);
    }
    return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  }));
  return files.flat();
}

test("forged Server Action requests are rejected before rendering", () => {
  for (const actionId of ["action", "x", "0", "1", "a".repeat(42)]) {
    const request = new NextRequest("https://aletheia.example/", {
      method: "POST",
      headers: { "Next-Action": actionId },
    });

    const response = proxy(request);
    assert.equal(response.status, 404, actionId);
    assert.equal(response.headers.get("Cache-Control"), "no-store", actionId);
  }
});

test("API CORS behavior remains available to the native app", () => {
  const request = new NextRequest("https://aletheia.example/api/auth/me", {
    method: "OPTIONS",
    headers: {
      Origin: "capacitor://localhost",
      "Access-Control-Request-Headers": "content-type, authorization",
    },
  });

  const response = proxy(request);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "capacitor://localhost");
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "content-type, authorization");
  assert.match(response.headers.get("Vary") ?? "", /Origin/);
});

test("the Server Action guard stays aligned with the application architecture", async () => {
  const sourceRoot = fileURLToPath(new URL("src/", root));
  const sourceFiles = await findTypeScriptFiles(sourceRoot);

  for (const file of sourceFiles) {
    const source = await readFile(file, "utf8");
    if (file.endsWith(`${path.sep}proxy.ts`)) {
      continue;
    }
    assert.doesNotMatch(source, /["']use server["']/, `${file} introduces a Server Action; revisit src/proxy.ts`);
  }
});
