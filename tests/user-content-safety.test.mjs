import assert from "node:assert/strict";
import test from "node:test";

import { isObjectionableUserContent } from "../src/lib/user-content-safety.ts";

test("shared-content safety filter blocks threats and sexual content involving minors", () => {
  assert.equal(isObjectionableUserContent("I will kill you"), true);
  assert.equal(isObjectionableUserContent("share child porn"), true);
  assert.equal(isObjectionableUserContent("g0 k!ll yourself"), true);
});

test("shared-content safety filter permits ordinary counsel and formation messages", () => {
  assert.equal(isObjectionableUserContent("I am praying for wisdom as you make this choice."), false);
  assert.equal(isObjectionableUserContent("Remember to rest and take the next small step."), false);
});
