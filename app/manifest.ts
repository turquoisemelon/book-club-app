import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chapter Club",
    short_name: "Chapter Club",
    description: "Book polls, meetups and spoiler-free chat for your book club.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#faf6ef",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
