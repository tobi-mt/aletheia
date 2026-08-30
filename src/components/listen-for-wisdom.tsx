"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Check, ChevronRight, FileText, Link2, Mic, MicOff, Save, Share2, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
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

export default function ListenForWisdom(props: Props) {
  const { mode, language, bibleTranslation, userSignedIn, thirdPartyAiConsent, onEnableThirdPartyAi, ts, theme, decisions, counselContacts, onOpenScripture, onReflect, onAttach, onShare } = props;
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
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

  const releaseRecorder = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

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
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("audio", new File([blob], `wisdom-listen.${blob.type.includes("mp4") ? "m4a" : "webm"}`, { type: blob.type || "audio/webm" }));
      formData.append("mode", mode);
      formData.append("language", language);
      formData.append("bibleTranslation", bibleTranslation);
      formData.append("thirdPartyAiConsent", String(thirdPartyAiConsent));
      const response = await fetch("/api/listen/recognize", { method: "POST", body: formData });
      const data = await response.json() as { result?: WisdomListenResult; errorCode?: string };
      if (!response.ok || !data.result) throw new Error(data.errorCode || "listen_failed");
      setResult(data.result);
    } catch (recognitionError) {
      const code = recognitionError instanceof Error ? recognitionError.message : "listen_failed";
      setError(ts(`listen.errors.${code}`, ts("listen.errors.listen_failed", "Aletheia could not recognize this clip. Please try again.")));
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError("");
    setResult(null);
    setPassageReads({});
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(ts("listen.errors.unsupportedDevice", "Recording is not available on this device."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      elapsedRef.current = 0;
      setElapsed(0);
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { setError(ts("listen.errors.interrupted", "Recording was interrupted. Please try again.")); releaseRecorder(); setRecording(false); };
      stream.getAudioTracks().forEach((track) => { track.onended = () => stopRecording(); });
      recorder.onstop = () => {
        releaseRecorder();
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (blob.size && elapsedRef.current >= 2) void recognize(blob);
        else setError(ts("listen.errors.tooShort", "Keep listening for at least two seconds."));
      };
      recorder.start(500);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_SECONDS) stopRecording();
      }, 1000);
    } catch (recordingError) {
      const name = recordingError instanceof DOMException ? recordingError.name : "";
      setError(name === "NotAllowedError" ? ts("listen.errors.permission", "Microphone permission was not granted.") : name === "NotFoundError" ? ts("listen.errors.noMicrophone", "No microphone was found on this device.") : ts("listen.errors.microphone", "Microphone access is needed to listen."));
      releaseRecorder();
    }
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
          {!result && !busy && thirdPartyAiConsent ? <>
            <div className="py-3 text-center">
              <button type="button" onClick={recording ? stopRecording : () => void startRecording()} className="mx-auto grid size-24 place-items-center rounded-full border-[6px] transition" style={{ borderColor: recording ? `${theme.accentGold}66` : theme.borderLight, backgroundColor: recording ? theme.primaryHover : theme.primary, color: theme.textOnPrimary }} aria-label={recording ? ts("listen.stop", "Stop and recognize") : ts("listen.start", "Start listening")}>
                {recording ? <MicOff size={30} /> : <Mic size={30} />}
              </button>
              <p className="mt-4 text-2xl font-semibold tabular-nums" style={{ color: theme.textPrimary }}>{formatElapsed(elapsed)} <span className="text-sm font-normal" style={{ color: theme.textMuted }}>/ 01:00</span></p>
              <p className="mt-1 text-sm font-semibold" style={{ color: theme.textPrimary }}>{recording ? ts("listen.recording", "Listening now") : ts("listen.tapToStart", "Tap to start")}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5" style={{ color: theme.textSecondary }}>{ts("listen.duration", "Best with 20–60 seconds of clear speech.")}</p>
            </div>
            <div className="flex items-start gap-2 border-t pt-3 text-xs leading-5" style={{ borderColor: theme.borderLight, color: theme.textMuted }}><ShieldCheck className="mt-0.5 shrink-0" size={14} /><span>{ts("listen.privacyNote", "Only record with permission. Audio is processed securely and is not retained by Aletheia.")}</span></div>
          </> : null}

          {busy ? <div className="py-10 text-center"><Sparkles className="mx-auto animate-pulse" size={26} style={{ color: theme.accentGold }} /><p className="mt-3 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.recognizing", "Checking verified Scripture…")}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5" style={{ color: theme.textSecondary }}>{ts("listen.recognizingBody", "Aletheia is finding candidates in the Bible corpus before interpreting them.")}</p></div> : null}
          {error ? <div role="alert" className="rounded-xl border p-3 text-sm" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgCardElevated, color: theme.textPrimary }}>{error}</div> : null}

          {result ? <ResultView result={result} reads={passageReads} isSaved={isSaved} saving={saving} action={action} setAction={setAction} decisionId={decisionId} setDecisionId={setDecisionId} contactId={contactId} setContactId={setContactId} decisions={decisions} counselContacts={counselContacts} ts={ts} theme={theme} onOpenScripture={(reference) => { closeTray(); onOpenScripture(reference); }} onSave={() => void saveCapture()} onReflect={() => { closeTray(); onReflect(result); }} onAttach={() => { onAttach(result, decisionId); setAction(null); }} onShare={() => { onShare(result, decisionId, contactId); setAction(null); }} onAgain={() => { setResult(null); setElapsed(0); setError(""); setAction(null); }} /> : null}

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
    <section className="border-t pt-4" style={{ borderColor: theme.borderMedium }}><p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>{ts("listen.interpretation", "Aletheia’s interpretation")}</p><h3 className="mt-2 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.counsel", "Counsel being offered")}</h3><p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{result.counsel}</p><h3 className="mt-3 text-sm font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.application", "How this may apply to your decision")}</h3><p className="mt-1 text-sm leading-6" style={{ color: theme.textSecondary }}>{result.application}</p></section>
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
  return <article className="rounded-xl border p-3.5" style={{ borderColor: theme.borderLight, backgroundColor: theme.bgCardElevated }}><div className="flex items-start justify-between gap-3"><button type="button" onClick={onOpen} className="text-left text-sm font-semibold underline underline-offset-4" style={{ color: theme.textPrimary }}>{match.reference}</button><span className="shrink-0 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: theme.borderMedium, color: theme.textSecondary }}>{ts(`listen.match.${match.strength}`, match.strength === "strong_wording" ? "Strong wording match" : match.strength === "likely_paraphrase" ? "Likely paraphrase" : "Possible thematic echo")}</span></div><p className="mt-2 text-sm leading-6" style={{ color: theme.textSecondary }}>{match.explanation}</p><details className="mt-3"><summary className="cursor-pointer text-xs font-semibold" style={{ color: theme.textPrimary }}>{ts("listen.context", "Read in context")}</summary><div className="mt-2 space-y-2 border-l-2 pl-3 text-sm leading-6" style={{ borderColor: theme.accentGold, color: theme.textSecondary }}>{before ? <p>{before}</p> : null}<p className="font-semibold" style={{ color: theme.textPrimary }}>{current}</p>{after ? <p>{after}</p> : null}</div><p className="mt-2 text-[10px]" style={{ color: theme.textMuted }}>{read ? ts("listen.preferredTranslation", "Shown in your selected translation") : ts("listen.verificationTranslation", "Verified against the World English Bible")}</p></details></article>;
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, theme }: { icon: typeof Save; label: string; onClick: () => void; disabled?: boolean; theme: Theme }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="h-10 shrink-0 whitespace-nowrap rounded-full border px-3 text-xs font-semibold disabled:opacity-55" style={{ borderColor: theme.borderMedium, backgroundColor: theme.bgInput, color: theme.textPrimary }}><Icon className="mr-1 inline" size={13} />{label}</button>;
}
