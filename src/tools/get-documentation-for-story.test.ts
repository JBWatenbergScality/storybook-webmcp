import { describe, expect, it } from 'vitest';
import { getDocumentationForStory, StoryNotFoundError } from './get-documentation-for-story';
import minimal from './__fixtures__/components.minimal.json';
import type { ComponentsManifest } from './types';

const m = { components: minimal as ComponentsManifest };

describe('getDocumentationForStory', () => {
  it('resolves by storyId', () => {
    const r = getDocumentationForStory({ storyId: 'ui-button--primary' }, m);
    expect(r).toMatchObject({ storyId: 'ui-button--primary', componentId: 'ui-button', name: 'Primary' });
    expect(typeof r.snippet).toBe('string');
  });

  it('resolves by componentId + storyName', () => {
    const r = getDocumentationForStory({ componentId: 'ui-button', storyName: 'Secondary' }, m);
    expect(r).toMatchObject({ storyId: 'ui-button--secondary', componentId: 'ui-button', name: 'Secondary' });
  });

  it('throws StoryNotFoundError when story missing', () => {
    expect(() => getDocumentationForStory({ storyId: 'ui-button--missing' }, m))
      .toThrowError(StoryNotFoundError);
  });
});
