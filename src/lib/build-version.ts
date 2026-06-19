const fallbackBuildId = "dev";

export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? fallbackBuildId;

const encodedBuildId = encodeURIComponent(BUILD_ID);

export const SERVICE_WORKER_URL = `/sw.js?v=${encodedBuildId}`;
export const MANIFEST_URL = `/manifest.webmanifest?v=${encodedBuildId}`;
export const PWA_START_URL = `/?pwa=true&v=${encodedBuildId}`;
