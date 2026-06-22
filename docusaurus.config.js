import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Learn With Anumax',
  tagline: '',
  favicon: 'img/favicon.ico',
  url: 'https://anuragkanwar.github.io',
  baseUrl: '/learning/',
  organizationName: 'anuragkanwar', // Usually your GitHub org/user name.
  projectName: 'learning', // Usually your repo name.
  deploymentBranch: 'main',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownImages: 'warn',
      onBrokenMarkdownLinks: 'warn',
    }
  },
  themes: ['@docusaurus/theme-mermaid'],
  future: {
    v4: true,
    experimental_faster: true,
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          showLastUpdateTime: true,
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      mermaid: {
        theme: { dark: 'dark' },
      },
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Anumax',
        logo: {
          alt: 'Anumax Logo',
          src: 'img/logo.png',
        },
        hideOnScroll: false,
        items: [
          {
            href: 'https://github.com/anuragkanwar/learning',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        links: [
          {
            title: 'Learn',
            items: [
              {
                label: 'Spring Framework',
                to: '/docs/category/spring-framework',
              },
              {
                label: 'React',
                to: '/docs/category/react',
              },
              {
                label: 'Go',
                to: '/docs/category/go',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/anuragkanwar/learning',
              },
              {
                label: 'Issues',
                href: 'https://github.com/anuragkanwar/learning/issues',
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Anumax`,
      },
      prism: {
        theme: prismThemes.gruvboxMaterialDark,
        darkTheme: prismThemes.gruvboxMaterialDark,
        additionalLanguages: ['java', 'sql', 'bash', 'plsql']
      },
    }),
};

export default config;
