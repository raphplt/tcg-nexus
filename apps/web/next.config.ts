import type { NextConfig } from "next";
import { remotePatterns } from "./utils/images";

const nextConfig: NextConfig = {
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

export default nextConfig;
