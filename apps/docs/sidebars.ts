import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Sidebars configuration for Docusaurus documentation portal.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    "intro",
    {
      type: "category",
      label: "Prise en main",
      items: ["guides/installation", "guides/commands"],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "architecture/monorepo",
        "architecture/database",
        "architecture/packages",
      ],
    },
    {
      type: "category",
      label: "Backend API",
      items: [
        "backend/api",
        "backend/auth",
        "backend/users",
        "backend/cards",
        "backend/decks",
        "backend/collections",
        "backend/marketplace",
        "backend/tournaments",
        "backend/matches",
        "backend/ai",
        "backend/mini-games",
        "backend/notifications",
        "backend/translations",
        "backend/social-gamification",
        "backend/support-editorial",
        "backend/misc",
      ],
    },
    {
      type: "category",
      label: "Front-end",
      items: ["frontend/web", "frontend/mobile"],
    },
    {
      type: "category",
      label: "Services",
      items: ["services/vision", "services/fetch"],
    },
    {
      type: "category",
      label: "Ops & Déploiement",
      items: ["ops/docker", "ops/tests", "ops/deployment"],
    },
  ],
};

export default sidebars;
