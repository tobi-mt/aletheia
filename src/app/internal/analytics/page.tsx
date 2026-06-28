"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type FunnelStage = {
  stage: string;
  stage_order: number;
  unique_people: number;
  conversion_from_previous_pct: number;
  conversion_from_first_pct: number;
};

type FeatureRow = {
  feature: string;
  event_name: string;
  actions: number;
  unique_people: number;
};

type RetentionRow = {
  cohort_week: string;
  signups: number;
  retained_7d: number;
  retention_7d_pct: number;
};

type HourlyUsageRow = {
  hour_of_day_utc: number;
  events: number;
  unique_people: number;
};

type TopicRow = {
  topic: string;
  count: number;
  unique_people: number;
  helpful_rate: number;
};

type EmotionalToneRow = {
  emotional_tone: string;
  count: number;
  decision_like_count: number;
};

type FeedbackByModeRow = {
  mode: string;
  value: string;
  count: number;
};

type JourneyRateRow = {
  metric: string;
  numerator: number;
  denominator: number;
  rate: number;
};

type DistributionRow = {
  count: number;
  unique_people: number;
};

type LanguageRow = DistributionRow & {
  language: string;
};

type ThemeRow = DistributionRow & {
  theme: string;
};

type FrictionRow = {
  area: string;
  count: number;
  unique_people: number;
};

type NotificationSelfHealDayRow = {
  day: string;
  healed: number;
  failed: number;
  attempts: number;
  success_rate: number;
};

type AuthPromptOverview = {
  shown_count: number;
  dismissed_count: number;
  cta_count: number;
  gate_hits: number;
  unique_shown_people: number;
  unique_cta_people: number;
  dismiss_rate_pct: number;
  cta_rate_pct: number;
  cta_per_shown_person_pct: number;
};

type AuthPromptReasonRow = {
  prompt_reason: string;
  shown_count: number;
  unique_people: number;
};

type AuthPromptCloseRow = {
  close_reason: string;
  dismissed_count: number;
  unique_people: number;
};

type AuthPromptDailyRow = {
  day: string;
  shown_count: number;
  cta_count: number;
  cta_rate_pct: number;
};

type AnalyticsPayload = {
  overview: Record<string, number>;
  events30d: Array<{ event_name: string; count: number; unique_people: number }>;
  funnel30d: FunnelStage[];
  features30d: FeatureRow[];
  retentionWeekly: RetentionRow[];
  hourlyUsage30d: HourlyUsageRow[];
  feedback30d: Array<{ value: string; count: number }>;
  topics30d: TopicRow[];
  emotionalTones30d: EmotionalToneRow[];
  feedbackByMode30d: FeedbackByModeRow[];
  journeyRates30d: JourneyRateRow[];
  languageDistribution30d: LanguageRow[];
  themeDistribution30d: ThemeRow[];
  frictionSignals30d: FrictionRow[];
  notificationSelfHeal14d: NotificationSelfHealDayRow[];
  notificationHealth?: {
    enabledSubscriptions: number;
    dueNow: number;
    scanned: number;
    unauthorizedHits: number;
    hourUtc: number;
    generatedAt: string;
    cronSecretConfigured: boolean;
    cronHealthy: boolean;
    cronStatus: "missing_secret" | "stale" | "healthy";
    lastDailyCheckedAt: string | null;
    lastDailyCheckedMinutesAgo: number | null;
    vapidConfigured: boolean;
    vapidKeyPairValid: boolean;
    vapidSubjectConfigured: boolean;
    vapidPublicKeyConfigured: boolean;
    vapidReason: string;
    recommendedAction: "fix_vapid" | "check_cron" | "subscribe" | "resubscribe_or_send_test" | "none";
  };
  authPrompts30d: {
    overview: AuthPromptOverview;
    reasons: AuthPromptReasonRow[];
    closes: AuthPromptCloseRow[];
    daily14d: AuthPromptDailyRow[];
  };
  generatedAt?: string;
  config?: {
    geo_enrichment_enabled?: boolean;
  };
};

