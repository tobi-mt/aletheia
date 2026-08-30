import type { NextConfig } from "next";

const COMMON_AVATAR_HOSTS = [
  "avatars.githubusercontent.com",
  "github.com",
  "lh3.googleusercontent.com",
  "platform-lookaside.fbsbx.com",
  "pbs.twimg.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "secure.gravatar.com",
  "www.gravatar.com",
  "i.pravatar.cc",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
];

const nativeWebBundle = process.env.NEXT_PUBLIC_NATIVE_WEB_BUNDLE === "1";

function toRemotePattern(value: string) {
  try {
    const normalized = value.includes("://") ? value : `https://${value}`;
    const parsed = new URL(normalized);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const protocol = parsed.protocol === "http:" && isLocalhost ? "http" : "https";
    return {
      protocol,
      hostname: parsed.hostname,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

function parseAvatarRemotePatterns() {
  const raw = process.env.AVATAR_IMAGE_HOSTS ?? "";
  const hosts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const envPatterns = hosts
    .map(toRemotePattern)
    .filter((pattern): pattern is { protocol: "http" | "https"; hostname: string; pathname: string } => Boolean(pattern));

  const commonPatterns = COMMON_AVATAR_HOSTS
    .map(toRemotePattern)
    .filter((pattern): pattern is { protocol: "http" | "https"; hostname: string; pathname: string } => Boolean(pattern));

  const localDevPatterns = [
    {
      protocol: "http" as const,
      hostname: "localhost",
      pathname: "/**",
    },
    {
      protocol: "http" as const,
      hostname: "127.0.0.1",
      pathname: "/**",
    },
  ];

  const allPatterns = [...localDevPatterns, ...commonPatterns, ...envPatterns];
  const seen = new Set<string>();

  return allPatterns.filter((pattern) => {
    const key = `${pattern.protocol}:${pattern.hostname}:${pattern.pathname}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingIncludes: {
    "/api/listen/recognize": ["./data/scripture/web-search-index.json"],
  },
  images: {
    remotePatterns: parseAvatarRemotePatterns(),
    unoptimized: nativeWebBundle,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/.well-known/assetlinks.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

export default nextConfig;
