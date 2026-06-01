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
];

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
  images: {
    remotePatterns: parseAvatarRemotePatterns(),
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
    ];
  },
};

export default nextConfig;
