import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ELP Hub — Equity Leaders Program",
    short_name: "ELP Hub",
    description: "Suivi du programme ELP : inscriptions, tests, autorisations, induction et stages.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f6",
    theme_color: "#a32a29",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
