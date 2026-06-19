import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "store-screenshots", "apple", "iphone");
const BASE_URL = "http://localhost:3000";

const VIEWPORT = { width: 428, height: 926 };
const DEVICE_SCALE_FACTOR = 3;

const PRESETS = [
  {
    file: "01-home.png",
    language: "en",
    theme: "classic",
    homeSection: "today",
    navIndex: null,
  },
  {
    file: "02-ask.png",
    language: "es",
    theme: "ocean",
    homeSection: "ask",
    navIndex: null,
  },
  {
    file: "03-decisions.png",
    language: "fr",
    theme: "sunset",
    homeSection: "today",
    navIndex: 1,
  },
  {
    file: "04-reflect.png",
    language: "de",
    theme: "forest",
    homeSection: "today",
    navIndex: 2,
  },
  {
    file: "05-library.png",
    language: "pt",
    theme: "warm",
    homeSection: "today",
    navIndex: 3,
  },
  {
    file: "06-account.png",
    language: "en",
    theme: "black",
    homeSection: "today",
    navIndex: 4,
  },
];

async function clickTopNavButton(page, index) {
  await page.evaluate((targetLabelValue) => {
    const buttons = [...document.querySelectorAll("button")];
    const navButtons = buttons.filter((el) => {
      const className = String(el.className ?? "");
      return className.includes("rounded-full") && className.includes("px-3") && className.includes("text-[0.82rem]");
    });
    const button = navButtons[targetLabelValue];
    if (!button) {
      throw new Error(`Could not find nav button at index ${targetLabelValue}`);
    }
    const reactKey = Object.keys(button).find((key) => key.startsWith("__reactProps"));
    const props = reactKey ? button[reactKey] : null;
    if (!props || typeof props.onClick !== "function") {
      throw new Error(`Nav button is missing an onClick handler at index ${targetLabelValue}`);
    }
    props.onClick({ preventDefault() {}, stopPropagation() {} });
  }, index);
}

async function waitForAppReady(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="app-launch-splash"]'),
    null,
    { timeout: 15000 }
  );
}

async function capturePreset(browser, preset) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  });
  const page = await context.newPage();
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({ language }));
    localStorage.setItem("aletheia_theme_preference", theme);
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia-home-section", "today");
  }, { language: preset.language, theme: preset.theme });

  if (preset.homeSection) {
    await page.addInitScript((homeSection) => {
      localStorage.setItem("aletheia-home-section", homeSection);
    }, preset.homeSection);
  }

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await waitForAppReady(page);

  if (typeof preset.navIndex === "number") {
    await clickTopNavButton(page, preset.navIndex);
    await page.waitForTimeout(1500);
    await waitForAppReady(page);
  }

  await page.screenshot({
    path: path.join(OUT_DIR, preset.file),
    fullPage: false,
  });

  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await rm(path.join(OUT_DIR, "02-mid.png"), { force: true });
  await rm(path.join(OUT_DIR, "03-bottom.png"), { force: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const preset of PRESETS) {
      await capturePreset(browser, preset);
      console.log(`saved ${preset.file}`);
    }
  } finally {
    await browser.close();
  }
}

await main();
