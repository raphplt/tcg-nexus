import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind v4 est supporté nativement par Next.js 15+
  // Pas besoin de configuration spéciale
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tcgdex.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
