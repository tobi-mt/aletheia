import type { MetadataRoute } from "next";
import { PWA_START_URL } from "@/lib/build-version";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aletheia",
    short_name: "Aletheia",
    start_url: PWA_START_URL,
    scope: "/",
    display: "standalone",
    background_color: "#eef2ef",
    theme_color: "#eef2ef",
    orientation: "portrait",
    categories: ["finance", "lifestyle", "productivity"],
    icons: [
      {
        src: "/brand/aletheia-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/aletheia-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/aletheia-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
