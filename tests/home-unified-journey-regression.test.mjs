import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/components/aletheia-app.tsx", import.meta.url), "utf8");
const homeStart = app.indexOf('{activeView === "companion" ? (');
const homeRender = app.slice(homeStart, app.indexOf('activeView === "decisions"', homeStart));

test("Home keeps Today and Ask in one oriented, explicitly selectable surface", () => {
  assert.match(homeRender, /id="home-today"/);
  assert.match(homeRender, /<HomeDashboard/);
  assert.match(homeRender, /<CompanionPanel/);
  assert.match(homeRender, /value=\{homeSection\}/);
  assert.match(homeRender, /key: "ask"/);
  assert.match(homeRender, /key: "today"/);
  assert.match(homeRender, /homeSection === "ask"/);
});

test("Home orients the person before offering Ask and Today workspaces", () => {
  const welcomeIndex = homeRender.indexOf("<HomeWelcomeHeader");
  const tabsIndex = homeRender.indexOf("<ScreenTabs");
  const askIndex = homeRender.indexOf("<CompanionPanel");
  const todayIndex = homeRender.indexOf("<HomeDashboard");
  assert.ok(welcomeIndex > 0);
  assert.ok(tabsIndex > 0);
  assert.ok(askIndex > 0);
  assert.ok(todayIndex > 0);
  assert.ok(welcomeIndex < tabsIndex);
  assert.ok(tabsIndex < askIndex);
  assert.ok(welcomeIndex < askIndex);
  assert.ok(askIndex < todayIndex);
});

test("Today presents daily wisdom before optional personalization and formation nudges", () => {
  const dashboard = app.slice(app.indexOf("function HomeDashboard"), app.indexOf("function WeeklyReviewRailStat"));
  const todayIndex = dashboard.indexOf("<TodayVisualPanel");
  const personalizationIndex = dashboard.indexOf("personalizationContextEmpty ?");
  const recommendationIndex = dashboard.indexOf("<TodayFormationContinuation");
  assert.ok(todayIndex > 0);
  assert.ok(todayIndex < personalizationIndex);
  assert.ok(personalizationIndex < recommendationIndex);
});

test("Home greeting transitions directly into Ask without a stacked spacer", () => {
  const welcome = app.slice(app.indexOf("function HomeWelcomeHeader"), app.indexOf("function ScreenPurposeHeader"));
  assert.doesNotMatch(welcome, /mt-4 block h-px w-full/);
  assert.match(homeRender, /id="home-today" className="mb-3 scroll-mt-24 sm:mb-4"/);
});

test("Today begins with Aletheia-owned visual assets instead of remote stock imagery", () => {
  const visualPanel = app.slice(app.indexOf("function TodayVisualPanel"), app.indexOf("function HomeDashboard"));
  assert.match(visualPanel, /useState\(true\)/);
  assert.match(app, /TODAY_LOCAL_VISUAL_LIBRARY/);
  assert.match(app, /TODAY_PREMIUM_VISUAL_PREFIX = "\/images\/today-premium\/"/);
  assert.match(app, /premiumTodayVisualAsset\("aletheia-restoration", "restoration-water\.jpg"\)/);
  for (const fileName of ["discernment-path.jpg", "stewardship-ledger.jpg", "counsel-table.jpg", "restoration-water.jpg"]) {
    const asset = new URL(`../public/images/today-premium/${fileName}`, import.meta.url);
    assert.ok(statSync(asset).size < 150_000, `${fileName} should remain mobile-ready`);
  }
});

test("all Ask workflow jumps retain the stable composer anchor", () => {
  assert.match(app, /id="companion-ask"/);
  assert.match(app, /function askOneQuestionFlow\(\)[\s\S]*?scrollToSection\("companion-ask"\)/);
  assert.match(app, /function goDeeperFromExchange[\s\S]*?scrollToSection\("companion-ask"\)/);
});
