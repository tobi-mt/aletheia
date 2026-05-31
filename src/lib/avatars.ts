const MAX_AVATAR_URL_LENGTH = 600;

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

  const trimmed = safeDecodeURIComponent(value.trim());
  if (!trimmed || trimmed.length > MAX_AVATAR_URL_LENGTH) {
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
  <rect width='96' height='96' rx='24' fill='url(#g)'/>
  <text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='34' font-family='system-ui, -apple-system, Segoe UI, sans-serif' font-weight='700'>${initials}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
