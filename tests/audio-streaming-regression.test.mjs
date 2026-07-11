import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("read aloud starts from short audio segments and streams where the browser supports it", async () => {
  const client = await read("src/components/aletheia-app.tsx");

  assert.match(client, /const SPEECH_AUDIO_CHUNK_TARGET = 280/);
  assert.match(client, /MediaSource\.isTypeSupported\(mimeType\)/);
  assert.match(client, /response\.body\?\.getReader\(\)/);
  assert.match(client, /sourceBuffer\.appendBuffer\(bytes\)/);
  assert.match(client, /nextAudio = index \+ 1 < textChunks\.length[\s\S]*fetchAudioChunk\(textChunks\[index \+ 1\]\)/);
});

test("only scripture playback is eligible for the bounded audio cache", async () => {
  const client = await read("src/components/aletheia-app.tsx");
  const route = await read("src/app/api/audio/speech/route.ts");
  const native = await read("ios/App/App/AppDelegate.swift");

  assert.match(client, /cacheScope\?: "scripture"/);
  assert.match(client, /"scripture"\n          \);/);
  assert.match(route, /body\.cacheScope === "scripture"/);
  assert.match(route, /SCRIPTURE_AUDIO_CACHE_LIMIT = 48/);
  assert.match(route, /speech\.body\.tee\(\)/);
  assert.match(native, /if cacheScope == "scripture"/);
});
