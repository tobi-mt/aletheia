"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, ChevronRight, FileText, Link2, Mic, MicOff, Radio, Save, Share2, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import type { BibleTranslation, LanguageCode } from "@/lib/localization";
import type { Mode } from "@/lib/wisdom-data";
import { normalizeStoredWisdomListenResult, type WisdomListenResult, type WisdomListenVerseMatch } from "@/lib/wisdom-listen";

const CAPTURES_KEY = "aletheia_wisdom_listen_captures_v2";
const MAX_SECONDS = 60;

type Theme = {
  primary: string; primaryHover: string; textOnPrimary: string; textPrimary: string; textSecondary: string;
  textMuted: string; bgCard: string; bgCardElevated: string; bgInput: string; borderLight: string; borderMedium: string; accentGold: string;
};

type Props = {
  mode: Mode;
  language: LanguageCode;
  bibleTranslation: BibleTranslation;
  userSignedIn: boolean;
  thirdPartyAiConsent: boolean;
  onEnableThirdPartyAi: () => void;
  ts: (key: string, fallback?: string) => string;
  theme: Theme;
  decisions: Array<{ id: string; title: string }>;
  counselContacts: Array<{ id: string; name: string }>;
  onOpenScripture: (reference: string) => void;
  onReflect: (result: WisdomListenResult) => void;
  onAttach: (result: WisdomListenResult, decisionId: string) => void;
  onShare: (result: WisdomListenResult, decisionId: string, contactId: string) => void;
};

type PassageRead = { translation: string; fallbackTranslation?: string; before: string; current: string; after: string };
type CandidateMovement = "emerging" | "strengthening" | "reconsidering" | "locked";
type LiveCandidate = { candidateId: string; reference: string; strength: WisdomListenVerseMatch["strength"]; evidence: string; movement?: CandidateMovement };

function storedCaptures() {
  if (typeof window === "undefined") return [] as WisdomListenResult[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CAPTURES_KEY) || "[]") as unknown;
    return Array.isArray(parsed)
      ? parsed.map(normalizeStoredWisdomListenResult).filter((item): item is WisdomListenResult => Boolean(item)).slice(0, 20)
      : [];
  } catch {
    return [] as WisdomListenResult[];
  }
}

function persistLocal(captures: WisdomListenResult[]) {
  try { window.localStorage.setItem(CAPTURES_KEY, JSON.stringify(captures.slice(0, 20))); } catch { /* Session state remains available. */ }
}

function formatElapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function recordingExtension(type: string) {
  const baseType = type.split(";")[0]?.toLowerCase();
  if (baseType === "audio/mp4" || baseType === "video/mp4" || baseType === "audio/x-m4a") return "m4a";
  if (baseType === "audio/aac") return "aac";
  if (baseType === "audio/ogg") return "ogg";
  if (baseType === "audio/mpeg") return "mp3";
  if (baseType === "audio/wav") return "wav";
  if (baseType === "audio/3gpp") return "3gp";
  return "webm";
}

