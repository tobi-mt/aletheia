"use client";

import { FormEvent, useMemo, useState } from "react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null);

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

  async function loadAnalytics(event?: FormEvent) {
    event?.preventDefault();
    const token = secret.trim();
    if (!token) {
      setError("Enter ANALYTICS_ADMIN_SECRET to load dashboard data.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/summary", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? "Unauthorized. Check your analytics secret." : "Failed to load analytics data.");
      }

      const nextPayload = (await response.json()) as AnalyticsPayload;
      setPayload(nextPayload);

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

  const overview = payload?.overview ?? {};

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Internal Analytics Dashboard</h1>
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

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Funnel (30d)</h2>
            <div className="mt-4 space-y-3">
              {(payload?.funnel30d ?? []).map((stage) => (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{formatStageName(stage.stage)}</span>
                    <span className="text-slate-600">
                      {stage.unique_people} users | {stage.conversion_from_previous_pct}% from prev
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
