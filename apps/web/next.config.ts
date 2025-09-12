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
      {
        protocol: "https",
        hostname: "assets.pokemon.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "den-cards.pokellector.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "toxigon.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.pexels.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
