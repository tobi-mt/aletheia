"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";
import { getTranslation, loadTranslationsSync } from "@/lib/translations";
import { installNativeWebFetchProxy } from "@/lib/native-web";

type SplashLanguage = "en" | "es" | "fr" | "de" | "pt" | "yo" | "ig" | "ha" | "tl" | "ar" | "hi";

const supportedSplashLanguages = new Set<SplashLanguage>(["en", "es", "fr", "de", "pt", "yo", "ig", "ha", "tl", "ar", "hi"]);
const LazyAletheiaApp = dynamic(
  () => import("@/components/aletheia-app").then((mod) => mod.AletheiaApp),
  { ssr: false, loading: () => null }
);

installNativeWebFetchProxy();

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
  const [splashVisible, setSplashVisible] = useState(true);
  const [launchReady, setLaunchReady] = useState(false);
  const [paintReady, setPaintReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
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
    let cancelled = false;
    const fonts = document.fonts;
    if (!fonts) {
      const fallbackFrame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(fallbackFrame);
      };
    }

    void fonts.ready
      .then(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!launchReady) {
      return;
    }

    let cancelled = false;
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setPaintReady(true);
        }
      });

      if (cancelled) {
        window.cancelAnimationFrame(secondFrame);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
    };
  }, [launchReady]);

  useEffect(() => {
    let active = true;
    let dismissTimer: number | null = null;
    let exitTimer: number | null = null;

    const clearTimers = () => {
      if (dismissTimer !== null) {
        window.clearTimeout(dismissTimer);
        dismissTimer = null;
      }

      if (exitTimer !== null) {
        window.clearTimeout(exitTimer);
        exitTimer = null;
      }
    };

    const hideSplash = () => {
      if (!active) {
        return;
      }

      setSplashVisible(false);
      if (exitTimer !== null) {
        window.clearTimeout(exitTimer);
      }
      exitTimer = window.setTimeout(() => {
        if (active && launchReady) {
          setShowSplash(false);
        }
      }, 440);
    };

    const showSplashFor = (visibleMs: number) => {
      setShowSplash(true);
      setSplashVisible(true);
      clearTimers();
      dismissTimer = window.setTimeout(() => {
        hideSplash();
      }, visibleMs);
    };

    if (launchReady && paintReady && fontsReady) {
      showSplashFor(160);
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
      clearTimers();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [launchReady, paintReady, fontsReady]);

  return (
    <>
      <LazyAletheiaApp onBootReady={() => setLaunchReady(true)} startupPaintReady={paintReady} />
      {showSplash ? (
        <div
          data-testid="app-launch-splash"
          className={`fixed inset-0 z-[160] flex items-center justify-center px-6 transition-[opacity,transform,filter] duration-500 ease-out ${splashVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-1 scale-[1.015]"}`}
          style={{
            background:
              "radial-gradient(circle at 50% 36%, rgba(134, 170, 155, 0.18), rgba(238, 242, 239, 0) 34%), radial-gradient(circle at 50% 82%, rgba(214, 180, 93, 0.15), rgba(238, 242, 239, 0) 28%), linear-gradient(160deg, #f7f8f4 0%, #edf2ed 54%, #e3ece5 100%)",
            backdropFilter: "blur(14px) saturate(110%)",
            WebkitBackdropFilter: "blur(14px) saturate(110%)",
          }}
          role="status"
          aria-live="polite"
        >
          <div className={`relative flex w-full max-w-sm flex-col items-center text-center transition-[opacity,transform] duration-500 ease-out ${splashVisible ? "opacity-100 translate-y-0" : "opacity-90 -translate-y-1"}`}>
            <div className="pointer-events-none absolute inset-x-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8fb3a4]/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d7bf7a]/10 blur-3xl" />

            <div className="relative size-36">
              <div
                className="absolute inset-0 rounded-full animate-[spin_10s_linear_infinite] motion-reduce:animate-none"
                style={{
                  background:
                    "conic-gradient(from 180deg, rgba(150, 185, 171, 0) 0deg, rgba(150, 185, 171, 0.72) 42deg, rgba(214, 180, 93, 0.95) 68deg, rgba(150, 185, 171, 0.78) 98deg, rgba(150, 185, 171, 0) 146deg, rgba(150, 185, 171, 0) 360deg)",
                  maskImage: "radial-gradient(circle, transparent 62%, black 64%)",
                  WebkitMaskImage: "radial-gradient(circle, transparent 62%, black 64%)",
                }}
              />
              <div className="absolute inset-[6px] rounded-full border border-[#d2ddd7] bg-white/30 shadow-[inset_0_0_24px_rgba(255,255,255,0.22)]" />
              <div className="absolute inset-[18px] overflow-hidden rounded-full border border-[#d2ddd7]/90 bg-[#f8faf5]/92 shadow-[0_10px_30px_rgba(65,83,74,0.12)]">
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
              <span className="pointer-events-none absolute left-2 top-8 size-2 rotate-45 rounded-[2px] bg-[#c9ac5e] shadow-[0_0_14px_rgba(201,172,94,0.45)] animate-pulse motion-reduce:animate-none" />
              <span className="pointer-events-none absolute right-5 top-6 size-1.5 rotate-45 rounded-[2px] bg-[#f4e7b9] shadow-[0_0_12px_rgba(244,231,185,0.5)] animate-pulse [animation-delay:-0.4s] motion-reduce:animate-none" />
              <span className="pointer-events-none absolute bottom-5 left-7 size-1.5 rotate-45 rounded-[2px] bg-[#7fa193] shadow-[0_0_12px_rgba(127,161,147,0.4)] animate-pulse [animation-delay:-0.7s] motion-reduce:animate-none" />
            </div>

            <p className={`mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[#395249] transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              Aletheia
            </p>
            <p className={`mt-2 text-sm text-[#41564d] transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              {appTagline}
            </p>
            <p className={`mt-1 text-[0.85rem] text-[#50665c] transition-opacity duration-300 ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>
              {loadingLabel}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
