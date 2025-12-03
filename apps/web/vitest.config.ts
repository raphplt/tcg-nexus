import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "@app": path.resolve(__dirname, "app"),
      "@components": path.resolve(__dirname, "components"),
      "@hooks": path.resolve(__dirname, "hooks"),
      "@utils": path.resolve(__dirname, "utils"),
      "@lib": path.resolve(__dirname, "lib"),
      "@actions": path.resolve(__dirname, "actions"),
      "@public": path.resolve(__dirname, "public"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.tsx",
    globals: true,
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
