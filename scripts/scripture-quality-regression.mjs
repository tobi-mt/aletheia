#!/usr/bin/env node

import process from "node:process";

const BASE_URL = process.env.QUALITY_BASE_URL || "http://localhost:3000";
const DEPTH_MIN_THEMES = 2;
const DEPTH_MIN_QUESTIONS = 2;
const DEPTH_MIN_ACTIONS = 2;
const MAX_FALLBACK_RATE = Number(process.env.QUALITY_MAX_FALLBACK_RATE || "0.35");
const MIN_CITATION_GROUNDING_RATIO = Number(process.env.QUALITY_MIN_CITATION_RATIO || "0.75");

const sampleCases = [
  { language: "en", translation: "WEB", book: "Matthew", chapter: 25 },
  { language: "es", translation: "RV1960", book: "John", chapter: 3 },
  { language: "fr", translation: "LSG1910", book: "Proverbs", chapter: 3 },
  { language: "pt", translation: "AA", book: "Psalm", chapter: 23 },
  { language: "de", translation: "LUTH1912", book: "Romans", chapter: 8 },
  { language: "yo", translation: "YOR1900", book: "John", chapter: 1 },
  { language: "ig", translation: "IGB1913", book: "Luke", chapter: 15 },
  { language: "ha", translation: "HAU1932", book: "Matthew", chapter: 6 },
  { language: "tl", translation: "WEB", book: "Philippians", chapter: 4 },
  { language: "ar", translation: "WEB", book: "Genesis", chapter: 1 },
  { language: "hi", translation: "WEB", book: "James", chapter: 1 },
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await res.text();
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, body };
}

function hasCitationArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function evaluateStudyPayload(payload) {
  const issues = [];

  if (!payload || typeof payload !== "object") {
    return { issues: ["study payload missing or invalid"], metrics: { citedThemes: 0, totalThemes: 0, citedActions: 0, totalActions: 0 } };
  }

  const themes = Array.isArray(payload.themes) ? payload.themes : [];
  const reflectionQuestions = Array.isArray(payload.reflectionQuestions) ? payload.reflectionQuestions : [];
  const practiceActions = Array.isArray(payload.practiceActions) ? payload.practiceActions : [];

  if (typeof payload.summary !== "string" || payload.summary.trim().length < 50) {
    issues.push("summary too short or missing");
  }
  if (themes.length < DEPTH_MIN_THEMES) {
    issues.push(`insufficient themes (${themes.length})`);
  }
  if (reflectionQuestions.length < DEPTH_MIN_QUESTIONS) {
    issues.push(`insufficient reflection questions (${reflectionQuestions.length})`);
  }
  if (practiceActions.length < DEPTH_MIN_ACTIONS) {
    issues.push(`insufficient practice actions (${practiceActions.length})`);
  }

  let citedThemes = 0;
  themes.forEach((theme, idx) => {
    if (!theme || typeof theme.title !== "string" || typeof theme.explanation !== "string") {
      issues.push(`theme ${idx + 1} missing title/explanation`);
      return;
    }
    if (theme.explanation.trim().length < 20) {
      issues.push(`theme ${idx + 1} explanation too short`);
    }
    if (hasCitationArray(theme.verseCitations)) {
      citedThemes += 1;
    } else {
      issues.push(`theme ${idx + 1} missing verse citations`);
    }
  });

  let citedActions = 0;
  practiceActions.forEach((action, idx) => {
    if (!action || typeof action.text !== "string" || action.text.trim().length < 12) {
      issues.push(`action ${idx + 1} too short or missing`);
    }
    if (hasCitationArray(action.verseCitations)) {
      citedActions += 1;
    } else {
      issues.push(`action ${idx + 1} missing verse citations`);
    }
  });

  return {
    issues,
    metrics: {
      citedThemes,
      totalThemes: themes.length,
      citedActions,
      totalActions: practiceActions.length,
    },
  };
}

