import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.ALETHEIA_CAPTURE_URL ?? "http://localhost:3000";
const OUT_ROOT = path.join(ROOT, "app-store-assets", "screenshots");

const DEVICES = [
  {
    name: "iphone-required-1206x2622",
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 3,
  },
  {
    name: "iphone-1320x2868",
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
  },
  {
    name: "iphone-duo-outer-1398x2034",
    viewport: { width: 466, height: 678 },
    deviceScaleFactor: 3,
  },
  {
    name: "iphone-duo-inner-2007x2853",
    viewport: { width: 669, height: 951 },
    deviceScaleFactor: 3,
  },
  {
    name: "ipad-13-2064x2752",
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
  },
];

const TARGET_FILTER = process.env.ALETHEIA_CAPTURE_TARGET;
const SELECTED_DEVICES = TARGET_FILTER
  ? DEVICES.filter((device) => device.name === TARGET_FILTER)
  : DEVICES;

if (TARGET_FILTER && SELECTED_DEVICES.length === 0) {
  throw new Error(`Unknown capture target: ${TARGET_FILTER}`);
}

const SCREENS = [
  { file: "01-today.png", action: async () => {} },
  {
    file: "02-ask-aletheia.png",
    action: async (page) => {
      await page.getByRole("button", { name: "Ask Aletheia", exact: true }).first().click();
    },
  },
  {
    file: "03-decisions-decision-companion.png",
    action: async (page) => clickPrimaryNav(page, 1),
  },
  {
    file: "04-decisions-counsel-circle.png",
    action: async (page) => {
      await clickPrimaryNav(page, 1);
      await page.getByRole("tab", { name: "Counsel Circle", exact: true }).click();
    },
  },
  {
    file: "05-decisions-rhythm.png",
    action: async (page) => {
      await clickPrimaryNav(page, 1);
      await page.getByRole("tab", { name: "Rhythm", exact: true }).click();
    },
  },
  {
    file: "06-reflect-gratitude.png",
    action: async (page) => clickPrimaryNav(page, 2),
  },
  {
    file: "07-reflect-journal.png",
    action: async (page) => {
      await clickPrimaryNav(page, 2);
      await page.getByRole("tab", { name: "Reflection Journal", exact: true }).click();
    },
  },
  {
    file: "08-reflect-formation.png",
    action: async (page) => {
      await clickPrimaryNav(page, 2);
      await page.getByRole("tab", { name: "Formation", exact: true }).click();
    },
  },
  {
    file: "09-library-formation.png",
    action: async (page) => {
      await clickPrimaryNav(page, 3);
      await page.getByRole("tab", { name: "Formation", exact: true }).click();
    },
  },
  {
    file: "10-library-explore.png",
    action: async (page) => clickPrimaryNav(page, 3),
  },
  {
    file: "11-library-bible.png",
    action: async (page) => {
      await clickPrimaryNav(page, 3);
      await page.getByRole("tab", { name: "Bible", exact: true }).click();
    },
  },
  {
    file: "12-library-listening.png",
    action: async (page) => {
      await clickPrimaryNav(page, 3);
      await page.getByRole("tab", { name: "Listening", exact: true }).click();
    },
  },
  {
    file: "13-library-saved.png",
    action: async (page) => {
      await clickPrimaryNav(page, 3);
      await page.getByRole("tab", { name: "Saved", exact: true }).click();
    },
  },
  {
    file: "14-account-profile.png",
    action: async (page) => clickPrimaryNav(page, 4),
  },
  {
    file: "15-account-personalize.png",
    action: async (page) => {
      await clickPrimaryNav(page, 4);
      await page.getByRole("tab", { name: "Personalize", exact: true }).click();
    },
  },
  {
    file: "16-account-notifications.png",
    action: async (page) => {
      await clickPrimaryNav(page, 4);
      await page.getByRole("tab", { name: "Notifications", exact: true }).click();
    },
  },
  {
    file: "17-account-system.png",
    action: async (page) => {
      await clickPrimaryNav(page, 4);
      await page.getByRole("tab", { name: "System", exact: true }).click();
    },
  },
];

async function clickPrimaryNav(page, index) {
  await page.evaluate((targetIndex) => {
    const buttons = [...document.querySelectorAll("button")];
    const navButtons = buttons.filter((element) => {
      const className = String(element.className ?? "");
      return (
        className.includes("rounded-full") &&
        className.includes("px-3") &&
        className.includes("text-[0.82rem]")
      );
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
}

async function preparePage(browser, device) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("aletheia_preferences", JSON.stringify({ language: "en" }));
    localStorage.setItem("aletheia_theme_preference", "classic");
    localStorage.setItem("aletheia_onboarding_complete", "yes");
    localStorage.setItem("aletheia-home-section", "today");
  });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.querySelector('[data-testid="app-launch-splash"]'));
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((element) => element.remove());
  });
  await page.waitForTimeout(900);
  return { context, page };
}

async function captureScreen(browser, device, screen) {
  const outputDirectory = path.join(OUT_ROOT, device.name);
  await mkdir(outputDirectory, { recursive: true });
  const { context, page } = await preparePage(browser, device);
  try {
    await screen.action(page);
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outputDirectory, screen.file),
      fullPage: false,
      omitBackground: false,
    });
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const device of SELECTED_DEVICES) {
      for (const screen of SCREENS) {
        await captureScreen(browser, device, screen);
        console.log(`saved ${device.name}/${screen.file}`);
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
