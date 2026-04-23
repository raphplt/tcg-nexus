import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://tcg-nexus.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/pokemon", changeFrequency: "weekly", priority: 0.9 },
    { path: "/marketplace", changeFrequency: "daily", priority: 0.9 },
    { path: "/marketplace/cards", changeFrequency: "daily", priority: 0.8 },
    { path: "/marketplace/sealed", changeFrequency: "daily", priority: 0.8 },
    { path: "/marketplace/sellers", changeFrequency: "weekly", priority: 0.6 },
    { path: "/tournaments", changeFrequency: "daily", priority: 0.8 },
    { path: "/decks", changeFrequency: "daily", priority: 0.7 },
    { path: "/challenges", changeFrequency: "weekly", priority: 0.6 },
    { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
    { path: "/auth/login", changeFrequency: "yearly", priority: 0.3 },
    { path: "/auth/register", changeFrequency: "yearly", priority: 0.3 },
  ];

  return staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
