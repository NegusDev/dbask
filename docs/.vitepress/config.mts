import { defineConfig } from 'vitepress';

// One setting decides where the site lives: '/dbask/' on GitHub Pages
// (negusdev.github.io/dbask), '/' on a custom domain such as dbask.dev.
const base = process.env.DOCS_BASE ?? '/dbask/';

export default defineConfig({
  title: 'dbask',
  description: 'Ask your SQL database questions in plain language. Read-only Text-to-SQL for MySQL, MariaDB and PostgreSQL.',
  base,
  cleanUrls: true,
  lastUpdated: true,
  // Dead internal links fail the build; that is the link checker for the site.
  ignoreDeadLinks: false,
  head: [['link', { rel: 'icon', href: `${base}favicon.svg` }]],
  themeConfig: {
    logo: { src: '/favicon.svg', alt: 'dbask' },
    nav: [
      { text: 'Guide', link: '/guide/quickstart' },
      { text: 'MCP', link: '/guide/mcp' },
      { text: 'Safety', link: '/guide/safety' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@negusdev/dbask' },
    ],
    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'Quickstart', link: '/guide/quickstart' },
          { text: 'Command line', link: '/guide/cli' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'AI providers', link: '/guide/providers' },
          { text: 'Databases', link: '/guide/databases' },
          { text: 'Business context (dbask.md)', link: '/guide/context' },
        ],
      },
      {
        text: 'Integrate',
        items: [
          { text: 'MCP server', link: '/guide/mcp' },
          { text: 'TypeScript SDK', link: '/guide/sdk' },
        ],
      },
      {
        text: 'Trust and accuracy',
        items: [
          { text: 'Safety model', link: '/guide/safety' },
          { text: 'Query plan', link: '/guide/query-plan' },
          { text: 'Evals and benchmarks', link: '/guide/evals' },
        ],
      },
      {
        text: 'Help',
        items: [
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'Contributing', link: '/guide/contributing' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/NegusDev/dbask' }],
    editLink: {
      pattern: 'https://github.com/NegusDev/dbask/edit/dev/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: { provider: 'local' },
    footer: { message: 'Released under the ISC License.', copyright: 'dbask' },
  },
});
