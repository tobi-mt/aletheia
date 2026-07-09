const STARTUP_TRACE_ENABLED =
  process.env.NEXT_PUBLIC_NATIVE_WEB_BUNDLE === "1" ||
  process.env.NEXT_PUBLIC_STARTUP_TRACE === "1" ||
  (typeof window !== "undefined" && window.location.protocol === "capacitor:");

const STARTUP_TRACE_STARTED_AT = typeof performance !== "undefined" && typeof performance.now === "function"
  ? performance.now()
  : Date.now();

let startupTraceSequence = 0;

function getStartupElapsedMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return Math.round(performance.now() - STARTUP_TRACE_STARTED_AT);
  }

  return Date.now() - STARTUP_TRACE_STARTED_AT;
}

export function traceStartup(step: string, details?: Record<string, unknown>) {
  if (!STARTUP_TRACE_ENABLED || typeof window === "undefined") {
    return;
  }

  startupTraceSequence += 1;
  const label = `[startup:${startupTraceSequence}] ${step} +${getStartupElapsedMs()}ms`;
  if (details && Object.keys(details).length > 0) {
    console.warn(label, details);
    return;
  }

  console.warn(label);
}

export function traceStartupError(step: string, error: unknown, details?: Record<string, unknown>) {
  if (!STARTUP_TRACE_ENABLED || typeof window === "undefined") {
    return;
  }

  const payload: Record<string, unknown> = {
    error,
  };

  if (details && Object.keys(details).length > 0) {
    Object.assign(payload, details);
  }

  console.error(`[startup] ${step} +${getStartupElapsedMs()}ms`, payload);
}
