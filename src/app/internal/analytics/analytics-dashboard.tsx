"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { installNativeWebFetchProxy } from "@/lib/native-web";

installNativeWebFetchProxy();

type PeriodKey = "daily" | "weekly" | "monthly" | "yearly";

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

type UsageTrendRow = {
  bucket_start: string;
  bucket_label: string;
  events: number;
  unique_people: number;
  new_users: number;
};

type FeatureTrendRow = {
  bucket_start: string;
  bucket_label: string;
  feature: string;
  event_name: string;
  actions: number;
  unique_people: number;
};

type CohortBreakdownRow = {
  cohort: string;
  signups: number;
  retained: number;
  retention_pct: number;
};

type RetentionRow = {
  cohort_week: string;
  signups: number;
  retained_7d: number;
  retention_7d_pct: number;
};

type ScreenRow = {
  view: string;
  count: number;
  unique_people: number;
};

type AnalyticsPayload = {
  overview: Record<string, number>;
  features30d: FeatureRow[];
  usageTrends: Record<PeriodKey, UsageTrendRow[]>;
  featureUsageTrends: Record<PeriodKey, FeatureTrendRow[]>;
  topScreens30d: ScreenRow[];
  funnel30d: FunnelStage[];
  retentionWeekly: RetentionRow[];
  retentionMonthly: CohortBreakdownRow[];
  cohortBreakdowns: {
    weekly: CohortBreakdownRow[];
    monthly: CohortBreakdownRow[];
  };
  selectedRange?: {
    startDate: string;
    endDate: string;
  };
  views30d?: ScreenRow[];
  generatedAt?: string;
};

const SECRET_KEY = "aletheia_analytics_admin_secret";
const PERIOD_ORDER: PeriodKey[] = ["daily", "weekly", "monthly", "yearly"];
const PERIOD_META: Record<PeriodKey, { title: string; subtitle: string }> = {
  daily: { title: "Daily Usage", subtitle: "Last 30 days" },
  weekly: { title: "Weekly Usage", subtitle: "Last 12 weeks" },
  monthly: { title: "Monthly Usage", subtitle: "Last 12 months" },
  yearly: { title: "Yearly Usage", subtitle: "Last 5 years" },
};

const FEATURE_SERIES = [
  { key: "questions_asked", label: "Questions asked", color: "#0f766e" },
  { key: "decisions_started", label: "Decisions started", color: "#2563eb" },
  { key: "reflections_saved", label: "Reflections saved", color: "#d97706" },
  { key: "counsel_contacts", label: "Counsel contacts", color: "#7c3aed" },
  { key: "notifications_enabled", label: "Notifications enabled", color: "#059669" },
  { key: "app_shares", label: "App shares", color: "#dc2626" },
] as const;

const DEFAULT_DATE_RANGE = getDefaultDateRange();

