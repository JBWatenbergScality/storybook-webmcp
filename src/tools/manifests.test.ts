import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loadManifests, __resetManifestCache, ManifestNotFoundError, SchemaVersionError } from './manifests';
import minimal from './__fixtures__/components.minimal.json';
import docs from './__fixtures__/docs.json';

const mockFetch = (responses: Record<string, { status: number; body?: unknown }>) => {
  return vi.fn(async (url: string) => {
    const key = Object.keys(responses).find((k) => url.endsWith(k));
    if (!key) throw new Error(`unexpected fetch: ${url}`);
    const { status, body } = responses[key]!;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
};

describe('loadManifests', () => {
  beforeEach(() => __resetManifestCache());

  it('returns parsed components and docs from same-origin fetches', async () => {
    const fetchImpl = mockFetch({
      '/manifests/components.json': { status: 200, body: minimal },
      '/manifests/docs.json': { status: 200, body: docs },
    });
    const result = await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
    expect(result.components).toEqual(minimal);
    expect(result.docs).toEqual(docs);
  });

  it('throws ManifestNotFoundError on 404 (message contains rebuild hint)', async () => {
    const fetchImpl = mockFetch({ '/manifests/components.json': { status: 404 } });
    await expect(loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }))
      .rejects.toThrow(/storybook-webmcp.*rebuild/i);
  });

  it('throws an instance of ManifestNotFoundError on 404', async () => {
    const fetchImpl = mockFetch({ '/manifests/components.json': { status: 404 } });
    await expect(loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }))
      .rejects.toBeInstanceOf(ManifestNotFoundError);
  });

  it('throws SchemaVersionError on an unknown manifest version', async () => {
    const fetchImpl = mockFetch({
      '/manifests/components.json': { status: 200, body: { v: 999, components: {} } },
    });
    await expect(
      loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl }),
    ).rejects.toThrow(/v.*999/);
  });

  it('caches results so a second call does not re-fetch', async () => {
    const fetchImpl = mockFetch({
      '/manifests/components.json': { status: 200, body: minimal },
      '/manifests/docs.json': { status: 200, body: docs },
    });
    await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
    await loadManifests({ baseHref: 'https://example.com/sb/', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2); // components + docs, not 4
  });
});
