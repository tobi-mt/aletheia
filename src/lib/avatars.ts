const MAX_AVATAR_URL_LENGTH = 600;
const MAX_AVATAR_DATA_URL_LENGTH = 2_500_000;
const MAX_AVATAR_SVG_DATA_URL_LENGTH = 24_000;
const SAFE_DATA_IMAGE_PREFIX = "data:image/";
const SAFE_DATA_SVG_PREFIX = "data:image/svg+xml,";

function isSafeRasterAvatarDataUrl(value: string) {
  if (!value.startsWith(SAFE_DATA_IMAGE_PREFIX) || value.length > MAX_AVATAR_DATA_URL_LENGTH) {
    return false;
  }

  const matched = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/i);
  return Boolean(matched);
}

function isSafeCuratedAvatarSvgDataUrl(value: string) {
  if (!value.startsWith(SAFE_DATA_SVG_PREFIX) || value.length > MAX_AVATAR_SVG_DATA_URL_LENGTH) {
    return false;
  }

  const encoded = value.slice(SAFE_DATA_SVG_PREFIX.length);
  const decoded = safeDecodeURIComponent(encoded).trim();
  if (!decoded.startsWith("<svg") || !decoded.includes("data-aletheia-avatar='1'")) {
    return false;
  }

  const lower = decoded.toLowerCase();
  if (
    lower.includes("<script") ||
    lower.includes("onload=") ||
    lower.includes("onerror=") ||
    lower.includes("<foreignobject") ||
    lower.includes("javascript:")
  ) {
    return false;
  }

  return true;
}

function normalizeCuratedAvatarSvgDataUrl(value: string) {
  if (!value.startsWith(SAFE_DATA_SVG_PREFIX) || value.length > MAX_AVATAR_SVG_DATA_URL_LENGTH) {
    return null;
  }

  const encoded = value.slice(SAFE_DATA_SVG_PREFIX.length);
  const decoded = safeDecodeURIComponent(encoded).trim();
  const canonical = `${SAFE_DATA_SVG_PREFIX}${encodeURIComponent(decoded)}`;
  return isSafeCuratedAvatarSvgDataUrl(canonical) ? canonical : null;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function initialsFromName(nameOrEmail: string) {
  const cleaned = nameOrEmail.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return "AL";
  }

  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "AL";
}

