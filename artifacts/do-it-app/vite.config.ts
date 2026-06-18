import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;
// PORT is only needed for the dev server — default to 3000 in build-only environments (e.g. Railway CI)
const port = rawPort ? Number(rawPort) : 3000;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH defaults to "/" when not set (e.g. Railway, standalone deploys)
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Suppress Vite's "[vite] connecting..." / "[vite] reconnecting..." console
    // messages that appear in Replit's console view due to proxy WebSocket drops.
    {
      name: "suppress-vite-console",
      apply: "serve" as const,
      transformIndexHtml() {
        return [
          {
            tag: "script",
            attrs: { type: "text/javascript" },
            children: `(function(){var _l=console.log.bind(console);console.log=function(){if(typeof arguments[0]==='string'&&arguments[0].startsWith('[vite]'))return;_l.apply(console,arguments)};})();`,
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: false,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
