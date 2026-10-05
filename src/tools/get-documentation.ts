import type {
  ComponentsManifest,
  DocsManifest,
  StoryEntry,
  PropDef,
  ReactDocgenTypescriptPropDef,
  ComponentEntry,
} from './types.js';
import { closestMatches } from './levenshtein.js';

export class ComponentNotFoundError extends Error {
  readonly suggestions: string[];
  constructor(id: string, suggestions: string[]) {
    super(`documentation not found: ${id}. Did you mean: ${suggestions.join(', ')}?`);
    this.name = 'ComponentNotFoundError';
    this.suggestions = suggestions;
  }
}

export type GetDocumentationArgs = { id: string };

export type PropSummary = {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: string;
};

export type ComponentDocumentation = {
  kind: 'component';
  id: string;
  name: string;
  path: string;
  description: string;
  props: PropSummary[];
  firstStories: StoryEntry[];
  remainingStoryIndex: { id: string; name: string }[];
};

/** An unattached MDX page: prose with no component behind it, so no props and no stories. */
export type PageDocumentation = {
  kind: 'docs';
  id: string;
  title: string;
  path?: string;
  content: string;
};

export type GetDocumentationResult = ComponentDocumentation | PageDocumentation;

const summarizeReactDocgenProps = (
  props: Record<string, PropDef> | undefined,
): PropSummary[] =>
  Object.entries(props ?? {}).map(([name, p]) => ({
    name,
    type: p.tsType.raw ?? p.tsType.name,
    required: p.required,
    description: p.description,
    ...(p.defaultValue !== undefined ? { defaultValue: p.defaultValue.value } : {}),
  }));

const summarizeReactDocgenTypescriptProps = (
  props: Record<string, ReactDocgenTypescriptPropDef> | undefined,
): PropSummary[] =>
  Object.entries(props ?? {}).map(([key, p]) => ({
    name: p.name ?? key,
    type: p.type.name,
    required: p.required,
    description: p.description,
    ...(p.defaultValue !== null && p.defaultValue !== undefined
      ? { defaultValue: p.defaultValue.value }
      : {}),
  }));

const summarizeProps = (entry: ComponentEntry): PropSummary[] => {
  // Prefer react-docgen-typescript when present (richer for TS projects);
  // fall back to react-docgen for vanilla JS projects.
  if (entry.reactDocgenTypescript?.props) {
    return summarizeReactDocgenTypescriptProps(entry.reactDocgenTypescript.props);
  }
  return summarizeReactDocgenProps(entry.reactDocgen?.props);
};

const describe = (entry: ComponentEntry): string =>
  entry.description
  ?? entry.reactDocgenTypescript?.description
  ?? entry.reactDocgen?.description
  ?? '';

export const getDocumentation = (
  args: GetDocumentationArgs,
  manifests: { components: ComponentsManifest; docs?: DocsManifest },
): GetDocumentationResult => {
  const entry = manifests.components.components[args.id];
  if (entry) {
    const stories = entry.stories ?? [];
    return {
      kind: 'component',
      id: entry.id,
      name: entry.name,
      path: entry.path,
      description: describe(entry),
      props: summarizeProps(entry),
      firstStories: stories.slice(0, 3),
      remainingStoryIndex: stories.slice(3).map((s) => ({ id: s.id, name: s.name })),
    };
  }

  // Unattached pages live in a manifest of their own, and list-all-documentation
  // returns them alongside components — so an id arriving here is as likely to be
  // a page as a typo. Without this branch they can be listed and never opened.
  const page = manifests.docs?.docs[args.id];
  if (page) {
    return {
      kind: 'docs',
      id: page.id,
      title: page.title ?? page.id,
      ...(page.path !== undefined ? { path: page.path } : {}),
      content: page.content ?? '',
    };
  }

  const ids = [
    ...Object.keys(manifests.components.components),
    ...Object.keys(manifests.docs?.docs ?? {}),
  ];
  throw new ComponentNotFoundError(args.id, closestMatches(args.id, ids, 5));
};
