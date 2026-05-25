import type { ComponentsManifest, DocsManifest } from './types';

export class ManifestNotFoundError extends Error {
  constructor(url: string) {
    super(
      `storybook-webmcp: ${url} returned 404. ` +
      `Make sure storybook-webmcp is in your .storybook/main.ts addons array, ` +
      `then rebuild Storybook (npm run build-storybook).`,
    );
    this.name = 'ManifestNotFoundError';
  }
}

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
    const componentsUrl = `${base}manifests/components.json`;
    const componentsRes = await fetchImpl(componentsUrl);
    if (componentsRes.status === 404) throw new ManifestNotFoundError(componentsUrl);
    const components = (await componentsRes.json()) as ComponentsManifest;
    const docsRes = await fetchImpl(`${base}manifests/docs.json`);
    const docs = docsRes.ok ? ((await docsRes.json()) as DocsManifest) : undefined;
    return { components, docs };
  })();
  return cache;
};
