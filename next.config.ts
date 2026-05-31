import type { NextConfig } from "next";

function parseAvatarRemotePatterns() {
  const raw = process.env.AVATAR_IMAGE_HOSTS ?? "";
  const hosts = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const envPatterns = hosts
    .map((value) => {
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
    })
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

  return [...localDevPatterns, ...envPatterns];
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
