const STARTUP_TRACE_ENABLED =
  process.env.NEXT_PUBLIC_NATIVE_WEB_BUNDLE === "1" ||
  process.env.NEXT_PUBLIC_STARTUP_TRACE === "1" ||
  (typeof window !== "undefined" && window.location.protocol === "capacitor:");

const STARTUP_TRACE_STARTED_AT = typeof performance !== "undefined" && typeof performance.now === "function"
  ? performance.now()
  : Date.now();

let startupTraceSequence = 0;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
      cause: error.cause ?? null,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return {
        value: String(error),
      };
    }
  }

  return {
    value: String(error),
  };
}

function postNativeStartupTrace(message: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const webkitWindow = window as Window & {
      webkit?: {
        messageHandlers?: {
          aletheiaStartupTrace?: {
            postMessage(message: Record<string, unknown>): void;
          };
        };
      };
    };
    const handler = webkitWindow.webkit?.messageHandlers?.aletheiaStartupTrace;
    if (!handler?.postMessage) {
      return;
    }

    handler.postMessage(message);
  } catch {
    // Best-effort diagnostics only.
  }
}

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
  postNativeStartupTrace({
    kind: "trace",
    sequence: startupTraceSequence,
    step,
    elapsedMs: getStartupElapsedMs(),
    details: details ?? null,
  });
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
    error: serializeError(error),
  };

  if (details && Object.keys(details).length > 0) {
    Object.assign(payload, details);
  }

  postNativeStartupTrace({
    kind: "error",
    step,
    elapsedMs: getStartupElapsedMs(),
    payload,
  });
  console.error(`[startup] ${step} +${getStartupElapsedMs()}ms`, payload);
}
