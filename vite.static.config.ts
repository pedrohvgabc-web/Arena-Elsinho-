import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Build separado para o Render Static Site/CDN. O build normal continua usando
 * vite.config.ts e o runtime Node do Web Service que atende server functions.
 */
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
        retryCount: 0,
      },
    },
  },
  // O Static Site publica dist/client; Nitro continua ativo somente no backend.
  nitro: false,
});
