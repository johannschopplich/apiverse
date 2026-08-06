import type { DefaultTheme } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitepress'
import { description, github, name, ogImage, ogUrl, releases, twitterImage, version } from './meta'

export default defineConfig({
  title: name,
  description,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Johann Schopplich' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: ogUrl }],
    ['meta', { property: 'og:title', content: name }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { name: 'twitter:title', content: name }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: twitterImage }],
    ['meta', { name: 'twitter:site', content: '@jschopplich' }],
    ['meta', { name: 'twitter:creator', content: '@jschopplich' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  vite: {
    plugins: [UnoCSS()],
  },

  themeConfig: {
    logo: {
      dark: '/logo-dark.svg',
      light: '/logo-light.svg',
    },

    nav: [
      {
        text: 'Guide',
        activeMatch: '^/guide/',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Using Extensions', link: '/guide/using-extensions' },
          { text: 'Creating Extensions', link: '/guide/custom-extensions' },
          { text: 'Command Line Interface', link: '/guide/cli' },
          { text: 'Migration', link: '/guide/migration' },
        ],
      },
      {
        text: 'Extensions',
        activeMatch: '^/extensions/',
        items: [
          { text: 'Overview', link: '/extensions/' },
          { text: 'ofetch', link: '/extensions/ofetch' },
          { text: 'OpenAPI', link: '/extensions/openapi' },
          { text: 'API Router', link: '/extensions/api-router' },
        ],
      },
      {
        text: 'Cookbook',
        activeMatch: '^/cookbook/',
        items: [
          { text: 'Authenticating Requests', link: '/cookbook/authentication' },
          { text: 'Typed Clients for Nitro', link: '/cookbook/typed-nitro-client' },
        ],
      },
      {
        text: 'Reference',
        activeMatch: '^/reference/',
        items: [
          { text: 'Overview', link: '/reference/' },
          {
            text: 'Methods',
            items: [
              { text: 'createClient', link: '/reference/create-client' },
              { text: 'createOpenAPIClient', link: '/reference/create-openapi-client' },
              { text: 'defineApifulConfig', link: '/reference/define-apiful-config' },
            ],
          },
          {
            text: 'Types',
            items: [
              { text: 'ApiClient', link: '/reference/api-client' },
              { text: 'HandlerExtensionBuilder', link: '/reference/handler-extension-builder' },
              { text: 'MethodsExtensionBuilder', link: '/reference/methods-extension-builder' },
            ],
          },
          {
            text: 'Extensions',
            items: [
              { text: 'OpenAPI Type Helpers', link: '/reference/openapi-type-helpers' },
            ],
          },
        ],
      },
      {
        text: 'Utilities',
        activeMatch: '^/utilities/',
        items: [
          { text: 'HTTP Status Codes', link: '/utilities/http-status-codes' },
          { text: 'HTTP Status Phrases', link: '/utilities/http-status-phrases' },
          { text: 'JSON to Type Definition', link: '/utilities/json-to-type-definition' },
          { text: 'Schema & Validation', link: '/utilities/schema' },
        ],
      },
      {
        text: `v${version}`,
        items: [
          {
            text: 'Release Notes ',
            link: releases,
          },
        ],
      },
    ],

    sidebar: {
      '/guide/': sidebarGuide(),
      '/extensions/': sidebarGuide(),
      '/cookbook/': sidebarGuide(),
      '/reference/': referenceGuide(),
      '/utilities/': utilitiesGuide(),
    },

    socialLinks: [
      { icon: 'github', link: github },
    ],

    footer: {
      message: 'Released under the <a href="https://opensource.org/licenses/MIT" target="_blank">MIT License</a>.',
      copyright: 'Copyright © 2024-PRESENT <a href="https://github.com/johannschopplich" target="_blank">Johann Schopplich</a> & <a href="https://github.com/productdevbook" target="_blank">productdevbook</a>.<br>',
    },

    search: {
      provider: 'local',
    },
  },
})

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Using Extensions', link: '/guide/using-extensions' },
        { text: 'Creating Extensions', link: '/guide/custom-extensions' },
        { text: 'Command Line Interface', link: '/guide/cli' },
        { text: 'Migration', link: '/guide/migration' },
      ],
    },
    {
      text: 'Built-in Extensions',
      items: [
        { text: 'Overview', link: '/extensions/' },
        { text: 'ofetch', link: '/extensions/ofetch' },
        { text: 'OpenAPI', link: '/extensions/openapi' },
        { text: 'API Router', link: '/extensions/api-router' },
      ],
    },
    {
      text: 'Cookbook',
      items: [
        { text: 'Authenticating Requests', link: '/cookbook/authentication' },
        { text: 'Typed Clients for Nitro', link: '/cookbook/typed-nitro-client' },
      ],
    },
    { text: 'Utilities', link: '/utilities' },
  ]
}

function referenceGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Reference',
      items: [
        { text: 'Overview', link: '/reference/' },
      ],
    },
    {
      text: 'Methods',
      items: [
        { text: 'createClient', link: '/reference/create-client' },
        { text: 'createOpenAPIClient', link: '/reference/create-openapi-client' },
        { text: 'defineApifulConfig', link: '/reference/define-apiful-config' },
      ],
    },
    {
      text: 'Types',
      items: [
        { text: 'ApiClient', link: '/reference/api-client' },
        { text: 'HandlerExtensionBuilder', link: '/reference/handler-extension-builder' },
        { text: 'MethodsExtensionBuilder', link: '/reference/methods-extension-builder' },
      ],
    },
    {
      text: 'Extensions',
      items: [
        { text: 'OpenAPI Type Helpers', link: '/reference/openapi-type-helpers' },
      ],
    },
  ]
}

function utilitiesGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Utilities',
      items: [
        { text: 'Overview', link: '/utilities' },
        { text: 'HTTP Status Codes', link: '/utilities/http-status-codes' },
        { text: 'HTTP Status Phrases', link: '/utilities/http-status-phrases' },
        { text: 'JSON to Type Definition', link: '/utilities/json-to-type-definition' },
        { text: 'Schema & Validation', link: '/utilities/schema' },
      ],
    },
  ]
}
