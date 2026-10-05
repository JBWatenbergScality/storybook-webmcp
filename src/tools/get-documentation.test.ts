import { describe, expect, it } from 'vitest';
import { getDocumentation, ComponentNotFoundError } from './get-documentation';
import minimal from './__fixtures__/components.minimal.json';
import tsdocgen from './__fixtures__/components.tsdocgen.json';
import docsFixture from './__fixtures__/docs.json';
import type { ComponentsManifest, DocsManifest } from './types';

const m = { components: minimal as ComponentsManifest };
const mTs = { components: tsdocgen as ComponentsManifest };
const mDocs = {
  components: minimal as ComponentsManifest,
  docs: docsFixture as DocsManifest,
};

describe('getDocumentation', () => {
  it('returns props (flattened), first <=3 stories, and a story index for the rest', () => {
    const result = getDocumentation({ id: 'ui-button' }, m);
    expect(result).toMatchObject({
      kind: 'component',
      id: 'ui-button',
      name: 'Button',
      path: './src/Button.stories.tsx',
      description: 'A primary action button.',
      props: [
        { name: 'label', type: 'string', required: true, description: 'Visible label' },
        { name: 'variant', type: "'primary' | 'secondary'", required: false, description: 'Visual variant', defaultValue: "'primary'" },
      ],
    });
    if (result.kind !== 'component') throw new Error('expected a component');
    expect(result.firstStories).toHaveLength(2);
    expect(result.remainingStoryIndex).toEqual([]);
  });

  it('reads props from reactDocgenTypescript when react-docgen-typescript is the engine', () => {
    const result = getDocumentation({ id: 'ts-select' }, mTs);
    if (result.kind !== 'component') throw new Error('expected a component');
    expect(result.description).toBe('A typescript-typed select component.');
    expect(result.props).toEqual([
      { name: 'id', type: 'string', required: true, description: 'Element id' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, description: 'Size variant', defaultValue: 'md' },
    ]);
  });

  it('returns an unattached docs page with its content', () => {
    expect(getDocumentation({ id: 'tokens' }, mDocs)).toEqual({
      kind: 'docs',
      id: 'tokens',
      title: 'Design Tokens',
      content: 'Spacing, color, typography.',
    });
  });

  it('carries the page path when the build emits one', () => {
    const withPath: DocsManifest = {
      v: 0,
      docs: {
        'style-colors--stories': {
          id: 'style-colors--stories',
          name: 'Stories',
          path: './stories/color.mdx',
          title: 'Style/Colors',
          content: '# Colors',
        },
      },
    };
    expect(getDocumentation({ id: 'style-colors--stories' }, { ...m, docs: withPath })).toEqual({
      kind: 'docs',
      id: 'style-colors--stories',
      title: 'Style/Colors',
      path: './stories/color.mdx',
      content: '# Colors',
    });
  });

  it('prefers the component when a docs page shares its id', () => {
    const clash: DocsManifest = {
      v: 0,
      docs: { 'ui-button': { id: 'ui-button', title: 'Button page', content: 'prose' } },
    };
    expect(getDocumentation({ id: 'ui-button' }, { ...m, docs: clash }).kind).toBe('component');
  });

  it('still throws when the manifest carries no docs at all', () => {
    expect(() => getDocumentation({ id: 'tokens' }, m)).toThrow(ComponentNotFoundError);
  });

  it('throws ComponentNotFoundError with up to 5 closest id suggestions', () => {
    try {
      getDocumentation({ id: 'ui-buton' }, m);
      throw new Error('should not reach');
    } catch (e) {
      expect(e).toBeInstanceOf(ComponentNotFoundError);
      expect((e as ComponentNotFoundError).suggestions).toContain('ui-button');
    }
  });

  it('suggests docs pages as well as components on a near miss', () => {
    try {
      getDocumentation({ id: 'tokns' }, mDocs);
      throw new Error('should not reach');
    } catch (e) {
      expect((e as ComponentNotFoundError).suggestions).toContain('tokens');
    }
  });
});
