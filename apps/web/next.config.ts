import type { NextConfig } from "next";
import { remotePatterns } from "./utils/images";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remotePatterns,
  },
  serverExternalPackages: ["@tailwindcss/oxide", "lightningcss"],
};

export default nextConfig;
