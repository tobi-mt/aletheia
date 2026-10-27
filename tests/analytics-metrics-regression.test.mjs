import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const analytics = readFileSync(new URL("../src/lib/analytics.ts", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/app/internal/analytics/analytics-dashboard.tsx", import.meta.url), "utf8");

test("human analytics excludes cron traffic and uses a real rolling 24-hour window", () => {
  assert.match(analytics, /COALESCE\(\$\{alias\}\.source, ''\) <> 'cron'/);
  assert.match(analytics, /SELECT 'events_24h',[\s\S]*?created_at >= now\(\) - interval '24 hours'/);
  assert.doesNotMatch(analytics, /SELECT 'events_24h', COUNT\(\*\)::int FROM analytics_events WHERE \$\{selectedDateFilter\}/);
});

test("journey funnel requires milestones to happen in sequence", () => {
  assert.match(analytics, /MIN\(created_at\) AS opened_at[\s\S]*?event_name = 'app_opened'/);
  assert.match(analytics, /opened_at::date >= \$\{startDateSql\}/);
  assert.match(analytics, /onboarded_at >= opened_at/);
  assert.match(analytics, /asked_at >= onboarded_at/);
  assert.doesNotMatch(analytics, /CASE WHEN authenticated_at >= opened_at/);
});

test("retention measures return windows only after cohorts mature", () => {
  assert.match(analytics, /created_at \+ interval '14 days' <= LEAST/);
  assert.match(analytics, /created_at >= signup_cohorts\.signup_at \+ interval '7 days'/);
  assert.match(analytics, /created_at < signup_cohorts\.signup_at \+ interval '14 days'/);
  assert.match(analytics, /created_at \+ interval '37 days' <= LEAST/);
  assert.match(analytics, /created_at >= signup_cohorts\.signup_at \+ interval '30 days'/);
  assert.match(analytics, /created_at < signup_cohorts\.signup_at \+ interval '37 days'/);
});

test("dashboard exposes privacy-safe audience and product-health dimensions", () => {
  assert.match(analytics, /generatedAt: new Date\(\)\.toISOString\(\)/);
  assert.match(analytics, /'anonymous_only_devices_30d'/);
  assert.match(analytics, /NOT EXISTS \([\s\S]*?identified_events\.user_id IS NOT NULL/);
  assert.match(analytics, /'runtime' AS dimension/);
  assert.match(analytics, /'device', COALESCE\(NULLIF\(metadata->>'device_class'/);
  assert.match(analytics, /'country', COALESCE\(NULLIF\(metadata->>'geo_country'/);
  assert.match(analytics, /'acquisition', COALESCE\(NULLIF\(source/);
  assert.match(analytics, /'returning_rate' AS metric/);
  assert.match(analytics, /'activation_rate'/);
  assert.match(analytics, /'impact_rate'/);
  assert.match(analytics, /feature_destinations.*feature_destination_opened/);
  assert.match(analytics, /audienceBreakdowns: audienceBreakdownRows/);
  assert.match(analytics, /growthMetrics: growthMetricRows/);
});

test("dashboard reports impact experiments and diagnosable authentication failures", () => {
  assert.match(analytics, /event_name IN \('answer_feedback', 'meaningful_outcome_recorded'\)/);
  assert.match(analytics, /impactBreakdowns: impactBreakdownRows/);
  assert.match(analytics, /event_name IN \('experiment_exposed', 'experiment_converted', 'onboarding_completed'\)/);
  assert.match(analytics, /experiments: experimentRows/);
  assert.match(analytics, /authFailures30d: authFailureRows/);
  assert.match(analytics, /metadata->>'method'/);
  assert.match(analytics, /metadata->>'reason'/);
});

test("dashboard turns measurements into prioritized actions without double-counting active people", () => {
  assert.match(dashboard, /function buildDashboardInsights/);
  assert.match(dashboard, /Decision briefing/);
  assert.match(dashboard, /conversion_from_previous_pct/);
  assert.match(dashboard, /averageUsers:[\s\S]*?unique_people/);
  assert.doesNotMatch(dashboard, /totals\.users/);
  assert.match(dashboard, /setSelectedPeriod/);
  assert.match(dashboard, /Intl\.DateTimeFormat\("en-GB"/);
  assert.match(dashboard, /onPointerMove=\{inspectPointer\}/);
  assert.match(dashboard, /onKeyDown=\{inspectWithKeyboard\}/);
  assert.match(dashboard, /Hover, drag, or use the arrow keys to inspect values/);
  assert.match(dashboard, /buildFeatureSeries\(featureRows, usageRows\.map/);
  assert.match(dashboard, /No activity was recorded for this chart/);
  assert.match(dashboard, /Measurement coverage/);
  assert.match(dashboard, /rangeDraft\.startDate > rangeDraft\.endDate/);
  assert.doesNotMatch(dashboard, /Promise\.all\(\[[\s\S]*?analytics\/summary[\s\S]*?notification-delivery-report/);
  assert.match(dashboard, /void hydrateNotificationDeliveryReport\(token\)/);
});

test("mode-fit calibration events are accepted and reported without question text", () => {
  assert.match(analytics, /"mode_fit_prediction"/);
  assert.match(analytics, /"mode_fit_outcome"/);
  assert.match(analytics, /export async function modeFitCalibrationSummary/);
  assert.match(analytics, /metadata->>'prediction_id'/);
  assert.match(analytics, /false-switch guardrails/);
  const calibration = analytics.slice(analytics.indexOf("export async function modeFitCalibrationSummary"));
  assert.doesNotMatch(calibration, /metadata->>'question'|metadata->>'answer'/);
});
