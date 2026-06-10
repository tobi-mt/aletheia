import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aletheia",
    short_name: "Aletheia",
    description:
      "Biblical wisdom for stewardship, work, generosity, and thoughtful financial decisions.",
    start_url: "/?pwa=true&v=17",
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
