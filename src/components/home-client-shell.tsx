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
  const runningRef = useRef(false);
  const lastHiddenAtRef = useRef<number | null>(null);
  const splashCycleIdRef = useRef(0);

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
    let hardDismissTimer: number | null = null;

    const runSplashCycle = async (reason: "launch" | "resume") => {
      if (!active || runningRef.current) {
        return;
      }

      splashCycleIdRef.current += 1;
      runningRef.current = true;
      setShowSplash(true);

      const minDelayMs = reason === "launch" ? 1400 : 900;
      const hardTimeoutMs = reason === "launch" ? 5200 : 3200;
      const shownAt = Date.now();

      try {
        window.sessionStorage.setItem(SPLASH_LAST_SHOWN_AT_KEY, String(shownAt));
      } catch {
        // Ignore storage failures in private browsing or restricted sessions.
      }

      if (hardDismissTimer !== null) {
        window.clearTimeout(hardDismissTimer);
      }
      hardDismissTimer = window.setTimeout(() => {
        if (!active) {
          return;
        }
        runningRef.current = false;
        setShowSplash(false);
      }, hardTimeoutMs + 800);

      const minDelay = new Promise<void>((resolve) => {
        window.setTimeout(resolve, minDelayMs);
      });

      const domReady =
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              const onLoad = () => {
                window.removeEventListener("load", onLoad);
                resolve();
              };
              window.addEventListener("load", onLoad, { once: true });
            });

      const serviceWorkerReady =
        "serviceWorker" in navigator
          ? Promise.race([
              navigator.serviceWorker.ready
                .then((registration) => registration.update().catch(() => undefined))
                .catch(() => undefined),
              new Promise<void>((resolve) => {
                window.setTimeout(resolve, 1800);
              }),
            ])
          : Promise.resolve();

      const overallTimeout = new Promise<void>((resolve) => {
        window.setTimeout(resolve, hardTimeoutMs);
      });

      await Promise.race([
        Promise.all([minDelay, domReady, serviceWorkerReady]).then(() => undefined),
        overallTimeout,
      ]);

      if (active) {
        setShowSplash(false);
      }
      if (hardDismissTimer !== null) {
        window.clearTimeout(hardDismissTimer);
        hardDismissTimer = null;
      }
      runningRef.current = false;
    };

    try {
      const lastShownAt = Number(window.sessionStorage.getItem(SPLASH_LAST_SHOWN_AT_KEY) || "0");
      if (lastShownAt > 0 && Date.now() - lastShownAt > 12000) {
        window.setTimeout(() => {
          if (active) {
            setShowSplash(false);
          }
        }, 0);
      }
    } catch {
      // Ignore session storage errors.
    }

    void runSplashCycle("launch");

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
        void runSplashCycle("resume");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      if (hardDismissTimer !== null) {
        window.clearTimeout(hardDismissTimer);
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
              "radial-gradient(circle at 22% 10%, rgba(74, 118, 105, 0.28), rgba(238, 242, 239, 0) 52%), linear-gradient(140deg, rgba(238, 242, 239, 0.97), rgba(227, 236, 232, 0.94))",
            backdropFilter: "blur(12px) saturate(120%)",
            WebkitBackdropFilter: "blur(12px) saturate(120%)",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-3xl border border-[#b8c9bf] bg-[rgba(248,252,249,0.9)] px-7 py-8 text-center shadow-[0_28px_80px_rgba(12,20,16,0.24)]">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#b8c9bf] bg-[#f4f7f2]">
              <div className="relative h-14 w-14 animate-pulse overflow-hidden rounded-xl">
                <Image
                  src="/brand/aletheia-app-icon-192.png"
                  alt="Aletheia"
                  fill
                  sizes="56px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#5a6a62]">Aletheia</p>
            <p className={`mt-1 text-sm text-[#5a6a62] ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>{splashText[splashLanguage].tagline}</p>
            <p className={`mt-4 text-base font-semibold text-[#203a35] ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>{splashText[splashLanguage].preparing}</p>
            <p className={`mt-1 text-xs text-[#6a7a72] ${splashCopyReady ? "opacity-100" : "opacity-0"}`}>{splashText[splashLanguage].refreshing}</p>
            <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-[#c9d5cd]">
              <div className="h-full w-2/5 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-[#8a6b2f]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
