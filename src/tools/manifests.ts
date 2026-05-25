import type { ComponentsManifest, DocsManifest } from './types';

// Bump when we've verified compatibility with a new shape.
export const SUPPORTED_SCHEMA_VERSIONS = [0] as const;

export class SchemaVersionError extends Error {
  constructor(field: string, got: unknown) {
    super(
      `storybook-webmcp: unsupported manifest ${field}=${JSON.stringify(got)}. ` +
      `Supported: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}. ` +
      `Upgrade or downgrade storybook-webmcp to a version that matches your Storybook.`,
    );
    this.name = 'SchemaVersionError';
  }
}

const assertSchema = (m: ComponentsManifest) => {
  if (m.v === undefined) {
    // Structural fallback: ensure `components` is an object.
    if (typeof m.components !== 'object' || m.components === null) {
      throw new SchemaVersionError('shape', 'missing `components` object');
    }
    return;
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(m.v as 0)) {
    throw new SchemaVersionError('v', m.v);
  }
};

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
    assertSchema(components);
    const docsRes = await fetchImpl(`${base}manifests/docs.json`);
    const docs = docsRes.ok ? ((await docsRes.json()) as DocsManifest) : undefined;
    return { components, docs };
  })();
  return cache;
};
