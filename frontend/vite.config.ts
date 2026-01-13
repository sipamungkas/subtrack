import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { partytownVite } from "@qwik.dev/partytown/utils";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    partytownVite({
      dest: path.resolve(__dirname, "dist", "~partytown"),
    }),
    {
      name: "inject-partytown-analytics",
      transformIndexHtml(html, ctx) {
        if (ctx.server) return html; // Skip in dev mode

        return html.replace(
          "</head>",
          `
    <!-- Partytown config + snippet -->
    <script>
      partytown = {
        forward: ['dataLayer.push', 'gtag'],
      };
    </script>
    <script src="/~partytown/partytown.js"></script>

    <!-- Google Analytics (GA4) -->
    <script type="text/partytown" src="https://www.googletagmanager.com/gtag/js?id=G-2ZZ3NG9SMM"></script>
    <script type="text/partytown">
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-2ZZ3NG9SMM');
    </script>

    <!-- Umami Analytics -->
    <script type="text/partytown" defer src="https://umami.awans.id/script.js" data-website-id="f510a727-c8bb-410b-a3f7-fa1f0a8e184b"></script>
  </head>`
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
