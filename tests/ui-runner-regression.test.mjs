import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("an explicit UI regression port starts an isolated server instead of reusing port 3000", async () => {
  const source = await readFile(new URL("scripts/ui-regression.mjs", root), "utf8");

  assert.match(source, /const HAS_EXPLICIT_LOCAL_PORT = Boolean\(process\.env\.UI_REGRESSION_PORT\)/);
  assert.match(source, /!HAS_EXPLICIT_LOCAL_PORT && await canReach\('http:\/\/localhost:3000'\)/);
  assert.match(source, /!HAS_EXPLICIT_LOCAL_PORT && await canReach\('http:\/\/127\.0\.0\.1:3000'\)/);
});
