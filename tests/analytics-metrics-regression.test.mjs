import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const analytics = readFileSync(new URL("../src/lib/analytics.ts", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../src/app/internal/analytics/analytics-dashboard.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
const notificationReport = readFileSync(new URL("../src/lib/notification-delivery-report.ts", import.meta.url), "utf8");

test("human analytics excludes cron traffic and uses a real rolling 24-hour window", () => {
  assert.match(analytics, /COALESCE\(\$\{alias\}\.source, ''\) <> 'cron'/);
  assert.match(analytics, /SELECT 'events_24h',[\s\S]*?created_at >= now\(\) - interval '24 hours'/);
  assert.doesNotMatch(analytics, /SELECT 'events_24h', COUNT\(\*\)::int FROM analytics_events WHERE \$\{selectedDateFilter\}/);
});

test("journey funnel requires milestones to happen in sequence", () => {
  assert.match(analytics, /WITH scoped_events AS MATERIALIZED \([\s\S]*?event_name,\s+metadata[\s\S]*?FROM analytics_events/);
  assert.match(analytics, /MIN\(created_at\) AS opened_at[\s\S]*?event_name = 'app_opened'/);
  assert.match(analytics, /metadata->>'onboarding_required' = 'true'/);
  assert.match(analytics, /opened_at::date >= \$\{startDateSql\}/);
  assert.match(analytics, /onboarded_at >= opened_at/);
  assert.match(analytics, /asked_at >= onboarded_at/);
  assert.doesNotMatch(analytics, /CASE WHEN authenticated_at >= opened_at/);
});

test("onboarding analytics cohorts only eligible first-run people with stable variants", () => {
  assert.match(client, /onboarding_required: onboardingRequired/);
  assert.match(client, /analytics_schema_version: 2/);
  assert.match(client, /assignExperimentVariant\(window\.localStorage, "activation_onboarding_v1"\)/);
  assert.match(client, /experiment: "activation_onboarding_v1"[\s\S]*?variant: onboardingVariant/);
  assert.doesNotMatch(client, /experiment: "whole_product_refinement_v1",\s*variant: "refined_information_architecture",\s*\}\);/);
});

test("notification blockers exclude accounts that never opted into push", () => {
  assert.match(notificationReport, /subscription_history AS/);
  assert.match(notificationReport, /COALESCE\(subscription_history\.total_subscription_count, 0\) > 0/);
  assert.match(notificationReport, /FROM push_subscriptions\s+ORDER BY user_id, updated_at DESC/);
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
  assert.match(analytics, /'eligible_activation_rate'/);
  assert.match(analytics, /'outcome_response_rate'/);
  assert.match(analytics, /'positive_outcome_rate'/);
  assert.match(analytics, /'impact_rate'/);
  assert.match(analytics, /feature_destinations.*feature_destination_opened/);
  assert.match(analytics, /audienceBreakdowns: audienceBreakdownRows/);
  assert.match(analytics, /growthMetrics: growthMetricRows/);
});

test("dashboard reports impact experiments and diagnosable authentication failures", () => {
  assert.match(analytics, /event_name IN \('answer_feedback', 'meaningful_outcome_recorded'\)/);
  assert.match(analytics, /impactBreakdowns: impactBreakdownRows/);
  assert.match(analytics, /WITH exposures AS[\s\S]*?event_name = 'experiment_exposed'/);
  assert.match(analytics, /conversions\.created_at >= exposures\.exposed_at/);
  assert.match(analytics, /metadata->>'variant' <> 'unassigned'/);
  assert.match(analytics, /COALESCE\(metadata->>'eligible', 'true'\) = 'true'/);
  assert.match(analytics, /experiments: experimentRows/);
  assert.match(analytics, /authFailures30d: authFailureRows/);
  assert.match(analytics, /metadata->>'method'/);
  assert.match(analytics, /metadata->>'reason'/);
  assert.match(analytics, /NULLIF\(metadata->>'runtime', ''\)/);
  assert.match(dashboard, /<th className="pb-2">Platform<\/th>/);
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

test("dashboard uses focused views and defers operational diagnostics", () => {
  assert.match(dashboard, /type DashboardView = "overview" \| "audience" \| "engagement" \| "journeys" \| "operations"/);
  assert.match(dashboard, /aria-label="Analytics sections"/);
  assert.match(dashboard, /selectedView === "operations"/);
  assert.match(dashboard, /payload\.notificationDeliveryReport === undefined/);
  assert.match(dashboard, /<details[\s\S]*?open=\{!payload\}/);
  assert.match(dashboard, /<option value="all">All time<\/option>/);
  assert.match(dashboard, /const startDate = "1970-01-01"/);
  assert.match(dashboard, /Account directory/);
  assert.match(dashboard, /\/api\/internal\/users/);
  assert.doesNotMatch(dashboard, /href="\/internal\/users"/);
});

test("dashboard supports comparison, segmentation, targets, drill-down, sharing, attribution, and coverage", () => {
  assert.match(dashboard, /formatComparison/);
  assert.match(dashboard, /Trend segment filters/);
  assert.match(dashboard, /Contributors for/);
  assert.match(dashboard, /Targets and alerts/);
  assert.match(dashboard, /Export CSV/);
  assert.match(dashboard, /Save view/);
  assert.match(dashboard, /Share snapshot/);
  assert.match(dashboard, /releaseAnnotations/);
  assert.match(dashboard, /Acquisition to retention/);
  assert.match(dashboard, /Event instrumentation coverage/);
  assert.match(analytics, /function segmentFilterWhere/);
  assert.match(analytics, /acquisitionRetention: acquisitionRetentionRows/);
  assert.match(analytics, /eventCoverage: \[\.\.\.ALLOWED_EVENTS\]/);
});

test("all-time analytics starts at real data and the admin secret can persist on-device", () => {
  assert.match(analytics, /requestedDateRange\.startDate === "1970-01-01"/);
  assert.match(analytics, /SELECT MIN\(observed_date\)::text AS earliest_date/);
  assert.match(dashboard, /PERSISTENT_SECRET_KEY/);
  assert.match(dashboard, /window\.localStorage\.setItem\(PERSISTENT_SECRET_KEY, token\)/);
  assert.match(dashboard, /Remember secret on this device/);
  assert.match(dashboard, /Forget saved secret/);
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
