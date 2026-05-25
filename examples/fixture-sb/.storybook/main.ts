import type { StorybookConfig } from '@storybook/react-vite';

// Manifest generation requires two things (discovered by reading node_modules source):
// 1. `features.componentsManifest: true` — gates the writeManifests() call in
//    core-server/index.js (line ~17047: `features?.componentsManifest && effects.push(...)`)
// 2. `experimental_manifests: {}` — the preset hook implemented by @storybook/react
//    and @storybook/addon-docs. The config field is NOT `manifests` (TS error) nor
//    `manifests: true` (TS error); it is `experimental_manifests` per StorybookConfigRaw.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
  features: { componentsManifest: true },
  experimental_manifests: {},
};

export default config;
