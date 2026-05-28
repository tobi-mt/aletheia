"use client";

import { useSyncExternalStore } from "react";
import { AletheiaApp } from "@/components/aletheia-app";

export default function HomeClientShell() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#eef2ef] text-[#203a35]">
        <p className="text-sm">Loading Aletheia...</p>
      </main>
    );
  }

  return <AletheiaApp />;
}
