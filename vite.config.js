import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// XA Project PhotoLog — standalone camera app. Static output only,
// same hosting model as xadOS-app: no server runtime, all data goes
// through the shared XA DOS Supabase project.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
