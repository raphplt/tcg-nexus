import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'TCG Nexus Docs',
  tagline: 'Front Next.js, API NestJS, microservices et ops en un seul monorepo.',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'http://localhost:3000',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'raphplt', // Usually your GitHub org/user name.
  projectName: 'tcg-nexus-docs', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/raphplt/tcg-nexus/tree/main/apps/docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'TCG Nexus Docs',
      logo: {
        alt: 'TCG Nexus Logo',
        src: 'img/Logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'http://localhost:3001/api',
          label: 'Swagger API',
          position: 'right',
        },
        {
          href: 'https://github.com/raphplt/tcg-nexus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guides',
          items: [
            {
              label: 'Prise en main',
              to: '/docs/guides/installation',
            },
          ],
        },
        {
          title: 'Backend',
          items: [
            {
              label: 'API NestJS',
              to: '/docs/backend/api',
            },
            {
              label: 'Fetch TCGdex',
              to: '/docs/services/fetch',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Front Next.js',
              to: '/docs/frontend/web',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/raphplt/tcg-nexus',
            }
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TCG Nexus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
