"use client";

import Image from "next/image";
import { startTransition, useEffect, useRef, useState } from "react";
import { AletheiaApp } from "@/components/aletheia-app";

const splashText = {
  en: {
    tagline: "Wisdom for stewardship",
    preparing: "Preparing your app...",
    refreshing: "Refreshing services and loading your latest experience.",
  },
  es: {
    tagline: "Sabiduria para mayordomia",
    preparing: "Preparando tu app...",
    refreshing: "Actualizando servicios y cargando tu experiencia mas reciente.",
  },
  fr: {
    tagline: "Sagesse pour la gestion",
    preparing: "Preparation de votre app...",
    refreshing: "Actualisation des services et chargement de votre experience la plus recente.",
  },
  de: {
    tagline: "Weisheit fur verantwortliche Verwaltung",
    preparing: "Deine App wird vorbereitet...",
    refreshing: "Dienste werden aktualisiert und deine neueste Erfahrung wird geladen.",
  },
  pt: {
    tagline: "Sabedoria para mordomia",
    preparing: "Preparando seu app...",
    refreshing: "Atualizando servicos e carregando sua experiencia mais recente.",
  },
  yo: {
    tagline: "Ogbon fun itoju",
    preparing: "N pese app re sile...",
    refreshing: "N tunse awon ise ati kiko iriri re to kẹhin.",
  },
  ig: {
    tagline: "Amamihe maka nlekota",
    preparing: "Na akwadebe ngwa gi...",
    refreshing: "Na emelite oru ma na-ebunye ahumahia gi kacha nso.",
  },
  ha: {
    tagline: "Hikima don kulawa",
    preparing: "Ana shirya manhajar ka...",
    refreshing: "Ana sabunta ayyuka kuma ana loda sabon kwarewarka.",
  },
  tl: {
    tagline: "Karunungan para sa maingat na pamumuno",
    preparing: "Inihahanda ang app mo...",
    refreshing: "Ina-update ang mga serbisyo at nilo-load ang pinakabagong karanasan mo.",
  },
  ar: {
    tagline: "حكمة للتدبير الأمين",
    preparing: "جارٍ تجهيز التطبيق...",
    refreshing: "جارٍ تحديث الخدمات وتحميل أحدث تجربة لك.",
  },
  hi: {
    tagline: "दायित्वपूर्ण जीवन के लिए विवेक",
    preparing: "आपका ऐप तैयार किया जा रहा है...",
    refreshing: "सेवाएं अपडेट की जा रही हैं और आपका नवीनतम अनुभव लोड हो रहा है।",
  },
} as const;

const supportedSplashLanguages = new Set(["en", "es", "fr", "de", "pt", "yo", "ig", "ha", "tl", "ar", "hi"] as const);

const SPLASH_LAST_SHOWN_AT_KEY = "aletheia_splash_last_shown_at";

function readStoredSplashLanguage(): keyof typeof splashText {
  if (typeof window === "undefined") {
    return "en";
  }
  try {
    const saved = window.localStorage.getItem("aletheia_preferences");
    if (!saved) {
      return "en";
    }
    const parsed = JSON.parse(saved) as { language?: string };
    if (parsed.language && supportedSplashLanguages.has(parsed.language as keyof typeof splashText)) {
      return parsed.language as keyof typeof splashText;
    }
  } catch {
    // Keep English fallback if preferences are malformed.
  }
  return "en";
}

export default function HomeClientShell() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashLanguage, setSplashLanguage] = useState<keyof typeof splashText>("en");
  const [splashCopyReady, setSplashCopyReady] = useState(false);
  const lastHiddenAtRef = useRef<number | null>(null);

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
        if (active) {
          setShowSplash(false);
        }
      }, visibleMs);
    };

    try {
      const lastShownAt = Number(window.sessionStorage.getItem(SPLASH_LAST_SHOWN_AT_KEY) || "0");
      if (lastShownAt > 0 && Date.now() - lastShownAt > 12000) {
        queueMicrotask(() => {
          setShowSplash(false);
        });
        return;
      }
    } catch {
      // Ignore session storage errors.
    }

    showSplashFor(1400);

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
  }, []);

  return (
    <>
      <AletheiaApp />
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
              {splashText[splashLanguage].preparing}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
