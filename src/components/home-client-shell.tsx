"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";
import { getTranslation, loadTranslationsSync } from "@/lib/translations";

type SplashLanguage = "en" | "es" | "fr" | "de" | "pt" | "yo" | "ig" | "ha" | "tl" | "ar" | "hi";

const supportedSplashLanguages = new Set<SplashLanguage>(["en", "es", "fr", "de", "pt", "yo", "ig", "ha", "tl", "ar", "hi"]);
const LazyAletheiaApp = dynamic(
  () => import("@/components/aletheia-app").then((mod) => mod.AletheiaApp),
  { ssr: false, loading: () => null }
);

function readStoredSplashLanguage(): SplashLanguage {
  if (typeof window === "undefined") {
    return "en";
  }
  try {
    const saved = window.localStorage.getItem("aletheia_preferences");
    if (!saved) {
      return "en";
    }
    const parsed = JSON.parse(saved) as { language?: string };
    if (parsed.language && supportedSplashLanguages.has(parsed.language as SplashLanguage)) {
      return parsed.language as SplashLanguage;
    }
  } catch {
    // Keep English fallback if preferences are malformed.
  }
  return "en";
}

export default function HomeClientShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [launchReady, setLaunchReady] = useState(false);
  const [splashLanguage, setSplashLanguage] = useState<SplashLanguage>("en");
  const [splashCopyReady, setSplashCopyReady] = useState(false);
  const lastHiddenAtRef = useRef<number | null>(null);
  const splashTranslations = loadTranslationsSync(splashLanguage);
  const appTagline = String(getTranslation(splashTranslations, "labels.appTagline", "Curated wisdom, translation-aware."));
  const loadingLabel = String(getTranslation(splashTranslations, "labels.loading", "Loading…"));

  useEffect(() => {
    const nextLanguage = readStoredSplashLanguage();
    const firstFrame = window.requestAnimationFrame(() => {
      startTransition(() => {
        if (nextLanguage !== "en") {
          setSplashLanguage(nextLanguage);
        }
        setSplashCopyReady(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let dismissTimer: number | null = null;
    const showSplashFor = (visibleMs: number) => {
      setShowSplash(true);
      if (dismissTimer !== null) {
        window.clearTimeout(dismissTimer);
      }
      dismissTimer = window.setTimeout(() => {
        if (active && launchReady) {
          setShowSplash(false);
        }
      }, visibleMs);
    };

    if (launchReady) {
      showSplashFor(180);
    } else {
      setShowSplash(true);
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        lastHiddenAtRef.current = Date.now();
        return;
      }

      const lastHiddenAt = lastHiddenAtRef.current;
      if (!lastHiddenAt) {
        return;
      }
      const hiddenForMs = Date.now() - lastHiddenAt;
      lastHiddenAtRef.current = null;

      if (hiddenForMs >= 5000) {
        showSplashFor(900);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      if (dismissTimer !== null) {
        window.clearTimeout(dismissTimer);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [launchReady]);

  return (
    <>
      <LazyAletheiaApp onBootReady={() => setLaunchReady(true)} />
      {showSplash ? (
        <div
          data-testid="app-launch-splash"
          className="fixed inset-0 z-[160] flex items-center justify-center px-6"
          style={{
            background:
              "radial-gradient(circle at 50% 38%, rgba(99, 146, 129, 0.14), rgba(8, 19, 17, 0) 34%), radial-gradient(circle at 50% 82%, rgba(138, 107, 47, 0.14), rgba(8, 19, 17, 0) 26%), linear-gradient(160deg, #07110f 0%, #0b1513 52%, #101c19 100%)",
            backdropFilter: "blur(16px) saturate(120%)",
            WebkitBackdropFilter: "blur(16px) saturate(120%)",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="relative flex w-full max-w-sm flex-col items-center text-center">
            <div className="pointer-events-none absolute inset-x-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6d8f82]/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8a6b2f]/10 blur-3xl" />

            <div className="relative size-36">
              <div
                className="absolute inset-0 rounded-full animate-[spin_10s_linear_infinite] motion-reduce:animate-none"
                style={{
                  background:
                    "conic-gradient(from 180deg, rgba(215,191,122,0) 0deg, rgba(215,191,122,0.9) 40deg, rgba(245,225,174,0.98) 64deg, rgba(149,185,171,0.95) 92deg, rgba(215,191,122,0) 140deg, rgba(215,191,122,0) 360deg)",
                  maskImage: "radial-gradient(circle, transparent 62%, black 64%)",
                  WebkitMaskImage: "radial-gradient(circle, transparent 62%, black 64%)",
                }}
              />
              <div className="absolute inset-[6px] rounded-full border border-white/6 bg-white/3 shadow-[inset_0_0_24px_rgba(255,255,255,0.04)]" />
              <div className="absolute inset-[18px] overflow-hidden rounded-full border border-white/10 bg-[#f1f4ef]/8 shadow-[0_10px_30px_rgba(0,0,0,0.26)]">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.22),rgba(255,255,255,0)_62%)]" />
                <Image
                  src="/brand/aletheia-app-icon-192.png"
                  alt="Aletheia"
                  fill
                  sizes="100px"
                  className="object-cover"
                  priority
                />
              </div>
              <span className="pointer-events-none absolute left-2 top-8 size-2 rotate-45 rounded-[2px] bg-[#d7bf7a] shadow-[0_0_14px_rgba(215,191,122,0.55)] animate-pulse motion-reduce:animate-none" />
              <span className="pointer-events-none absolute right-5 top-6 size-1.5 rotate-45 rounded-[2px] bg-[#f3e2ab] shadow-[0_0_12px_rgba(243,226,171,0.55)] animate-pulse [animation-delay:-0.4s] motion-reduce:animate-none" />
              <span className="pointer-events-none absolute bottom-5 left-7 size-1.5 rotate-45 rounded-[2px] bg-[#8cb5a6] shadow-[0_0_12px_rgba(140,181,166,0.45)] animate-pulse [animation-delay:-0.7s] motion-reduce:animate-none" />
            </div>

            <p className={`mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#d7e1db] transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              Aletheia
            </p>
            <p className={`mt-2 text-sm text-[#d4ddd7] transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              {appTagline}
            </p>
            <p className={`mt-1 text-[0.85rem] text-[#d4ddd7]/90 transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              {loadingLabel}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
