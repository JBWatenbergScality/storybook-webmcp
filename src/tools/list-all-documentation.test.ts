import { describe, expect, it } from 'vitest';
import { listAllDocumentation } from './list-all-documentation';
import minimal from './__fixtures__/components.minimal.json';
import docs from './__fixtures__/docs.json';
import type { ComponentsManifest, DocsManifest } from './types';

describe('listAllDocumentation', () => {
  it('returns a compact index of components from components.json', () => {
    const result = listAllDocumentation({
      components: minimal as ComponentsManifest,
    });
    expect(result.components).toEqual([
      { id: 'ui-button', name: 'Button', path: './src/Button.stories.tsx', storyCount: 2 },
      { id: 'ui-input', name: 'Input', path: './src/Input.stories.tsx', storyCount: 1 },
    ]);
    expect(result.docs).toEqual([]);
  });

  it('includes unattached docs from docs.json when present', () => {
    const result = listAllDocumentation({
      components: minimal as ComponentsManifest,
      docs: docs as DocsManifest,
    });
    expect(result.docs).toEqual([
      { id: 'intro', title: 'Introduction', type: 'docs' },
      { id: 'tokens', title: 'Design Tokens', type: 'docs' },
    ]);
  });
});
