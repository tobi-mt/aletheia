import test from "node:test";
import assert from "node:assert/strict";
import { applyGratitudeImageEffect } from "../src/lib/gratitude-image-effects.ts";

test("gratitude postcard effects alter RGB pixels while preserving alpha", () => {
  for (const filter of ["warm", "soft", "mono", "forest", "golden", "calm"]) {
    const pixels = new Uint8ClampedArray([32, 108, 224, 117, 210, 70, 18, 255]);
    const original = [...pixels];
    applyGratitudeImageEffect(pixels, filter);
    assert.notDeepEqual([...pixels.slice(0, 3)], original.slice(0, 3), `${filter} should alter color`);
    assert.equal(pixels[3], 117, `${filter} should preserve partial alpha`);
    assert.equal(pixels[7], 255, `${filter} should preserve opaque alpha`);
  }
});

test("none leaves postcard pixels unchanged", () => {
  const pixels = new Uint8ClampedArray([12, 34, 56, 78]);
  const result = applyGratitudeImageEffect(pixels, "none");
  assert.strictEqual(result, pixels);
  assert.deepEqual([...pixels], [12, 34, 56, 78]);
});

test("mono produces equal RGB channels", () => {
  const pixels = new Uint8ClampedArray([30, 120, 240, 255]);
  applyGratitudeImageEffect(pixels, "mono");
  assert.equal(pixels[0], pixels[1]);
  assert.equal(pixels[1], pixels[2]);
});
