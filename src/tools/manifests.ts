import type { ComponentsManifest, DocsManifest } from './types';

export type LoadOptions = {
  baseHref: string;
  fetchImpl?: typeof fetch;
};

export type Manifests = {
  components: ComponentsManifest;
  docs?: DocsManifest;
};

let cache: Promise<Manifests> | null = null;

export const __resetManifestCache = () => { cache = null; };

export const loadManifests = async ({ baseHref, fetchImpl = fetch }: LoadOptions): Promise<Manifests> => {
  if (cache) return cache;
  cache = (async () => {
    const base = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    const componentsRes = await fetchImpl(`${base}manifests/components.json`);
    const components = (await componentsRes.json()) as ComponentsManifest;
    const docsRes = await fetchImpl(`${base}manifests/docs.json`);
    const docs = docsRes.ok ? ((await docsRes.json()) as DocsManifest) : undefined;
    return { components, docs };
  })();
  return cache;
};