export default function ListenForWisdom(props: Props) {
  const { mode, language, bibleTranslation, userSignedIn, thirdPartyAiConsent, onEnableThirdPartyAi, ts, theme, decisions, counselContacts, onOpenScripture, onReflect, onAttach, onShare } = props;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);
  const previewControllerRef = useRef<AbortController | null>(null);
  const previewInFlightRef = useRef(false);
  const candidateHistoryRef = useRef(new Map<string, { candidate: LiveCandidate; rank: number; observations: number }>());
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const pcmSampleRateRef = useRef(44_100);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mountedRef = useRef(true);
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WisdomListenResult | null>(null);
  const [captures, setCaptures] = useState<WisdomListenResult[]>(storedCaptures);
  const [action, setAction] = useState<"attach" | "share" | null>(null);
  const [decisionId, setDecisionId] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);
  const [passageReads, setPassageReads] = useState<Record<string, PassageRead>>({});
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveCandidates, setLiveCandidates] = useState<LiveCandidate[]>([]);
  const [signalLevel, setSignalLevel] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [rejectedCandidateIds, setRejectedCandidateIds] = useState<Set<string>>(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPhrase, setHelpPhrase] = useState("");
  const [helpBook, setHelpBook] = useState("");
  const [helpSpeaker, setHelpSpeaker] = useState("");
  const [helpTheme, setHelpTheme] = useState("");
  const [helpCandidates, setHelpCandidates] = useState<LiveCandidate[]>([]);
  const [helpBusy, setHelpBusy] = useState(false);

  const releaseRecorder = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    previewControllerRef.current?.abort();
    previewInFlightRef.current = false;
    if (meterFrameRef.current) window.cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    processorRef.current = null;
    setSignalLevel(0);
  }, []);

  function pcmWavBlob() {
    const sampleCount = pcmChunksRef.current.reduce((total, chunk) => total + chunk.length, 0);
    if (!sampleCount) return null;
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => { for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index)); };
    write(0, "RIFF"); view.setUint32(4, 36 + sampleCount * 2, true); write(8, "WAVE"); write(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, pcmSampleRateRef.current, true); view.setUint32(28, pcmSampleRateRef.current * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, sampleCount * 2, true);
    let offset = 44;
    for (const chunk of pcmChunksRef.current) {
      for (const sample of chunk) {
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([buffer], { type: "audio/wav" });
  }

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const interrupt = () => {
      if (document.visibilityState === "hidden") stopRecording();
    };
    document.addEventListener("visibilitychange", interrupt);
    window.addEventListener("pagehide", stopRecording);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", interrupt);
      window.removeEventListener("pagehide", stopRecording);
      stopRecording();
      releaseRecorder();
    };
  }, [releaseRecorder, stopRecording]);

  useEffect(() => {
    if (!userSignedIn) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const local = storedCaptures();
        const response = await fetch("/api/listen/captures", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { captures?: WisdomListenResult[] };
        const remote = Array.isArray(data.captures) ? data.captures : [];
        const remoteIds = new Set(remote.map((capture) => capture.id));
        const unsynced = local.filter((capture) => !remoteIds.has(capture.id) && capture.syncState !== "synced");
        const uploaded = await Promise.all(unsynced.map(async (capture) => {
          const saveResponse = await fetch("/api/listen/captures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capture }), signal: controller.signal });
          if (!saveResponse.ok) return capture;
          return ((await saveResponse.json()) as { capture: WisdomListenResult }).capture;
        }));
        const next = [...uploaded, ...remote].filter((capture, index, all) => all.findIndex((item) => item.id === capture.id) === index).slice(0, 50);
        if (mountedRef.current) setCaptures(next);
        persistLocal(next);
      } catch { /* Local captures remain available offline. */ }
    })();
    return () => controller.abort();
  }, [userSignedIn]);

  useEffect(() => {
    if (!result?.matches.length) return;
    const controller = new AbortController();
    void Promise.all(result.matches.map(async (match) => {
      try {
        const query = new URLSearchParams({ translation: bibleTranslation, book: match.book, chapter: String(match.chapter) });
        const response = await fetch(`/api/bible?${query}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { translation: string; fallbackTranslation?: string; verses?: Array<{ verse: number; text: string }> };
        const byVerse = new Map((data.verses ?? []).map((verse) => [verse.verse, verse.text]));
        setPassageReads((current) => ({ ...current, [match.candidateId]: { translation: data.translation, fallbackTranslation: data.fallbackTranslation, before: byVerse.get(match.verse - 1) ?? "", current: byVerse.get(match.verse) ?? "", after: byVerse.get(match.verse + 1) ?? "" } }));
      } catch { /* Verified WEB context remains visible if the preferred reading is unavailable. */ }
    }));
    return () => controller.abort();
  }, [bibleTranslation, result]);

  async function recognize(blob: Blob) {
    previewControllerRef.current?.abort();
    previewInFlightRef.current = false;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", new File([blob], `wisdom-listen.${recordingExtension(blob.type)}`, { type: blob.type || "audio/webm" }));
      formData.append("mode", mode);
      formData.append("language", language);
      formData.append("bibleTranslation", bibleTranslation);
      formData.append("thirdPartyAiConsent", String(thirdPartyAiConsent));
      formData.append("rejectedCandidateIds", JSON.stringify([...rejectedCandidateIds]));
      formData.append("durationSeconds", String(elapsedRef.current));
      const response = await fetch("/api/listen/recognize", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({})) as { result?: WisdomListenResult; errorCode?: string };
      if (!response.ok || !data.result) throw new Error(data.errorCode || "listen_failed");
      setResult(data.result);
      setLiveTranscript("");
      setLiveCandidates([]);
    } catch (recognitionError) {
      const code = recognitionError instanceof Error ? recognitionError.message : "listen_failed";
      setError(ts(`listen.errors.${code}`, ts("listen.errors.listen_failed", "Aletheia could not recognize this clip. Please try again.")));
      setElapsed(0);
      elapsedRef.current = 0;
    } finally {
      setBusy(false);
    }
  }

  async function previewRecordedAudio(mimeType: string) {
    if (previewInFlightRef.current || !chunksRef.current.length) return;
    const blob = pcmWavBlob() ?? new Blob([...chunksRef.current], { type: mimeType || "audio/webm" });
    if (!blob.size) return;
    previewInFlightRef.current = true;
    const controller = new AbortController();
    previewControllerRef.current = controller;
    setPreviewing(true);
    try {
      const formData = new FormData();
      formData.append("audio", new File([blob], `wisdom-preview.${recordingExtension(blob.type)}`, { type: blob.type || "audio/webm" }));
      formData.append("language", language);
      formData.append("bibleTranslation", bibleTranslation);
      formData.append("thirdPartyAiConsent", String(thirdPartyAiConsent));
      formData.append("durationSeconds", String(elapsedRef.current));
      const response = await fetch("/api/listen/preview-audio", { method: "POST", body: formData, signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json() as { transcript?: string; candidates?: LiveCandidate[] };
      if (typeof data.transcript === "string") setLiveTranscript(data.transcript);
      if (Array.isArray(data.candidates)) {
        const previous = candidateHistoryRef.current;
        const strengthOrder = { possible_echo: 0, likely_paraphrase: 1, strong_wording: 2 };
        const nextHistory = new Map<string, { candidate: LiveCandidate; rank: number; observations: number }>();
        const moving = data.candidates.filter((candidate) => !rejectedCandidateIds.has(candidate.candidateId)).map((candidate, rank) => {
          const prior = previous.get(candidate.candidateId);
          const observations = (prior?.observations ?? 0) + 1;
          const movement: CandidateMovement = candidate.strength === "strong_wording" && rank === 0 && observations >= 2
            ? "locked"
            : !prior ? "emerging"
              : rank < prior.rank || strengthOrder[candidate.strength] > strengthOrder[prior.candidate.strength] ? "strengthening"
                : rank > prior.rank ? "reconsidering" : "strengthening";
          const enriched = { ...candidate, movement };
          nextHistory.set(candidate.candidateId, { candidate: enriched, rank, observations });
          return enriched;
        });
        const reconsidered = [...previous.values()].filter(({ candidate }) => !nextHistory.has(candidate.candidateId) && !rejectedCandidateIds.has(candidate.candidateId)).slice(0, 1).map(({ candidate }) => ({ ...candidate, movement: "reconsidering" as const }));
        candidateHistoryRef.current = nextHistory;
        setLiveCandidates([...moving, ...reconsidered].slice(0, 4));
      }
    } catch { /* The full recording remains available for final recognition. */ }
    finally {
      if (!controller.signal.aborted) setPreviewing(false);
      previewInFlightRef.current = false;
    }
  }

  function startLiveFeedback(stream: MediaStream) {
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      processor.onaudioprocess = (event) => pcmChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(context.destination);
      processorRef.current = processor;
      pcmSampleRateRef.current = context.sampleRate;
      audioContextRef.current = context;
      void context.resume();
      const samples = new Uint8Array(analyser.fftSize);
      const updateMeter = () => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) energy += ((sample - 128) / 128) ** 2;
        setSignalLevel(Math.min(1, Math.sqrt(energy / samples.length) * 5));
        meterFrameRef.current = window.requestAnimationFrame(updateMeter);
      };
      updateMeter();
    } catch { /* Recording still works when an audio meter is unavailable. */ }

  }

  async function startRecording() {
    setError("");
    setResult(null);
    setPassageReads({});
    setLiveTranscript("");
    setLiveCandidates([]);
    setRejectedCandidateIds(new Set());
    candidateHistoryRef.current.clear();
    pcmChunksRef.current = [];
    setElapsed(0);
    elapsedRef.current = 0;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(ts("listen.errors.unsupportedDevice", "Recording is not available on this device."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      startLiveFeedback(stream);
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError(ts("listen.errors.interrupted", "Recording was interrupted. Please try again.")); releaseRecorder(); setRecording(false); };
      stream.getAudioTracks().forEach((track) => { track.onended = () => stopRecording(); });
      recorder.onstop = () => {
        releaseRecorder();
        setRecording(false);
        const blob = pcmWavBlob() ?? new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size && elapsedRef.current >= 2) void recognize(blob);
        else setError(ts("listen.errors.tooShort", "Keep listening for at least two seconds."));
      };
      recorder.start(500);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= 3 && (elapsedRef.current - 3) % 4 === 0) void previewRecordedAudio(recorder.mimeType);
        if (elapsedRef.current >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch (recordingError) {
      const name = recordingError instanceof DOMException ? recordingError.name : "";
      setError(name === "NotAllowedError" ? ts("listen.errors.permission", "Microphone permission was not granted.") : name === "NotFoundError" ? ts("listen.errors.noMicrophone", "No microphone was found on this device.") : ts("listen.errors.microphone", "Microphone access is needed to listen."));
      releaseRecorder();
    }
  }

  async function findWithClues() {
    if (helpBusy || ![helpPhrase, helpBook, helpSpeaker, helpTheme].some((value) => value.trim())) return;
    setHelpBusy(true);
    try {
      const response = await fetch("/api/listen/find", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase: helpPhrase, book: helpBook, speaker: helpSpeaker, theme: helpTheme, language, bibleTranslation }),
      });
      const data = await response.json().catch(() => ({})) as { candidates?: LiveCandidate[] };
      setHelpCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    } catch { setHelpCandidates([]); }
    finally { setHelpBusy(false); }
  }

  async function saveCapture() {
    if (!result || saving) return;
    setSaving(true);
    let saved: WisdomListenResult = { ...result, syncState: "local" };
    if (userSignedIn) {
      try {
        const response = await fetch("/api/listen/captures", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ capture: result }) });
        if (response.ok) saved = ((await response.json()) as { capture: WisdomListenResult }).capture;
      } catch { /* Save locally and sync on the next signed-in load. */ }
    }
    const next = [saved, ...captures.filter((capture) => capture.id !== saved.id)].slice(0, 50);
    setCaptures(next);
    persistLocal(next);
    setResult(saved);
    setSaving(false);
  }

  async function removeCapture(capture: WisdomListenResult) {
    const next = captures.filter((item) => item.id !== capture.id);
    setCaptures(next);
    persistLocal(next);
    if (userSignedIn && capture.syncState === "synced") await fetch(`/api/listen/captures/${encodeURIComponent(capture.id)}`, { method: "DELETE" }).catch(() => undefined);
    if (result?.id === capture.id) setResult(null);
  }

  function closeTray() {
    stopRecording();
    setOpen(false);
    setAction(null);
  }

  const isSaved = Boolean(result && captures.some((capture) => capture.id === result.id));
  return <>
    <button type="button" onClick={() => setOpen(true)} className="premium-tap-card flex w-full items-center gap-3 rounded-xl border p-3.5 text-left" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}><Mic size={18} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.compactTitle", "Listen for Scripture")}</span><span className="mt-0.5 block text-xs leading-5" style={{ color: theme.textSecondary }}>{ts("listen.compactBody", "Recognize a verse or counsel from a short recording.")}</span></span>
      <ChevronRight className="shrink-0" size={17} style={{ color: theme.textMuted }} />
    </button>

    {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeTray(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="wisdom-listen-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.6rem] border shadow-2xl sm:rounded-[1.6rem]" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCard }}>
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b p-4" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCard }}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}><Mic size={16} /></span>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts("listen.eyebrow", "Listen for wisdom")}</p><h2 id="wisdom-listen-title" className="mt-1 text-lg font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.title", "Recognize Scripture and counsel")}</h2></div>
          <button type="button" onClick={closeTray} className="grid size-9 shrink-0 place-items-center rounded-full border" style={{ borderColor: theme.borderMedium, color: theme.textPrimary }} aria-label={ts("listen.close", "Close listening tray")}><X size={16} /></button>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          {!result && !busy && !thirdPartyAiConsent ? <div className="rounded-xl border p-4" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0" size={18} style={{ color: theme.accentGold }} /><div><h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.aiConsentTitle", "Allow secure audio recognition")}</h3><p className="mt-1 text-xs leading-5" style={{ color: theme.textSecondary }}>{ts("listen.aiConsentBody", "Your short recording is sent to OpenAI for transcription and candidate ranking. Aletheia does not retain the audio.")}</p><p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>{ts("listen.aiConsentControl", "You can turn third-party AI processing off anytime in Account settings.")}</p><button type="button" onClick={onEnableThirdPartyAi} className="mt-3 min-h-10 rounded-full px-4 text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{ts("listen.aiConsentAllow", "Allow and continue")}</button></div></div></div> : null}
          {!result && !busy && thirdPartyAiConsent && !helpOpen ? <>
            <div className="py-3 text-center">
              <button type="button" onClick={recording ? stopRecording : () => void startRecording()} className="mx-auto grid size-24 place-items-center rounded-full border-[6px] transition duration-150" style={{ borderColor: recording ? `${theme.accentGold}${Math.round(45 + signalLevel * 50).toString(16).padStart(2, "0")}` : theme.borderLight, backgroundColor: recording ? theme.primaryHover : theme.primary, color: theme.textOnPrimary, transform: recording ? `scale(${1 + signalLevel * 0.08})` : "scale(1)", boxShadow: recording ? `0 0 ${12 + signalLevel * 28}px ${theme.accentGold}33` : "none" }} aria-label={recording ? ts("listen.stop", "Stop and recognize") : ts("listen.start", "Start listening")}>
                {recording ? <MicOff size={30} /> : <Mic size={30} />}
              </button>
              <p className="mt-4 text-2xl font-semibold tabular-nums" style={{ color: theme.textPrimary }}>{formatElapsed(elapsed)} <span className="text-sm font-normal" style={{ color: theme.textMuted }}>/ 01:00</span></p>
              <p className="mt-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{recording ? ts("listen.recording", "Listening now") : ts("listen.tapToStart", "Tap to start")}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5" style={{ color: theme.textSecondary }}>{recording ? (signalLevel > 0.015 ? ts("listen.signalGood", "I can hear you—keep going.") : ts("listen.signalQuiet", "Listening—keep speaking naturally.")) : ts("listen.duration", "Best with 20–60 seconds of clear speech.")}</p>
            </div>
            {recording ? <div className="border-t pt-3" style={{ borderColor: theme.borderLight }} aria-live="polite">
              <div className="flex items-center gap-2"><Radio className={previewing ? "animate-pulse" : ""} size={14} style={{ color: theme.accentGold }} /><p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>{previewing ? ts("listen.updatingGuess", "Updating the match…") : ts("listen.liveClues", "Live clues")}</p></div>
              {liveTranscript ? <p className="mt-2 line-clamp-3 text-sm leading-6" style={{ color: theme.textSecondary }}><span className="font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.hearing", "I’m hearing:")} </span>{liveTranscript}</p> : <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>{ts("listen.waitingForWords", "Listening for distinctive words or a spoken reference…")}</p>}
              {liveCandidates.length ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{liveCandidates.map((candidate, index) => <div key={candidate.candidateId} className="relative shrink-0 rounded-lg border px-3 py-2 pr-9 text-left" style={{ borderColor: candidate.movement === "locked" ? theme.accentGold : theme.borderLight, backgroundColor: theme.bgCardElevated, opacity: candidate.movement === "reconsidering" ? 0.62 : 1 }}><button type="button" className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full" aria-label={ts("listen.rejectCandidate", "Not this passage")} onClick={() => { setRejectedCandidateIds((current) => new Set(current).add(candidate.candidateId)); setLiveCandidates((current) => current.filter((item) => item.candidateId !== candidate.candidateId)); }}><X size={12} /></button><span className="block text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: candidate.movement === "locked" ? theme.accentGold : theme.textMuted }}>{ts(`listen.movement.${candidate.movement ?? "emerging"}`, candidate.movement === "locked" ? "Locked" : candidate.movement === "strengthening" ? "Strengthening" : candidate.movement === "reconsidering" ? "Reconsidering" : index === 0 ? "Emerging best guess" : "Emerging")}</span><span className="mt-0.5 block text-sm font-semibold" style={{ color: theme.textPrimary }}>{candidate.reference}</span><span className="mt-0.5 block text-[10px]" style={{ color: theme.textSecondary }}>{ts(`listen.match.${candidate.strength}`, candidate.strength === "strong_wording" ? "Strong wording match" : candidate.strength === "likely_paraphrase" ? "Likely paraphrase" : "Possible thematic echo")}</span></div>)}</div> : null}
              <p className="mt-2 text-[10px] leading-4" style={{ color: theme.textMuted }}>{ts("listen.provisional", "Guesses may change as Aletheia hears more. Final references are verified after you stop.")}</p>
              <p className="mt-1 text-[10px] leading-4" style={{ color: theme.textMuted }}>{ts("listen.livePrivacyNote", "Live clues securely check periodic audio snapshots with OpenAI. Aletheia does not retain the audio.")}</p>
            </div> : null}
            <div className="flex items-start gap-2 border-t pt-3 text-xs leading-5" style={{ borderColor: theme.borderLight, color: theme.textMuted }}><ShieldCheck className="mt-0.5 shrink-0" size={14} /><span>{ts("listen.privacyNote", "Only record with permission. Audio is processed securely and is not retained by Aletheia.")}</span></div>
          </> : null}

          {busy ? <div className="py-10 text-center"><Sparkles className="mx-auto animate-pulse" size={26} style={{ color: theme.accentGold }} /><p className="mt-3 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.recognizing", "Checking verified Scripture…")}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5" style={{ color: theme.textSecondary }}>{ts("listen.recognizingBody", "Aletheia is finding candidates in the Bible corpus before interpreting them.")}</p></div> : null}
          {error ? <div role="alert" className="rounded-xl border p-3.5" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}><p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.tryAgainTitle", "Let’s try that again")}</p><p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{error}</p><p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>{ts("listen.tryAgainHint", "Move closer to the speaker, reduce background noise, and include a few distinctive words—or say the reference aloud.")}</p><button type="button" onClick={() => { setHelpPhrase(liveTranscript); setHelpOpen(true); }} className="mt-3 text-xs font-semibold underline underline-offset-4" style={{ color: theme.textPrimary }}>{ts("listen.helpFind", "Help Aletheia find it")}</button></div> : null}

          {!result && !recording && !busy && !error ? <button type="button" onClick={() => setHelpOpen((value) => !value)} className="w-full text-center text-xs font-semibold underline underline-offset-4" style={{ color: theme.textSecondary }}>{ts("listen.helpFind", "Help Aletheia find it")}</button> : null}
          {helpOpen && !recording && !busy ? <section className="border-t pt-4" style={{ borderColor: theme.borderLight }}><h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.helpTitle", "What do you remember?")}</h3><p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>{ts("listen.helpBody", "Correct the words we heard or add any clue. Aletheia will search verified Scripture only.")}</p><textarea value={helpPhrase} onChange={(event) => setHelpPhrase(event.target.value)} rows={3} placeholder={ts("listen.phrasePlaceholder", "A phrase or corrected transcript")} className="mt-3 w-full rounded-lg border p-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} /><div className="mt-2 grid grid-cols-2 gap-2"><input value={helpBook} onChange={(event) => setHelpBook(event.target.value)} placeholder={ts("listen.bookPlaceholder", "Possible book")} className="h-10 rounded-lg border px-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} /><input value={helpSpeaker} onChange={(event) => setHelpSpeaker(event.target.value)} placeholder={ts("listen.speakerPlaceholder", "Speaker or setting")} className="h-10 rounded-lg border px-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} /></div><input value={helpTheme} onChange={(event) => setHelpTheme(event.target.value)} placeholder={ts("listen.themePlaceholder", "Theme, such as courage or counsel")} className="mt-2 h-10 w-full rounded-lg border px-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }} /><button type="button" disabled={helpBusy} onClick={() => void findWithClues()} className="mt-3 h-10 rounded-full px-4 text-xs font-semibold disabled:opacity-50" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{helpBusy ? ts("listen.searchingClues", "Searching verified Scripture…") : ts("listen.searchClues", "Search with these clues")}</button>{!helpBusy && helpCandidates.length ? <div className="mt-3 space-y-2">{helpCandidates.map((candidate) => <div key={candidate.candidateId} className="flex items-center gap-2 border-t py-2" style={{ borderColor: theme.borderLight }}><button type="button" onClick={() => { closeTray(); onOpenScripture(candidate.reference); }} className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold" style={{ color: theme.textPrimary }}>{candidate.reference}</span><span className="block text-[10px]" style={{ color: theme.textMuted }}>{ts(`listen.match.${candidate.strength}`, "Possible thematic echo")}</span></button><button type="button" aria-label={ts("listen.rejectCandidate", "Not this passage")} onClick={() => setHelpCandidates((current) => current.filter((item) => item.candidateId !== candidate.candidateId))} className="grid size-8 place-items-center rounded-full"><X size={13} /></button></div>)}</div> : null}{!helpBusy && helpCandidates.length === 0 && [helpPhrase, helpBook, helpSpeaker, helpTheme].some((value) => value.trim()) ? <p className="mt-3 text-xs" style={{ color: theme.textMuted }}>{ts("listen.noClueMatch", "No verified match yet. Try one more distinctive word or a possible book.")}</p> : null}</section> : null}

          {result ? <ResultView result={result} reads={passageReads} isSaved={isSaved} saving={saving} action={action} setAction={setAction} decisionId={decisionId} setDecisionId={setDecisionId} contactId={contactId} setContactId={setContactId} decisions={decisions} counselContacts={counselContacts} ts={ts} theme={theme} onOpenScripture={(reference) => { closeTray(); onOpenScripture(reference); }} onSave={() => void saveCapture()} onReflect={() => { closeTray(); onReflect(result); }} onAttach={() => { onAttach(result, decisionId); setAction(null); }} onShare={() => { onShare(result, decisionId, contactId); setAction(null); }} onAgain={() => { setResult(null); setElapsed(0); setError(""); setAction(null); }} /> : null}
          {result ? <button type="button" onClick={() => { setHelpPhrase(result.transcript); setHelpOpen(true); }} className="w-full text-center text-xs font-semibold underline underline-offset-4" style={{ color: theme.textSecondary }}>{ts("listen.correctTranscript", "Correct words or search with more clues")}</button> : null}

          {!result && !recording && !busy && captures.length ? <section className="border-t pt-4" style={{ borderColor: theme.borderLight }}><div className="flex items-center gap-2"><BookOpen size={15} style={{ color: theme.accentGold }} /><h3 className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.savedCaptures", "Saved from listening")}</h3></div><div className="mt-3 space-y-2">{captures.slice(0, 5).map((capture) => <div key={capture.id} className="flex items-center gap-2 rounded-xl border p-3" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}><button type="button" onClick={() => setResult(capture)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold" style={{ color: theme.textPrimary }}>{capture.matches[0]?.reference || ts("listen.savedCounsel", "Saved counsel")}</span><span className="mt-1 block truncate text-xs" style={{ color: theme.textSecondary }}>{capture.counsel}</span></button><button type="button" onClick={() => void removeCapture(capture)} className="grid size-9 shrink-0 place-items-center rounded-full" aria-label={ts("listen.remove", "Remove saved capture")} style={{ color: theme.textMuted }}><Trash2 size={15} /></button></div>)}</div></section> : null}
        </div>
      </section>
    </div>, document.body) : null}
  </>;
}

function ResultView({ result, reads, isSaved, saving, action, setAction, decisionId, setDecisionId, contactId, setContactId, decisions, counselContacts, ts, theme, onOpenScripture, onSave, onReflect, onAttach, onShare, onAgain }: {
  result: WisdomListenResult; reads: Record<string, PassageRead>; isSaved: boolean; saving: boolean; action: "attach" | "share" | null; setAction: (value: "attach" | "share" | null) => void; decisionId: string; setDecisionId: (value: string) => void; contactId: string; setContactId: (value: string) => void; decisions: Array<{ id: string; title: string }>; counselContacts: Array<{ id: string; name: string }>; ts: Props["ts"]; theme: Theme; onOpenScripture: (reference: string) => void; onSave: () => void; onReflect: () => void; onAttach: () => void; onShare: () => void; onAgain: () => void;
}) {
  return <div className="space-y-4">
    <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.accentGold }}>{ts("listen.recognized", "Verified candidates")}</p><h3 className="mt-1 text-base font-semibold" style={{ color: theme.textPrimary }}>{result.matches.length ? ts("listen.possibleMatches", "Possible Scripture matches") : ts("listen.noMatch", "No supported Scripture match")}</h3><p className="mt-1 text-xs leading-5" style={{ color: theme.textMuted }}>{ts("listen.verifiedNote", "Every reference below came from Aletheia’s Bible corpus. Match wording describes evidence, not certainty.")}</p></div>
    {result.matches.map((match) => <VerifiedMatch key={match.candidateId} match={match} read={reads[match.candidateId]} ts={ts} theme={theme} onOpen={() => onOpenScripture(match.reference)} />)}
    <section className="border-t pt-4" style={{ borderColor: theme.borderMedium }}><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{ts("listen.interpretation", "Aletheia’s interpretation")}</p>{result.counsel || result.application ? <><h3 className="mt-2 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.counsel", "Counsel being offered")}</h3><p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{result.counsel}</p><h3 className="mt-3 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.application", "How this may apply to your decision")}</h3><p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{result.application}</p></> : <p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{ts("listen.interpretationUnavailable", "The verified matches are ready, but interpretation is temporarily unavailable. Review the passage in context before applying it.")}</p>}</section>
    <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      <ActionButton icon={isSaved ? Check : Save} label={isSaved ? ts("listen.saved", "Saved") : saving ? ts("listen.saving", "Saving…") : ts("listen.save", "Save to Library")} onClick={onSave} disabled={isSaved || saving} theme={theme} />
      <ActionButton icon={FileText} label={ts("listen.reflect", "Reflect")} onClick={onReflect} theme={theme} />
      <ActionButton icon={Link2} label={ts("listen.attach", "Attach to decision")} onClick={() => setAction("attach")} theme={theme} />
      <ActionButton icon={Share2} label={ts("listen.share", "Share with counsel")} onClick={() => setAction("share")} theme={theme} />
    </div>
    {action ? <div className="rounded-xl border p-3.5" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated }}><p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>{action === "share" ? ts("listen.chooseShare", "Choose a decision and trusted person") : ts("listen.chooseDecision", "Choose a decision")}</p>{decisions.length ? <select value={decisionId} onChange={(event) => setDecisionId(event.target.value)} className="mt-3 h-11 w-full rounded-lg border px-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}><option value="">{ts("listen.selectDecision", "Select a decision")}</option>{decisions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select> : <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>{ts("listen.noDecisions", "Track a decision first to attach this counsel.")}</p>}{action === "share" && counselContacts.length ? <select value={contactId} onChange={(event) => setContactId(event.target.value)} className="mt-2 h-11 w-full rounded-lg border px-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}><option value="">{ts("listen.selectCounsel", "Select a trusted person")}</option>{counselContacts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}{action === "share" && !counselContacts.length ? <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>{ts("listen.noCounsel", "Add someone to your Counsel Circle before sharing.")}</p> : null}<div className="mt-3 flex gap-2"><button type="button" onClick={() => setAction(null)} className="h-10 rounded-lg border px-3 text-xs font-semibold" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>{ts("listen.cancel", "Cancel")}</button><button type="button" disabled={!decisionId || (action === "share" && !contactId)} onClick={action === "share" ? onShare : onAttach} className="h-10 rounded-lg px-3 text-xs font-semibold disabled:opacity-45" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{action === "share" ? ts("listen.shareNow", "Share summary") : ts("listen.attachNow", "Attach")}</button></div></div> : null}
    <button type="button" onClick={onAgain} className="w-full py-2 text-xs font-semibold" style={{ color: theme.textSecondary }}>{ts("listen.listenAgain", "Listen again")}</button>
  </div>;
}

function VerifiedMatch({ match, read, ts, theme, onOpen }: { match: WisdomListenVerseMatch; read?: PassageRead; ts: Props["ts"]; theme: Theme; onOpen: () => void }) {
  const before = read?.before || match.contextBefore;
  const current = read?.current || match.verifiedText;
  const after = read?.after || match.contextAfter;
  return <article className="rounded-xl border p-3.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}><div className="flex items-start justify-between gap-3"><button type="button" onClick={onOpen} className="text-left text-sm font-semibold underline underline-offset-4" style={{ color: theme.textPrimary }}>{match.reference}</button><span className="shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>{ts(`listen.match.${match.strength}`, match.strength === "strong_wording" ? "Strong wording match" : match.strength === "likely_paraphrase" ? "Likely paraphrase" : "Possible thematic echo")}</span></div><p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{match.explanation || ts("listen.matchEvidence", "Recovered directly from verified Scripture wording.")}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.context", "Read in context")}</summary><div className="mt-2 space-y-2 border-l-2 pl-3 text-sm leading-6" style={{ borderColor: theme.accentGold, color: theme.textSecondary }}>{before ? <p>{before}</p> : null}<p className="font-semibold" style={{ color: theme.textPrimary }}>{current}</p>{after ? <p>{after}</p> : null}</div><p className="mt-2 text-[10px]" style={{ color: theme.textMuted }}>{read ? ts("listen.preferredTranslation", "Shown in your selected translation") : ts("listen.verificationTranslation", "Verified against the World English Bible")}</p></details></article>;
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, theme }: { icon: typeof Save; label: string; onClick: () => void; disabled?: boolean; theme: Theme }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="h-10 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold disabled:opacity-55" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}><Icon className="mr-1 inline" size={13} />{label}</button>;
}
