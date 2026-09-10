import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

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
      items: ["architecture/monorepo", "architecture/database"],
    },
    {
      type: "category",
      label: "Backend",
      items: [
        "backend/api",
        "backend/auth",
        "backend/users",
        "backend/tournaments",
        "backend/matches",
        "backend/marketplace",
        "backend/cards",
        "backend/decks",
        "backend/collections",
        "backend/translations",
        "backend/scan",
        "backend/notifications",
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
      items: ["services/fetch", "services/vision"],
    },
    {
      type: "category",
      label: "Ops",
      items: ["ops/docker", "ops/tests"],
    },
  ],
};

export default sidebars;
