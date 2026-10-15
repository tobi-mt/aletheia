import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const SCREENSHOT_ROOT = path.join(ROOT, "app-store-assets", "screenshots");
const PREVIEW_ROOT = path.join(ROOT, "app-store-assets", "previews", "comprehensive");

const TARGETS = [
  { name: "iphone", screenshots: "iphone-1320x2868" },
  { name: "iphone-duo", screenshots: "iphone-duo-outer-1398x2034" },
];

const JOURNEYS = [
  {
    slug: "01-home-to-ask",
    screens: ["01-today.png", "02-ask-aletheia.png"],
  },
  {
    slug: "02-decision-discernment",
    screens: [
      "03-decisions-decision-companion.png",
      "04-decisions-counsel-circle.png",
      "05-decisions-rhythm.png",
    ],
  },
  {
    slug: "03-reflection-formation",
    screens: [
      "06-reflect-gratitude.png",
      "07-reflect-journal.png",
      "08-reflect-formation.png",
    ],
  },
  {
    slug: "04-scripture-library",
    screens: [
      "09-library-formation.png",
      "10-library-explore.png",
      "11-library-bible.png",
      "12-library-listening.png",
      "13-library-saved.png",
    ],
  },
  {
    slug: "05-account-control",
    screens: [
      "14-account-profile.png",
      "15-account-personalize.png",
      "16-account-notifications.png",
      "17-account-system.png",
    ],
  },
  {
    slug: "06-complete-companion-loop",
    screens: [
      "01-today.png",
      "02-ask-aletheia.png",
      "03-decisions-decision-companion.png",
      "04-decisions-counsel-circle.png",
      "07-reflect-journal.png",
    ],
  },
];

const WIDTH = 886;
const HEIGHT = 1920;
const FPS = 30;
const DURATION = 16;
const FADE_DURATION = 0.5;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function buildFilter(screenCount, stillDuration) {
  const filters = [];
  for (let index = 0; index < screenCount; index += 1) {
    filters.push(
      `[${index}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,` +
      `crop=${WIDTH}:${HEIGHT},format=yuv420p,setsar=1[v${index}]`
    );
  }

  let previous = "v0";
  for (let index = 1; index < screenCount; index += 1) {
    const output = index === screenCount - 1 ? "outv" : `x${index}`;
    const offset = index * (stillDuration - FADE_DURATION);
    filters.push(
      `[${previous}][v${index}]xfade=transition=fade:` +
      `duration=${FADE_DURATION}:offset=${offset.toFixed(3)}[${output}]`
    );
    previous = output;
  }
  return filters.join(";");
}

async function generatePreview(target, journey) {
  const outputDirectory = path.join(PREVIEW_ROOT, target.name);
  await mkdir(outputDirectory, { recursive: true });
  const stillDuration = (DURATION + FADE_DURATION * (journey.screens.length - 1)) / journey.screens.length;
  const args = ["-y"];

  for (const screen of journey.screens) {
    args.push(
      "-loop", "1",
      "-t", stillDuration.toFixed(3),
      "-i", path.join(SCREENSHOT_ROOT, target.screenshots, screen)
    );
  }

  args.push(
    "-f", "lavfi",
    "-t", String(DURATION),
    "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-filter_complex", buildFilter(journey.screens.length, stillDuration),
    "-map", "[outv]",
    "-map", `${journey.screens.length}:a`,
    "-t", String(DURATION),
    "-r", String(FPS),
    "-c:v", "libx264",
    "-preset", "medium",
    "-profile:v", "high",
    "-level:v", "4.0",
    "-b:v", "10M",
    "-minrate", "10M",
    "-maxrate", "10M",
    "-bufsize", "20M",
    "-x264-params", "nal-hrd=cbr:force-cfr=1:filler=1",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "256k",
    "-ar", "48000",
    "-movflags", "+faststart",
    path.join(outputDirectory, `${journey.slug}-886x1920.mp4`)
  );

  await run("ffmpeg", args);
  console.log(`saved ${target.name}/${journey.slug}-886x1920.mp4`);
}

for (const target of TARGETS) {
  for (const journey of JOURNEYS) {
    await generatePreview(target, journey);
  }
}