async function checkStudyCase(testCase) {
  const qs = new URLSearchParams({
    translation: testCase.translation,
    book: testCase.book,
    chapter: String(testCase.chapter),
    language: testCase.language,
  });
  const url = `${BASE_URL}/api/bible-study?${qs.toString()}`;
  const res = await fetchJson(url);

  if (!res.ok) {
    return {
      ok: false,
      case: testCase,
      issues: [`study endpoint failed with ${res.status}`],
      metrics: { citedThemes: 0, totalThemes: 0, citedActions: 0, totalActions: 0 },
      fallback: false,
    };
  }

  const evaluation = evaluateStudyPayload(res.json);
  return {
    ok: evaluation.issues.length === 0,
    case: testCase,
    issues: evaluation.issues,
    metrics: evaluation.metrics,
    fallback: Boolean(res.json?.fallbackTranslation),
  };
}

async function checkQuickReadFallbacks() {
  let fallbackCount = 0;
  let total = 0;

  for (const testCase of sampleCases) {
    const qs = new URLSearchParams({
      translation: testCase.translation,
      book: testCase.book,
      chapter: String(testCase.chapter),
    });
    const res = await fetchJson(`${BASE_URL}/api/bible?${qs.toString()}`);
    if (!res.ok) {
      continue;
    }
    total += 1;
    if (res.json?.fallbackTranslation) {
      fallbackCount += 1;
    }
  }

  const fallbackRate = total > 0 ? fallbackCount / total : 0;
  return { fallbackCount, total, fallbackRate };
}

async function main() {
  const studyResults = await Promise.all(sampleCases.map((testCase) => checkStudyCase(testCase)));

  const failedStudies = studyResults.filter((result) => !result.ok);
  const citedThemes = studyResults.reduce((sum, result) => sum + result.metrics.citedThemes, 0);
  const totalThemes = studyResults.reduce((sum, result) => sum + result.metrics.totalThemes, 0);
  const citedActions = studyResults.reduce((sum, result) => sum + result.metrics.citedActions, 0);
  const totalActions = studyResults.reduce((sum, result) => sum + result.metrics.totalActions, 0);

  const citationGroundingRatio =
    totalThemes + totalActions > 0 ? (citedThemes + citedActions) / (totalThemes + totalActions) : 0;

  const fallback = await checkQuickReadFallbacks();

  const failures = [];

  if (failedStudies.length > 0) {
    failures.push(`Study depth/structure failed for ${failedStudies.length} case(s).`);
  }

  if (citationGroundingRatio < MIN_CITATION_GROUNDING_RATIO) {
    failures.push(
      `Citation grounding ratio ${citationGroundingRatio.toFixed(2)} below threshold ${MIN_CITATION_GROUNDING_RATIO.toFixed(2)}.`
    );
  }

  if (fallback.fallbackRate > MAX_FALLBACK_RATE) {
    failures.push(
      `Fallback rate ${fallback.fallbackRate.toFixed(2)} above threshold ${MAX_FALLBACK_RATE.toFixed(2)}.`
    );
  }

  console.log("Scripture Quality Regression Summary");
  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    sampledCases: sampleCases.length,
    failedStudies: failedStudies.length,
    citationGroundingRatio: Number(citationGroundingRatio.toFixed(4)),
    fallbackRate: Number(fallback.fallbackRate.toFixed(4)),
    fallbackCount: fallback.fallbackCount,
    checkedQuickReads: fallback.total,
  }, null, 2));

  if (failedStudies.length > 0) {
    console.log("\nStudy Case Failures:");
    failedStudies.forEach((failure) => {
      console.log(`- ${failure.case.language}/${failure.case.translation} ${failure.case.book} ${failure.case.chapter}: ${failure.issues.join("; ")}`);
    });
  }

  if (failures.length > 0) {
    console.error("\nQuality regression failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log("\nQuality regression passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
