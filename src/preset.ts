// src/preset.ts
// Storybook 10 preset entry. Storybook 10 is ESM-only — resolve sibling files
// via import.meta.resolve + fileURLToPath, NOT require.resolve.
import { fileURLToPath } from 'node:url';

export const managerEntries = async (existing: string[] = []) => [
  ...existing,
  fileURLToPath(import.meta.resolve('./manager.js')),
];

// Storybook 10 calls preset exports named after config keys and merges them
// into the resolved StorybookConfig. Manifest emission is gated by BOTH:
//   features.componentsManifest === true   (core-server gate)
//   experimental_manifests  (preset-hook registration; addon-docs / @storybook/react)
// We enable both. Note: common-preset runs before addon presets and sets
// componentsManifest: false, so we must unconditionally set it to true here.
// Users who want to disable it can set features.componentsManifest: false in
// their main.ts (main config runs AFTER addon presets and will override us).

export const features = (existing: Record<string, unknown> | undefined = {}) => ({
  ...existing,
  componentsManifest: true,
});

export const experimental_manifests = (existing: unknown) => {
  if (existing === undefined || existing === false) return {};
  return existing; // user-provided config wins
};
