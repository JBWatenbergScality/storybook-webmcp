import { describe, expect, it } from 'vitest';
import { getDocumentation, ComponentNotFoundError } from './get-documentation';
import minimal from './__fixtures__/components.minimal.json';
import type { ComponentsManifest } from './types';

const m = { components: minimal as ComponentsManifest };

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
