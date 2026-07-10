import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reps",
    short_name: "Reps",
    description:
      "The daily loop, verified. A character-driven operating system for becoming a real software engineer.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f3f7",
    theme_color: "#f2f3f7",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
