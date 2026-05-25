import type { ComponentsManifest, StoryEntry, PropDef } from './types';

export type GetDocumentationArgs = { id: string };

export type PropSummary = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
};

export type GetDocumentationResult = {
  id: string;
  name: string;
  path: string;
  description: string;
  props: PropSummary[];
  firstStories: StoryEntry[];
  remainingStoryIndex: { id: string; name: string }[];
};

const propTypeString = (p: PropDef): string => p.tsType.raw ?? p.tsType.name;

const summarizeProps = (props: Record<string, PropDef> | undefined): PropSummary[] =>
  Object.entries(props ?? {}).map(([name, p]) => ({
    name,
    type: propTypeString(p),
    required: p.required,
    description: p.description,
    ...(p.defaultValue !== undefined ? { defaultValue: p.defaultValue.value } : {}),
  }));

export const getDocumentation = (
  args: GetDocumentationArgs,
  manifests: { components: ComponentsManifest },
): GetDocumentationResult => {
  const entry = manifests.components.components[args.id];
  if (!entry) throw new Error(`component not found: ${args.id}`); // refined in Task 9
  const stories = entry.stories ?? [];
  return {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    description: entry.description ?? entry.reactDocgen?.description ?? '',
    props: summarizeProps(entry.reactDocgen?.props),
    firstStories: stories.slice(0, 3),
    remainingStoryIndex: stories.slice(3).map((s) => ({ id: s.id, name: s.name })),
  };
};
