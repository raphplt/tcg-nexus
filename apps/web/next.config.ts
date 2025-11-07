import type { NextConfig } from "next";
import { remotePatterns } from "./utils/images";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: remotePatterns,
  },
};

export default nextConfig;
