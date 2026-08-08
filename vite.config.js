import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// XA Project PhotoLog — standalone camera app. Static output only,
// same hosting model as xadOS-app: no server runtime, all data goes
// through the shared XA DOS Supabase project.
//
// __BUILD_TIME__ backs the favicon cache-bust in src/favicon.js. Favicon
// files live in /public with stable filenames (required by some platform
// icon conventions), so Vite's normal content-hashed asset pipeline
// doesn't cover them -- and putting a raw %PLACEHOLDER% token straight in
// an index.html <link href> breaks Vite's own HTML/URL parsing, so the
// version is injected as JS instead, at runtime.
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_TIME__: JSON.stringify(String(Date.now())),
  },
  build: {
    outDir: "dist",
  },
});
