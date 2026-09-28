/// <reference types="vitest/config" />

declare const process: { env: Record<string, string | undefined> };

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const base =
  process.env.VITE_BASE && process.env.VITE_BASE.length > 0 ? process.env.VITE_BASE : "/";

const scope = base.endsWith("/") ? base : `${base}/`;

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Flora",
        short_name: "Flora",
        description: "Track thirty different plant foods each week.",
        theme_color: "#1f6b45",
        background_color: "#f4f0e8",
        display: "standalone",
        start_url: scope,
        scope,
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,ico}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
