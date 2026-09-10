import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { remotePatterns } from "./utils/images";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repositoryRoot,
  images: {
    remotePatterns: remotePatterns,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  serverExternalPackages: ["@tailwindcss/oxide", "lightningcss"],
  compress: true,
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
