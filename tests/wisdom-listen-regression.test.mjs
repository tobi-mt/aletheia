import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { retrieveVerifiedCuratedCandidates, retrieveVerifiedScriptureCandidates, retrieveVerifiedScriptureCandidatesForTranslation, verifiedCandidateMatchLabel } from "../src/lib/scripture-recognition.ts";
import { normalizeStoredWisdomListenResult, wisdomListenDecisionNote, wisdomListenReflectionBody } from "../src/lib/wisdom-listen.ts";

test("deterministic retrieval finds a directly quoted verse in the verified corpus", () => {
  const candidates = retrieveVerifiedScriptureCandidates("For God so loved the world that he gave his one and only Son", 5);
  assert.equal(candidates[0]?.reference, "John 3:16");
  assert.equal(verifiedCandidateMatchLabel(candidates[0]), "strong_wording");
  assert.match(candidates[0]?.text ?? "", /God so loved the world/i);
});

test("retrieval tolerates ordinary transcription errors in a distinctive verse fragment", () => {
  const candidates = retrieveVerifiedScriptureCandidates("God so luvved the wurld and gave his only son", 5);
  assert.equal(candidates[0]?.reference, "John 3:16");
  assert.ok((candidates[0]?.queryCoverage ?? 0) >= 0.5);
});

test("a likely paraphrase ranks ahead of weaker thematic echoes", () => {
  const candidates = retrieveVerifiedScriptureCandidatesForTranslation(
    "When you do not know what to do, ask God for wisdom, because he gives generously without finding fault.",
    "WEB",
    5,
  );
  assert.equal(candidates[0]?.reference, "James 1:5");
  assert.equal(verifiedCandidateMatchLabel(candidates[0]), "likely_paraphrase");
});

test("clue search retains a bundled verified fallback when the full corpus is unavailable", async () => {
  const candidates = retrieveVerifiedCuratedCandidates("well done good and faithful servant", "WEB", 5);
  assert.equal(candidates[0]?.reference, "Matthew 25:21");

  const [route, recognition] = await Promise.all([
    readFile(new URL("../src/app/api/listen/find/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/scripture-recognition.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /using verified curated fallback/);
  assert.match(route, /retrieveVerifiedCuratedCandidates/);
  assert.match(recognition, /import webSearchIndex from/);
  assert.doesNotMatch(recognition, /process\.cwd\(\)/);
});

test("clue search UI distinguishes an unavailable service from a genuine empty result", async () => {
  const recorder = await readFile(new URL("../src/components/listen-for-wisdom.tsx", import.meta.url), "utf8");
  assert.match(recorder, /if \(!response\.ok\) throw new Error\("search_failed"\)/);
  assert.match(recorder, /helpSearched && !helpBusy && helpCandidates\.length === 0/);
  assert.match(recorder, /listen\.searchUnavailable/);
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

test("live preview is deterministic and the UI exposes evolving guesses and recovery", async () => {
  const [audioPreview, recorder] = await Promise.all([
    readFile(new URL("../src/app/api/listen/preview-audio/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/listen-for-wisdom.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(audioPreview, /audio\.transcriptions\.create/);
  assert.match(audioPreview, /retrieveVerifiedScriptureCandidates/);
  assert.doesNotMatch(audioPreview, /responses\.create/);
  assert.match(recorder, /previewRecordedAudio/);
  assert.match(recorder, /signalLevel/);
  assert.match(recorder, /listen\.provisional/);
  assert.match(recorder, /setElapsed\(0\)/);
});

test("interpretation failure preserves verified candidates", async () => {
  const route = await readFile(new URL("../src/app/api/listen/recognize/route.ts", import.meta.url), "utf8");
  assert.match(route, /interpretation failed; returning verified retrieval/);
  assert.match(route, /rankedMatches = candidates\.slice\(0, 3\)/);
  assert.match(route, /listen_transcription_failed/);
  assert.match(route, /deterministicFloor/);
});

test("iOS recording is normalized to PCM WAV before preview and final upload", async () => {
  const recorder = await readFile(new URL("../src/components/listen-for-wisdom.tsx", import.meta.url), "utf8");
  assert.match(recorder, /pcmWavBlob/);
  assert.match(recorder, /audio\/wav/);
  assert.match(recorder, /createScriptProcessor/);
  assert.match(recorder, /pcmWavBlob\(\) \?\?/);
  assert.match(recorder, /await activeContext\.resume\(\)/);
  assert.match(recorder, /peak < 0\.001 \|\| rms < 0\.0001/);
  assert.match(recorder, /startLiveFeedback\(stream, activeContext\)/);
  assert.doesNotMatch(recorder, /Speak a little closer to your microphone/);
});

test("recognition telemetry records operational metrics but no audio or transcript content", async () => {
  const [recognize, preview] = await Promise.all([
    readFile(new URL("../src/app/api/listen/recognize/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/listen/preview-audio/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(recognize, /listen_recognition_completed/);
  assert.match(preview, /listen_preview_processed/);
  assert.match(recognize, /duration_ms/);
  assert.match(preview, /audio_bytes/);
  const telemetryLines = [...recognize.split("\n"), ...preview.split("\n")].filter((line) => line.includes("trackServerEvent"));
  assert.ok(telemetryLines.length >= 4);
  assert.ok(telemetryLines.every((line) => !/\btranscript\s*:|\baudio\s*:/.test(line)));
});

test("calibrated evaluation set separates quotations from ordinary speech", async () => {
  const evaluations = JSON.parse(await readFile(new URL("./fixtures/wisdom-listen-evals.json", import.meta.url), "utf8"));
  let recognized = 0;
  let falsePositives = 0;
  for (const evaluation of evaluations) {
    const candidates = retrieveVerifiedScriptureCandidatesForTranslation(evaluation.text, evaluation.translation ?? "WEB", 5);
    if (evaluation.expected) {
      if (candidates.slice(0, 3).some((candidate) => candidate.reference === evaluation.expected)) recognized += 1;
    } else if (candidates.some((candidate) => verifiedCandidateMatchLabel(candidate) !== "possible_echo")) {
      falsePositives += 1;
    }
  }
  const expectedCount = evaluations.filter((evaluation) => evaluation.expected).length;
  assert.ok(recognized / expectedCount >= 0.82, `recognition recall was ${recognized}/${expectedCount}`);
  assert.equal(falsePositives, 0, "ordinary speech must not be labeled as a quotation or likely paraphrase");
});
