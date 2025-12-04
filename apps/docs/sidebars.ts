import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Prise en main',
      items: ['guides/installation', 'guides/commands'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/monorepo'],
    },
    {
      type: 'category',
      label: 'Backend',
      items: [
        'backend/api',
        'backend/auth',
        'backend/users',
        'backend/tournaments',
        'backend/marketplace',
        'backend/cards',
        'backend/decks',
        'backend/collections',
      ],
    },
    {
      type: 'category',
      label: 'Front-end',
      items: ['frontend/web'],
    },
    {
      type: 'category',
      label: 'Services',
      items: ['services/fetch'],
    },
    {
      type: 'category',
      label: 'Ops',
      items: ['ops/docker', 'ops/tests'],
    },
  ],
};

export default sidebars;