type ChartSeries = {
  label: string;
  color: string;
  values: number[];
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatPeriodBucket(period: PeriodKey, bucketStart: string) {
  const date = new Date(bucketStart);
  if (Number.isNaN(date.valueOf())) {
    return bucketStart;
  }

  if (period === "yearly") {
    return String(date.getFullYear());
  }

  if (period === "monthly") {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function getDefaultDateRange() {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { startDate, endDate };
}

function formatRangeLabel(range?: { startDate: string; endDate: string } | null) {
  if (!range?.startDate || !range?.endDate) {
    return "Selected range";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const start = new Date(`${range.startDate}T00:00:00Z`);
  const end = new Date(`${range.endDate}T00:00:00Z`);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return `${range.startDate} - ${range.endDate}`;
  }

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function buildUsageSeries(rows: UsageTrendRow[]) {
  return {
    labels: rows.map((row) => row.bucket_start),
    series: [
      {
        label: "Events",
        color: "#0f766e",
        values: rows.map((row) => row.events),
      },
      {
        label: "Active users",
        color: "#2563eb",
        values: rows.map((row) => row.unique_people),
      },
    ] satisfies ChartSeries[],
    totals: {
      events: rows.reduce((sum, row) => sum + row.events, 0),
      users: rows.reduce((sum, row) => sum + row.unique_people, 0),
      newUsers: rows.reduce((sum, row) => sum + row.new_users, 0),
      peakEvents: rows.reduce((max, row) => Math.max(max, row.events), 0),
    },
  };
}

function buildFeatureSeries(rows: FeatureTrendRow[]) {
  const labels = Array.from(new Set(rows.map((row) => row.bucket_start)));
  const valuesByFeature = new Map<string, number[]>(FEATURE_SERIES.map((series) => [series.key, Array(labels.length).fill(0)]));
  const bucketIndex = new Map(labels.map((label, index) => [label, index]));

  for (const row of rows) {
    const slot = bucketIndex.get(row.bucket_start);
    const values = valuesByFeature.get(row.feature);
    if (slot === undefined || !values) {
      continue;
    }

    values[slot] = row.actions;
  }

  return {
    labels,
    series: FEATURE_SERIES.map((definition) => ({
      label: definition.label,
      color: definition.color,
      values: valuesByFeature.get(definition.key) ?? Array(labels.length).fill(0),
    })) satisfies ChartSeries[],
  };
}

function LineChart({
  labels,
  series,
  height = 180,
}: {
  labels: string[];
  series: ChartSeries[];
  height?: number;
}) {
  const width = 640;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 30;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(1, ...series.flatMap((row) => row.values));
  const xStep = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;
  const labelIndices = new Set<number>([
    0,
    Math.floor(labels.length / 2),
    Math.max(0, labels.length - 1),
  ]);
  const seriesPaths = series.map((row) => {
    const path = row.values
      .map((value, index) => {
        const x = paddingX + index * xStep;
        const y = paddingTop + plotHeight - (value / maxValue) * plotHeight;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return {
      ...row,
      path,
      lastX: paddingX + Math.max(0, row.values.length - 1) * xStep,
      lastY: paddingTop + plotHeight - ((row.values[row.values.length - 1] ?? 0) / maxValue) * plotHeight,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap gap-3 text-[11px] text-slate-600">
        {series.map((row) => (
          <span key={row.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            {row.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-44 w-full" role="img" aria-label="Analytics trend chart">
        {Array.from({ length: 4 }, (_, index) => {
          const y = paddingTop + (plotHeight / 3) * index;
          return <line key={index} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {seriesPaths.map((row) => (
          <g key={row.label}>
            <path d={row.path} fill="none" stroke={row.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {row.values.length > 0 ? <circle cx={row.lastX} cy={row.lastY} r="2.8" fill={row.color} /> : null}
          </g>
        ))}
        {labels.map((label, index) => {
          if (!labelIndices.has(index)) {
            return null;
          }

          const x = paddingX + index * xStep;
          const y = height - 10;
          return (
            <text key={`${label}-${index}`} x={x} y={y} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"} className="fill-slate-500 text-[10px]">
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }: { label: string; value: number | string; tone?: "slate" | "teal" | "blue" | "amber" }) {
  const toneClasses = {
    slate: "text-slate-900",
    teal: "text-teal-700",
    blue: "text-blue-700",
    amber: "text-amber-700",
  } as const;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
    </article>
  );
}

export default function AnalyticsDashboard() {
  const [secret, setSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [lastSuccessfulSecret, setLastSuccessfulSecret] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.sessionStorage.getItem(SECRET_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);
  const [includeAutomation, setIncludeAutomation] = useState(false);
  const [rangeDraft, setRangeDraft] = useState(DEFAULT_DATE_RANGE);
  const [appliedRange, setAppliedRange] = useState(DEFAULT_DATE_RANGE);
  const [lastLoaded, setLastLoaded] = useState<{ atIso: string; mode: string } | null>(null);
  const skipNextAutoRefreshRef = useRef(false);

  const trafficModeLabel = includeAutomation ? "All traffic" : "Human-only";
  const topScreens = payload?.topScreens30d ?? payload?.views30d ?? [];
  const selectedRange = payload?.selectedRange ?? appliedRange;
  const usageCards = useMemo(
    () =>
      PERIOD_ORDER.map((period) => {
        const usageRows = payload?.usageTrends?.[period] ?? [];
        const featureRows = payload?.featureUsageTrends?.[period] ?? [];
        return {
          period,
          meta: PERIOD_META[period],
          usage: buildUsageSeries(usageRows),
          features: buildFeatureSeries(featureRows),
          usageRows,
        };
      }),
    [payload]
  );

  async function loadAnalyticsData(token: string, automation: boolean, range: { startDate: string; endDate: string }) {
    const params = new URLSearchParams();
    if (automation) {
      params.set("includeAutomation", "1");
    }
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);

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

  async function loadAnalytics(event?: FormEvent, nextRange = rangeDraft, tokenOverride?: string) {
    event?.preventDefault();
    const token = (tokenOverride ?? secret).trim();
    if (!token) {
      setError("Enter the analytics admin secret to load the dashboard.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const nextPayload = await loadAnalyticsData(token, includeAutomation, nextRange);
      setPayload(nextPayload);
      const normalizedRange = nextPayload.selectedRange ?? nextRange;
      setAppliedRange((current) =>
        current.startDate === normalizedRange.startDate && current.endDate === normalizedRange.endDate ? current : normalizedRange
      );
      setRangeDraft((current) =>
        current.startDate === normalizedRange.startDate && current.endDate === normalizedRange.endDate ? current : normalizedRange
      );
      setLastLoaded({ atIso: new Date().toISOString(), mode: trafficModeLabel });
      setLastSuccessfulSecret(token);
      skipNextAutoRefreshRef.current = true;

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
  }

  async function applyRange(event: FormEvent) {
    event.preventDefault();
    const token = secret.trim() || lastSuccessfulSecret.trim();
    if (!token) {
      setError("Enter the analytics admin secret before applying a date range.");
      return;
    }

    setSecret(token);
    await loadAnalytics(undefined, rangeDraft, token);
  }

  function exportAnalyticsSnapshot() {
    if (!payload) {
      setError("Load the dashboard before exporting analytics.");
      return;
    }

    const snapshot = {
      generatedAt: payload.generatedAt ?? null,
      exportedAt: new Date().toISOString(),
      trafficMode: trafficModeLabel,
      includeAutomation,
      selectedRange: payload.selectedRange ?? appliedRange,
      overview: payload.overview,
      usageTrends: payload.usageTrends,
      featureUsageTrends: payload.featureUsageTrends,
      topScreens30d: payload.topScreens30d,
      funnel30d: payload.funnel30d,
      features30d: payload.features30d,
      retentionWeekly: payload.retentionWeekly,
      retentionMonthly: payload.retentionMonthly,
      cohortBreakdowns: payload.cohortBreakdowns,
      views30d: payload.views30d ?? payload.topScreens30d,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const suffix = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `aletheia-analytics-${suffix}.json`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
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
        const nextPayload = await loadAnalyticsData(token, includeAutomation, appliedRange);
        if (cancelled) {
          return;
        }
        setPayload(nextPayload);
        const normalizedRange = nextPayload.selectedRange ?? appliedRange;
        setAppliedRange((current) =>
          current.startDate === normalizedRange.startDate && current.endDate === normalizedRange.endDate ? current : normalizedRange
        );
        setRangeDraft((current) =>
          current.startDate === normalizedRange.startDate && current.endDate === normalizedRange.endDate ? current : normalizedRange
        );
        setLastLoaded({ atIso: new Date().toISOString(), mode: trafficModeLabel });
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
  }, [appliedRange, includeAutomation, lastSuccessfulSecret, trafficModeLabel]);

  const overview = payload?.overview ?? {};
  const weeklyCohorts = payload?.cohortBreakdowns?.weekly ?? [];
  const monthlyCohorts = payload?.cohortBreakdowns?.monthly ?? [];
  const funnelRows = payload?.funnel30d ?? [];
  const topScreensMax = topScreens.reduce((max, row) => Math.max(max, row.count), 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-4 sm:px-6 lg:px-8">
          <span className="border-b-2 border-slate-900 px-3 py-3 text-sm font-semibold text-slate-900">Analytics</span>
          <Link href="/internal/users" className="px-3 py-3 text-sm text-slate-500 hover:text-slate-900">
            Users
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-semibold tracking-tight">Internal Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">
                Daily, weekly, monthly, and yearly usage with feature trends, top screens, funnels, retention, and cohort breakdowns.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    includeAutomation ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  Mode: {trafficModeLabel}
                </span>
              </div>
              {lastLoaded ? (
                <div className="space-y-0.5 text-xs text-slate-500">
                  <p>
                    Last loaded in {lastLoaded.mode}: {lastLoaded.atIso}
                  </p>
                  {payload?.generatedAt ? <p>Data generated at: {payload.generatedAt}</p> : null}
                  <p>Range: {formatRangeLabel(selectedRange)}</p>
                </div>
              ) : null}
            </div>
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={loadAnalytics}>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Analytics admin secret"
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
            <button
              type="button"
              onClick={exportAnalyticsSnapshot}
              disabled={!payload}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Export JSON
            </button>
          </form>

          <form className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end" onSubmit={applyRange}>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Start date
                <input
                  type="date"
                  value={rangeDraft.startDate}
                  onChange={(event) =>
                    setRangeDraft((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                End date
                <input
                  type="date"
                  value={rangeDraft.endDate}
                  onChange={(event) =>
                    setRangeDraft((current) => ({
                      ...current,
                      endDate: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply range
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
            <p className="mt-3 text-sm text-slate-600">Enter the analytics admin secret and load live metrics.</p>
          ) : null}
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard label="Active Users" value={formatCount(overview.identified_active_users_30d ?? 0)} tone="teal" />
          <MetricCard label="Events" value={formatCount(overview.events_30d ?? 0)} tone="blue" />
          <MetricCard label="Tracked Features" value={formatCount(payload?.features30d.length ?? 0)} tone="amber" />
          <MetricCard label="Top Screens" value={formatCount(topScreens.length)} tone="slate" />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {usageCards.map((card) => (
            <article key={card.period} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{card.meta.title}</h2>
                  <p className="text-sm text-slate-600">{formatRangeLabel(selectedRange)}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>{card.usageRows.length} buckets</p>
                  <p>{formatCount(card.usage.totals.events)} total events</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase text-slate-500">Events</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCount(card.usage.totals.events)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase text-slate-500">Active Users</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCount(card.usage.totals.users)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase text-slate-500">New Users</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatCount(card.usage.totals.newUsers)}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage trend</p>
                <LineChart labels={card.usage.labels.map((bucket) => formatPeriodBucket(card.period, bucket))} series={card.usage.series} />
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feature usage trend</p>
                <LineChart labels={card.features.labels.map((bucket) => formatPeriodBucket(card.period, bucket))} series={card.features.series} height={200} />
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Top Screens</h2>
                <p className="text-sm text-slate-600">Most used screens across the selected range.</p>
              </div>
              <p className="text-xs text-slate-500">{topScreens.length} screens</p>
            </div>

            <div className="mt-4 space-y-3">
              {topScreens.slice(0, 10).map((row) => {
                const width = topScreensMax > 0 ? (row.count / topScreensMax) * 100 : 0;
                return (
                  <div key={row.view} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{formatLabel(row.view)}</span>
                      <span className="text-slate-600">
                        {formatCount(row.count)} views · {formatCount(row.unique_people)} users
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(2, width)}%` }} />
                    </div>
                  </div>
                );
              })}
              {topScreens.length === 0 ? <p className="text-sm text-slate-500">No screen data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Journey Funnel</h2>
                <p className="text-sm text-slate-600">Open app, activate, create value, and share.</p>
              </div>
              <p className="text-xs text-slate-500">Selected-range conversion by step</p>
            </div>

            <div className="mt-4 space-y-3">
              {funnelRows.map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{formatLabel(stage.stage)}</span>
                    <span className="text-slate-600">
                      {formatCount(stage.unique_people)} people · {stage.conversion_from_first_pct}% of openers
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, stage.conversion_from_first_pct)}%` }} />
                  </div>
                </div>
              ))}
              {funnelRows.length === 0 ? <p className="text-sm text-slate-500">No funnel data yet.</p> : null}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Feature Adoption</h2>
                <p className="text-sm text-slate-600">Which features are used most often in the selected range.</p>
              </div>
            <p className="text-xs text-slate-500">Actions and unique people by feature</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {payload?.features30d.map((row) => (
              <article key={row.feature} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-800">{formatLabel(row.feature)}</p>
                  <p className="text-sm text-slate-600">{formatCount(row.unique_people)} users</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCount(row.actions)} actions · {row.event_name}
                </p>
              </article>
            ))}
            {payload && payload.features30d.length === 0 ? <p className="text-sm text-slate-500">No feature adoption data yet.</p> : null}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Weekly Retention</h2>
                <p className="text-sm text-slate-600">Signup cohorts and 7-day retention for the selected range.</p>
              </div>
              <p className="text-xs text-slate-500">Selected weekly cohorts</p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Cohort Week</th>
                    <th className="pb-2 pr-3 font-medium">Signups</th>
                    <th className="pb-2 pr-3 font-medium">Retained 7d</th>
                    <th className="pb-2 font-medium">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyCohorts.map((row) => (
                    <tr key={row.cohort} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700">{row.cohort.slice(0, 10)}</td>
                      <td className="py-2 pr-3">{formatCount(row.signups)}</td>
                      <td className="py-2 pr-3">{formatCount(row.retained)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(2, Math.min(100, row.retention_pct || 0))}%` }} />
                          </div>
                          <span>{row.retention_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {weeklyCohorts.length === 0 ? <p className="mt-2 text-sm text-slate-500">No weekly cohort data yet.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Monthly Cohorts</h2>
                <p className="text-sm text-slate-600">Signup cohorts with 30-day retention for the selected range.</p>
              </div>
              <p className="text-xs text-slate-500">Selected monthly cohort breakdown</p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Cohort Month</th>
                    <th className="pb-2 pr-3 font-medium">Signups</th>
                    <th className="pb-2 pr-3 font-medium">Retained 30d</th>
                    <th className="pb-2 font-medium">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyCohorts.map((row) => (
                    <tr key={row.cohort} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-700">{row.cohort.slice(0, 10)}</td>
                      <td className="py-2 pr-3">{formatCount(row.signups)}</td>
                      <td className="py-2 pr-3">{formatCount(row.retained)}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.max(2, Math.min(100, row.retention_pct || 0))}%` }} />
                          </div>
                          <span>{row.retention_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {monthlyCohorts.length === 0 ? <p className="mt-2 text-sm text-slate-500">No monthly cohort data yet.</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
