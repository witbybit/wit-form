import type { StorybookConfig } from '@storybook/react-vite';
import remarkGfm from 'remark-gfm';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    {
      name: '@storybook/addon-docs',
      // GitHub-flavored markdown (tables, strikethrough, task lists) in .mdx files
      options: {
        mdxPluginOptions: { mdxCompileOptions: { remarkPlugins: [remarkGfm] } },
      },
    },
  ],
  framework: '@storybook/react-vite',
  // Examples import from 'wit-form' exactly like an app would, served from the local source
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      resolve: {
        alias: {
          'wit-form': decodeURIComponent(
            new URL('../src/index.ts', import.meta.url).pathname
          ),
        },
      },
    }),
};
export default config;
