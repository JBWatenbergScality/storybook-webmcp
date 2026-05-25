import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', 'storybook-webmcp'],
  framework: { name: '@storybook/react-vite', options: {} },
  // No `features.componentsManifest` or `experimental_manifests` — the addon
  // enables both. Removing them proves the addon does the right thing.
};

export default config;
