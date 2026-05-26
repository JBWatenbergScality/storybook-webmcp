// Public library entry (`@jbwatenbergscality/storybook-webmcp/tools`).
//
// Lets a Node host reuse the exact same documentation tools the addon
// registers in the browser, *without* a browser. Pass a `ModelContextLike`
// collector and a `fetchImpl`, and `registerDocsTools` populates it with the
// three tools — each fetching the target Storybook's static
// `/manifests/components.json` server-side. No DOM, no navigator.modelContext.
//
// Example (server):
//   const tools: ToolDef[] = [];
//   registerDocsTools({ registerTool: (t) => tools.push(t) },
//     { baseHref: 'https://scality.github.io/core-ui/', fetchImpl: fetch });
export { registerDocsTools } from './register.js';
export type { ToolDef, ModelContextLike, RegisterOptions } from './register.js';
export {
  loadManifests,
  __resetManifestCache,
  SchemaVersionError,
  ManifestNotFoundError,
} from './manifests.js';
export type { Manifests, LoadOptions } from './manifests.js';
export type { ComponentsManifest, DocsManifest } from './types.js';
