import { mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.ALETHEIA_CAPTURE_URL ?? "http://localhost:3000";
const RAW_ROOT = path.join(ROOT, "app-store-assets", "previews", "raw-recordings");
const OUTPUT_ROOT = path.join(ROOT, "app-store-assets", "previews", "comprehensive");

const TARGETS = [
  {
    name: "iphone",
    viewport: { width: 443, height: 960 },
    recordingSize: { width: 443, height: 960 },
    preserveWideLayout: false,
    outputSize: { width: 886, height: 1920 },
  },
  {
    name: "iphone-duo",
    viewport: { width: 699, height: 1017 },
    recordingSize: { width: 699, height: 1017 },
    preserveWideLayout: true,
    outputSize: { width: 886, height: 1920 },
  },
  {
    name: "ipad-13",
    viewport: { width: 1032, height: 1376 },
    recordingSize: { width: 1032, height: 1376 },
    preserveWideLayout: false,
    outputSize: { width: 1200, height: 1600 },
  },
];

const TARGET_FILTER = process.env.ALETHEIA_CAPTURE_TARGET;
const SELECTED_TARGETS = TARGET_FILTER
  ? TARGETS.filter((target) => target.name === TARGET_FILTER)
  : TARGETS;

if (TARGET_FILTER && SELECTED_TARGETS.length === 0) {
  throw new Error(`Unknown preview target: ${TARGET_FILTER}`);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function clickPrimaryNav(page, index) {
  await page.evaluate((targetIndex) => {
    const buttons = [...document.querySelectorAll("button")];
    const navButtons = buttons.filter((element) => {
      const className = String(element.className ?? "");
      return className.includes("rounded-full") &&
        className.includes("px-3") &&
        className.includes("text-[0.82rem]");
    });
    const button = navButtons[targetIndex];
    if (!button) throw new Error(`Primary navigation button ${targetIndex} was not found.`);
    const reactKey = Object.keys(button).find((key) => key.startsWith("__reactProps"));
    const props = reactKey ? button[reactKey] : null;
    if (!props || typeof props.onClick !== "function") {
      throw new Error(`Primary navigation button ${targetIndex} has no click handler.`);
    }
    props.onClick({ preventDefault() {}, stopPropagation() {} });
  }, index);
  await wait(500);
}

async function clickTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click();
  await wait(400);
}

async function scrollBy(page, amount) {
  await page.evaluate((distance) => window.scrollBy({ top: distance, behavior: "smooth" }), amount);
  await wait(700);
}

const JOURNEYS = [
  {
    slug: "01-home-to-ask",
    run: async (page) => {
      await wait(3000);
      await clickTab(page, "Ask Aletheia");
      await wait(2500);
      const input = page.getByRole("textbox").first();
      await input.fill("How can I make this decision with wisdom?");
      await wait(3000);
      await scrollBy(page, 360);
      await wait(3000);
      await scrollBy(page, -360);
      await wait(3000);
    },
  },
  {
    slug: "02-decision-discernment",
    run: async (page) => {
      await clickPrimaryNav(page, 1);
      await wait(3500);
      await clickTab(page, "Counsel Circle");
      await wait(3500);
      await clickTab(page, "Rhythm");
      await wait(3500);
      await scrollBy(page, 420);
      await wait(3500);
    },
  },
  {
    slug: "03-reflection-formation",
    run: async (page) => {
      await clickPrimaryNav(page, 2);
      await wait(3500);
      await clickTab(page, "Reflection Journal");
      await wait(3500);
      await clickTab(page, "Formation");
      await wait(3500);
      await scrollBy(page, 420);
      await wait(3500);
    },
  },
  {
    slug: "04-scripture-library",
    run: async (page) => {
      await clickPrimaryNav(page, 3);
      await clickTab(page, "Formation");
      await wait(2500);
      await clickTab(page, "Explore");
      await wait(2500);
      await clickTab(page, "Bible");
      await wait(2500);
      await clickTab(page, "Listening");
      await wait(2500);
      await clickTab(page, "Saved");
      await wait(3500);
    },
  },
  {
    slug: "05-account-control",
    run: async (page) => {
      await clickPrimaryNav(page, 4);
      await wait(3000);
      await clickTab(page, "Personalize");
      await wait(3000);
      await clickTab(page, "Notifications");
      await wait(3000);
      await clickTab(page, "System");
      await wait(3500);
      await scrollBy(page, 360);
      await wait(1500);
    },
  },
  {
    slug: "06-complete-companion-loop",
    run: async (page) => {
      await wait(2500);
      await clickTab(page, "Ask Aletheia");
      await wait(2500);
      await clickPrimaryNav(page, 1);
      await wait(2500);
      await clickTab(page, "Counsel Circle");
      await wait(2500);
      await clickPrimaryNav(page, 2);
      await clickTab(page, "Reflection Journal");
      await wait(3500);
    },
  },
];

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function transcode(rawPath, outputPath, leadSeconds, target) {
  const { width, height } = target.outputSize;
  const filter = target.preserveWideLayout
    ? `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=36,eq=brightness=-0.24:saturation=0.72[bg];` +
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg];` +
      "[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[outv]"
    : `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0xEEF2EF,format=yuv420p[outv]`;

  await runCommand("ffmpeg", [
    "-y", "-loglevel", "error",
    "-ss", leadSeconds.toFixed(3),
    "-i", rawPath,
    "-f", "lavfi", "-t", "16", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", filter,
    "-map", "[outv]", "-map", "1:a",
    "-t", "16", "-r", "30",
    "-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-level:v", "4.0",
    "-b:v", "10M", "-minrate", "10M", "-maxrate", "10M", "-bufsize", "20M",
    "-x264-params", "nal-hrd=cbr:force-cfr=1:filler=1",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

async function recordJourney(browser, target, journey) {
  const rawDirectory = path.join(RAW_ROOT, target.name, journey.slug);
  const outputDirectory = path.join(OUTPUT_ROOT, target.name);
  await mkdir(rawDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  const context = await browser.newContext({
    viewport: target.viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: rawDirectory, size: target.recordingSize },
  });
  const recordingStartedAt = Date.now();
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({ language: "en" }));
    localStorage.setItem("aletheia_theme_preference", "classic");
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia-home-section", "today");
    const hideDevelopmentUi = () => {
      document.querySelectorAll("nextjs-portal").forEach((element) => element.remove());
    };
    window.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.documentElement.appendChild(style);
      hideDevelopmentUi();
      window.setInterval(hideDevelopmentUi, 200);
    });
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.querySelector('[data-testid="app-launch-splash"]'));
  await wait(700);
  const journeyStartedAt = Date.now();
  await journey.run(page);
  await wait(1000);
  const video = page.video();
  await context.close();
  const rawPath = await video.path();
  const leadSeconds = Math.max(0, (journeyStartedAt - recordingStartedAt) / 1000);
  const { width, height } = target.outputSize;
  const outputPath = path.join(outputDirectory, `${journey.slug}-${width}x${height}.mp4`);
  await transcode(rawPath, outputPath, leadSeconds, target);
  await rm(rawDirectory, { recursive: true, force: true });
  console.log(`saved ${target.name}/${journey.slug}-${width}x${height}.mp4`);
}

const browser = await chromium.launch({ headless: true });
try {
  await Promise.all(SELECTED_TARGETS.map(async (target) => {
    for (const journey of JOURNEYS) {
      await recordJourney(browser, target, journey);
    }
  }));
} finally {
  await browser.close();
  await rm(RAW_ROOT, { recursive: true, force: true });
}
