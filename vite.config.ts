import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
    },
    middlewareMode: false,
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
    },
    fs: {
      strict: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "react-hook-form",
      "react-i18next",
      "zod",
      "@hookform/resolvers",
    ],
    exclude: ["node_modules"],
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    reportCompressedSize: false,
  },
}));
