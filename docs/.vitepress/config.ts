import { defineConfig } from 'vitepress'
import { description, name, version } from '../../package.json'

export default defineConfig({
  title: name,
  description,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      {
        text: 'Adapters',
        activeMatch: '^/adapters/',
        items: [
          { text: 'ofetch', link: '/adapters/ofetch' },
          { text: 'OpenAPI', link: '/adapters/openapi' },
          { text: 'Route Builder', link: '/adapters/route-builder' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Release Notes ',
            link: 'https://github.com/johannschopplich/apiful/releases',
          },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Usage', link: '/guide/usage' },
        ],
      },
      {
        text: 'Adapters',
        items: [
          { text: 'ofetch', link: '/adapters/ofetch' },
          { text: 'OpenAPI', link: '/adapters/openapi' },
          { text: 'Route Builder', link: '/adapters/route-builder' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/johannschopplich/apiful' },
    ],

    footer: {
      message: 'Released under the <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a>.',
      copyright: 'Copyright © 2024-PRESENT <a href="https://github.com/johannschopplich" target="_blank">Johann Schopplich</a>.',
    },

    search: {
      provider: 'local',
    },
  },
})
