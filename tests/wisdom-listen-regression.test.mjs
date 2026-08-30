import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { retrieveVerifiedScriptureCandidates, verifiedCandidateMatchLabel } from "../src/lib/scripture-recognition.ts";
import { normalizeStoredWisdomListenResult, wisdomListenDecisionNote, wisdomListenReflectionBody } from "../src/lib/wisdom-listen.ts";

test("deterministic retrieval finds a directly quoted verse in the verified corpus", () => {
  const candidates = retrieveVerifiedScriptureCandidates("For God so loved the world that he gave his one and only Son", 5);
  assert.equal(candidates[0]?.reference, "John 3:16");
  assert.equal(verifiedCandidateMatchLabel(candidates[0]), "strong_wording");
  assert.match(candidates[0]?.text ?? "", /God so loved the world/i);
});

test("spoken canonical references resolve without allowing AI-created references", () => {
  const candidates = retrieveVerifiedScriptureCandidates("The speaker asked us to read James 1:5", 5);
  assert.ok(candidates.some((candidate) => candidate.reference === "James 1:5"));
  assert.ok(candidates.every((candidate) => candidate.id.startsWith("web:")));
});

test("empty transcripts do not produce candidates", () => {
  assert.deepEqual(retrieveVerifiedScriptureCandidates("   "), []);
});

test("stored captures reject obsolete unverified match shapes", () => {
  const capture = normalizeStoredWisdomListenResult({ id: "old", transcript: "text", matches: [{ reference: "Invented 1:1", confidence: 99, matchKind: "quoted" }] });
  assert.equal(capture?.matches.length, 0);
});

test("reflection and decision notes use caller-provided translated labels", () => {
  const result = normalizeStoredWisdomListenResult({
    id: "capture-1", transcript: "text", createdAt: new Date().toISOString(), mode: "Life", language: "de", bibleTranslation: "LUTH1912",
    matches: [{ candidateId: "web:John:3:16", reference: "John 3:16", book: "John", chapter: 3, verse: 16, strength: "strong_wording", explanation: "", verifiedText: "text", contextBefore: "", contextAfter: "" }],
    counsel: "Rat", application: "Anwendung",
  });
  assert.ok(result);
  const copy = { possibleScripture: "Mögliche Bibelstelle", noConfidentMatch: "Keine", counselHeard: "Gehörter Rat", possibleApplication: "Mögliche Anwendung", reflectionPrompt: "Prüfen", recognitionNote: "Gefunden" };
  assert.match(wisdomListenReflectionBody(result, copy), /Mögliche Bibelstelle/);
  assert.match(wisdomListenDecisionNote(result, copy), /Gefunden/);
});

test("persistence schema and API enforce user ownership", async () => {
  const [db, route, removeRoute] = await Promise.all([
    readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/listen/captures/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/listen/captures/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(db, /wisdom_listen_captures/);
  assert.match(db, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(route, /WHERE user_id = \?/);
  assert.match(removeRoute, /WHERE id = \? AND user_id = \?/);
});

test("native shells declare microphone access and interruption handling", async () => {
  const [androidManifest, iosInfo, recorder] = await Promise.all([
    readFile(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8"),
    readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8"),
    readFile(new URL("../src/components/listen-for-wisdom.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(androidManifest, /android\.permission\.RECORD_AUDIO/);
  assert.match(iosInfo, /NSMicrophoneUsageDescription/);
  assert.match(recorder, /visibilitychange/);
  assert.match(recorder, /pagehide/);
  assert.match(recorder, /track\.onended/);
});

test("recognition requires third-party AI consent and constrains model output to verified IDs", async () => {
  const route = await readFile(new URL("../src/app/api/listen/recognize/route.ts", import.meta.url), "utf8");
  assert.match(route, /third_party_ai_consent/);
  assert.match(route, /listen_ai_consent_required/);
  assert.match(route, /candidateById\.get\(candidateId\)/);
  assert.match(route, /content-length/);
  assert.match(route, /listen_audio_too_large/);
  assert.doesNotMatch(route, /reference:\s*cleanText\(ranked/);
});
