import type { ComponentsManifest, StoryEntry } from './types.js';
import { closestMatches } from './levenshtein.js';

export type GetDocumentationForStoryArgs =
  | { storyId: string }
  | { componentId: string; storyName: string };

export type GetDocumentationForStoryResult = StoryEntry & {
  storyId: string;
  componentId: string;
};

export class StoryNotFoundError extends Error {
  readonly suggestions: string[];
  constructor(needle: string, suggestions: string[]) {
    super(`story not found: ${needle}. Did you mean: ${suggestions.join(', ')}?`);
    this.name = 'StoryNotFoundError';
    this.suggestions = suggestions;
  }
}

export const getDocumentationForStory = (
  args: GetDocumentationForStoryArgs,
  manifests: { components: ComponentsManifest },
): GetDocumentationForStoryResult => {
  const allEntries = Object.values(manifests.components.components);
  let componentId: string | undefined;
  let story: StoryEntry | undefined;

  if ('storyId' in args) {
    for (const c of allEntries) {
      const s = c.stories.find((s) => s.id === args.storyId);
      if (s) { componentId = c.id; story = s; break; }
    }
    if (!story) {
      const all = allEntries.flatMap((c) => c.stories.map((s) => s.id));
      throw new StoryNotFoundError(args.storyId, closestMatches(args.storyId, all, 5));
    }
  } else {
    const c = manifests.components.components[args.componentId];
    if (c) {
      componentId = c.id;
      story = c.stories.find((s) => s.name === args.storyName);
    }
    if (!story) {
      const all = c
        ? c.stories.map((s) => s.name)
        : Object.keys(manifests.components.components);
      throw new StoryNotFoundError(
        `${args.componentId}/${args.storyName}`,
        closestMatches(args.storyName, all, 5),
      );
    }
  }

  return { ...story, storyId: story.id, componentId: componentId! };
};