type NotificationDiagnosticsPayload = {
  configured: boolean;
  server: {
    cronSecretConfigured: boolean;
    cronHealthy: boolean;
    cronStatus: "missing_secret" | "stale" | "healthy";
    lastDailyCheckedAt: string | null;
    lastDailyCheckedMinutesAgo: number | null;
    vapidConfigured: boolean;
    vapidKeyPairValid: boolean;
    vapidSubjectConfigured: boolean;
    vapidPublicKeyConfigured: boolean;
    vapidReason: string;
  };
  account: {
    subscriptions: number;
    staleSubscriptions: number;
    recommendedAction: "fix_vapid" | "check_cron" | "subscribe" | "resubscribe_or_send_test" | "none";
    diagnostics: Array<{
      id: string;
      endpointHost: string;
      preferredLocalHour: number;
      preferredTimezone: string;
      timezoneMode: "auto" | "manual";
      deliveryStrategy: string;
      updatedAt: string | null;
      lastSentAt: string | null;
      lastGratitudeSentAt: string | null;
      lastChallengeNotifiedAt: string | null;
      latestActivityAt: string | null;
      daysSinceLastActivity: number | null;
      stale: boolean;
      skipReason: "before_window" | "already_sent_today" | "subscription_stale" | null;
    }>;
  };
  generatedAt: string;
};

const SECRET_KEY = "aletheia_analytics_admin_secret";