function hashToHue(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

export function normalizeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isSafeRasterAvatarDataUrl(trimmed)) {
    return trimmed;
  }

  const curatedAvatar = normalizeCuratedAvatarSvgDataUrl(trimmed);
  if (curatedAvatar) {
    return curatedAvatar;
  }

  if (trimmed.length > MAX_AVATAR_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isHttps = parsed.protocol === "https:";
    const isHttpLocal = parsed.protocol === "http:" && isLocalhost;

    if (!isHttps && !isHttpLocal) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

type CuratedAvatarPreset = {
  id: string;
  name: string;
  hue: number;
  accentHue: number;
  pattern: "halo" | "spark" | "rays" | "dots";
  accessory: "glasses" | "smile" | "wink" | "sparkle" | "cap" | "leaf";
};

export type CuratedAvatarOption = {
  id: string;
  name: string;
  src: string;
};

const CURATED_AVATAR_PRESETS: CuratedAvatarPreset[] = [
  { id: "sunny-sage", name: "Sunny Sage", hue: 45, accentHue: 18, pattern: "rays", accessory: "smile" },
  { id: "mint-spark", name: "Mint Spark", hue: 152, accentHue: 188, pattern: "spark", accessory: "sparkle" },
  { id: "ocean-wink", name: "Ocean Wink", hue: 204, accentHue: 168, pattern: "halo", accessory: "wink" },
  { id: "amber-joy", name: "Amber Joy", hue: 36, accentHue: 12, pattern: "dots", accessory: "smile" },
  { id: "forest-friend", name: "Forest Friend", hue: 132, accentHue: 96, pattern: "rays", accessory: "leaf" },
  { id: "berry-buddy", name: "Berry Buddy", hue: 330, accentHue: 288, pattern: "spark", accessory: "glasses" },
  { id: "denim-dream", name: "Denim Dream", hue: 222, accentHue: 250, pattern: "dots", accessory: "cap" },
  { id: "coral-comet", name: "Coral Comet", hue: 8, accentHue: 28, pattern: "halo", accessory: "sparkle" },
  { id: "olive-orbit", name: "Olive Orbit", hue: 82, accentHue: 136, pattern: "rays", accessory: "glasses" },
  { id: "sky-smile", name: "Sky Smile", hue: 194, accentHue: 214, pattern: "halo", accessory: "smile" },
  { id: "peach-peace", name: "Peach Peace", hue: 20, accentHue: 350, pattern: "dots", accessory: "wink" },
  { id: "teal-trail", name: "Teal Trail", hue: 172, accentHue: 196, pattern: "spark", accessory: "cap" },
  { id: "plum-pulse", name: "Plum Pulse", hue: 282, accentHue: 316, pattern: "rays", accessory: "sparkle" },
  { id: "gold-grove", name: "Gold Grove", hue: 54, accentHue: 80, pattern: "dots", accessory: "leaf" },
  { id: "stone-smirk", name: "Stone Smirk", hue: 28, accentHue: 205, pattern: "halo", accessory: "wink" },
  { id: "aqua-ally", name: "Aqua Ally", hue: 186, accentHue: 160, pattern: "spark", accessory: "smile" },
  { id: "ruby-ripple", name: "Ruby Ripple", hue: 354, accentHue: 22, pattern: "rays", accessory: "cap" },
  { id: "citrus-charm", name: "Citrus Charm", hue: 64, accentHue: 42, pattern: "halo", accessory: "glasses" },
  { id: "moss-mate", name: "Moss Mate", hue: 110, accentHue: 146, pattern: "dots", accessory: "smile" },
  { id: "navy-nudge", name: "Navy Nudge", hue: 232, accentHue: 198, pattern: "spark", accessory: "wink" },
  { id: "rose-ray", name: "Rose Ray", hue: 338, accentHue: 14, pattern: "rays", accessory: "sparkle" },
  { id: "sand-step", name: "Sand Step", hue: 34, accentHue: 56, pattern: "dots", accessory: "leaf" },
  { id: "palm-play", name: "Palm Play", hue: 146, accentHue: 166, pattern: "halo", accessory: "cap" },
  { id: "dusk-dash", name: "Dusk Dash", hue: 256, accentHue: 286, pattern: "spark", accessory: "glasses" },
];

function avatarAccessory(preset: CuratedAvatarPreset) {
  const accent = `hsl(${preset.accentHue} 76% 34%)`;
  switch (preset.accessory) {
    case "glasses":
      return `<rect x='28' y='38' width='14' height='10' rx='3' fill='none' stroke='${accent}' stroke-width='2'/><rect x='54' y='38' width='14' height='10' rx='3' fill='none' stroke='${accent}' stroke-width='2'/><line x1='42' y1='43' x2='54' y2='43' stroke='${accent}' stroke-width='2'/>`;
    case "wink":
      return `<line x1='34' y1='43' x2='42' y2='43' stroke='${accent}' stroke-width='2.4' stroke-linecap='round'/>`;
    case "sparkle":
      return `<path d='M48 24 l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2 z' fill='${accent}'/>`;
    case "cap":
      return `<path d='M30 35 q18 -14 36 0 v4 h-36z' fill='${accent}'/><rect x='26' y='39' width='44' height='4' rx='2' fill='${accent}' opacity='0.85'/>`;
    case "leaf":
      return `<path d='M50 28 c10 -4 12 8 3 12 c-9 4 -12 -8 -3 -12z' fill='${accent}'/><path d='M49 30 l4 8' stroke='white' stroke-width='1.4' stroke-linecap='round'/>`;
    case "smile":
    default:
      return "";
  }
}

function avatarPattern(preset: CuratedAvatarPreset) {
  const accentSoft = `hsla(${preset.accentHue} 88% 92% / 0.45)`;
  switch (preset.pattern) {
    case "rays":
      return `<g stroke='${accentSoft}' stroke-width='2'><line x1='48' y1='7' x2='48' y2='18'/><line x1='48' y1='78' x2='48' y2='89'/><line x1='7' y1='48' x2='18' y2='48'/><line x1='78' y1='48' x2='89' y2='48'/><line x1='18' y1='18' x2='26' y2='26'/><line x1='70' y1='70' x2='78' y2='78'/><line x1='18' y1='78' x2='26' y2='70'/><line x1='70' y1='26' x2='78' y2='18'/></g>`;
    case "spark":
      return `<g fill='${accentSoft}'><circle cx='22' cy='22' r='3'/><circle cx='74' cy='24' r='2.8'/><circle cx='24' cy='72' r='2.8'/><circle cx='72' cy='74' r='3'/></g>`;
    case "dots":
      return `<g fill='${accentSoft}'><circle cx='16' cy='18' r='3'/><circle cx='31' cy='12' r='2'/><circle cx='80' cy='18' r='3'/><circle cx='65' cy='12' r='2'/><circle cx='16' cy='79' r='3'/><circle cx='31' cy='84' r='2'/><circle cx='80' cy='79' r='3'/><circle cx='65' cy='84' r='2'/></g>`;
    case "halo":
    default:
      return `<circle cx='48' cy='48' r='34' fill='none' stroke='${accentSoft}' stroke-width='6'/>`;
  }
}

function curatedAvatarSvg(preset: CuratedAvatarPreset) {
  const baseOne = `hsl(${preset.hue} 60% 52%)`;
  const baseTwo = `hsl(${(preset.hue + 24) % 360} 62% 38%)`;
  const skin = `hsl(${(preset.hue + 18) % 360} 58% 88%)`;
  const features = `hsl(${(preset.hue + 210) % 360} 28% 24%)`;

  return `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' data-aletheia-avatar='1' role='img' aria-label='${preset.name}'>
  <defs>
    <linearGradient id='g-${preset.id}' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${baseOne}'/>
      <stop offset='100%' stop-color='${baseTwo}'/>
    </linearGradient>
  </defs>
  <rect width='96' height='96' rx='24' fill='url(#g-${preset.id})'/>
  ${avatarPattern(preset)}
  <circle cx='48' cy='51' r='22' fill='${skin}'/>
  <circle cx='40' cy='48' r='2.4' fill='${features}'/>
  <circle cx='56' cy='48' r='2.4' fill='${features}'/>
  <path d='M38 58 q10 8 20 0' fill='none' stroke='${features}' stroke-width='2.8' stroke-linecap='round'/>
  ${avatarAccessory(preset)}
</svg>`;
}

export const curatedAvatarOptions: CuratedAvatarOption[] = CURATED_AVATAR_PRESETS.map((preset) => ({
  id: preset.id,
  name: preset.name,
  src: `${SAFE_DATA_SVG_PREFIX}${encodeURIComponent(curatedAvatarSvg(preset))}`,
}));

export function defaultAvatarDataUrl(seed: string, label: string) {
  const initials = initialsFromName(label);
  const hue = hashToHue(seed);
  const hueTwo = (hue + 36) % 360;
  const bgOne = `hsl(${hue} 54% 46%)`;
  const bgTwo = `hsl(${hueTwo} 64% 34%)`;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96' role='img' aria-label='${initials}'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${bgOne}'/>
      <stop offset='100%' stop-color='${bgTwo}'/>
    </linearGradient>
  </defs>
  <circle cx='48' cy='48' r='48' fill='url(#g)'/>
  <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='34' font-family='system-ui, -apple-system, Segoe UI, sans-serif' font-weight='700'>${initials}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
