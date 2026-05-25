import type { ComponentsManifest, DocsManifest } from './types';

export type ComponentIndexEntry = {
  id: string;
  name: string;
  path: string;
  storyCount: number;
};

export type DocsIndexEntry = { id: string; title: string; type: 'docs' };

export type ListAllDocumentationResult = {
  components: ComponentIndexEntry[];
  docs: DocsIndexEntry[];
};

export const listAllDocumentation = (
  manifests: { components: ComponentsManifest; docs?: DocsManifest },
): ListAllDocumentationResult => {
  const components: ComponentIndexEntry[] = Object.values(manifests.components.components).map((c) => ({
    id: c.id,
    name: c.name,
    path: c.path,
    storyCount: c.stories.length,
  }));
  const docs: DocsIndexEntry[] = manifests.docs
    ? Object.values(manifests.docs.docs).map((d) => ({
        id: d.id,
        title: d.title ?? d.id,
        type: 'docs' as const,
      }))
    : [];
  return { components, docs };
};
