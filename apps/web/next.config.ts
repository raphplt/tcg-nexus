import type { NextConfig } from "next";
import { remotePatterns } from "./utils/images";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: remotePatterns,
  },
  serverExternalPackages: ["@tailwindcss/oxide", "lightningcss"],
};

export default nextConfig;
