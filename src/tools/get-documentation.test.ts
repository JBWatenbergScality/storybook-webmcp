import { describe, expect, it } from 'vitest';
import { getDocumentation, ComponentNotFoundError } from './get-documentation';
import minimal from './__fixtures__/components.minimal.json';
import tsdocgen from './__fixtures__/components.tsdocgen.json';
import type { ComponentsManifest } from './types';

const m = { components: minimal as ComponentsManifest };
const mTs = { components: tsdocgen as ComponentsManifest };

describe('getDocumentation', () => {
  it('returns props (flattened), first <=3 stories, and a story index for the rest', () => {
    const result = getDocumentation({ id: 'ui-button' }, m);
    expect(result).toMatchObject({
      id: 'ui-button',
      name: 'Button',
      path: './src/Button.stories.tsx',
      description: 'A primary action button.',
      props: [
        { name: 'label', type: 'string', required: true, description: 'Visible label' },
        { name: 'variant', type: "'primary' | 'secondary'", required: false, description: 'Visual variant', defaultValue: "'primary'" },
      ],
    });
    expect(result.firstStories).toHaveLength(2);
    expect(result.remainingStoryIndex).toEqual([]);
  });

  it('reads props from reactDocgenTypescript when react-docgen-typescript is the engine', () => {
    const result = getDocumentation({ id: 'ts-select' }, mTs);
    expect(result.description).toBe('A typescript-typed select component.');
    expect(result.props).toEqual([
      { name: 'id', type: 'string', required: true, description: 'Element id' },
      { name: 'size', type: '"sm" | "md" | "lg"', required: false, description: 'Size variant', defaultValue: 'md' },
    ]);
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
});
