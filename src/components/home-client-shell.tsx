"use client";

import { useEffect, useState } from "react";
import { AletheiaApp } from "@/components/aletheia-app";

export default function HomeClientShell() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#eef2ef] text-[#203a35]">
        <p className="text-sm">Loading Aletheia...</p>
      </main>
    );
  }

  return <AletheiaApp />;
}