function formatStageName(stage: string) {
  return stage
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatFeatureName(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}${suffix}`;
}

function heatColor(intensity: number) {
  if (intensity >= 0.85) return "#264653";
  if (intensity >= 0.65) return "#2a9d8f";
  if (intensity >= 0.45) return "#7fbf7f";
  if (intensity >= 0.25) return "#e9c46a";
  if (intensity > 0) return "#f4e2b8";
  return "#f5f6f8";
}

export default function InternalAnalyticsDashboardPage() {
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    try {
      return window.sessionStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [lastSuccessfulSecret, setLastSuccessfulSecret] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }
    try {
      return window.sessionStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [notificationDiagnostics, setNotificationDiagnostics] = useState<NotificationDiagnosticsPayload | null>(null);
  const [notificationDiagnosticsError, setNotificationDiagnosticsError] = useState<string | null>(null);
  const [includeAutomation, setIncludeAutomation] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<{ atIso: string; mode: string } | null>(null);
  const skipNextAutoRefreshRef = useRef(false);

  const hourlyGrid = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, events: 0, unique_people: 0 }));
    const rows = payload?.hourlyUsage30d ?? [];
    for (const row of rows) {
      if (row.hour_of_day_utc >= 0 && row.hour_of_day_utc <= 23) {
        hours[row.hour_of_day_utc] = {
          hour: row.hour_of_day_utc,
          events: row.events,
          unique_people: row.unique_people,
        };
      }
    }
    return hours;
  }, [payload]);

  const maxHourlyEvents = useMemo(
    () => hourlyGrid.reduce((max, row) => Math.max(max, row.events), 0),
    [hourlyGrid]
  );

  const maxFeatureUsers = useMemo(
    () => (payload?.features30d ?? []).reduce((max, row) => Math.max(max, row.unique_people), 0),
    [payload]
  );
  const selfHealSummary = useMemo(() => {
    const rows = payload?.notificationSelfHeal14d ?? [];
    const healed = rows.reduce((sum, row) => sum + row.healed, 0);
    const failed = rows.reduce((sum, row) => sum + row.failed, 0);
    const attempts = healed + failed;
    const successRate = attempts > 0 ? Number(((healed / attempts) * 100).toFixed(1)) : 0;
    return { healed, failed, attempts, successRate };
  }, [payload]);
  const authPromptSparkline = useMemo(() => {
    const rows = payload?.authPrompts30d?.daily14d ?? [];
    const width = 220;
    const height = 56;
    const padding = 4;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const maxValue = rows.reduce((max, row) => Math.max(max, row.shown_count, row.cta_count), 0);
    const scaleMax = Math.max(maxValue, 1);
    const xStep = rows.length > 1 ? chartWidth / (rows.length - 1) : 0;
    const pointY = (value: number) => {
      const ratio = value / scaleMax;
      return padding + (chartHeight - ratio * chartHeight);
    };
    const shownPoints = rows.map((row, index) => ({ x: padding + index * xStep, y: pointY(row.shown_count), row }));
    const ctaPoints = rows.map((row, index) => ({ x: padding + index * xStep, y: pointY(row.cta_count), row }));
    const toPath = (points: Array<{ x: number; y: number }>) =>
      points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

    return {
      rows,
      shownPath: toPath(shownPoints),
      ctaPath: toPath(ctaPoints),
      shownLast: rows.length > 0 ? rows[rows.length - 1]?.shown_count ?? 0 : 0,
      ctaLast: rows.length > 0 ? rows[rows.length - 1]?.cta_count ?? 0 : 0,
      width,
      height,
    };
  }, [payload]);
  const trafficModeLabel = includeAutomation ? "All traffic" : "Human-only";
  const geoEnrichmentEnabled = payload?.config?.geo_enrichment_enabled;
  const geoEnrichmentLabel = geoEnrichmentEnabled == null ? "Unknown" : geoEnrichmentEnabled ? "On" : "Off";

  async function loadAnalyticsData(token: string, automation: boolean) {
    const params = new URLSearchParams();
    if (automation) {
      params.set("includeAutomation", "1");
    }

    const response = await fetch(`/api/analytics/summary${params.size ? `?${params.toString()}` : ""}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(response.status === 401 ? "Unauthorized. Check your analytics secret." : "Failed to load analytics data.");
    }

    return (await response.json()) as AnalyticsPayload;
  }

  async function loadNotificationDiagnostics(token: string) {
    const response = await fetch("/api/notifications/diagnostics", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.status === 401) {
      setNotificationDiagnostics(null);
      setNotificationDiagnosticsError("Unauthorized. Check the analytics admin secret or account session.");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load notification diagnostics.");
    }

    const data = (await response.json()) as NotificationDiagnosticsPayload;
    setNotificationDiagnostics(data);
    setNotificationDiagnosticsError(null);
  }

  async function loadAnalytics(event?: FormEvent) {
    event?.preventDefault();
    const token = secret.trim();
    if (!token) {
      setError("Enter ANALYTICS_ADMIN_SECRET to load dashboard data.");
      return;
    }

    setError(null);
    setLoading(true);

    const refresh = async () => {
      try {
        const nextPayload = await loadAnalyticsData(token, includeAutomation);
        setPayload(nextPayload);
        setLastLoaded({ atIso: new Date().toISOString(), mode: includeAutomation ? "All traffic" : "Human-only" });
        setLastSuccessfulSecret(token);
        skipNextAutoRefreshRef.current = true;

        try {
          await loadNotificationDiagnostics(token);
        } catch (diagnosticsError) {
          setNotificationDiagnostics(null);
          setNotificationDiagnosticsError(
            diagnosticsError instanceof Error ? diagnosticsError.message : "Failed to load notification diagnostics."
          );
        }

        try {
          window.sessionStorage.setItem(SECRET_KEY, token);
        } catch {
          // Session storage is optional for this internal tool.
        }
      } catch (err) {
        setPayload(null);
        setError(err instanceof Error ? err.message : "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    void refresh();
  }

  useEffect(() => {
    const token = lastSuccessfulSecret.trim();
    if (!token) {
      return;
    }

    let cancelled = false;
    let refreshTimer: number | null = null;

    const refresh = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextPayload = await loadAnalyticsData(token, includeAutomation);
        if (cancelled) {
          return;
        }
        setPayload(nextPayload);
        setLastLoaded({ atIso: new Date().toISOString(), mode: includeAutomation ? "All traffic" : "Human-only" });
        try {
          await loadNotificationDiagnostics(token);
        } catch (diagnosticsError) {
          if (cancelled) {
            return;
          }
          setNotificationDiagnostics(null);
          setNotificationDiagnosticsError(
            diagnosticsError instanceof Error ? diagnosticsError.message : "Failed to load notification diagnostics."
          );
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load analytics data.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const shouldSkipImmediateRefresh = skipNextAutoRefreshRef.current;
    skipNextAutoRefreshRef.current = false;

    if (!shouldSkipImmediateRefresh) {
      void refresh();
    }
    refreshTimer = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      cancelled = true;
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [includeAutomation, lastSuccessfulSecret]);

  const overview = payload?.overview ?? {};
  const notificationDiag = notificationDiagnostics;
  const notificationDiagStatus = notificationDiag?.server.cronStatus ?? "missing_secret";
  const notificationDiagRecommended = notificationDiag?.account.recommendedAction ?? "check_cron";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
          <span className="border-b-2 border-slate-900 px-3 py-3 text-sm font-semibold text-slate-900">Analytics</span>
          <Link href="/internal/users" className="px-3 py-3 text-sm text-slate-500 hover:text-slate-900">Users</Link>
        </div>
      </nav>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Internal Analytics Dashboard</h1>
            <div className="flex flex-col items-start gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    includeAutomation
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  Mode: {trafficModeLabel}
                </span>
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    geoEnrichmentEnabled == null
                      ? "border-slate-200 bg-slate-100 text-slate-700"
                      : geoEnrichmentEnabled
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  Geo enrichment: {geoEnrichmentLabel}
                </span>
              </div>
              {lastLoaded ? (
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>Last loaded with mode {lastLoaded.mode}: {lastLoaded.atIso}</p>
                  {payload?.generatedAt ? <p>Data generated at: {payload.generatedAt}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Visualizes funnel progression, feature adoption, cohort retention, and hourly usage heatmap from <span className="font-mono">/api/analytics/summary</span>.
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadAnalytics}>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ANALYTICS_ADMIN_SECRET"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-slate-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Load Dashboard"}
            </button>
          </form>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeAutomation}
              onChange={(event) => setIncludeAutomation(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            Include automation and test traffic
          </label>
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {!error && !payload ? (
            <p className="mt-3 text-sm text-slate-600">
              Enter your analytics admin secret and click Load Dashboard to display live metrics.
            </p>
          ) : null}
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Users (30d)</p>
            <p className="mt-2 text-2xl font-semibold">{overview.identified_active_users_30d ?? 0}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Anonymous Devices (30d)</p>
            <p className="mt-2 text-2xl font-semibold">{overview.anonymous_devices_30d ?? 0}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">Events (30d)</p>
            <p className="mt-2 text-2xl font-semibold">{overview.events_30d ?? 0}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase text-slate-500">New Users (30d)</p>
            <p className="mt-2 text-2xl font-semibold">{overview.new_users_30d ?? 0}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Global Notification Ops</h2>
              <p className="text-sm text-slate-600">
                Summary from <span className="font-mono">/api/analytics/summary</span> so notification health is visible even without a user session.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {payload?.notificationHealth?.generatedAt ? `Updated ${payload.notificationHealth.generatedAt}` : "No notification summary yet"}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Cron</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.notificationHealth?.cronStatus ?? "unknown"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Enabled Subs</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.notificationHealth?.enabledSubscriptions ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Due Now</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.notificationHealth?.dueNow ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">VAPID</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {payload?.notificationHealth?.vapidConfigured && payload.notificationHealth.vapidKeyPairValid ? "Ready" : "Needs fix"}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">UTC Hour</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.notificationHealth?.hourUtc ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Action</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {(payload?.notificationHealth?.recommendedAction ?? "check_cron").replace(/_/g, " ")}
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Notification Diagnostics</h2>
              <p className="text-sm text-slate-600">
                Pulled from <span className="font-mono">/api/notifications/diagnostics</span> so cron health and subscription state stay in one place.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {notificationDiag?.generatedAt ? `Updated ${notificationDiag.generatedAt}` : "Waiting for notification diagnostics"}
            </p>
          </div>

          {notificationDiagnosticsError ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {notificationDiagnosticsError}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Cron</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{notificationDiag?.server.cronStatus ?? "unknown"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Enabled Subs</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{notificationDiag?.account.subscriptions ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Stale Subs</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{notificationDiag?.account.staleSubscriptions ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Cron Health</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{notificationDiag?.server.cronHealthy ? "Healthy" : "Needs check"}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">VAPID</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {notificationDiag?.server.vapidConfigured && notificationDiag?.server.vapidKeyPairValid ? "Ready" : "Needs fix"}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Action</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{notificationDiagRecommended.replace(/_/g, " ")}</p>
            </article>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Server health</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Cron secret</dt>
                  <dd className="font-medium text-slate-900">{notificationDiag?.server.cronSecretConfigured ? "Configured" : "Missing"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Cron status</dt>
                  <dd className="font-medium text-slate-900">{notificationDiagStatus.replace(/_/g, " ")}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Last daily check</dt>
                  <dd className="font-medium text-slate-900">
                    {notificationDiag?.server.lastDailyCheckedMinutesAgo !== null && notificationDiag?.server.lastDailyCheckedMinutesAgo !== undefined
                      ? `${notificationDiag.server.lastDailyCheckedMinutesAgo} minutes ago`
                      : "Not seen yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">VAPID key pair</dt>
                  <dd className="font-medium text-slate-900">
                    {notificationDiag?.server.vapidConfigured && notificationDiag.server.vapidKeyPairValid
                      ? "Valid"
                      : notificationDiag?.server.vapidReason ?? "Unknown"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Public key</dt>
                  <dd className="font-medium text-slate-900">{notificationDiag?.server.vapidPublicKeyConfigured ? "Configured" : "Missing"}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Account diagnostics</h3>
              {notificationDiag?.account.diagnostics?.length ? (
                <div className="mt-3 space-y-2">
                  {notificationDiag.account.diagnostics.slice(0, 5).map((row) => (
                    <div key={row.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-800">{row.endpointHost}</span>
                        <span className={`font-semibold ${row.stale ? "text-amber-700" : "text-emerald-700"}`}>
                          {row.stale ? "Stale" : "Fresh"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.preferredLocalHour}:00 {row.preferredTimezone} · {row.timezoneMode} · {row.deliveryStrategy}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.latestActivityAt ? `Last activity ${row.daysSinceLastActivity ?? 0}d ago` : "No activity recorded yet"}
                      </p>
                      {row.skipReason ? (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Skip reason: {row.skipReason.replace(/_/g, " ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Ready to send
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Sign in with a user account to see the per-subscription diagnostics from <span className="font-mono">/api/notifications/diagnostics</span>.
                </p>
              )}
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Notification Self-Heal Health (14d)</h2>
              <p className="text-sm text-slate-600">Daily automatic resubscribe recovery success vs failure.</p>
            </div>
            <p className="text-sm text-slate-700">
              Success rate: <span className="font-semibold">{selfHealSummary.successRate}%</span>
              {" "}
              ({selfHealSummary.healed} healed / {selfHealSummary.failed} failed)
            </p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-14">
            {(payload?.notificationSelfHeal14d ?? []).map((row) => {
              const ratio = row.attempts > 0 ? row.healed / row.attempts : 0;
              const barColor = row.attempts === 0
                ? "#e2e8f0"
                : ratio >= 0.9
                  ? "#16a34a"
                  : ratio >= 0.6
                    ? "#f59e0b"
                    : "#dc2626";
              return (
                <div
                  key={row.day}
                  className="rounded-lg border border-slate-200 p-2"
                  title={`${row.day.slice(0, 10)} | healed=${row.healed} failed=${row.failed} success=${row.success_rate}%`}
                >
                  <p className="text-[10px] text-slate-500">{row.day.slice(5, 10)}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{row.success_rate}%</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, row.success_rate))}%`, backgroundColor: barColor }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{row.healed}/{row.failed}</p>
                </div>
              );
            })}
          </div>
          {payload && payload.notificationSelfHeal14d.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No self-heal events recorded yet.</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Core Wisdom Loop (30d)</h2>
              <p className="text-sm text-slate-600">Open app → ask/reflect/decide → save insight → revisit or share.</p>
            </div>
            <p className="text-xs text-slate-500">Privacy-first: broad signals, not private content.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(payload?.journeyRates30d ?? []).map((row) => (
              <article key={row.metric} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-800">{formatFeatureName(row.metric)}</p>
                  <p className="text-xl font-semibold text-slate-950">{row.rate}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, Math.min(100, row.rate))}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{row.numerator} of {row.denominator} active people</p>
              </article>
            ))}
            {payload && payload.journeyRates30d.length === 0 ? <p className="text-sm text-slate-500">No journey data yet.</p> : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Auth Prompt Health (30d)</h2>
              <p className="text-sm text-slate-600">Monitors prompt conversion and suppression behavior for guest sign-in nudges.</p>
            </div>
            <p className="text-xs text-slate-500">Signals from auth_prompt_* and gate_hit_notifications events.</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Shown</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.authPrompts30d?.overview?.shown_count ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">CTA Clicked</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.authPrompts30d?.overview?.cta_count ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Dismissed</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.authPrompts30d?.overview?.dismissed_count ?? 0}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">CTA Rate</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{payload?.authPrompts30d?.overview?.cta_rate_pct ?? 0}%</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Dismiss Rate</p>
              <p className="mt-1 text-xl font-semibold text-amber-700">{payload?.authPrompts30d?.overview?.dismiss_rate_pct ?? 0}%</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] uppercase text-slate-500">Notif Gate Hits</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{payload?.authPrompts30d?.overview?.gate_hits ?? 0}</p>
            </article>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">14d Sparkline · Prompt Shown vs CTA</p>
              <p className="text-xs text-slate-600">
                Last day: {authPromptSparkline.shownLast} shown / {authPromptSparkline.ctaLast} CTA
              </p>
            </div>
            <div className="mt-2">
              <svg
                viewBox={`0 0 ${authPromptSparkline.width} ${authPromptSparkline.height}`}
                className="h-14 w-full"
                role="img"
                aria-label="14-day auth prompt shown and CTA trend"
              >
                <path d={`M4 ${authPromptSparkline.height - 4} L${authPromptSparkline.width - 4} ${authPromptSparkline.height - 4}`} stroke="#cbd5e1" strokeWidth="1" fill="none" />
                {authPromptSparkline.rows.length > 0 ? (
                  <>
                    <path d={authPromptSparkline.shownPath} stroke="#0f766e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={authPromptSparkline.ctaPath} stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : null}
              </svg>
            </div>
            <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-teal-700" />Shown</span>
              <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-blue-600" />CTA</span>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt Reasons</p>
              <div className="mt-2 space-y-2">
                {(payload?.authPrompts30d?.reasons ?? []).map((row) => (
                  <div key={row.prompt_reason} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-800">{formatFeatureName(row.prompt_reason)}</span>
                    <span className="text-slate-600">{row.shown_count} shown · {row.unique_people} users</span>
                  </div>
                ))}
                {payload && (payload.authPrompts30d?.reasons?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">No prompt reason data yet.</p> : null}
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dismiss Close Reasons</p>
              <div className="mt-2 space-y-2">
                {(payload?.authPrompts30d?.closes ?? []).map((row) => (
                  <div key={row.close_reason} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-800">{formatFeatureName(row.close_reason)}</span>
                    <span className="text-slate-600">{row.dismissed_count} dismissed · {row.unique_people} users</span>
                  </div>
                ))}
                {payload && (payload.authPrompts30d?.closes?.length ?? 0) === 0 ? <p className="text-sm text-slate-500">No dismiss behavior data yet.</p> : null}
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Journey Milestones (30d)</h2>
            <div className="mt-4 space-y-3">
              {(payload?.funnel30d ?? []).map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{formatStageName(stage.stage)}</span>
                    <span className="text-slate-600">
                      {stage.unique_people} users | {stage.conversion_from_first_pct}% of openers
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${Math.max(2, stage.conversion_from_first_pct)}%` }}
                    />
                  </div>
                </div>
              ))}
              {payload && payload.funnel30d.length === 0 ? <p className="text-sm text-slate-500">No funnel data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Feature Adoption (30d)</h2>
            <div className="mt-4 space-y-3">
              {(payload?.features30d ?? []).map((feature) => {
                const width = maxFeatureUsers > 0 ? (feature.unique_people / maxFeatureUsers) * 100 : 0;
                return (
                  <div key={feature.feature}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{formatFeatureName(feature.feature)}</span>
                      <span className="text-slate-600">{feature.unique_people} users | {feature.actions} actions</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max(2, width)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {payload && payload.features30d.length === 0 ? <p className="text-sm text-slate-500">No feature data yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Top User Topics</h2>
            <div className="mt-4 space-y-3">
              {(payload?.topics30d ?? []).map((row) => (
                <div key={row.topic} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{formatFeatureName(row.topic)}</p>
                    <p className="text-sm text-slate-600">{row.unique_people} people</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{row.count} questions/events | {row.helpful_rate}% helpful feedback</p>
                </div>
              ))}
              {payload && payload.topics30d.length === 0 ? <p className="text-sm text-slate-500">No topic data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Emotional Pressure</h2>
            <div className="mt-4 space-y-3">
              {(payload?.emotionalTones30d ?? []).map((row) => (
                <div key={row.emotional_tone} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{formatFeatureName(row.emotional_tone)}</p>
                    <p className="text-sm text-slate-600">{row.count}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{row.decision_like_count} decision-like questions</p>
                </div>
              ))}
              {payload && payload.emotionalTones30d.length === 0 ? <p className="text-sm text-slate-500">No emotional tone data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Answer Quality</h2>
            <div className="mt-4 space-y-3">
              {(payload?.feedback30d ?? []).map((row) => (
                <div key={row.value} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <p className="font-medium text-slate-800">{formatFeatureName(row.value)}</p>
                  <p className="text-sm text-slate-600">{row.count}</p>
                </div>
              ))}
              {payload && payload.feedback30d.length === 0 ? <p className="text-sm text-slate-500">No feedback yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Feedback By Mode</h2>
            <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
              {(payload?.feedbackByMode30d ?? []).map((row) => (
                <div key={`${row.mode}-${row.value}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{row.mode} · {formatFeatureName(row.value)}</span>
                  <span className="text-slate-600">{row.count}</span>
                </div>
              ))}
              {payload && payload.feedbackByMode30d.length === 0 ? <p className="text-sm text-slate-500">No mode feedback yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Language / Theme</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Languages</p>
                <div className="mt-2 space-y-2">
                  {(payload?.languageDistribution30d ?? []).slice(0, 6).map((row) => (
                    <div key={row.language} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{row.language}</span>
                      <span>{row.unique_people}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Themes</p>
                <div className="mt-2 space-y-2">
                  {(payload?.themeDistribution30d ?? []).slice(0, 6).map((row) => (
                    <div key={row.theme} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span>{formatFeatureName(row.theme)}</span>
                      <span>{row.unique_people}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Friction Signals</h2>
            <div className="mt-4 space-y-3">
              {(payload?.frictionSignals30d ?? []).map((row) => (
                <div key={row.area} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{formatFeatureName(row.area)}</p>
                    <p className="text-sm text-slate-600">{row.count}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{row.unique_people} affected people/devices</p>
                </div>
              ))}
              {payload && payload.frictionSignals30d.length === 0 ? <p className="text-sm text-slate-500">No friction signals yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Retention Cohorts (Weekly)</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Cohort Week</th>
                    <th className="pb-2 pr-3 font-medium">Signups</th>
                    <th className="pb-2 pr-3 font-medium">Retained 7d</th>
                    <th className="pb-2 font-medium">Retention %</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload?.retentionWeekly ?? []).map((row) => (
                    <tr key={row.cohort_week} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700">{row.cohort_week.slice(0, 10)}</td>
                      <td className="py-2 pr-3">{row.signups}</td>
                      <td className="py-2 pr-3">{row.retained_7d}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-violet-600"
                              style={{ width: `${Math.max(2, Math.min(100, row.retention_7d_pct || 0))}%` }}
                            />
                          </div>
                          <span>{row.retention_7d_pct ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payload && payload.retentionWeekly.length === 0 ? <p className="mt-2 text-sm text-slate-500">No cohort data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Hourly Usage Heatmap (UTC, 30d)</h2>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
              {hourlyGrid.map((cell) => {
                const intensity = maxHourlyEvents > 0 ? cell.events / maxHourlyEvents : 0;
                return (
                  <div
                    key={cell.hour}
                    className="rounded-lg border border-slate-200 p-2"
                    style={{ backgroundColor: heatColor(intensity) }}
                    title={`${hourLabel(cell.hour)} UTC | ${cell.events} events | ${cell.unique_people} users`}
                  >
                    <p className="text-[11px] font-medium text-slate-700">{hourLabel(cell.hour)}</p>
                    <p className="text-sm font-semibold text-slate-900">{cell.events}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">Darker cells indicate heavier event volume during that UTC hour.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
