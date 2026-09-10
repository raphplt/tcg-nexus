import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const docsUrl = process.env.DOCS_URL ?? "https://docs.tcg-nexus.org";
const swaggerUrl = process.env.SWAGGER_URL ?? "http://localhost:3001/api/docs";

const config: Config = {
  title: "TCG Nexus Docs",
  tagline:
    "Front Next.js, API NestJS, microservices et ops en un seul monorepo.",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: docsUrl,
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: "/",

  // GitHub pages deployment config
  organizationName: "raphplt",
  projectName: "tcg-nexus-docs",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "fr",
    locales: ["fr"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/raphplt/tcg-nexus/tree/main/apps/docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/docusaurus-social-card.jpg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "TCG Nexus Docs",
      logo: {
        alt: "TCG Nexus Logo",
        src: "img/Logo.png",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: swaggerUrl,
          label: "Swagger API",
          position: "right",
        },
        {
          href: "https://github.com/raphplt/tcg-nexus",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Guides & Architecture",
          items: [
            {
              label: "Prise en main",
              to: "/docs/guides/installation",
            },
            {
              label: "Architecture Monorepo",
              to: "/docs/architecture/monorepo",
            },
            {
              label: "Schéma Base de Données",
              to: "/docs/architecture/database",
            },
            {
              label: "Packages Partagés",
              to: "/docs/architecture/packages",
            },
          ],
        },
        {
          title: "Backend & Moteurs",
          items: [
            {
              label: "API NestJS",
              to: "/docs/backend/api",
            },
            {
              label: "Marketplace & Grand Livre",
              to: "/docs/backend/marketplace",
            },
            {
              label: "Tournois & Matches",
              to: "/docs/backend/tournaments",
            },
            {
              label: "Module IA & Analyse",
              to: "/docs/backend/ai",
            },
            {
              label: "Mini-jeux",
              to: "/docs/backend/mini-games",
            },
          ],
        },
        {
          title: "Front & Exploitation",
          items: [
            {
              label: "Front-end Next.js",
              to: "/docs/frontend/web",
            },
            {
              label: "Application Mobile Expo",
              to: "/docs/frontend/mobile",
            },
            {
              label: "Microservice Vision & CLIP",
              to: "/docs/services/vision",
            },
            {
              label: "Déploiement en Production",
              to: "/docs/ops/deployment",
            },
            {
              label: "Dépôt GitHub",
              href: "https://github.com/raphplt/tcg-nexus",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TCG Nexus. Tous droits réservés.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
