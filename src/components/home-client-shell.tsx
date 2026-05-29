"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AletheiaApp } from "@/components/aletheia-app";

export default function HomeClientShell() {
  const [showSplash, setShowSplash] = useState(true);
  const runningRef = useRef(false);
  const lastHiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const runSplashCycle = async (reason: "launch" | "resume") => {
      if (!active || runningRef.current) {
        return;
      }
      runningRef.current = true;
      setShowSplash(true);

      const minDelayMs = reason === "launch" ? 1400 : 900;
      const hardTimeoutMs = reason === "launch" ? 5200 : 3200;

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
      runningRef.current = false;
    };

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
            <p className="mt-1 text-sm text-[#5a6a62]">Wisdom for stewardship</p>
            <p className="mt-4 text-base font-semibold text-[#203a35]">Preparing your app...</p>
            <p className="mt-1 text-xs text-[#6a7a72]">Refreshing services and loading your latest experience.</p>
            <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-[#c9d5cd]">
              <div className="h-full w-2/5 animate-[pulse_1.1s_ease-in-out_infinite] rounded-full bg-[#8a6b2f]" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
