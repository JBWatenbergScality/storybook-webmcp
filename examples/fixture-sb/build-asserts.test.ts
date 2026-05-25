import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, 'storybook-static');

describe('fixture-sb build outputs', () => {
  it('emits /manifests/components.json', () => {
    expect(existsSync(path.join(out, 'manifests', 'components.json'))).toBe(true);
  });

  it('manager bundle references the storybook-webmcp manager entry', () => {
    // Storybook places addon manager bundles under sb-addons/<n>/manager-bundle.js
    // and core manager files under sb-manager/. Search both trees.
    const candidates = [
      path.join(out, 'sb-manager'),
      path.join(out, 'sb-addons'),
      out,
    ];
    const jsFiles = candidates
      .filter(existsSync)
      .flatMap((d) =>
        readdirSync(d, { recursive: true })
          .map((f) => path.join(d, String(f)))
          .filter((p) => p.endsWith('.js')),
      );
    const haystack = jsFiles.map((p) => readFileSync(p, 'utf8')).join('\n');
    expect(haystack).toMatch(/storybook-webmcp|modelContext/);
  });
});
