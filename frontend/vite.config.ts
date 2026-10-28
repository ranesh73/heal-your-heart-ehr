import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          forms: ["react-hook-form", "zod", "@hookform/resolvers/zod"],
          query: ["@tanstack/react-query"],
          dialog: ["@radix-ui/react-dialog"],
        },
      },
    },
  },
});
